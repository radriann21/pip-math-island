import type { Clock, Deps } from '@/application/ports';
import type { Rng } from '@/domain/shared/rng';
import type { KeyValueStorage } from '@/infrastructure/local/KeyValueStorage';
import { LocalAuthGateway } from '@/infrastructure/local/LocalAuthGateway';
import { LocalChildRepository } from '@/infrastructure/local/LocalChildRepository';
import { LocalProgressRepository } from '@/infrastructure/local/LocalProgressRepository';
import { MODE_KEY } from '@/infrastructure/local/keys';
import { SupabaseAuthGateway } from '@/infrastructure/supabase/SupabaseAuthGateway';
import { SupabaseChildRepository } from '@/infrastructure/supabase/SupabaseChildRepository';
import { SupabaseProgressRepository } from '@/infrastructure/supabase/SupabaseProgressRepository';
import { type PipSupabaseClient, createSupabaseClient } from '@/infrastructure/supabase/client';
import { type SupabaseConfig, readSupabaseEnv } from './env';

export type AppMode = 'cloud' | 'guest';

/**
 * Cloud only when Supabase is configured AND the user has not chosen guest mode.
 * An unreadable storage counts as "no preference".
 */
export function resolveMode(input: { env: Record<string, unknown>; storage: Pick<KeyValueStorage, 'getItem'> }): AppMode {
  if (readSupabaseEnv(input.env) === null) return 'guest';
  try {
    return input.storage.getItem(MODE_KEY) === 'guest' ? 'guest' : 'cloud';
  } catch {
    return 'cloud';
  }
}

/** Remembers the user's choice: guest is persisted, cloud clears the flag. */
export function setPreferredMode(storage: Pick<KeyValueStorage, 'setItem' | 'removeItem'>, mode: AppMode): void {
  try {
    if (mode === 'guest') storage.setItem(MODE_KEY, 'guest');
    else storage.removeItem(MODE_KEY);
  } catch {
    // The preference only lasts for this page load when storage is unavailable.
  }
}

let shared: { key: string; client: PipSupabaseClient } | null = null;

/** One Supabase client per page, so two containers never register two auth listeners. */
function sharedSupabaseClient(config: SupabaseConfig): PipSupabaseClient {
  const key = `${config.url}|${config.publishableKey}`;
  if (shared?.key !== key) shared = { key, client: createSupabaseClient(config) };
  return shared.client;
}

/** Test hook: forget the cached client. */
export function resetSupabaseClient(): void {
  shared = null;
}

export interface CreateDepsInput {
  mode: AppMode;
  supabaseConfig: SupabaseConfig | null;
  storage: KeyValueStorage;
  clock: Clock;
  rng: Rng;
  /** Where e-mail confirmation links return to. Defaults to the current origin. */
  emailRedirectTo?: string;
}

export function createDeps(input: CreateDepsInput): Deps {
  const { mode, supabaseConfig, storage, clock, rng } = input;
  if (mode === 'guest') {
    const children = new LocalChildRepository(storage);
    return {
      auth: new LocalAuthGateway(storage),
      children,
      progress: new LocalProgressRepository(storage, children, clock),
      clock,
      rng,
    };
  }
  if (!supabaseConfig) throw new Error('Cloud mode needs Supabase configuration (VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY)');
  const client = sharedSupabaseClient(supabaseConfig);
  const emailRedirectTo = input.emailRedirectTo ?? (typeof window !== 'undefined' ? window.location.origin : undefined);
  return {
    auth: new SupabaseAuthGateway(client, { emailRedirectTo }),
    children: new SupabaseChildRepository(client),
    progress: new SupabaseProgressRepository(client, clock),
    clock,
    rng,
  };
}

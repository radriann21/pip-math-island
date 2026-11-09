import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createSupabaseClient } = vi.hoisted(() => ({
  createSupabaseClient: vi.fn().mockImplementation(() => ({
    auth: { onAuthStateChange: vi.fn(), getSession: vi.fn() },
    from: vi.fn(),
    rpc: vi.fn(),
  })),
}));
vi.mock('@/infrastructure/supabase/client', () => ({ createSupabaseClient }));

import { FixedClock } from '@/application/testing';
import { createSeededRng } from '@/domain/shared/rng';
import { LocalAuthGateway } from '@/infrastructure/local/LocalAuthGateway';
import { LocalChildRepository } from '@/infrastructure/local/LocalChildRepository';
import { LocalProgressRepository } from '@/infrastructure/local/LocalProgressRepository';
import { MemoryStorage } from '@/infrastructure/local/MemoryStorage';
import { SupabaseAuthGateway } from '@/infrastructure/supabase/SupabaseAuthGateway';
import { SupabaseChildRepository } from '@/infrastructure/supabase/SupabaseChildRepository';
import { SupabaseProgressRepository } from '@/infrastructure/supabase/SupabaseProgressRepository';
import { createDeps, resetSupabaseClient, resolveMode, setPreferredMode } from './container';

const env = { VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'k' };
const config = { url: 'https://x.supabase.co', publishableKey: 'k' };

beforeEach(() => {
  createSupabaseClient.mockClear();
  resetSupabaseClient();
});

describe('resolveMode', () => {
  it('is cloud when Supabase is configured and no guest flag is set', () => {
    expect(resolveMode({ env, storage: new MemoryStorage() })).toBe('cloud');
  });
  it('is guest when the env is missing or invalid', () => {
    expect(resolveMode({ env: {}, storage: new MemoryStorage() })).toBe('guest');
    expect(resolveMode({ env: { ...env, VITE_SUPABASE_URL: 'nope' }, storage: new MemoryStorage() })).toBe('guest');
  });
  it('is guest when the persisted preference says so, even with env present', () => {
    expect(resolveMode({ env, storage: new MemoryStorage({ 'pip.v2.mode': 'guest' }) })).toBe('guest');
  });
  it('ignores unknown stored values and a storage that throws', () => {
    expect(resolveMode({ env, storage: new MemoryStorage({ 'pip.v2.mode': 'whatever' }) })).toBe('cloud');
    const broken = { getItem: () => { throw new Error('denied'); } };
    expect(resolveMode({ env, storage: broken })).toBe('cloud');
  });
});

describe('setPreferredMode', () => {
  it('persists guest and clears the flag for cloud', () => {
    const storage = new MemoryStorage();
    setPreferredMode(storage, 'guest');
    expect(storage.getItem('pip.v2.mode')).toBe('guest');
    expect(resolveMode({ env, storage })).toBe('guest');
    setPreferredMode(storage, 'cloud');
    expect(storage.getItem('pip.v2.mode')).toBeNull();
    expect(resolveMode({ env, storage })).toBe('cloud');
  });
});

describe('createDeps', () => {
  const base = { storage: new MemoryStorage(), clock: new FixedClock('2026-05-10'), rng: createSeededRng(1) };

  it('wires Local adapters in guest mode without touching Supabase', () => {
    const deps = createDeps({ ...base, mode: 'guest', supabaseConfig: null });
    expect(deps.auth).toBeInstanceOf(LocalAuthGateway);
    expect(deps.children).toBeInstanceOf(LocalChildRepository);
    expect(deps.progress).toBeInstanceOf(LocalProgressRepository);
    expect(deps.clock).toBe(base.clock);
    expect(deps.rng).toBe(base.rng);
    expect(createSupabaseClient).not.toHaveBeenCalled();
  });
  it('wires Supabase adapters in cloud mode', () => {
    const deps = createDeps({ ...base, mode: 'cloud', supabaseConfig: config });
    expect(deps.auth).toBeInstanceOf(SupabaseAuthGateway);
    expect(deps.children).toBeInstanceOf(SupabaseChildRepository);
    expect(deps.progress).toBeInstanceOf(SupabaseProgressRepository);
    expect(createSupabaseClient).toHaveBeenCalledWith(config);
  });
  it('shares one Supabase client between containers', () => {
    createDeps({ ...base, mode: 'cloud', supabaseConfig: config });
    createDeps({ ...base, mode: 'cloud', supabaseConfig: { ...config } });
    expect(createSupabaseClient).toHaveBeenCalledTimes(1);
  });
  it('creates a new client when the config changes', () => {
    createDeps({ ...base, mode: 'cloud', supabaseConfig: config });
    createDeps({ ...base, mode: 'cloud', supabaseConfig: { ...config, publishableKey: 'other' } });
    expect(createSupabaseClient).toHaveBeenCalledTimes(2);
  });
  it('refuses cloud mode without configuration', () => {
    expect(() => createDeps({ ...base, mode: 'cloud', supabaseConfig: null })).toThrow(/Supabase/);
  });
  it('guest deps work end to end on the provided storage', async () => {
    const storage = new MemoryStorage();
    const deps = createDeps({ ...base, storage, mode: 'guest', supabaseConfig: null });
    const child = await deps.children.create({ name: 'Ana', grade: 2, locale: 'en', soundEnabled: true });
    expect((await deps.progress.load(child.id)).today.day).toBe('2026-05-10');
    expect(storage.getItem('pip.v2.children')).not.toBeNull();
  });
});

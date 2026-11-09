import { type SupabaseClient, createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export type PipSupabaseClient = SupabaseClient<Database>;

export interface SupabaseConfig {
  url: string;
  publishableKey: string;
}

/** Browser client. Only the publishable key is ever used here; row access is enforced by RLS. */
export function createSupabaseClient(config: SupabaseConfig): PipSupabaseClient {
  return createClient<Database>(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
}

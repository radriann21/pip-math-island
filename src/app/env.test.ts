import { describe, expect, it } from 'vitest';
import { readSupabaseEnv } from './env';

const URL_ = 'https://abc.supabase.co';

describe('readSupabaseEnv', () => {
  it('returns url and publishable key when both are present', () => {
    expect(readSupabaseEnv({ VITE_SUPABASE_URL: URL_, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x' })).toEqual({
      url: URL_,
      publishableKey: 'sb_publishable_x',
    });
  });
  it('trims surrounding whitespace', () => {
    expect(readSupabaseEnv({ VITE_SUPABASE_URL: `  ${URL_} `, VITE_SUPABASE_PUBLISHABLE_KEY: ' k ' })).toEqual({
      url: URL_,
      publishableKey: 'k',
    });
  });
  it('accepts http urls (local Supabase)', () => {
    expect(readSupabaseEnv({ VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_PUBLISHABLE_KEY: 'k' })).not.toBeNull();
  });
  it('returns null when either value is missing, empty or not a string', () => {
    expect(readSupabaseEnv({})).toBeNull();
    expect(readSupabaseEnv({ VITE_SUPABASE_URL: URL_ })).toBeNull();
    expect(readSupabaseEnv({ VITE_SUPABASE_PUBLISHABLE_KEY: 'k' })).toBeNull();
    expect(readSupabaseEnv({ VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: 'k' })).toBeNull();
    expect(readSupabaseEnv({ VITE_SUPABASE_URL: URL_, VITE_SUPABASE_PUBLISHABLE_KEY: '   ' })).toBeNull();
    expect(readSupabaseEnv({ VITE_SUPABASE_URL: 42, VITE_SUPABASE_PUBLISHABLE_KEY: 'k' })).toBeNull();
  });
  it('returns null for an unparseable or non-http url', () => {
    expect(readSupabaseEnv({ VITE_SUPABASE_URL: 'not a url', VITE_SUPABASE_PUBLISHABLE_KEY: 'k' })).toBeNull();
    expect(readSupabaseEnv({ VITE_SUPABASE_URL: 'ftp://x.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'k' })).toBeNull();
    expect(readSupabaseEnv({ VITE_SUPABASE_URL: 'javascript:alert(1)', VITE_SUPABASE_PUBLISHABLE_KEY: 'k' })).toBeNull();
  });
  it('accepts import.meta.env without throwing', () => {
    expect(() => readSupabaseEnv(import.meta.env)).not.toThrow();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn().mockReturnValue({ marker: 'client' }) }));
vi.mock('@supabase/supabase-js', () => ({ createClient }));

import { createSupabaseClient } from './client';

describe('createSupabaseClient', () => {
  beforeEach(() => createClient.mockClear());

  it('creates a client with session persistence, token refresh and URL detection', () => {
    const client = createSupabaseClient({ url: 'https://x.supabase.co', publishableKey: 'sb_publishable_k' });
    expect(client).toEqual({ marker: 'client' });
    expect(createClient).toHaveBeenCalledWith('https://x.supabase.co', 'sb_publishable_k', {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  });
});

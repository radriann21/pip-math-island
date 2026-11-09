export interface SupabaseConfig {
  url: string;
  publishableKey: string;
}

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

/** Reads the Supabase settings from a Vite-style env object. Returns null when cloud mode is not configured. */
export function readSupabaseEnv(env: Record<string, unknown>): SupabaseConfig | null {
  const url = text(env.VITE_SUPABASE_URL);
  const publishableKey = text(env.VITE_SUPABASE_PUBLISHABLE_KEY);
  if (url === null || publishableKey === null || !isHttpUrl(url)) return null;
  return { url, publishableKey };
}

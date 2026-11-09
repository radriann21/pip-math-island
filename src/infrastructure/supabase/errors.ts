import { AuthError, NotFoundError, StorageError, ValidationError } from '@/application/errors';
import { asRecord } from '../coerce';

type AppError = AuthError | NotFoundError | StorageError | ValidationError;

const NETWORK_TEXT = /failed to fetch|networkerror|network request failed|load failed|fetch failed|offline/i;

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

function looksLikeNetworkFailure(error: unknown): boolean {
  if (error instanceof TypeError) return NETWORK_TEXT.test(error.message);
  const r = asRecord(error);
  return r !== null && (str(r.name) === 'AuthRetryableFetchError' || NETWORK_TEXT.test(str(r.message)));
}

/**
 * Maps a PostgREST / RPC error to an application error. The raw error (which may contain SQL, table or
 * column names) is kept in `cause`; the `message` is always a fixed, user-safe sentence.
 */
export function mapPostgrestError(error: unknown, options: { resource?: string } = {}): AppError {
  const r = asRecord(error);
  const code = r ? str(r.code) : '';
  const cause = { cause: error };
  if (code === '42501') {
    return options.resource ? new NotFoundError(`${options.resource} not found`, cause) : new AuthError('not_allowed', cause);
  }
  if (code === 'PGRST301' || code === 'PGRST303') return new AuthError('session_expired', cause);
  if (code === '23505') return new ValidationError('Already exists', cause);
  if (code === '23514' || code === '23502' || code.startsWith('22')) return new ValidationError('Invalid data', cause);
  if (code === '23503' || code === 'PGRST116') return new NotFoundError('Not found', cause);
  if (looksLikeNetworkFailure(error)) return new StorageError('Network unavailable', cause);
  return new StorageError('Could not reach the server', cause);
}

const AUTH_CODES: Record<string, string> = {
  invalid_credentials: 'invalid_credentials',
  email_not_confirmed: 'email_not_confirmed',
  user_already_exists: 'email_taken',
  email_exists: 'email_taken',
  weak_password: 'weak_password',
  over_request_rate_limit: 'rate_limited',
  over_email_send_rate_limit: 'rate_limited',
  signup_disabled: 'signup_disabled',
};

const VALIDATION_CODES = new Set(['validation_failed', 'email_address_invalid', 'bad_json']);

/** Maps a Supabase Auth error. AuthError messages are stable codes the UI can translate. */
export function mapAuthError(error: unknown): AppError {
  const r = asRecord(error);
  const code = r ? str(r.code) : '';
  const cause = { cause: error };
  if (looksLikeNetworkFailure(error)) return new StorageError('Network unavailable', cause);
  if (code in AUTH_CODES) return new AuthError(AUTH_CODES[code] as string, cause);
  if (VALIDATION_CODES.has(code)) return new ValidationError('Invalid data', cause);
  if (r?.status === 429) return new AuthError('rate_limited', cause);
  return new AuthError('auth_failed', cause);
}

/** Last line of defence for exceptions thrown (not returned) by the client, e.g. fetch rejections. */
export function mapThrown(error: unknown): AppError {
  if (
    error instanceof AuthError ||
    error instanceof NotFoundError ||
    error instanceof StorageError ||
    error instanceof ValidationError
  ) {
    return error;
  }
  return new StorageError(looksLikeNetworkFailure(error) ? 'Network unavailable' : 'Unexpected error', { cause: error });
}

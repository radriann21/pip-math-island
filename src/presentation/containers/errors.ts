import { AuthError, NotFoundError, StorageError, ValidationError } from '@/application/errors';
import type { MessageKey, MessageParams } from '../i18n';

const AUTH_CODES = [
  'invalid_credentials',
  'email_not_confirmed',
  'email_taken',
  'weak_password',
  'rate_limited',
  'signup_disabled',
  'session_expired',
  'not_allowed',
  'cloud_unavailable',
  'auth_failed',
] as const;

export interface ErrorDescription {
  key: MessageKey;
  params?: MessageParams;
}

/**
 * Turns an application error into a translatable message. Adapters only expose stable codes and
 * developer sentences, never user copy, so every message shown to the family comes from the dictionaries.
 */
export function describeError(error: unknown): ErrorDescription {
  if (error instanceof AuthError) {
    const code = AUTH_CODES.find((c) => c === error.message) ?? 'auth_failed';
    return { key: `error.auth.${code}` };
  }
  if (error instanceof StorageError) return { key: 'error.network' };
  if (error instanceof ValidationError) {
    const limit = /at most (\d+) child/.exec(error.message);
    if (limit) return { key: 'error.childLimit', params: { n: Number(limit[1]) } };
    return { key: 'error.validation' };
  }
  if (error instanceof NotFoundError) return { key: 'error.notFound' };
  return { key: 'error.generic' };
}

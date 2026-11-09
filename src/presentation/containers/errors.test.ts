import { describe, expect, it } from 'vitest';
import { AuthError, NotFoundError, StorageError, ValidationError } from '@/application/errors';
import { messagesEn, messagesEs } from '@/presentation/i18n';
import { describeError } from './errors';

describe('describeError', () => {
  it('maps every stable auth code to its own message key', () => {
    const codes = [
      'invalid_credentials',
      'email_not_confirmed',
      'email_taken',
      'weak_password',
      'rate_limited',
      'signup_disabled',
      'session_expired',
      'not_allowed',
      'cloud_unavailable',
    ];
    for (const code of codes) {
      expect(describeError(new AuthError(code)).key).toBe(`error.auth.${code}`);
    }
  });

  it('falls back to a generic auth message for unknown codes', () => {
    expect(describeError(new AuthError('auth_failed')).key).toBe('error.auth.auth_failed');
    expect(describeError(new AuthError('something_new')).key).toBe('error.auth.auth_failed');
  });

  it('distinguishes network, validation, child limit, not found and unknown errors', () => {
    expect(describeError(new StorageError('Network unavailable')).key).toBe('error.network');
    expect(describeError(new StorageError('Could not reach the server')).key).toBe('error.network');
    expect(describeError(new ValidationError('Name must be 1 to 24 characters')).key).toBe('error.validation');
    expect(describeError(new ValidationError('A parent can have at most 8 child profiles'))).toEqual({
      key: 'error.childLimit',
      params: { n: 8 },
    });
    expect(describeError(new NotFoundError('x')).key).toBe('error.notFound');
    expect(describeError(new Error('boom')).key).toBe('error.generic');
    expect(describeError('weird').key).toBe('error.generic');
  });

  it('only returns keys both dictionaries define', () => {
    const errors = [new AuthError('invalid_credentials'), new StorageError('n'), new Error('x'), new NotFoundError('n')];
    for (const e of errors) {
      const { key } = describeError(e);
      expect(messagesEn[key]).toBeTruthy();
      expect(messagesEs[key]).toBeTruthy();
    }
  });
});

import { describe, expect, it } from 'vitest';
import { AuthError, NotFoundError, StorageError, ValidationError } from '@/application/errors';
import { mapAuthError, mapPostgrestError, mapThrown } from './errors';

const pg = (code: string, message = 'raw sql: relation "public.children" violates something') => ({
  code,
  message,
  details: 'Key (id)=(1) detail',
  hint: null,
});

describe('mapPostgrestError', () => {
  it('maps 42501 to NotFoundError when the caller names a resource, else to AuthError', () => {
    expect(mapPostgrestError(pg('42501'), { resource: 'child' })).toBeInstanceOf(NotFoundError);
    expect(mapPostgrestError(pg('42501'))).toBeInstanceOf(AuthError);
  });
  it('maps check_violation and class 22 errors to ValidationError', () => {
    for (const code of ['23514', '22001', '22003', '22P02', '23502']) {
      expect(mapPostgrestError(pg(code))).toBeInstanceOf(ValidationError);
    }
  });
  it('maps unique violations to a ValidationError that says the row already exists', () => {
    const e = mapPostgrestError(pg('23505'));
    expect(e).toBeInstanceOf(ValidationError);
    expect(e.message).toBe('Already exists');
  });
  it('maps foreign key violations and missing single rows to NotFoundError', () => {
    expect(mapPostgrestError(pg('23503'))).toBeInstanceOf(NotFoundError);
    expect(mapPostgrestError(pg('PGRST116'))).toBeInstanceOf(NotFoundError);
  });
  it('maps expired or missing JWTs to AuthError', () => {
    expect(mapPostgrestError(pg('PGRST301'))).toBeInstanceOf(AuthError);
    expect(mapPostgrestError(pg('PGRST303'))).toBeInstanceOf(AuthError);
  });
  it('maps everything else, including network failures, to StorageError', () => {
    expect(mapPostgrestError(pg('XX000'))).toBeInstanceOf(StorageError);
    expect(mapPostgrestError({ code: '', message: 'TypeError: Failed to fetch', details: '', hint: '' })).toBeInstanceOf(StorageError);
    expect(mapPostgrestError(undefined)).toBeInstanceOf(StorageError);
  });
  it('never leaks raw SQL text into message and keeps the original in cause', () => {
    for (const code of ['42501', '23514', '23505', '23503', 'XX000', 'PGRST301']) {
      const raw = pg(code);
      const e = mapPostgrestError(raw, { resource: 'child' });
      expect(e.message).not.toContain('relation');
      expect(e.message).not.toContain('public.');
      expect(e.cause).toBe(raw);
    }
  });
  it('flags network failures with a dedicated message', () => {
    expect(mapPostgrestError({ code: '', message: 'TypeError: Failed to fetch', details: '', hint: '' }).message).toBe('Network unavailable');
  });
});

describe('mapAuthError', () => {
  const api = (code: string, status = 400, message = 'raw gotrue text') => ({ name: 'AuthApiError', code, status, message });
  it('maps credential problems', () => {
    expect(mapAuthError(api('invalid_credentials'))).toMatchObject({ name: 'AuthError', message: 'invalid_credentials' });
    expect(mapAuthError(api('email_not_confirmed'))).toMatchObject({ message: 'email_not_confirmed' });
  });
  it('maps duplicate accounts and weak passwords', () => {
    expect(mapAuthError(api('user_already_exists', 422))).toMatchObject({ message: 'email_taken' });
    expect(mapAuthError(api('email_exists', 422))).toMatchObject({ message: 'email_taken' });
    expect(mapAuthError(api('weak_password', 422))).toMatchObject({ message: 'weak_password' });
  });
  it('maps rate limits by code or status 429', () => {
    expect(mapAuthError(api('over_request_rate_limit', 429))).toMatchObject({ message: 'rate_limited' });
    expect(mapAuthError(api('over_email_send_rate_limit', 429))).toMatchObject({ message: 'rate_limited' });
    expect(mapAuthError({ name: 'AuthApiError', status: 429, message: 'x' })).toMatchObject({ message: 'rate_limited' });
  });
  it('maps validation failures on the auth endpoints to ValidationError', () => {
    expect(mapAuthError(api('validation_failed', 422))).toBeInstanceOf(ValidationError);
    expect(mapAuthError(api('email_address_invalid', 400))).toBeInstanceOf(ValidationError);
  });
  it('maps retryable fetch failures and offline errors to StorageError', () => {
    expect(mapAuthError({ name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' })).toBeInstanceOf(StorageError);
    expect(mapAuthError(new TypeError('Failed to fetch'))).toBeInstanceOf(StorageError);
  });
  it('falls back to a generic AuthError and never leaks raw text', () => {
    const raw = api('something_new', 500, 'secret internal text');
    const e = mapAuthError(raw);
    expect(e).toBeInstanceOf(AuthError);
    expect(e.message).toBe('auth_failed');
    expect(e.cause).toBe(raw);
  });
});

describe('mapThrown', () => {
  it('passes application errors through untouched', () => {
    const e = new ValidationError('x');
    expect(mapThrown(e)).toBe(e);
  });
  it('turns anything else into a StorageError with the cause kept', () => {
    const boom = new TypeError('Failed to fetch');
    const e = mapThrown(boom);
    expect(e).toBeInstanceOf(StorageError);
    expect(e.cause).toBe(boom);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { AuthError, StorageError } from '@/application/errors';
import type { PipSupabaseClient } from './client';
import { SupabaseAuthGateway } from './SupabaseAuthGateway';

const user = { id: 'u1', email: 'a@b.co' };
const session = { access_token: 't', user };

function makeAuth() {
  const unsubscribe = vi.fn();
  let listener: ((event: string, s: unknown) => void) | undefined;
  const auth = {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    onAuthStateChange: vi.fn((cb: (event: string, s: unknown) => void) => {
      listener = cb;
      return { data: { subscription: { unsubscribe } } };
    }),
  };
  const gateway = new SupabaseAuthGateway({ auth } as unknown as Pick<PipSupabaseClient, 'auth'>, {
    emailRedirectTo: 'https://pip.example',
  });
  return { auth, gateway, unsubscribe, emit: (e: string, s: unknown) => listener?.(e, s) };
}

describe('SupabaseAuthGateway', () => {
  it('signUp passes the redirect URL and returns the session when one is issued', async () => {
    const { auth, gateway } = makeAuth();
    auth.signUp.mockResolvedValue({ data: { user: { ...user, identities: [{}] }, session }, error: null });
    const res = await gateway.signUp('a@b.co', 'secret1');
    expect(auth.signUp).toHaveBeenCalledWith({
      email: 'a@b.co',
      password: 'secret1',
      options: { emailRedirectTo: 'https://pip.example' },
    });
    expect(res).toEqual({ session: { userId: 'u1', email: 'a@b.co', guest: false }, needsEmailConfirmation: false });
  });
  it('signUp requires email confirmation when no session is returned', async () => {
    const { auth, gateway } = makeAuth();
    auth.signUp.mockResolvedValue({ data: { user: { ...user, identities: [{}] }, session: null }, error: null });
    expect(await gateway.signUp('a@b.co', 'secret1')).toEqual({ session: null, needsEmailConfirmation: true });
  });
  it('signUp reports an already registered email (obfuscated response with no identities)', async () => {
    const { auth, gateway } = makeAuth();
    auth.signUp.mockResolvedValue({ data: { user: { ...user, identities: [] }, session: null }, error: null });
    await expect(gateway.signUp('a@b.co', 'secret1')).rejects.toMatchObject({ name: 'AuthError', message: 'email_taken' });
  });
  it('maps signUp errors', async () => {
    const { auth, gateway } = makeAuth();
    auth.signUp.mockResolvedValue({ data: { user: null, session: null }, error: { name: 'AuthApiError', code: 'weak_password', status: 422, message: 'x' } });
    await expect(gateway.signUp('a@b.co', '1')).rejects.toMatchObject({ message: 'weak_password' });
  });
  it('signIn returns the session and maps bad credentials', async () => {
    const { auth, gateway } = makeAuth();
    auth.signInWithPassword.mockResolvedValueOnce({ data: { user, session }, error: null });
    expect(await gateway.signIn('a@b.co', 'secret1')).toEqual({ userId: 'u1', email: 'a@b.co', guest: false });
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.co', password: 'secret1' });
    auth.signInWithPassword.mockResolvedValueOnce({ data: { user: null, session: null }, error: { name: 'AuthApiError', code: 'invalid_credentials', status: 400, message: 'x' } });
    await expect(gateway.signIn('a@b.co', 'nope')).rejects.toMatchObject({ message: 'invalid_credentials' });
  });
  it('signIn without a session is an AuthError', async () => {
    const { auth, gateway } = makeAuth();
    auth.signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: null });
    await expect(gateway.signIn('a@b.co', 'x')).rejects.toBeInstanceOf(AuthError);
  });
  it('signOut calls the client and maps errors', async () => {
    const { auth, gateway } = makeAuth();
    auth.signOut.mockResolvedValueOnce({ error: null });
    await expect(gateway.signOut()).resolves.toBeUndefined();
    auth.signOut.mockResolvedValueOnce({ error: { name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' } });
    await expect(gateway.signOut()).rejects.toBeInstanceOf(StorageError);
  });
  it('getSession reads the current session or null', async () => {
    const { auth, gateway } = makeAuth();
    auth.getSession.mockResolvedValueOnce({ data: { session }, error: null });
    expect(await gateway.getSession()).toEqual({ userId: 'u1', email: 'a@b.co', guest: false });
    auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    expect(await gateway.getSession()).toBeNull();
    auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: { name: 'AuthApiError', status: 500, message: 'boom' } });
    await expect(gateway.getSession()).rejects.toBeInstanceOf(AuthError);
  });
  it('maps a session without an email', async () => {
    const { auth, gateway } = makeAuth();
    auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u2' } } }, error: null });
    expect(await gateway.getSession()).toEqual({ userId: 'u2', email: null, guest: false });
  });
  it('continueAsGuest is unavailable in cloud mode', async () => {
    const { gateway } = makeAuth();
    await expect(gateway.continueAsGuest()).rejects.toMatchObject({ name: 'AuthError', message: 'guest_unavailable' });
  });
  it('onChange forwards mapped sessions, ignores token refreshes and unsubscribes', () => {
    const { gateway, emit, unsubscribe } = makeAuth();
    const cb = vi.fn();
    const off = gateway.onChange(cb);
    emit('SIGNED_IN', session);
    emit('TOKEN_REFRESHED', session);
    emit('SIGNED_OUT', null);
    expect(cb.mock.calls).toEqual([[{ userId: 'u1', email: 'a@b.co', guest: false }], [null]]);
    off();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
  it('turns thrown fetch failures into StorageError', async () => {
    const { auth, gateway } = makeAuth();
    auth.signInWithPassword.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(gateway.signIn('a@b.co', 'x')).rejects.toBeInstanceOf(StorageError);
  });
});

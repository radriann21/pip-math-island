import { describe, expect, it, vi } from 'vitest';
import { AuthError } from '@/application/errors';
import { LocalAuthGateway } from './LocalAuthGateway';
import { MemoryStorage } from './MemoryStorage';
import { MODE_KEY } from './keys';

describe('LocalAuthGateway', () => {
  it('has no session until the user continues as guest', async () => {
    const auth = new LocalAuthGateway(new MemoryStorage());
    expect(await auth.getSession()).toBeNull();
  });
  it('continueAsGuest returns the guest session and persists the flag', async () => {
    const storage = new MemoryStorage();
    const auth = new LocalAuthGateway(storage);
    expect(await auth.continueAsGuest()).toEqual({ userId: 'guest', email: null, guest: true });
    expect(storage.getItem(MODE_KEY)).toBe('guest');
    expect(await new LocalAuthGateway(storage).getSession()).toEqual({ userId: 'guest', email: null, guest: true });
  });
  it('signOut clears the flag', async () => {
    const storage = new MemoryStorage();
    const auth = new LocalAuthGateway(storage);
    await auth.continueAsGuest();
    await auth.signOut();
    expect(storage.getItem(MODE_KEY)).toBeNull();
    expect(await auth.getSession()).toBeNull();
  });
  it('rejects sign up and sign in with a cloud_unavailable AuthError', async () => {
    const auth = new LocalAuthGateway(new MemoryStorage());
    await expect(auth.signUp('a@b.co', 'secret1')).rejects.toMatchObject({ name: 'AuthError', message: 'cloud_unavailable' });
    await expect(auth.signIn('a@b.co', 'secret1')).rejects.toBeInstanceOf(AuthError);
  });
  it('notifies listeners until they unsubscribe', async () => {
    const auth = new LocalAuthGateway(new MemoryStorage());
    const cb = vi.fn();
    const off = auth.onChange(cb);
    await auth.continueAsGuest();
    await auth.signOut();
    expect(cb.mock.calls).toEqual([[{ userId: 'guest', email: null, guest: true }], [null]]);
    off();
    await auth.continueAsGuest();
    expect(cb).toHaveBeenCalledTimes(2);
  });
  it('survives a storage that throws', async () => {
    const broken = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
      removeItem: () => {
        throw new Error('denied');
      },
    };
    const auth = new LocalAuthGateway(broken);
    expect(await auth.getSession()).toBeNull();
    await expect(auth.continueAsGuest()).resolves.toMatchObject({ guest: true });
    await expect(auth.signOut()).resolves.toBeUndefined();
  });
});

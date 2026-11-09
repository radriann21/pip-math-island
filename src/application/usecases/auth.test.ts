import { describe, expect, it } from 'vitest';
import { AuthError, ValidationError } from '../errors';
import { createTestDeps } from '../testing';
import { continueAsGuest } from './continueAsGuest';
import { getSession } from './getSession';
import { signIn } from './signIn';
import { signOut } from './signOut';
import { signUp } from './signUp';

describe('signUp', () => {
  it('creates the account and returns the session', async () => {
    const { deps } = createTestDeps();
    const result = await signUp(deps, '  Parent@Mail.com ', 'secret1');
    expect(result.needsEmailConfirmation).toBe(false);
    expect(result.session?.email).toBe('parent@mail.com');
  });
  it('reports when email confirmation is needed', async () => {
    const { deps } = createTestDeps({ requireEmailConfirmation: true });
    expect(await signUp(deps, 'p@mail.com', 'secret1')).toEqual({ session: null, needsEmailConfirmation: true });
  });
  it('validates the email and password before calling the gateway', async () => {
    const { deps } = createTestDeps();
    await expect(signUp(deps, 'not-an-email', 'secret1')).rejects.toBeInstanceOf(ValidationError);
    await expect(signUp(deps, '', 'secret1')).rejects.toBeInstanceOf(ValidationError);
    await expect(signUp(deps, 'p@mail.com', '12345')).rejects.toBeInstanceOf(ValidationError);
    expect(await getSession(deps)).toBeNull();
  });
  it('propagates gateway errors such as a duplicate account', async () => {
    const { deps } = createTestDeps();
    await signUp(deps, 'p@mail.com', 'secret1');
    await expect(signUp(deps, 'p@mail.com', 'secret1')).rejects.toBeInstanceOf(AuthError);
  });
});

describe('signIn', () => {
  it('returns the session for valid credentials', async () => {
    const { deps } = createTestDeps();
    await signUp(deps, 'p@mail.com', 'secret1');
    await signOut(deps);
    const session = await signIn(deps, ' p@mail.com ', 'secret1');
    expect(session).toMatchObject({ email: 'p@mail.com', guest: false });
  });
  it('rejects empty input with ValidationError and bad credentials with AuthError', async () => {
    const { deps } = createTestDeps();
    await signUp(deps, 'p@mail.com', 'secret1');
    await expect(signIn(deps, '', 'secret1')).rejects.toBeInstanceOf(ValidationError);
    await expect(signIn(deps, 'p@mail.com', '')).rejects.toBeInstanceOf(ValidationError);
    await expect(signIn(deps, 'p@mail.com', 'wrong-pass')).rejects.toBeInstanceOf(AuthError);
  });
});

describe('signOut, continueAsGuest and getSession', () => {
  it('tracks the current session', async () => {
    const { deps } = createTestDeps();
    expect(await getSession(deps)).toBeNull();
    const guest = await continueAsGuest(deps);
    expect(guest.guest).toBe(true);
    expect(await getSession(deps)).toEqual(guest);
    await signOut(deps);
    expect(await getSession(deps)).toBeNull();
  });
});

import { ValidationError } from '../errors';
import type { Session } from '../model';
import type { Deps } from '../ports';

export async function signIn(deps: Pick<Deps, 'auth'>, email: string, password: string): Promise<Session> {
  const clean = email.trim();
  if (clean === '' || password === '') throw new ValidationError('Email and password are required');
  return deps.auth.signIn(clean, password);
}

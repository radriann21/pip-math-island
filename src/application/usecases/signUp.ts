import type { Session } from '../model';
import type { Deps } from '../ports';
import { ValidationError } from '../errors';
import { MIN_PASSWORD_LENGTH, validEmail } from './validation';

export async function signUp(
  deps: Pick<Deps, 'auth'>,
  email: string,
  password: string,
): Promise<{ session: Session | null; needsEmailConfirmation: boolean }> {
  const clean = validEmail(email);
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  return deps.auth.signUp(clean, password);
}

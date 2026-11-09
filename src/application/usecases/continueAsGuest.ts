import type { Session } from '../model';
import type { Deps } from '../ports';

export async function continueAsGuest(deps: Pick<Deps, 'auth'>): Promise<Session> {
  return deps.auth.continueAsGuest();
}

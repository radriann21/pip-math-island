import type { Session } from '../model';
import type { Deps } from '../ports';

export async function getSession(deps: Pick<Deps, 'auth'>): Promise<Session | null> {
  return deps.auth.getSession();
}

import type { Deps } from '../ports';

export async function signOut(deps: Pick<Deps, 'auth'>): Promise<void> {
  await deps.auth.signOut();
}

import type { Child } from '../model';
import type { Deps } from '../ports';

export async function listChildren(deps: Pick<Deps, 'children'>): Promise<Child[]> {
  return deps.children.list();
}

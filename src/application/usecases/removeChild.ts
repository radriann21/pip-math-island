import type { Deps } from '../ports';

export async function removeChild(deps: Pick<Deps, 'children'>, id: string): Promise<void> {
  await deps.children.remove(id);
}

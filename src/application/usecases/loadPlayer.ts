import type { PlayerState } from '../model';
import type { Deps } from '../ports';

export async function loadPlayer(deps: Pick<Deps, 'progress'>, childId: string): Promise<PlayerState> {
  return deps.progress.load(childId);
}

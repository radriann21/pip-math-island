import { createSeededRng } from '@/domain/shared/rng';
import type { Deps } from '../ports';
import { FixedClock } from './FixedClock';
import { InMemoryAuthGateway } from './InMemoryAuthGateway';
import { InMemoryChildRepository } from './InMemoryChildRepository';
import { InMemoryProgressRepository } from './InMemoryProgressRepository';

export { FixedClock } from './FixedClock';
export { InMemoryAuthGateway } from './InMemoryAuthGateway';
export { InMemoryChildRepository } from './InMemoryChildRepository';
export { InMemoryProgressRepository } from './InMemoryProgressRepository';

/** A full set of in-memory dependencies plus handles to the concrete fakes, for tests. */
export function createTestDeps(options: { today?: string; seed?: number; requireEmailConfirmation?: boolean } = {}) {
  const clock = new FixedClock(options.today);
  const auth = new InMemoryAuthGateway({ requireEmailConfirmation: options.requireEmailConfirmation ?? false });
  const children = new InMemoryChildRepository();
  const progress = new InMemoryProgressRepository(children, clock);
  const deps: Deps = { auth, children, progress, clock, rng: createSeededRng(options.seed ?? 1) };
  return { deps, clock, auth, children, progress };
}

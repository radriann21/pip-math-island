import type { Rng } from '@/domain/shared/rng';
import type { AuthGateway } from './AuthGateway';
import type { ChildRepository } from './ChildRepository';
import type { Clock } from './Clock';
import type { ProgressRepository } from './ProgressRepository';

export type { AuthGateway, ChildRepository, Clock, ProgressRepository };

/** Everything a use case may depend on, wired by the composition root. */
export interface Deps {
  auth: AuthGateway;
  children: ChildRepository;
  progress: ProgressRepository;
  clock: Clock;
  rng: Rng;
}

import { generateRaceQuestion } from '@/domain/exercises';
import type { RaceQuestion } from '@/domain/exercises';
import { RACE_SECONDS, initialRace } from '@/domain/progression';
import type { RaceTracker } from '@/domain/progression';
import type { PlayerState } from '../model';
import type { Deps } from '../ports';

/** Everything the race screen needs: the duration, a fresh tracker and a question source for the child's grade. */
export function startRace(
  deps: Pick<Deps, 'rng'>,
  state: PlayerState,
): { seconds: number; tracker: RaceTracker; nextQuestion: () => RaceQuestion } {
  const { grade, locale } = state.child;
  return {
    seconds: RACE_SECONDS,
    tracker: initialRace(),
    nextQuestion: () => generateRaceQuestion(grade, locale, deps.rng),
  };
}

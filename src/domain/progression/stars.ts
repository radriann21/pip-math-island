import type { Stars } from '../shared/types';

/** Round score: a first-try answer is worth 1 point, a second-try answer half a point. */
export function roundScoreValue(firstTry: number, secondTry: number): number {
  return firstTry + 0.5 * secondTry;
}

/** Stars for a round score: >=9 gives 3, >=7 gives 2, >=5 gives 1, otherwise 0. */
export function starsFor(score: number): Stars {
  if (score >= 9) return 3;
  if (score >= 7) return 2;
  if (score >= 5) return 1;
  return 0;
}

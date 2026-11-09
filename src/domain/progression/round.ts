import type { Grade, Stars, Tier, TopicId } from '../shared/types';
import { roundScoreValue, starsFor } from './stars';
import { nextTier } from './tiers';
import { roundXp } from './xp';

/** One answered question. tries=2 with correct=false means the child missed it. */
export interface AnswerDetail {
  index: number;
  prompt: string;
  correct: boolean;
  tries: 1 | 2;
}

export interface RoundOutcome {
  topic: TopicId;
  grade: Grade;
  tierBefore: Tier;
  firstTry: number;
  secondTry: number;
  missed: number;
  bestCombo: number;
  details: AnswerDetail[];
}

export interface RoundScore {
  stars: Stars;
  tierAfter: Tier;
  xpGained: number;
  perfect: boolean;
}

/** Thrown when a round outcome is internally inconsistent. */
export class InvalidRoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRoundError';
  }
}

function validate(o: RoundOutcome): void {
  const counts = [o.firstTry, o.secondTry, o.missed];
  if (counts.some((n) => !Number.isInteger(n) || n < 0)) {
    throw new InvalidRoundError('answer counts must be non-negative integers');
  }
  if (o.details.length === 0) throw new InvalidRoundError('a round needs at least one answer');
  if (o.firstTry + o.secondTry + o.missed !== o.details.length) {
    throw new InvalidRoundError('firstTry + secondTry + missed must equal the number of details');
  }
  let first = 0;
  let second = 0;
  let missed = 0;
  for (const d of o.details) {
    if (d.tries === 1 && d.correct) first++;
    else if (d.tries === 2 && d.correct) second++;
    else if (d.tries === 2) missed++;
    else throw new InvalidRoundError(`answer ${d.index} is wrong after a single try`);
  }
  if (first !== o.firstTry || second !== o.secondTry || missed !== o.missed) {
    throw new InvalidRoundError('the details do not match the answer counts');
  }
}

/** Stars, next tier and XP of a finished round. Throws InvalidRoundError on inconsistent input. */
export function scoreRound(o: RoundOutcome): RoundScore {
  validate(o);
  return {
    stars: starsFor(roundScoreValue(o.firstTry, o.secondTry)),
    tierAfter: nextTier(o.tierBefore, o.firstTry),
    xpGained: roundXp(o.details),
    perfect: o.firstTry === 10,
  };
}

/** Counts and the longest first-try run, derived from the answer details (in index order). */
export function summarizeAnswers(details: readonly AnswerDetail[]): {
  firstTry: number;
  secondTry: number;
  missed: number;
  bestCombo: number;
} {
  const summary = { firstTry: 0, secondTry: 0, missed: 0, bestCombo: 0 };
  let combo = 0;
  for (const d of [...details].sort((a, b) => a.index - b.index)) {
    if (d.correct && d.tries === 1) {
      summary.firstTry++;
      combo++;
      summary.bestCombo = Math.max(summary.bestCombo, combo);
    } else {
      combo = 0;
      if (d.correct) summary.secondTry++;
      else summary.missed++;
    }
  }
  return summary;
}

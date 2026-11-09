import type { AnswerDetail } from './round';

const FIRST_TRY_XP = 10;
const SECOND_TRY_XP = 5;
const MAX_COMBO_BONUS = 5;

/** XP for one answer. `combo` is the number of first-try answers in a row just before this one. */
export function answerXp(detail: Pick<AnswerDetail, 'correct' | 'tries'>, combo: number): number {
  if (!detail.correct) return 0;
  if (detail.tries === 1) return FIRST_TRY_XP + Math.min(combo, MAX_COMBO_BONUS);
  return SECOND_TRY_XP;
}

/** Total XP of a round, deriving the running combo from the order of the details. */
export function roundXp(details: readonly AnswerDetail[]): number {
  const ordered = [...details].sort((a, b) => a.index - b.index);
  let combo = 0;
  let total = 0;
  for (const detail of ordered) {
    total += answerXp(detail, combo);
    combo = detail.correct && detail.tries === 1 ? combo + 1 : 0;
  }
  return total;
}

/** Player level from total XP: level = 1 + floor(sqrt(xp / 60)). `pct` is progress inside the level (0..100). */
export function levelInfo(xp: number): { level: number; pct: number; next: number } {
  const start = (level: number) => 60 * (level - 1) * (level - 1);
  const level = 1 + Math.floor(Math.sqrt(xp / 60));
  const from = start(level);
  const to = start(level + 1);
  return {
    level,
    pct: Math.max(0, Math.min(100, (100 * (xp - from)) / (to - from))),
    next: to - xp,
  };
}

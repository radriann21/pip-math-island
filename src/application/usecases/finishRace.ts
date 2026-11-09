import { newlyEarned, raceXp } from '@/domain/progression';
import type { BadgeDefinition } from '@/domain/progression';
import { ValidationError } from '../errors';
import type { PlayerState, SavedRace } from '../model';
import type { Deps } from '../ports';
import { applyRace } from '../projection';
import { buildSnapshot } from './buildSnapshot';

/** Largest score that still fits the database xp check (score * 2 <= 1000). */
const MAX_RACE_SCORE = 500;

export interface FinishRaceResult {
  state: PlayerState;
  xpGained: number;
  newBadges: BadgeDefinition[];
  record: boolean;
}

/** Awards race xp and race badges, persists the race and reports whether it beat the personal record. */
export async function finishRace(
  deps: Pick<Deps, 'progress'>,
  input: { state: PlayerState; score: number; bestCombo: number },
): Promise<FinishRaceResult> {
  const { state, score, bestCombo } = input;
  if (!Number.isInteger(score) || score < 0 || score > MAX_RACE_SCORE) {
    throw new ValidationError(`Race score must be a whole number from 0 to ${MAX_RACE_SCORE}`);
  }
  if (!Number.isInteger(bestCombo) || bestCombo < 0 || bestCombo > score) {
    throw new ValidationError('Best combo must be a whole number no larger than the score');
  }

  const saved: SavedRace = { grade: state.child.grade, score, bestCombo, xpGained: raceXp(score), newBadgeIds: [] };
  // Like the prototype, a race never counts towards the first-try combo sticker.
  const newBadges = newlyEarned(new Set(state.badges), buildSnapshot(applyRace(state, saved)));
  saved.newBadgeIds = newBadges.map((b) => b.id);

  const next = await deps.progress.saveRace(state.child.id, saved);
  return { state: next, xpGained: saved.xpGained, newBadges, record: score > state.raceBest };
}

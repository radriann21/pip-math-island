import {
  InvalidRoundError,
  dailyBonus,
  levelInfo,
  newlyEarned,
  nextStreak,
  scoreRound,
  summarizeAnswers,
} from '@/domain/progression';
import type { AnswerDetail, BadgeDefinition, RoundScore } from '@/domain/progression';
import type { Tier, TopicId } from '@/domain/shared/types';
import { ValidationError } from '../errors';
import type { PlayerState, SavedRound } from '../model';
import type { Deps } from '../ports';
import { applyRound } from '../projection';
import { buildSnapshot } from './buildSnapshot';

export interface FinishRoundInput {
  state: PlayerState;
  topic: TopicId;
  tierBefore: Tier;
  details: AnswerDetail[];
}

export interface FinishRoundResult {
  state: PlayerState;
  score: RoundScore;
  bonusXp: number;
  newBadges: BadgeDefinition[];
  levelUp: boolean;
}

/** Scores a finished round with the domain, decides bonus/streak/badges, persists it once, returns the new state. */
export async function finishRound(
  deps: Pick<Deps, 'progress' | 'clock'>,
  input: FinishRoundInput,
): Promise<FinishRoundResult> {
  const { state, topic, tierBefore, details } = input;
  const grade = state.child.grade;
  const summary = summarizeAnswers(details);

  let score: RoundScore;
  try {
    score = scoreRound({ topic, grade, tierBefore, ...summary, details });
  } catch (e) {
    if (e instanceof InvalidRoundError) throw new ValidationError(e.message);
    throw e;
  }

  const today = deps.clock.today();
  const sameDay = state.today.day === today;
  const bonusXp = dailyBonus(sameDay ? state.today.rounds : 0, sameDay && state.today.bonusClaimed);
  const streak = nextStreak({ streak: state.streak, lastPlayed: state.lastPlayed }, today).streak;

  const saved: SavedRound = {
    topic,
    grade,
    tierBefore,
    tierAfter: score.tierAfter,
    firstTry: summary.firstTry,
    secondTry: summary.secondTry,
    missed: summary.missed,
    bestCombo: summary.bestCombo,
    stars: score.stars,
    xpGained: score.xpGained,
    bonusXp,
    details,
    today,
    streak,
    newBadgeIds: [],
  };

  const snapshot = buildSnapshot(applyRound(state, saved), {
    perfectRound: score.perfect,
    bestCombo: summary.bestCombo,
  });
  const newBadges = newlyEarned(new Set(state.badges), snapshot);
  saved.newBadgeIds = newBadges.map((b) => b.id);

  const next = await deps.progress.saveRound(state.child.id, saved);
  return {
    state: next,
    score,
    bonusXp,
    newBadges,
    levelUp: levelInfo(next.xp).level > levelInfo(state.xp).level,
  };
}

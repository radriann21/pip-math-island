import type { Child, PlayerState, SavedRace, SavedRound } from './model';
import { progressKey } from './model';

/** A brand-new player: no xp, no progress, today untouched. */
export function emptyPlayer(child: Child, today: string): PlayerState {
  return {
    child,
    xp: 0,
    streak: 0,
    lastPlayed: null,
    roundsTotal: 0,
    raceBest: 0,
    progress: {},
    badges: [],
    today: { day: today, rounds: 0, bonusClaimed: false },
  };
}

function unionBadges(owned: readonly string[], added: readonly string[]): string[] {
  const out = [...owned];
  for (const id of added) if (!out.includes(id)) out.push(id);
  return out;
}

/**
 * Applies a saved round to a player state with the same semantics as the SQL function `record_round`:
 * topic totals accumulate, best stars is a max, tier takes tierAfter, the day counter and bonus flag
 * accumulate, xp grows by gained + bonus, streak is overwritten, last played never moves back, badges union.
 */
export function applyRound(state: PlayerState, r: SavedRound): PlayerState {
  const key = progressKey(r.grade, r.topic);
  const prev = state.progress[key];
  const answered = r.firstTry + r.secondTry + r.missed;
  const correct = r.firstTry + r.secondTry;
  const sameDay = state.today.day === r.today;
  return {
    ...state,
    progress: {
      ...state.progress,
      [key]: {
        tier: r.tierAfter,
        bestStars: prev ? (Math.max(prev.bestStars, r.stars) as typeof r.stars) : r.stars,
        answered: (prev?.answered ?? 0) + answered,
        correct: (prev?.correct ?? 0) + correct,
      },
    },
    today: {
      day: r.today,
      rounds: (sameDay ? state.today.rounds : 0) + 1,
      bonusClaimed: (sameDay && state.today.bonusClaimed) || r.bonusXp > 0,
    },
    xp: state.xp + r.xpGained + r.bonusXp,
    streak: r.streak,
    lastPlayed: state.lastPlayed !== null && state.lastPlayed > r.today ? state.lastPlayed : r.today,
    roundsTotal: state.roundsTotal + 1,
    badges: unionBadges(state.badges, r.newBadgeIds),
  };
}

/** Applies a saved race with the same semantics as the SQL function `record_race`. */
export function applyRace(state: PlayerState, r: SavedRace): PlayerState {
  return {
    ...state,
    raceBest: Math.max(state.raceBest, r.score),
    xp: state.xp + r.xpGained,
    badges: unionBadges(state.badges, r.newBadgeIds),
  };
}

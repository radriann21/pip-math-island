import type { PlayerSnapshot } from '@/domain/progression';
import type { PlayerState } from '../model';

/**
 * The facts badge rules need, derived from a player state. `perfectRound` and `bestCombo` describe the
 * round just played and are not stored, so the caller passes them in.
 */
export function buildSnapshot(
  state: PlayerState,
  extras: { perfectRound?: boolean; bestCombo?: number } = {},
): PlayerSnapshot {
  let totalStars = 0;
  let hasMaster = false;
  const topics = new Set<string>();
  for (const [key, p] of Object.entries(state.progress)) {
    totalStars += p.bestStars;
    if (p.bestStars >= 3) hasMaster = true;
    if (p.answered > 0) topics.add(key.slice(key.indexOf(':') + 1));
  }
  return {
    xp: state.xp,
    streak: state.streak,
    roundsTotal: state.roundsTotal,
    totalStars,
    topicsTried: topics.size,
    hasMaster,
    raceBest: state.raceBest,
    perfectRound: extras.perfectRound ?? false,
    bestCombo: extras.bestCombo ?? 0,
  };
}

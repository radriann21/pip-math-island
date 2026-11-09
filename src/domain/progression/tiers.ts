import type { Tier } from '../shared/types';

/** Difficulty tier for the next round: 9+ first-try answers moves up, 4 or fewer moves down. */
export function nextTier(tier: Tier, firstTry: number): Tier {
  if (firstTry >= 9) return Math.min(2, tier + 1) as Tier;
  if (firstTry <= 4) return Math.max(0, tier - 1) as Tier;
  return tier;
}

export const DAILY_GOAL_ROUNDS = 3;
export const DAILY_BONUS_XP = 30;

/**
 * Bonus XP for the round being finished. `todayRoundsBefore` counts today's rounds before this one;
 * the bonus is granted when this round reaches the goal and it was not claimed yet.
 */
export function dailyBonus(todayRoundsBefore: number, bonusClaimed: boolean): number {
  return !bonusClaimed && todayRoundsBefore + 1 >= DAILY_GOAL_ROUNDS ? DAILY_BONUS_XP : 0;
}

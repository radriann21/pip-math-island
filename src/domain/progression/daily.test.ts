import { describe, expect, it } from 'vitest';
import { DAILY_BONUS_XP, DAILY_GOAL_ROUNDS, dailyBonus } from './daily';

describe('daily goal', () => {
  it('has the contract constants', () => {
    expect(DAILY_GOAL_ROUNDS).toBe(3);
    expect(DAILY_BONUS_XP).toBe(30);
  });
  it('grants the bonus on the 3rd round of the day', () => {
    expect(dailyBonus(0, false)).toBe(0);
    expect(dailyBonus(1, false)).toBe(0);
    expect(dailyBonus(2, false)).toBe(30);
  });
  it('keeps granting only until claimed', () => {
    expect(dailyBonus(3, false)).toBe(30);
    expect(dailyBonus(2, true)).toBe(0);
    expect(dailyBonus(5, true)).toBe(0);
  });
});

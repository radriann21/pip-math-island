import { describe, expect, it } from 'vitest';
import { roundScoreValue, starsFor } from './stars';

describe('roundScoreValue', () => {
  it('counts a second-try answer as half a point', () => {
    expect(roundScoreValue(7, 3)).toBe(8.5);
    expect(roundScoreValue(10, 0)).toBe(10);
    expect(roundScoreValue(0, 0)).toBe(0);
  });
});

describe('starsFor', () => {
  it.each([
    [0, 0],
    [4, 0],
    [4.5, 0],
    [5, 1],
    [6, 1],
    [6.5, 1],
    [7, 2],
    [8, 2],
    [8.5, 2],
    [9, 3],
    [9.5, 3],
    [10, 3],
  ])('score %s gives %s stars', (score, stars) => {
    expect(starsFor(score)).toBe(stars);
  });
});

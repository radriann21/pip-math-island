import { describe, expect, it } from 'vitest';
import { InvalidRoundError, scoreRound } from './round';
import type { AnswerDetail, RoundOutcome } from './round';

function outcome(first: number, second: number, missed: number, tierBefore: 0 | 1 | 2 = 1): RoundOutcome {
  const details: AnswerDetail[] = [];
  let i = 0;
  for (let k = 0; k < first; k++) details.push({ index: i, prompt: `q${i++}`, correct: true, tries: 1 });
  for (let k = 0; k < second; k++) details.push({ index: i, prompt: `q${i++}`, correct: true, tries: 2 });
  for (let k = 0; k < missed; k++) details.push({ index: i, prompt: `q${i++}`, correct: false, tries: 2 });
  return { topic: 'add', grade: 2, tierBefore, firstTry: first, secondTry: second, missed, bestCombo: first, details };
}

describe('scoreRound', () => {
  it('scores a perfect round', () => {
    expect(scoreRound(outcome(10, 0, 0))).toEqual({ stars: 3, tierAfter: 2, xpGained: 135, perfect: true });
  });
  it('is not perfect with one second-try answer', () => {
    const s = scoreRound(outcome(9, 1, 0));
    expect(s.perfect).toBe(false);
    expect(s.stars).toBe(3); // 9.5
    expect(s.tierAfter).toBe(2);
  });
  it('lowers the tier on a poor round and gives zero stars', () => {
    const s = scoreRound(outcome(2, 2, 6, 1));
    expect(s.stars).toBe(0); // 3
    expect(s.tierAfter).toBe(0);
  });
  it('keeps the tier in the middle band', () => {
    const s = scoreRound(outcome(6, 2, 2, 1));
    expect(s.stars).toBe(2); // 7
    expect(s.tierAfter).toBe(1);
  });
  it('uses the stars thresholds from first and second tries', () => {
    expect(scoreRound(outcome(5, 0, 5)).stars).toBe(1);
    expect(scoreRound(outcome(4, 2, 4)).stars).toBe(1); // 5
    expect(scoreRound(outcome(4, 1, 5)).stars).toBe(0); // 4.5
    expect(scoreRound(outcome(6, 2, 2)).stars).toBe(2); // 7
    expect(scoreRound(outcome(6, 1, 3)).stars).toBe(1); // 6.5
    expect(scoreRound(outcome(8, 1, 1)).stars).toBe(2); // 8.5
    expect(scoreRound(outcome(8, 2, 0)).stars).toBe(3); // 9
  });
  it('clamps the tier at both ends', () => {
    expect(scoreRound(outcome(9, 1, 0, 2)).tierAfter).toBe(2);
    expect(scoreRound(outcome(0, 0, 10, 0)).tierAfter).toBe(0);
  });
  it('sums xp from the order of the details', () => {
    expect(scoreRound(outcome(0, 10, 0)).xpGained).toBe(50);
    expect(scoreRound(outcome(0, 0, 10)).xpGained).toBe(0);
  });

  describe('validation', () => {
    it('throws when the counts do not match the details length', () => {
      const bad = { ...outcome(5, 0, 5), firstTry: 6 };
      expect(() => scoreRound(bad)).toThrow(InvalidRoundError);
    });
    it('throws on negative or fractional counts', () => {
      expect(() => scoreRound({ ...outcome(5, 0, 5), missed: -1, firstTry: 6 })).toThrow(InvalidRoundError);
      expect(() => scoreRound({ ...outcome(5, 0, 5), firstTry: 5.5, secondTry: -0.5 })).toThrow(InvalidRoundError);
    });
    it('throws when the details disagree with the counts', () => {
      const o = outcome(5, 0, 5);
      const swapped: RoundOutcome = {
        ...o,
        details: o.details.map((x, i) => (i === 0 ? { ...x, tries: 2 as const } : x)),
      };
      expect(() => scoreRound(swapped)).toThrow(InvalidRoundError);
    });
    it('throws when a detail is impossible (first try but wrong)', () => {
      const o = outcome(1, 0, 0);
      const bad: RoundOutcome = {
        ...o,
        firstTry: 0,
        missed: 1,
        details: [{ index: 0, prompt: 'q', correct: false, tries: 1 }],
      };
      expect(() => scoreRound(bad)).toThrow(InvalidRoundError);
    });
    it('throws on an empty round', () => {
      expect(() => scoreRound(outcome(0, 0, 0))).toThrow(InvalidRoundError);
    });
    it('names the error', () => {
      try {
        scoreRound(outcome(0, 0, 0));
      } catch (e) {
        expect((e as Error).name).toBe('InvalidRoundError');
      }
    });
  });
});

import { describe, expect, it } from 'vitest';
import type { AnswerDetail } from './round';
import { answerXp, levelInfo, roundXp } from './xp';

const d = (index: number, correct: boolean, tries: 1 | 2): AnswerDetail => ({
  index,
  prompt: `q${index}`,
  correct,
  tries,
});

describe('answerXp', () => {
  it('gives 10 plus the combo for a first-try answer', () => {
    expect(answerXp({ correct: true, tries: 1 }, 0)).toBe(10);
    expect(answerXp({ correct: true, tries: 1 }, 3)).toBe(13);
  });
  it('caps the combo bonus at 5', () => {
    expect(answerXp({ correct: true, tries: 1 }, 5)).toBe(15);
    expect(answerXp({ correct: true, tries: 1 }, 9)).toBe(15);
  });
  it('gives 5 for a second-try answer and 0 for a miss', () => {
    expect(answerXp({ correct: true, tries: 2 }, 4)).toBe(5);
    expect(answerXp({ correct: false, tries: 2 }, 4)).toBe(0);
  });
});

describe('roundXp', () => {
  it('derives the combo from the order of the details', () => {
    // combo at that point: 0,1,2 -> 10,11,12
    expect(roundXp([d(0, true, 1), d(1, true, 1), d(2, true, 1)])).toBe(33);
  });
  it('resets the combo after a second-try answer or a miss', () => {
    // 10, 11, (5 resets), 10, (0 resets), 10
    expect(
      roundXp([d(0, true, 1), d(1, true, 1), d(2, true, 2), d(3, true, 1), d(4, false, 2), d(5, true, 1)]),
    ).toBe(10 + 11 + 5 + 10 + 0 + 10);
  });
  it('caps the combo bonus over a perfect round', () => {
    const perfect = Array.from({ length: 10 }, (_, i) => d(i, true, 1));
    // bonuses 0,1,2,3,4,5,5,5,5,5 = 35
    expect(roundXp(perfect)).toBe(100 + 35);
  });
  it('sorts by index so the order of the array does not matter', () => {
    const shuffled = [d(2, true, 1), d(0, true, 1), d(1, true, 1)];
    expect(roundXp(shuffled)).toBe(33);
  });
  it('is 0 for no details', () => {
    expect(roundXp([])).toBe(0);
  });
});

describe('levelInfo', () => {
  it('starts at level 1 with 0%', () => {
    expect(levelInfo(0)).toEqual({ level: 1, pct: 0, next: 60 });
  });
  it('stays at level 1 at 59 xp', () => {
    const info = levelInfo(59);
    expect(info.level).toBe(1);
    expect(info.next).toBe(1);
    expect(info.pct).toBeCloseTo((59 / 60) * 100, 6);
  });
  it('reaches level 2 at 60 xp', () => {
    // level 2 spans 60..240
    expect(levelInfo(60)).toEqual({ level: 2, pct: 0, next: 180 });
  });
  it('stays at level 2 at 239 xp and reaches level 3 at 240', () => {
    expect(levelInfo(239).level).toBe(2);
    expect(levelInfo(239).next).toBe(1);
    expect(levelInfo(240)).toEqual({ level: 3, pct: 0, next: 300 });
  });
  it('reaches level 5 at 960 xp', () => {
    expect(levelInfo(959).level).toBe(4);
    expect(levelInfo(960).level).toBe(5);
  });
  it('reports the percentage inside the level', () => {
    expect(levelInfo(150).pct).toBe(50);
  });
});

import { describe, expect, it } from 'vitest';
import { RACE_SECONDS, answerRace, initialRace, raceXp } from './race';

describe('race constants', () => {
  it('lasts 60 seconds', () => {
    expect(RACE_SECONDS).toBe(60);
  });
  it('gives 2 xp per correct answer', () => {
    expect(raceXp(0)).toBe(0);
    expect(raceXp(15)).toBe(30);
  });
});

describe('RaceTracker', () => {
  it('starts empty', () => {
    expect(initialRace()).toEqual({ score: 0, combo: 0, bestCombo: 0 });
  });
  it('counts correct answers and grows the combo', () => {
    let s = initialRace();
    s = answerRace(s, true);
    s = answerRace(s, true);
    expect(s).toEqual({ score: 2, combo: 2, bestCombo: 2 });
  });
  it('resets the combo on a wrong answer but keeps score and best combo', () => {
    let s = initialRace();
    for (const ok of [true, true, true, false, true]) s = answerRace(s, ok);
    expect(s).toEqual({ score: 4, combo: 1, bestCombo: 3 });
  });
  it('does not mutate the previous state', () => {
    const before = initialRace();
    answerRace(before, true);
    expect(before).toEqual({ score: 0, combo: 0, bestCombo: 0 });
  });
});

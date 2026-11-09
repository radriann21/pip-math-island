import { describe, expect, it } from 'vitest';
import { addDays, liveStreak, nextStreak } from './streak';

describe('addDays', () => {
  it('moves across month, year and leap-day boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2024-02-29', 1)).toBe('2024-03-01');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });
  it('rejects malformed dates', () => {
    expect(() => addDays('2026-13-01', 1)).toThrow(RangeError);
    expect(() => addDays('2026-02-30', 1)).toThrow(RangeError);
    expect(() => addDays('tomorrow', 1)).toThrow(RangeError);
  });
});

describe('nextStreak', () => {
  it('starts a streak on the first ever play', () => {
    expect(nextStreak({ streak: 0, lastPlayed: null }, '2026-05-10')).toEqual({ streak: 1, lastPlayed: '2026-05-10' });
  });
  it('leaves the streak unchanged on the same day', () => {
    expect(nextStreak({ streak: 4, lastPlayed: '2026-05-10' }, '2026-05-10')).toEqual({
      streak: 4,
      lastPlayed: '2026-05-10',
    });
  });
  it('adds one on a consecutive day', () => {
    expect(nextStreak({ streak: 4, lastPlayed: '2026-05-09' }, '2026-05-10')).toEqual({
      streak: 5,
      lastPlayed: '2026-05-10',
    });
  });
  it('resets to 1 after a gap', () => {
    expect(nextStreak({ streak: 9, lastPlayed: '2026-05-08' }, '2026-05-10')).toEqual({
      streak: 1,
      lastPlayed: '2026-05-10',
    });
  });
  it('continues across a month end', () => {
    expect(nextStreak({ streak: 2, lastPlayed: '2026-04-30' }, '2026-05-01').streak).toBe(3);
    expect(nextStreak({ streak: 2, lastPlayed: '2026-04-29' }, '2026-05-01').streak).toBe(1);
  });
  it('continues across a year end', () => {
    expect(nextStreak({ streak: 6, lastPlayed: '2026-12-31' }, '2027-01-01').streak).toBe(7);
  });
  it('continues across a leap day', () => {
    expect(nextStreak({ streak: 1, lastPlayed: '2024-02-28' }, '2024-02-29').streak).toBe(2);
    expect(nextStreak({ streak: 2, lastPlayed: '2024-02-29' }, '2024-03-01').streak).toBe(3);
    expect(nextStreak({ streak: 2, lastPlayed: '2024-02-28' }, '2024-03-01').streak).toBe(1);
  });
  it('treats March 1 as the day after February 28 in a non-leap year', () => {
    expect(nextStreak({ streak: 3, lastPlayed: '2026-02-28' }, '2026-03-01').streak).toBe(4);
  });
  it('resets when the clock goes backwards', () => {
    expect(nextStreak({ streak: 3, lastPlayed: '2026-05-10' }, '2026-05-08').streak).toBe(1);
  });
});

describe('liveStreak', () => {
  it('shows the streak if played today or yesterday', () => {
    expect(liveStreak(5, '2026-05-10', '2026-05-10')).toBe(5);
    expect(liveStreak(5, '2026-05-09', '2026-05-10')).toBe(5);
  });
  it('shows 0 when the streak has lapsed or never started', () => {
    expect(liveStreak(5, '2026-05-08', '2026-05-10')).toBe(0);
    expect(liveStreak(5, null, '2026-05-10')).toBe(0);
  });
  it('handles yesterday across a month end', () => {
    expect(liveStreak(3, '2026-04-30', '2026-05-01')).toBe(3);
  });
});

import { describe, expect, it } from 'vitest';
import { asRecord, clampInt, isTopicId, toGrade, toLocale, toStars, toTier } from './coerce';

describe('clampInt', () => {
  it('rounds, clamps and falls back for non numbers', () => {
    expect(clampInt(3.4, 0, 5, 0)).toBe(3);
    expect(clampInt(9, 0, 5, 0)).toBe(5);
    expect(clampInt(-2, 0, 5, 1)).toBe(0);
    expect(clampInt('4', 0, 5, 0)).toBe(4);
    expect(clampInt('abc', 0, 5, 2)).toBe(2);
    expect(clampInt(null, 0, 5, 2)).toBe(2);
    expect(clampInt(Number.NaN, 0, 5, 2)).toBe(2);
    expect(clampInt(Infinity, 0, 5, 2)).toBe(2);
  });
});

describe('domain coercions', () => {
  it('grade is 1..6', () => {
    expect([toGrade(0), toGrade(1), toGrade(6), toGrade(9), toGrade('x')]).toEqual([1, 1, 6, 6, 1]);
  });
  it('stars are 0..3 and tiers 0..2', () => {
    expect([toStars(-1), toStars(2), toStars(7)]).toEqual([0, 2, 3]);
    expect([toTier(-1), toTier(1), toTier(7)]).toEqual([0, 1, 2]);
  });
  it('locale defaults to en', () => {
    expect([toLocale('es'), toLocale('en'), toLocale('fr'), toLocale(null)]).toEqual(['es', 'en', 'en', 'en']);
  });
  it('recognises topic ids', () => {
    expect(isTopicId('add')).toBe(true);
    expect(isTopicId('word')).toBe(true);
    expect(isTopicId('nope')).toBe(false);
    expect(isTopicId(3)).toBe(false);
  });
});

describe('asRecord', () => {
  it('accepts plain objects only', () => {
    expect(asRecord({ a: 1 })).toEqual({ a: 1 });
    expect(asRecord(null)).toBeNull();
    expect(asRecord([1])).toBeNull();
    expect(asRecord('x')).toBeNull();
  });
});

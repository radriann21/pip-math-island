import { describe, expect, it } from 'vitest';
import { atGrade, atTier, roundTo } from './math';

describe('table helpers', () => {
  it('atGrade reads one-based grade rows', () => {
    expect(atGrade(['a', 'b', 'c', 'd', 'e', 'f'], 1)).toBe('a');
    expect(atGrade(['a', 'b', 'c', 'd', 'e', 'f'], 6)).toBe('f');
  });
  it('atTier reads zero-based tier columns', () => {
    expect(atTier([10, 20, 30], 0)).toBe(10);
    expect(atTier([10, 20, 30], 2)).toBe(30);
  });
  it('throws on a table that is too short', () => {
    expect(() => atGrade(['a'], 3)).toThrow();
  });
  it('roundTo stays exported', () => {
    expect(roundTo(1.234, 1)).toBe(1.2);
  });
});

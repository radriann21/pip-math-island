import { describe, expect, it } from 'vitest';
import { atGrade, atTier, gcd, lcm, roundTo } from './math';

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

describe('gcd and lcm', () => {
  it('gcd finds the greatest common divisor', () => {
    expect(gcd(12, 18)).toBe(6);
    expect(gcd(7, 5)).toBe(1);
    expect(gcd(9, 0)).toBe(9);
  });
  it('lcm finds the least common multiple', () => {
    expect(lcm(4, 6)).toBe(12);
    expect(lcm(3, 5)).toBe(15);
    expect(lcm(2, 4)).toBe(4);
  });
});

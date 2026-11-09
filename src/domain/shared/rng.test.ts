import { describe, expect, it } from 'vitest';
import { createSeededRng, pick, randInt, shuffle } from './rng';

describe('createSeededRng', () => {
  it('is deterministic for the same seed', () => {
    const a = createSeededRng(42);
    const b = createSeededRng(42);
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = createSeededRng(1);
    const b = createSeededRng(2);
    expect(Array.from({ length: 5 }, () => a())).not.toEqual(Array.from({ length: 5 }, () => b()));
  });

  it('returns values in [0, 1)', () => {
    const rng = createSeededRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('randInt', () => {
  it('includes both bounds and stays inside them', () => {
    const rng = createSeededRng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const v = randInt(rng, 2, 5);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(5);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([2, 3, 4, 5]);
  });

  it('returns the bound when min equals max', () => {
    expect(randInt(createSeededRng(1), 4, 4)).toBe(4);
  });
});

describe('pick', () => {
  it('returns an element of the array', () => {
    const items = ['a', 'b', 'c'] as const;
    const rng = createSeededRng(9);
    for (let i = 0; i < 50; i++) expect(items).toContain(pick(rng, items));
  });

  it('throws on an empty array', () => {
    expect(() => pick(createSeededRng(1), [])).toThrow();
  });
});

describe('shuffle', () => {
  it('returns a permutation of the input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffle(createSeededRng(11), input);
    expect(out).toHaveLength(input.length);
    expect([...out].sort((x, y) => x - y)).toEqual(input);
  });

  it('does not mutate the input and returns a new array', () => {
    const input = [1, 2, 3, 4, 5];
    const copy = [...input];
    const out = shuffle(createSeededRng(5), input);
    expect(input).toEqual(copy);
    expect(out).not.toBe(input);
  });

  it('is deterministic for the same seed', () => {
    const input = [1, 2, 3, 4, 5, 6];
    expect(shuffle(createSeededRng(8), input)).toEqual(shuffle(createSeededRng(8), input));
  });
});

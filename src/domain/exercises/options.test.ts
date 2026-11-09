import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../shared/rng';
import type { GenContext } from '../shared/types';
import {
  arithmeticQuestion,
  choiceQuestion,
  makeQuestion,
  numberChoiceQuestion,
  numberOptions,
  numericQuestion,
} from './options';

const ctx = (grade: GenContext['grade'], tier: GenContext['tier'], seed = 1): GenContext => ({
  grade,
  tier,
  locale: 'en',
  rng: createSeededRng(seed),
});

describe('numberOptions', () => {
  it('returns 4 unique non-negative numbers including the answer', () => {
    for (let seed = 1; seed <= 100; seed++) {
      for (const [answer, decimals] of [[0, false], [3, false], [57, false], [12.4, true], [0.5, true]] as const) {
        const opts = numberOptions(createSeededRng(seed), answer, decimals);
        expect(opts).toHaveLength(4);
        expect(new Set(opts).size).toBe(4);
        expect(opts).toContain(answer);
        expect(opts.every((o) => o >= 0)).toBe(true);
      }
    }
  });
  it('is deterministic for a seed', () => {
    expect(numberOptions(createSeededRng(9), 20, false)).toEqual(numberOptions(createSeededRng(9), 20, false));
  });
});

describe('makeQuestion', () => {
  it('fills in defaults', () => {
    const q = makeQuestion({ kind: 'num', prompt: 'p', answer: 1 });
    expect(q).toEqual({ kind: 'num', prompt: 'p', vis: '', hint: '', why: '', answer: 1, decimal: false });
  });
});

describe('choiceQuestion', () => {
  it('keeps the answer, drops duplicates and caps at 4 options', () => {
    const q = choiceQuestion(createSeededRng(3), {
      prompt: 'p',
      answer: 'A',
      wrong: ['B', 'B', 'A', 'C', 'D', 'E'],
      hint: 'h',
      why: 'w',
    });
    expect(q.kind).toBe('choice');
    expect(q.opts).toHaveLength(4);
    expect(new Set(q.opts).size).toBe(4);
    expect(q.opts).toContain('A');
  });
});

describe('numberChoiceQuestion', () => {
  it('formats the answer and options with the locale', () => {
    const c = { ...ctx(1, 0), locale: 'es' as const };
    const q = numberChoiceQuestion(c, { prompt: 'p', answer: 1500, hint: 'h', why: 'w' });
    expect(q.answer).toBe('1500');
    expect(q.opts).toContain('1500');
    expect(q.opts).toHaveLength(4);
  });
  it('supports decimals', () => {
    const q = numberChoiceQuestion(ctx(2, 0), { prompt: 'p', answer: 2.5, decimals: true, hint: 'h', why: 'w' });
    expect(q.answer).toBe('2.5');
    expect(q.opts).toContain('2.5');
  });
});

describe('numericQuestion', () => {
  it('builds a keypad question', () => {
    const q = numericQuestion({ prompt: 'p', answer: 3.5, decimal: true, hint: 'h', why: 'w' });
    expect(q).toMatchObject({ kind: 'num', answer: 3.5, decimal: true });
    expect(q.opts).toBeUndefined();
  });
});

describe('arithmeticQuestion', () => {
  const spec = { prompt: 'p', answer: 10, hint: 'h', why: 'w' };
  it('uses choices for grades 1 and 2', () => {
    expect(arithmeticQuestion(ctx(1, 2), spec).kind).toBe('choice');
    expect(arithmeticQuestion(ctx(2, 2), spec).kind).toBe('choice');
  });
  it('uses choices for grade 3 only at tier 0', () => {
    expect(arithmeticQuestion(ctx(3, 0), spec).kind).toBe('choice');
    expect(arithmeticQuestion(ctx(3, 1), spec).kind).toBe('num');
  });
  it('uses the keypad from grade 4', () => {
    expect(arithmeticQuestion(ctx(4, 0), spec).kind).toBe('num');
    expect(arithmeticQuestion(ctx(6, 2), spec).kind).toBe('num');
  });
});

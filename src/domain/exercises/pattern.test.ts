import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../shared/rng';
import type { GenContext, Grade, Locale, Tier } from '../shared/types';
import { EMPTY_BOX } from './markup';
import {
  buildAlgebra,
  buildMissingNumber,
  buildSequenceQuestion,
  patternTopic,
  sequenceTerms,
} from './pattern';
import { sequenceBoxes } from './visuals';

const ctx = (grade: Grade, tier: Tier, seed: number, locale: Locale = 'en'): GenContext => ({
  grade,
  tier,
  locale,
  rng: createSeededRng(seed),
});
const GRADES: Grade[] = [1, 2, 3, 4, 5, 6];
const TIERS: Tier[] = [0, 1, 2];
const num = (s: string | number) => Number(String(s).replace(/,/g, ''));
/** Cells of a `sequenceBoxes` drawing; the hidden one is "?". */
const cells = (vis: string) => [...vis.matchAll(/<b(?: class="q")?>([^<]*)<\/b>/g)].map((m) => m[1]!);

describe('sequenceTerms', () => {
  it('builds arithmetic and geometric terms', () => {
    expect(sequenceTerms(3, { kind: 'add', step: 4 })).toEqual([3, 7, 11, 15, 19]);
    expect(sequenceTerms(20, { kind: 'add', step: -5 })).toEqual([20, 15, 10, 5, 0]);
    expect(sequenceTerms(2, { kind: 'multiply', factor: 3 })).toEqual([2, 6, 18, 54, 162]);
  });
  it('rejects sequences that go negative or repeat a term', () => {
    expect(() => sequenceTerms(5, { kind: 'add', step: -2 })).toThrow();
    expect(() => sequenceTerms(4, { kind: 'add', step: 0 })).toThrow();
    expect(() => sequenceTerms(4, { kind: 'multiply', factor: 1 })).toThrow();
    expect(() => sequenceTerms(0, { kind: 'multiply', factor: 2 })).toThrow();
  });
});

describe('buildSequenceQuestion', () => {
  it('answers the hidden term and draws the boxes', () => {
    const rule = { kind: 'add', step: 5 } as const;
    const terms = sequenceTerms(10, rule);
    const q = buildSequenceQuestion(ctx(2, 0, 1), terms, 3, rule);
    expect(q.kind).toBe('choice');
    expect(q.answer).toBe('25');
    expect(q.vis).toBe(sequenceBoxes('en', terms, 3));
    expect(q.why).toBe('Each step adds 5, so the missing number is 25.');
    expect(buildSequenceQuestion(ctx(2, 0, 1, 'es'), terms, 3, rule).why).toBe(
      'Cada paso suma 5, así que el número que falta es 25.',
    );
  });
  it('describes subtracting and multiplying rules', () => {
    const down = { kind: 'add', step: -5 } as const;
    expect(buildSequenceQuestion(ctx(3, 1, 1), sequenceTerms(30, down), 2, down).why).toBe(
      'Each step subtracts 5, so the missing number is 20.',
    );
    const up = { kind: 'multiply', factor: 2 } as const;
    const q = buildSequenceQuestion(ctx(4, 1, 1), sequenceTerms(3, up), 4, up);
    expect(q.kind).toBe('num');
    expect(q.answer).toBe(48);
    expect(q.why).toBe('Each step multiplies by 2, so the missing number is 48.');
  });
  it('rejects terms that do not follow the rule or a hidden first term', () => {
    expect(() => buildSequenceQuestion(ctx(2, 0, 1), [1, 2, 4, 5, 6], 1, { kind: 'add', step: 1 })).toThrow();
    expect(() => buildSequenceQuestion(ctx(2, 0, 1), [1, 2, 3, 4, 5], 0, { kind: 'add', step: 1 })).toThrow();
  });
});

describe('equation builders', () => {
  it('buildMissingNumber covers the four inverse operations', () => {
    const addend = buildMissingNumber(ctx(5, 0, 1), { kind: 'addend', missing: 7, other: 5 });
    expect(addend.prompt).toBe(`${EMPTY_BOX} + 5 = 12`);
    expect(addend.answer).toBe(7);
    const subtrahend = buildMissingNumber(ctx(5, 0, 1), { kind: 'subtrahend', missing: 4, difference: 9 });
    expect(subtrahend.prompt).toBe(`13 − ${EMPTY_BOX} = 9`);
    expect(subtrahend.answer).toBe(4);
    const factor = buildMissingNumber(ctx(5, 0, 1), { kind: 'factor', missing: 6, other: 4 });
    expect(factor.prompt).toBe(`4 × ${EMPTY_BOX} = 24`);
    expect(factor.answer).toBe(6);
    const dividend = buildMissingNumber(ctx(5, 0, 1), { kind: 'dividend', divisor: 4, quotient: 6 });
    expect(dividend.prompt).toBe(`${EMPTY_BOX} ÷ 4 = 6`);
    expect(dividend.answer).toBe(24);
    expect(dividend.why).toBe('6 × 4 = 24');
    expect(factor.kind).toBe('num');
    expect(factor.decimal).toBe(false);
  });
  it('buildAlgebra covers one- and two-step equations', () => {
    expect(buildAlgebra(ctx(6, 0, 1), { kind: 'add', x: 7, b: 5 })).toMatchObject({ prompt: 'x + 5 = 12', answer: 7 });
    expect(buildAlgebra(ctx(6, 0, 1), { kind: 'multiply', x: 7, m: 3 })).toMatchObject({ prompt: '3x = 21', answer: 7 });
    expect(buildAlgebra(ctx(6, 0, 1), { kind: 'twoStep', x: 7, m: 3, b: 4 })).toMatchObject({
      prompt: '3x + 4 = 25',
      answer: 7,
    });
    expect(buildAlgebra(ctx(6, 0, 1), { kind: 'divide', m: 3, quotient: 7 })).toMatchObject({
      prompt: 'x ÷ 3 = 7',
      answer: 21,
    });
    expect(buildAlgebra(ctx(6, 0, 1, 'es'), { kind: 'twoStep', x: 7, m: 3, b: 4 }).hint).toBe(
      'Primero resta y luego divide.',
    );
  });
});

describe('patternTopic correctness (English prompts)', () => {
  const seen = new Set<string>();
  for (const grade of GRADES) {
    for (const tier of TIERS) {
      for (let seed = 1; seed <= 150; seed++) {
        const q = patternTopic.generate(ctx(grade, tier, seed));
        const p = q.prompt;
        const tag = `g${grade}/t${tier}/seed${seed}: ${p}`;
        if (p === 'What number goes in the empty box?') {
          expect(grade, tag).toBeLessThanOrEqual(4);
          const labels = cells(q.vis);
          const hide = labels.indexOf('?');
          expect(labels, tag).toHaveLength(5);
          expect(hide, tag).toBeGreaterThanOrEqual(1);
          expect(labels.filter((l) => l === '?'), tag).toHaveLength(1);
          const v = labels.map((l) => (l === '?' ? NaN : num(l)));
          const visible = v.map((x, i) => [x, i] as const).filter(([x]) => !Number.isNaN(x));
          expect(visible.every(([x]) => x >= 0), tag).toBe(true);
          // the rule must be recoverable from the visible cells
          const [a, ai] = visible[0]!;
          const [b, bi] = visible[1]!;
          const diff = (b - a) / (bi - ai);
          const arithmetic = visible.every(([x, i]) => x === a + diff * (i - ai));
          const ratio = Math.pow(b / a, 1 / (bi - ai));
          const geometric = a > 0 && visible.every(([x, i]) => Math.abs(x - a * ratio ** (i - ai)) < 1e-9);
          expect(arithmetic || geometric, tag).toBe(true);
          const expected = arithmetic ? a + diff * (hide - ai) : a * ratio ** (hide - ai);
          expect(Math.abs(num(q.answer) - expected), tag).toBeLessThan(1e-9);
          // no repeated terms: a clamped or flat sequence would make the gap ambiguous
          const all = [...v];
          all[hide] = num(q.answer);
          expect(new Set(all).size, tag).toBe(5);
          seen.add(arithmetic ? (diff < 0 ? 'descending' : 'ascending') : 'geometric');
        } else if (q.prompt.includes(EMPTY_BOX)) {
          seen.add('missing');
          expect(grade, tag).toBe(5);
          const filled = p.replace(EMPTY_BOX, String(q.answer));
          const m = /^(\d+) ([+−×÷]) (\d+) = (\d+)$/.exec(filled);
          expect(m, tag).not.toBeNull();
          const [a, b, c] = [Number(m![1]), Number(m![3]), Number(m![4])];
          const result = { '+': a + b, '−': a - b, '×': a * b, '÷': a / b }[m![2] as '+' | '−' | '×' | '÷'];
          expect(result, tag).toBe(c);
          expect(q.kind, tag).toBe('num');
        } else {
          seen.add('algebra');
          expect(grade, tag).toBe(6);
          const x = Number(q.answer);
          let m: RegExpExecArray | null;
          if ((m = /^x \+ (\d+) = (\d+)$/.exec(p))) expect(x + Number(m[1]), tag).toBe(Number(m[2]));
          else if ((m = /^(\d+)x = (\d+)$/.exec(p))) expect(Number(m[1]) * x, tag).toBe(Number(m[2]));
          else if ((m = /^(\d+)x \+ (\d+) = (\d+)$/.exec(p))) expect(Number(m[1]) * x + Number(m[2]), tag).toBe(Number(m[3]));
          else if ((m = /^x ÷ (\d+) = (\d+)$/.exec(p))) expect(x / Number(m[1]), tag).toBe(Number(m[2]));
          else throw new Error(`unrecognised pattern prompt: ${p}`);
        }
      }
    }
  }
  it('covers every question type', () => {
    expect([...seen].sort()).toEqual(['algebra', 'ascending', 'descending', 'geometric', 'missing']);
  });
});

describe('patternTopic by grade', () => {
  it('never descends outside grade 3', () => {
    for (let seed = 1; seed <= 200; seed++) {
      for (const grade of [1, 2, 4] as Grade[]) {
        const labels = cells(patternTopic.generate(ctx(grade, 1, seed)).vis).map(num);
        const known = labels.filter((x) => !Number.isNaN(x));
        const descending = known[0]! > known[known.length - 1]!;
        expect(descending, `grade ${grade}`).toBe(false);
      }
    }
  });
  it('speaks Spanish', () => {
    expect(patternTopic.generate(ctx(1, 0, 1, 'es')).prompt).toBe('¿Qué número va en el recuadro vacío?');
  });
});

describe('patternTopic metadata', () => {
  it('matches the prototype table', () => {
    expect(patternTopic).toMatchObject({
      id: 'pattern',
      accent: '#f06a3c',
      title: { en: 'Patterns & Puzzles', es: 'Patrones y acertijos' },
    });
    expect(patternTopic.generate(ctx(1, 0, 1)).topic).toBe('pattern');
  });
});

import { describe, expect, it } from 'vitest';
import { gcd } from '../shared/math';
import { createSeededRng } from '../shared/rng';
import type { GenContext, Grade, Locale, Tier } from '../shared/types';
import {
  buildAddSameDenominator,
  buildAddUnlike,
  buildCompareFractions,
  buildEquivalentFraction,
  buildFractionOfNumber,
  buildIdentifyFraction,
  buildSimplify,
  fracTopic,
  sameFractionValue,
} from './frac';
import { fraction } from './markup';
import { bar, pie } from './visuals';

const ctx = (grade: Grade, tier: Tier, seed: number, locale: Locale = 'en'): GenContext => ({
  grade,
  tier,
  locale,
  rng: createSeededRng(seed),
});
const GRADES: Grade[] = [1, 2, 3, 4, 5, 6];
const TIERS: Tier[] = [0, 1, 2];

type Fraction = [number, number];
const FRACTION_MARKUP = /<span class="fr"><i>(\d+|\?)<\/i><i>(\d+)<\/i><\/span>/g;

/** Every fraction in a string; the unknown "?" numerator is returned as -1. */
function fractionsIn(text: string): Fraction[] {
  return [...text.matchAll(FRACTION_MARKUP)].map((m) => [m[1] === '?' ? -1 : Number(m[1]), Number(m[2])]);
}
function parseLabel(label: string): Fraction {
  const found = fractionsIn(label);
  expect(found, label).toHaveLength(1);
  return found[0]!;
}
/** Independent equality by cross-multiplication. */
const equalValue = (a: Fraction, b: Fraction) => a[0] * b[1] === b[0] * a[1];
const lowestTerms = (f: Fraction) => gcd(f[0], f[1]) === 1;
const optionFractions = (opts: readonly string[] | undefined) => (opts ?? []).map(parseLabel);

describe('sameFractionValue', () => {
  it('compares by cross-multiplication', () => {
    expect(sameFractionValue([1, 2], [2, 4])).toBe(true);
    expect(sameFractionValue([3, 4], [4, 5])).toBe(false);
  });
});

describe('buildIdentifyFraction', () => {
  it('answers n/d, draws the pie and offers exactly one value-equal option', () => {
    for (let den = 2; den <= 10; den++) {
      for (let n = 1; n < den; n++) {
        const q = buildIdentifyFraction(ctx(2, 0, 1), n, den);
        expect(q.answer).toBe(fraction(n, den));
        expect(q.vis).toBe(pie(n, den));
        const opts = optionFractions(q.opts);
        expect(opts.length).toBeGreaterThanOrEqual(2);
        expect(opts.filter((o) => equalValue(o, [n, den]))).toHaveLength(1);
      }
    }
  });
  it('can draw a bar instead of a pie', () => {
    const q = buildIdentifyFraction(ctx(1, 0, 1), 2, 3, 'bar');
    expect(q.vis).toBe(bar(2, 3));
    expect(q.prompt).toBe('What fraction of the bar is colored?');
    expect(buildIdentifyFraction(ctx(1, 0, 1, 'es'), 2, 3, 'bar').prompt).toBe(
      '¿Qué fracción de la barra está coloreada?',
    );
    expect(optionFractions(q.opts).filter((o) => equalValue(o, [2, 3]))).toHaveLength(1);
  });
  it('rejects a fraction that is not between 0 and 1', () => {
    expect(() => buildIdentifyFraction(ctx(2, 0, 1), 4, 4)).toThrow();
    expect(() => buildIdentifyFraction(ctx(2, 0, 1), 0, 4)).toThrow();
  });
  it('explains in both languages', () => {
    expect(buildIdentifyFraction(ctx(1, 0, 1), 1, 4).why).toBe('1 of 4 equal parts are colored.');
    expect(buildIdentifyFraction(ctx(1, 0, 1, 'es'), 1, 4).why).toBe('1 de 4 partes iguales están coloreadas.');
  });
});

describe('buildCompareFractions', () => {
  it('answers the bigger fraction and offers just the two bars', () => {
    const q = buildCompareFractions(ctx(3, 0, 1), [3, 8], [5, 8]);
    expect(q.answer).toBe(fraction(5, 8));
    expect([...(q.opts ?? [])].sort()).toEqual([fraction(3, 8), fraction(5, 8)].sort());
    expect(q.vis).toContain(bar(3, 8));
    expect(q.vis).toContain(bar(5, 8));
    expect(buildCompareFractions(ctx(3, 1, 1), [1, 2], [1, 5]).answer).toBe(fraction(1, 2));
  });
  it('uses the matching hint for equal numerators or denominators', () => {
    expect(buildCompareFractions(ctx(3, 0, 1), [3, 8], [5, 8]).hint).toContain('Same bottom number');
    expect(buildCompareFractions(ctx(3, 1, 1), [1, 3], [1, 6]).hint).toContain('Same top number');
  });
  it('rejects two fractions of equal value', () => {
    expect(() => buildCompareFractions(ctx(3, 0, 1), [1, 2], [2, 4])).toThrow();
  });
});

describe('equivalent and same-denominator builders', () => {
  it('buildEquivalentFraction multiplies top and bottom by k', () => {
    const q = buildEquivalentFraction(ctx(4, 0, 1), 2, 3, 4);
    expect(q.kind).toBe('num');
    expect(q.answer).toBe(8);
    expect(fractionsIn(q.prompt)).toEqual([
      [2, 3],
      [-1, 12],
    ]);
  });
  it('buildAddSameDenominator keeps the denominator and adds the numerators', () => {
    const q = buildAddSameDenominator(ctx(4, 0, 1), 3, 4, 9);
    expect(q.answer).toBe(7);
    expect(fractionsIn(q.prompt)).toEqual([
      [3, 9],
      [4, 9],
      [-1, 9],
    ]);
  });
  it('buildFractionOfNumber divides by the denominator then multiplies', () => {
    const q = buildFractionOfNumber(ctx(5, 0, 1), 3, 4, 5);
    expect(q.answer).toBe(15);
    expect(q.prompt).toContain('20');
    expect(buildFractionOfNumber(ctx(5, 0, 1, 'es'), 3, 4, 5).prompt).toContain('¿Cuánto es');
  });
});

describe('buildAddUnlike', () => {
  const cases: [Fraction, Fraction][] = [];
  for (const [b, e] of [
    [2, 3],
    [2, 5],
    [3, 4],
    [3, 5],
    [2, 4],
    [4, 8],
    [5, 10],
  ] as const) {
    for (let c = 1; c < e; c++) cases.push([[1, b], [c, e]]);
  }
  it('answers the exact sum over the common denominator with one value-equal option', () => {
    for (const [x, y] of cases) {
      const q = buildAddUnlike(ctx(6, 1, 1), x, y);
      const sum: Fraction = [x[0] * y[1] + y[0] * x[1], x[1] * y[1]];
      const answer = parseLabel(String(q.answer));
      expect(equalValue(answer, sum), `${x}+${y}`).toBe(true);
      // the common denominator is the least one, so e.g. 1/2 + 1/4 is shown over 4
      expect(answer[1]).toBe((x[1] * y[1]) / gcd(x[1], y[1]));
      expect(optionFractions(q.opts).filter((o) => equalValue(o, sum)), `${x}+${y}`).toHaveLength(1);
    }
  });
  it('shows the sum in the prompt', () => {
    expect(fractionsIn(buildAddUnlike(ctx(6, 0, 1), [1, 2], [1, 3]).prompt)).toEqual([
      [1, 2],
      [1, 3],
    ]);
    expect(buildAddUnlike(ctx(6, 0, 1), [1, 2], [1, 3]).answer).toBe(fraction(5, 6));
  });
});

describe('buildSimplify', () => {
  it('answers the lowest terms and offers exactly one equal fraction', () => {
    const pairs: Fraction[] = [
      [1, 2],
      [2, 3],
      [3, 4],
      [1, 3],
      [2, 5],
      [3, 5],
      [1, 4],
      [3, 8],
      [5, 6],
    ];
    for (const p of pairs) {
      for (let k = 2; k <= 5; k++) {
        const q = buildSimplify(ctx(6, 0, 1), p, k);
        expect(q.answer).toBe(fraction(p[0], p[1]));
        expect(fractionsIn(q.prompt)).toEqual([[p[0] * k, p[1] * k]]);
        const equal = optionFractions(q.opts).filter((o) => equalValue(o, p));
        expect(equal).toHaveLength(1);
        expect(lowestTerms(equal[0]!)).toBe(true);
      }
    }
  });
  it('rejects a fraction that is already reducible', () => {
    expect(() => buildSimplify(ctx(6, 0, 1), [2, 4], 2)).toThrow();
  });
});

describe('fracTopic correctness (English prompts)', () => {
  const seen = new Set<string>();
  for (const grade of GRADES) {
    for (const tier of TIERS) {
      for (let seed = 1; seed <= 120; seed++) {
        const q = fracTopic.generate(ctx(grade, tier, seed));
        const tag = `g${grade}/t${tier}/seed${seed}: ${q.prompt}`;
        const found = fractionsIn(q.prompt);
        let m: RegExpExecArray | null;
        if (/^What fraction of the (circle|bar) is colored\?$/.test(q.prompt)) {
          seen.add('id');
          const answer = parseLabel(String(q.answer));
          expect(q.vis, tag).toBe(q.prompt.includes('circle') ? pie(answer[0], answer[1]) : bar(answer[0], answer[1]));
          expect(optionFractions(q.opts).filter((o) => equalValue(o, answer)), tag).toHaveLength(1);
        } else if (q.prompt === 'Which fraction is bigger?') {
          seen.add('cmp');
          const [first, second] = optionFractions(q.opts);
          const answer = parseLabel(String(q.answer));
          const other = equalValue(first!, answer) ? second! : first!;
          expect(q.opts, tag).toHaveLength(2);
          expect(answer[0] * other[1], tag).toBeGreaterThan(other[0] * answer[1]);
          expect(q.vis, tag).toContain(bar(answer[0], answer[1]));
        } else if (/=/.test(q.prompt) && found.length === 2 && !q.prompt.includes('+')) {
          seen.add('equiv');
          const [a, b] = found;
          expect(b![0]).toBe(-1);
          expect(Number(q.answer) * a![1], tag).toBe(a![0] * b![1]);
        } else if (found.length === 3 && q.kind === 'num') {
          seen.add('addSame');
          const [a, b, c] = found;
          expect(a![1]).toBe(b![1]);
          expect(c![1]).toBe(a![1]);
          expect(Number(q.answer), tag).toBe(a![0] + b![0]);
        } else if ((m = /^What is .* of (\d+)\?$/.exec(q.prompt))) {
          seen.add('ofnum');
          const [f] = found;
          const total = Number(m[1]);
          expect(total % f![1], tag).toBe(0);
          expect(Number(q.answer) * f![1], tag).toBe(f![0] * total);
        } else if (found.length === 2 && q.prompt.includes('+')) {
          seen.add('addUnlike');
          const [x, y] = found;
          const sum: Fraction = [x![0] * y![1] + y![0] * x![1], x![1] * y![1]];
          expect(optionFractions(q.opts).filter((o) => equalValue(o, sum)), tag).toHaveLength(1);
          expect(equalValue(parseLabel(String(q.answer)), sum), tag).toBe(true);
        } else if (/^Write .* in simplest form\.$/.test(q.prompt)) {
          seen.add('simplify');
          const [f] = found;
          const equal = optionFractions(q.opts).filter((o) => equalValue(o, f!));
          expect(equal, tag).toHaveLength(1);
          expect(lowestTerms(equal[0]!), tag).toBe(true);
          expect(q.answer, tag).toBe(fraction(equal[0]![0], equal[0]![1]));
        } else {
          throw new Error(`unrecognised fraction prompt: ${q.prompt}`);
        }
      }
    }
  }
  it('covers every question type', () => {
    expect([...seen].sort()).toEqual(['addSame', 'addUnlike', 'cmp', 'equiv', 'id', 'ofnum', 'simplify']);
  });
});

describe('fracTopic by grade', () => {
  it('only asks to identify a coloured fraction in grade 1, with simple denominators on tier 0', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const q = fracTopic.generate(ctx(1, 0, seed));
      expect(q.prompt).toMatch(/^What fraction of the (circle|bar) is colored\?$/);
      expect([2, 4]).toContain(parseLabel(String(q.answer))[1]);
    }
  });
  it('speaks Spanish', () => {
    const q = fracTopic.generate(ctx(1, 0, 1, 'es'));
    expect(q.prompt).toMatch(/^¿Qué fracción (del círculo|de la barra) está coloreada\?$/);
  });
});

describe('fracTopic metadata', () => {
  it('matches the prototype table', () => {
    expect(fracTopic).toMatchObject({
      id: 'frac',
      accent: '#4c8dff',
      title: { en: 'Fractions', es: 'Fracciones' },
    });
    expect(fracTopic.generate(ctx(1, 0, 1)).topic).toBe('frac');
  });
});

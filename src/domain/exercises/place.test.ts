import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../shared/rng';
import type { GenContext, Grade, Locale, Tier } from '../shared/types';
import {
  buildBlocks,
  buildCompareDecimals,
  buildCompareWithSymbols,
  buildDecimalDigitValue,
  buildDecimalRounding,
  buildDigitValue,
  buildRounding,
  distinctDigits,
  placeTopic,
  roundHalfUp,
} from './place';
import { baseTenBlocks } from './visuals';

const ctx = (grade: Grade, tier: Tier, seed: number, locale: Locale = 'en'): GenContext => ({
  grade,
  tier,
  locale,
  rng: createSeededRng(seed),
});
const GRADES: Grade[] = [1, 2, 3, 4, 5, 6];
const TIERS: Tier[] = [0, 1, 2];
/** English label ("1,234.5") to number. */
const num = (s: string | number) => Number(String(s).replace(/,/g, ''));

describe('roundHalfUp', () => {
  it('rounds to the nearest multiple, halves going up', () => {
    expect(roundHalfUp(1234, 100)).toBe(1200);
    expect(roundHalfUp(1250, 100)).toBe(1300);
    expect(roundHalfUp(45, 10)).toBe(50);
    expect(roundHalfUp(44, 10)).toBe(40);
    expect(roundHalfUp(5, 10)).toBe(10);
    expect(roundHalfUp(30, 10)).toBe(30);
  });
});

describe('buildBlocks', () => {
  it('answers the number drawn with base-ten blocks and explains the places', () => {
    const q = buildBlocks(ctx(2, 0, 1), 247);
    expect(q.kind).toBe('num');
    expect(q.answer).toBe(247);
    expect(q.vis).toBe(baseTenBlocks(247));
    expect(q.why).toBe('2 hundreds, 4 tens, 7 ones = 247');
    expect(buildBlocks(ctx(2, 0, 1, 'es'), 47).why).toBe('0 centenas, 4 decenas, 7 unidades = 47');
  });
});

describe('distinctDigits', () => {
  it('returns distinct digits with a non-zero leading digit', () => {
    for (let seed = 1; seed <= 60; seed++) {
      for (const len of [3, 4, 6]) {
        const digits = distinctDigits(createSeededRng(seed), len);
        expect(digits).toHaveLength(len);
        expect(new Set(digits).size).toBe(len);
        expect(digits[0]).not.toBe(0);
      }
    }
  });
});

describe('buildDigitValue', () => {
  it('asks for the place value of one digit', () => {
    const q = buildDigitValue(ctx(3, 0, 1), [4, 0, 7, 2], 2);
    expect(q.prompt).toBe('What is the value of the digit 7 in 4,072?');
    expect(q.answer).toBe('70');
    const matches = (q.opts ?? []).filter((o) => num(o) === 70);
    expect(matches).toEqual(['70']);
    expect(q.why).toBe('7 is in the tens place, so it is worth 70.');
    expect(buildDigitValue(ctx(3, 0, 1, 'es'), [4, 0, 7, 2], 2).why).toBe('7 está en las decenas, vale 70.');
  });
  it('is correct for every digit position and offers a single correct option', () => {
    const digits = [9, 8, 7, 6, 5, 4];
    for (let pos = 0; pos < digits.length; pos++) {
      const q = buildDigitValue(ctx(4, 1, 3), digits, pos);
      const expected = digits[pos]! * 10 ** (digits.length - 1 - pos);
      expect(num(q.answer)).toBe(expected);
      expect((q.opts ?? []).filter((o) => num(o) === expected)).toHaveLength(1);
    }
  });
  it('rejects a zero digit or a digit that appears twice', () => {
    expect(() => buildDigitValue(ctx(3, 0, 1), [4, 0, 7, 2], 1)).toThrow();
    expect(() => buildDigitValue(ctx(3, 0, 1), [4, 7, 7, 2], 1)).toThrow();
  });
});

describe('buildRounding', () => {
  it('rounds half up to the nearest ten, hundred, thousand or ten thousand', () => {
    expect(buildRounding(ctx(3, 0, 1), 45, 10).answer).toBe('50');
    expect(buildRounding(ctx(3, 0, 1), 44, 10).answer).toBe('40');
    expect(buildRounding(ctx(4, 0, 1), 1250, 100).answer).toBe('1,300');
    expect(buildRounding(ctx(4, 0, 1), 12499, 1000).answer).toBe('12,000');
    expect(buildRounding(ctx(4, 0, 1), 35000, 10000).answer).toBe('40,000');
    expect(buildRounding(ctx(4, 0, 1), 1234, 100).prompt).toBe('Round 1,234 to the nearest 100.');
    expect(buildRounding(ctx(4, 0, 1, 'es'), 1234, 100).prompt).toBe('Redondea 1234 al 100 más cercano.');
  });
  it('matches an independent computation and keeps exactly one correct option', () => {
    for (const p of [10, 100, 1000, 10000]) {
      for (let n = 11; n < 30000; n += 37) {
        const q = buildRounding(ctx(4, 1, n), n, p);
        const lower = Math.floor(n / p) * p;
        const expected = n - lower >= p / 2 ? lower + p : lower;
        expect(num(q.answer), `${n}~${p}`).toBe(expected);
        const opts = q.opts ?? [];
        expect(opts.length, `${n}~${p}`).toBeGreaterThanOrEqual(2);
        expect(opts.filter((o) => num(o) === expected), `${n}~${p}`).toHaveLength(1);
      }
    }
  });
  it('still offers several options when the number is already a multiple', () => {
    const q = buildRounding(ctx(3, 1, 1), 300, 10);
    expect(q.answer).toBe('300');
    expect((q.opts ?? []).length).toBeGreaterThanOrEqual(3);
  });
});

describe('buildCompareWithSymbols', () => {
  it('answers <, = or >', () => {
    expect(buildCompareWithSymbols(ctx(4, 0, 1), 1234, 1243).answer).toBe('<');
    expect(buildCompareWithSymbols(ctx(4, 0, 1), 5000, 5000).answer).toBe('=');
    expect(buildCompareWithSymbols(ctx(4, 0, 1), 9000, 3000).answer).toBe('>');
    expect([...(buildCompareWithSymbols(ctx(4, 0, 1), 1, 2).opts ?? [])].sort()).toEqual(['<', '=', '>']);
    expect(buildCompareWithSymbols(ctx(4, 0, 1), 1234, 1243).vis).toContain('1,234');
  });
});

describe('buildDecimalDigitValue', () => {
  it('asks for tenths or hundredths', () => {
    const tenths = buildDecimalDigitValue(ctx(5, 0, 1), [3, 4, 5], 'tenth');
    expect(tenths.prompt).toBe('In 3.45, what is the value of the digit 4?');
    expect(tenths.answer).toBe('0.4');
    expect(tenths.why).toBe('4 is in the tenths place: 0.4.');
    const hundredths = buildDecimalDigitValue(ctx(5, 0, 1), [3, 4, 5], 'hundredth');
    expect(hundredths.prompt).toBe('In 3.45, what is the value of the digit 5?');
    expect(hundredths.answer).toBe('0.05');
    const es = buildDecimalDigitValue(ctx(5, 0, 1, 'es'), [3, 4, 5], 'hundredth');
    expect(es.prompt).toBe('En 3,45, ¿cuál es el valor de la cifra 5?');
    expect(es.answer).toBe('0,05');
    expect(es.why).toBe('5 está en las centésimas: 0,05.');
  });
  it('offers exactly one correct option', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const digits = distinctDigits(createSeededRng(seed), 3) as [number, number, number];
      for (const place of ['tenth', 'hundredth'] as const) {
        const digit = place === 'tenth' ? digits[1] : digits[2];
        if (digit === 0) continue;
        const q = buildDecimalDigitValue(ctx(5, 0, seed), digits, place);
        const expected = place === 'tenth' ? digit / 10 : digit / 100;
        expect((q.opts ?? []).filter((o) => Math.abs(num(o) - expected) < 1e-9)).toHaveLength(1);
      }
    }
  });
  it('rejects a zero or repeated digit', () => {
    expect(() => buildDecimalDigitValue(ctx(5, 0, 1), [3, 0, 5], 'tenth')).toThrow();
    expect(() => buildDecimalDigitValue(ctx(5, 0, 1), [3, 4, 4], 'tenth')).toThrow();
  });
});

describe('buildCompareDecimals', () => {
  it('shows both numbers with the same two decimals', () => {
    const q = buildCompareDecimals(ctx(5, 0, 1), 2.5, 2.45);
    expect(q.answer).toBe('>');
    expect(q.vis).toContain('2.50');
    expect(q.vis).toContain('2.45');
    expect(buildCompareDecimals(ctx(5, 0, 1, 'es'), 2.5, 2.45).vis).toContain('2,50');
    expect(buildCompareDecimals(ctx(5, 0, 1), 2.5, 2.5).answer).toBe('=');
    expect(buildCompareDecimals(ctx(5, 0, 1), 0.7, 0.75).answer).toBe('<');
  });
  it('compares hundredths exactly despite float noise', () => {
    expect(buildCompareDecimals(ctx(5, 0, 1), 0.1 + 0.2, 0.3).answer).toBe('=');
  });
});

describe('buildDecimalRounding', () => {
  it('rounds half up to a tenth or a whole number', () => {
    expect(buildDecimalRounding(ctx(5, 0, 1), 235, 1).prompt).toBe('Round 2.35 to the nearest tenth.');
    expect(buildDecimalRounding(ctx(5, 0, 1), 235, 1).answer).toBe('2.4');
    expect(buildDecimalRounding(ctx(5, 0, 1), 234, 1).answer).toBe('2.3');
    expect(buildDecimalRounding(ctx(5, 0, 1), 449, 0).answer).toBe('4');
    expect(buildDecimalRounding(ctx(5, 0, 1), 450, 0).answer).toBe('5');
    expect(buildDecimalRounding(ctx(5, 0, 1), 450, 0).prompt).toBe('Round 4.50 to the nearest whole number.');
    expect(buildDecimalRounding(ctx(5, 0, 1, 'es'), 235, 1).prompt).toBe(
      'Redondea 2,35 a la décima más cercana.',
    );
  });
  it('matches an independent computation and keeps exactly one correct option', () => {
    for (let h = 101; h <= 9999; h += 13) {
      for (const places of [0, 1] as const) {
        const q = buildDecimalRounding(ctx(6, 1, h), h, places);
        const unit = places === 1 ? 10 : 100;
        const lower = Math.floor(h / unit) * unit;
        const expected = (h - lower >= unit / 2 ? lower + unit : lower) / 100;
        expect(num(q.answer), `${h}/${places}`).toBeCloseTo(expected, 9);
        const opts = q.opts ?? [];
        expect(opts.length, `${h}/${places}`).toBeGreaterThanOrEqual(3);
        expect(opts.filter((o) => Math.abs(num(o) - expected) < 1e-9), `${h}/${places}`).toHaveLength(1);
        for (const o of opts) expect(num(o)).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('placeTopic correctness (English prompts)', () => {
  const seen = new Set<string>();
  for (const grade of GRADES) {
    for (const tier of TIERS) {
      for (let seed = 1; seed <= 120; seed++) {
        const q = placeTopic.generate(ctx(grade, tier, seed));
        const p = q.prompt;
        const tag = `g${grade}/t${tier}/seed${seed}: ${p}`;
        const opts = q.opts ?? [];
        let m: RegExpExecArray | null;
        if (p === 'What number do the blocks show?') {
          seen.add('blocks');
          expect(q.vis, tag).toBe(baseTenBlocks(Number(q.answer)));
          expect(Number(q.answer), tag).toBeGreaterThan(10);
        } else if ((m = /^What is the value of the digit (\d) in ([\d,]+)\?$/.exec(p))) {
          seen.add('digit');
          const digits = m[2]!.replace(/,/g, '');
          const idx = digits.indexOf(m[1]!);
          expect(digits.lastIndexOf(m[1]!), tag).toBe(idx);
          const expected = Number(m[1]) * 10 ** (digits.length - 1 - idx);
          expect(num(q.answer), tag).toBe(expected);
          expect(opts.filter((o) => num(o) === expected), tag).toHaveLength(1);
        } else if ((m = /^Round ([\d,]+) to the nearest ([\d,]+)\.$/.exec(p))) {
          seen.add('round');
          const [n, step] = [num(m[1]!), num(m[2]!)];
          const lower = Math.floor(n / step) * step;
          const expected = n - lower >= step / 2 ? lower + step : lower;
          expect(num(q.answer), tag).toBe(expected);
          expect(opts.filter((o) => num(o) === expected), tag).toHaveLength(1);
        } else if (p === 'Which symbol goes in the box?') {
          seen.add(/\.\d/.test(q.vis) ? 'cmpDec' : 'cmp');
          const [left, right] = q.vis.replace(/<[^>]+>/g, '|').split('|').filter((x) => /\d/.test(x.trim()));
          const [a, b] = [num(left!.trim()), num(right!.trim())];
          if (/\./.test(q.vis)) {
            expect(left!.trim(), tag).toMatch(/^\d+\.\d\d$/);
            expect(right!.trim(), tag).toMatch(/^\d+\.\d\d$/);
          }
          expect(q.answer, tag).toBe(a < b ? '<' : a > b ? '>' : '=');
        } else if ((m = /^In (\d\.\d\d), what is the value of the digit (\d)\?$/.exec(p))) {
          seen.add('decDigit');
          const [, whole, tenths, hundredths] = /^(\d)\.(\d)(\d)$/.exec(m[1]!)!;
          const digit = m[2]!;
          expect(new Set([whole, tenths, hundredths]).size, tag).toBe(3);
          const expected = digit === tenths ? Number(digit) / 10 : Number(digit) / 100;
          expect([tenths, hundredths], tag).toContain(digit);
          expect(Number(digit), tag).toBeGreaterThan(0);
          expect(num(q.answer), tag).toBeCloseTo(expected, 9);
          expect(opts.filter((o) => Math.abs(num(o) - expected) < 1e-9), tag).toHaveLength(1);
        } else if ((m = /^Round (\d+\.\d\d) to the nearest (tenth|whole number)\.$/.exec(p))) {
          seen.add('roundDec');
          const h = Math.round(Number(m[1]) * 100);
          const unit = m[2] === 'tenth' ? 10 : 100;
          const lower = Math.floor(h / unit) * unit;
          const expected = (h - lower >= unit / 2 ? lower + unit : lower) / 100;
          expect(num(q.answer), tag).toBeCloseTo(expected, 9);
          expect(opts.filter((o) => Math.abs(num(o) - expected) < 1e-9), tag).toHaveLength(1);
        } else {
          throw new Error(`unrecognised place prompt: ${p}`);
        }
      }
    }
  }
  it('covers every question type', () => {
    expect([...seen].sort()).toEqual(['blocks', 'cmp', 'cmpDec', 'decDigit', 'digit', 'round', 'roundDec']);
  });
});

describe('placeTopic by grade', () => {
  it('uses 3, 4 and 6 digit numbers for digit-value questions in grades 2, 3 and 4', () => {
    const lengths: Partial<Record<Grade, Set<number>>> = {};
    for (const grade of [2, 3, 4] as Grade[]) {
      lengths[grade] = new Set();
      for (let seed = 1; seed <= 200; seed++) {
        const q = placeTopic.generate(ctx(grade, 1, seed));
        const m = /^What is the value of the digit \d in ([\d,]+)\?$/.exec(q.prompt);
        if (m) lengths[grade]!.add(m[1]!.replace(/,/g, '').length);
      }
    }
    expect([...lengths[2]!]).toEqual([3]);
    expect([...lengths[3]!]).toEqual([4]);
    expect([...lengths[4]!]).toEqual([6]);
  });
});

describe('placeTopic metadata', () => {
  it('matches the prototype table', () => {
    expect(placeTopic).toMatchObject({
      id: 'place',
      accent: '#7a5cf5',
      title: { en: 'Place Value', es: 'Valor posicional' },
    });
    expect(placeTopic.generate(ctx(1, 0, 1)).topic).toBe('place');
  });
});

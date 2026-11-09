import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../shared/rng';
import type { Grade, Locale } from '../shared/types';
import { generateRaceQuestion } from './race';

const GRADES: Grade[] = [1, 2, 3, 4, 5, 6];
const LOCALES: Locale[] = ['en', 'es'];
const BAD = /NaN|undefined|Infinity|null|\[object/;

describe('generateRaceQuestion', () => {
  it.each(GRADES)('grade %i: options are unique and include the answer', (grade) => {
    for (const locale of LOCALES) {
      for (let seed = 1; seed <= 60; seed++) {
        const q = generateRaceQuestion(grade, locale, createSeededRng(seed));
        expect(q.opts).toHaveLength(4);
        expect(new Set(q.opts).size).toBe(4);
        expect(q.opts).toContain(q.answer);
        expect(q.prompt).not.toMatch(BAD);
      }
    }
  });

  it.each(GRADES)('grade %i: the answer is arithmetically correct', (grade) => {
    const operators = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) {
      const q = generateRaceQuestion(grade, 'en', createSeededRng(seed));
      const m = /^([\d,]+) ([+−×÷]) ([\d,]+)$/.exec(q.prompt);
      expect(m, q.prompt).not.toBeNull();
      const a = Number(m![1]!.replace(/,/g, ''));
      const b = Number(m![3]!.replace(/,/g, ''));
      const op = m![2]!;
      operators.add(op);
      const expected = op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : a / b;
      expect(Number.isInteger(expected)).toBe(true);
      expect(expected).toBeGreaterThanOrEqual(0);
      expect(Number(q.answer.replace(/,/g, ''))).toBe(expected);
    }
    const allowed = grade === 1 ? ['+', '−'] : grade === 2 ? ['+', '−', '×'] : ['+', '−', '×', '÷'];
    expect([...operators].sort()).toEqual([...allowed].sort());
  });

  it('formats numbers with the locale (es-ES does not group 4-digit numbers)', () => {
    let sawFourDigits = false;
    for (let seed = 1; seed <= 200; seed++) {
      const en = generateRaceQuestion(6, 'en', createSeededRng(seed));
      const es = generateRaceQuestion(6, 'es', createSeededRng(seed));
      expect(es.answer).toBe(en.answer.replace(/,/g, ''));
      if (en.answer.includes(',')) sawFourDigits = true;
    }
    expect(sawFourDigits).toBe(true);
  });

  it('is deterministic per seed', () => {
    expect(generateRaceQuestion(4, 'en', createSeededRng(11))).toEqual(
      generateRaceQuestion(4, 'en', createSeededRng(11)),
    );
  });
});

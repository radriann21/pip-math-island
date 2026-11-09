import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../shared/rng';
import type { GenContext, Grade, Locale, Tier } from '../shared/types';
import { addTopic, buildAddition } from './add';
import { buildDivision, divTopic } from './div';
import { buildMultiplication, mulTopic } from './mul';
import { buildSubtraction, subTopic } from './sub';

const GRADES: Grade[] = [1, 2, 3, 4, 5, 6];
const TIERS: Tier[] = [0, 1, 2];
const SEEDS = 60;

const ctx = (grade: Grade, tier: Tier, seed: number, locale: Locale = 'en'): GenContext => ({
  grade,
  tier,
  locale,
  rng: createSeededRng(seed),
});

/** Parses "a <op> b = ?" with English formatting ("1,234.5"). */
function parseEquation(prompt: string, op: string): [number, number] {
  const m = new RegExp(`^([\\d,.]+) ${op} ([\\d,.]+) = \\?$`).exec(prompt);
  if (!m) throw new Error(`unexpected prompt: ${prompt}`);
  const num = (s: string | undefined) => Number((s ?? '').replace(/,/g, ''));
  return [num(m[1]), num(m[2])];
}

/** Numeric value of the question's answer regardless of kind (choice answers are formatted labels). */
function answerValue(answer: string | number): number {
  return typeof answer === 'number' ? answer : Number(answer.replace(/,/g, ''));
}

describe('pure builders', () => {
  it('buildAddition answers a + b', () => {
    expect(answerValue(buildAddition(ctx(2, 0, 1), 17, 25).answer)).toBe(42);
    expect(buildAddition(ctx(4, 0, 1), 1200, 800).answer).toBe(2000);
    expect(buildAddition(ctx(5, 0, 1), 1.7, 2.6).answer).toBeCloseTo(4.3, 9);
    expect(buildAddition(ctx(6, 0, 1), 1.25, 2.75).answer).toBe(4);
  });
  it('buildAddition shows an apple/star picture only for small grade 1 sums', () => {
    expect(buildAddition(ctx(1, 0, 1), 2, 3).vis).toContain('#i-apple');
    expect(buildAddition(ctx(1, 0, 1), 2, 3).vis).toContain('#i-starc');
    expect(buildAddition(ctx(1, 0, 1), 15, 8).vis).toBe('');
    expect(buildAddition(ctx(2, 0, 1), 2, 3).vis).toBe('');
  });
  it('buildSubtraction answers a - b and crosses out b items', () => {
    const q = buildSubtraction(ctx(1, 1, 1), 9, 4);
    expect(answerValue(q.answer)).toBe(5);
    expect(q.vis.split('class="xx"')).toHaveLength(5);
    expect(buildSubtraction(ctx(5, 0, 1), 8.5, 3.2).answer).toBeCloseTo(5.3, 9);
    expect(() => buildSubtraction(ctx(2, 0, 1), 3, 5)).toThrow();
  });
  it('buildMultiplication answers a x b and draws the array for small facts', () => {
    const q = buildMultiplication(ctx(2, 1, 1), 3, 4);
    expect(answerValue(q.answer)).toBe(12);
    expect(q.vis).toContain('dot-v');
    expect(buildMultiplication(ctx(4, 0, 1), 23, 6).answer).toBe(138);
    expect(buildMultiplication(ctx(4, 0, 1), 23, 6).vis).toBe('');
    expect(buildMultiplication(ctx(6, 1, 1), 4.5, 3).answer).toBe(13.5);
    expect(buildMultiplication(ctx(6, 0, 1), 9.9, 100).answer).toBe(990);
  });
  it('buildDivision answers a / b with plates for grade 1', () => {
    const q = buildDivision(ctx(1, 1, 1), 10, 5);
    expect(answerValue(q.answer)).toBe(2);
    expect(q.vis).toContain('class="plate"');
    expect(buildDivision(ctx(4, 0, 1), 144, 12).answer).toBe(12);
    expect(buildDivision(ctx(6, 0, 1), 7, 4).answer).toBe(1.75);
    expect(buildDivision(ctx(6, 0, 1), 9, 5).answer).toBe(1.8);
  });
  it('builders localise the explanation', () => {
    expect(buildAddition(ctx(4, 0, 1, 'es'), 12000, 800).why).toBe('12.000 + 800 = 12.800');
    expect(buildDivision(ctx(2, 0, 1, 'es'), 12, 3).hint).toContain('Pregúntate');
    expect(buildDivision(ctx(2, 0, 1, 'en'), 12, 3).hint).toContain('Ask yourself');
  });
});

describe.each(GRADES)('generated arithmetic, grade %i', (grade) => {
  const each = (fn: (tier: Tier, seed: number) => void) => {
    for (const tier of TIERS) for (let seed = 1; seed <= SEEDS; seed++) fn(tier, seed);
  };

  it('addition prompts and answers agree', () => {
    each((tier, seed) => {
      const q = addTopic.generate(ctx(grade, tier, seed));
      const [a, b] = parseEquation(q.prompt, '\\+');
      expect(answerValue(q.answer)).toBeCloseTo(a + b, 9);
    });
  });

  it('subtraction prompts and answers agree and never go negative', () => {
    each((tier, seed) => {
      const q = subTopic.generate(ctx(grade, tier, seed));
      const [a, b] = parseEquation(q.prompt, '−');
      expect(a).toBeGreaterThanOrEqual(b);
      expect(answerValue(q.answer)).toBeCloseTo(a - b, 9);
      expect(answerValue(q.answer)).toBeGreaterThanOrEqual(0);
    });
  });

  it('multiplication prompts and answers agree', () => {
    each((tier, seed) => {
      const q = mulTopic.generate(ctx(grade, tier, seed));
      const [a, b] = parseEquation(q.prompt, '×');
      expect(answerValue(q.answer)).toBeCloseTo(a * b, 6);
    });
  });

  it('division prompts and answers agree', () => {
    each((tier, seed) => {
      const q = divTopic.generate(ctx(grade, tier, seed));
      const [a, b] = parseEquation(q.prompt, '÷');
      expect(b).toBeGreaterThan(0);
      expect(answerValue(q.answer)).toBeCloseTo(a / b, 6);
      if (grade <= 5) {
        expect(Number.isInteger(a / b)).toBe(true);
        expect(Number.isInteger(answerValue(q.answer))).toBe(true);
      }
    });
  });
});

describe('topic metadata', () => {
  it('matches the prototype table', () => {
    expect(addTopic).toMatchObject({ id: 'add', accent: '#ef8a17', title: { en: 'Addition', es: 'Suma' } });
    expect(subTopic).toMatchObject({ id: 'sub', accent: '#c99700', title: { en: 'Subtraction', es: 'Resta' } });
    expect(mulTopic).toMatchObject({
      id: 'mul',
      accent: '#2fa66a',
      title: { en: 'Multiplication', es: 'Multiplicación' },
    });
    expect(divTopic).toMatchObject({ id: 'div', accent: '#1d9fb0', title: { en: 'Division', es: 'División' } });
  });
  it('stamps the topic id on generated questions', () => {
    expect(addTopic.generate(ctx(1, 0, 1)).topic).toBe('add');
    expect(divTopic.generate(ctx(1, 0, 1)).topic).toBe('div');
  });
});

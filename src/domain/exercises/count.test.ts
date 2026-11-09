import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../shared/rng';
import type { GenContext, Grade, Locale, Tier } from '../shared/types';
import { buildCountingQuestion, COUNT_ITEMS, countTopic } from './count';

const ctx = (grade: Grade, tier: Tier, seed: number, locale: Locale = 'en'): GenContext => ({
  grade,
  tier,
  locale,
  rng: createSeededRng(seed),
});
const GRADES: Grade[] = [1, 2, 3, 4, 5, 6];
const TIERS: Tier[] = [0, 1, 2];
const num = (s: string) => Number(s.replace(/[,°]/g, ''));

describe('buildCountingQuestion', () => {
  it('draws n items and answers n', () => {
    const q = buildCountingQuestion(ctx(1, 0, 1), 7, COUNT_ITEMS[0]!);
    expect(q.answer).toBe('7');
    expect(q.vis.split('<use')).toHaveLength(8);
    expect(q.prompt).toBe('How many apples do you see?');
  });
  it('uses the right grammatical gender in Spanish', () => {
    for (const item of COUNT_ITEMS) {
      const q = buildCountingQuestion(ctx(1, 0, 1, 'es'), 5, item);
      const word = item.feminine ? 'Cuántas' : 'Cuántos';
      const wrong = item.feminine ? 'Cuántos' : 'Cuántas';
      expect(q.prompt).toBe(`¿${word} ${item.es} ves?`);
      expect(q.prompt).not.toContain(wrong);
    }
  });
  it('balloons (globos) are masculine', () => {
    const balloons = COUNT_ITEMS.find((i) => i.symbol === 'balloon');
    expect(buildCountingQuestion(ctx(1, 0, 1, 'es'), 4, balloons!).prompt).toBe('¿Cuántos globos ves?');
  });
});

describe('countTopic correctness (English prompts)', () => {
  const seen = new Set<string>();
  for (const grade of GRADES) {
    for (const tier of TIERS) {
      for (let seed = 1; seed <= 80; seed++) {
        const q = countTopic.generate(ctx(grade, tier, seed));
        const p = q.prompt;
        const ans = String(q.answer);
        let m: RegExpExecArray | null;
        if ((m = /^What number comes right after ([\d,]+)\?$/.exec(p))) {
          seen.add('after');
          expect(num(ans)).toBe(num(m[1]!) + 1);
        } else if ((m = /^What number comes right before ([\d,]+)\?$/.exec(p))) {
          seen.add('before');
          expect(num(ans)).toBe(num(m[1]!) - 1);
        } else if ((m = /^What is 10 more than ([\d,]+)\?$/.exec(p))) {
          seen.add('p10');
          expect(num(ans)).toBe(num(m[1]!) + 10);
        } else if ((m = /^What is 10 less than ([\d,]+)\?$/.exec(p))) {
          seen.add('m10');
          expect(num(ans)).toBe(num(m[1]!) - 10);
        } else if ((m = /^What is 100 more than ([\d,]+)\?$/.exec(p))) {
          seen.add('p100');
          expect(num(ans)).toBe(num(m[1]!) + 100);
        } else if ((m = /^Which number is between ([\d,]+) and ([\d,]+)\?$/.exec(p))) {
          seen.add('between');
          const [lo, hi] = [num(m[1]!), num(m[2]!)];
          const inside = (q.opts ?? []).filter((o) => num(o) > lo && num(o) < hi);
          expect(inside).toEqual([ans]);
        } else if (/^Which number is the (biggest|smallest)\?$/.test(p)) {
          seen.add('cmp');
          const values = (q.opts ?? []).map(num);
          const target = /biggest/.test(p) ? Math.max(...values) : Math.min(...values);
          expect(num(ans)).toBe(target);
        } else if ((m = /^Is ([\d,]+) even or odd\?$/.exec(p))) {
          seen.add('parity');
          expect(ans).toBe(num(m[1]!) % 2 === 0 ? 'Even' : 'Odd');
        } else if (p === 'Which temperature is the coldest?') {
          seen.add('neg');
          expect(num(ans)).toBe(Math.min(...(q.opts ?? []).map(num)));
        } else if (/^How many .* do you see\?$/.test(p)) {
          seen.add('count');
          expect(q.vis.split('<use').length - 1).toBe(num(ans));
        } else {
          throw new Error(`unrecognised count prompt: ${p}`);
        }
      }
    }
  }
  it('covers every question type', () => {
    expect([...seen].sort()).toEqual(
      ['after', 'before', 'between', 'cmp', 'count', 'm10', 'neg', 'p10', 'p100', 'parity'].sort(),
    );
  });
});

describe('countTopic metadata', () => {
  it('matches the prototype table', () => {
    expect(countTopic).toMatchObject({
      id: 'count',
      accent: '#e8504f',
      title: { en: 'Numbers & Counting', es: 'Números y conteo' },
    });
    expect(countTopic.generate(ctx(1, 0, 1)).topic).toBe('count');
  });
});

import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../shared/rng';
import type { GenContext, Grade, Locale, Tier } from '../shared/types';
import {
  buildChange,
  buildCoinTotal,
  buildDiscount,
  buildPriceSum,
  buildQuantityPrice,
  drawCoins,
  moneyTopic,
} from './money';
import { coins } from './visuals';

const ctx = (grade: Grade, tier: Tier, seed: number, locale: Locale = 'en'): GenContext => ({
  grade,
  tier,
  locale,
  rng: createSeededRng(seed),
});
const GRADES: Grade[] = [1, 2, 3, 4, 5, 6];
const TIERS: Tier[] = [0, 1, 2];
const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);
const num = (s: string | number) => Number(String(s).replace(/,/g, ''));
/** Coin and bill values written in a `coins()` drawing. */
const drawnValues = (vis: string) => [...vis.matchAll(/class="(?:coin-t|bill-t)"[^>]*>(\d+)</g)].map((m) => Number(m[1]));
const tagValues = (vis: string) => [...vis.matchAll(/class="tag">\$([\d.]+)</g)].map((m) => Number(m[1]));

describe('drawCoins', () => {
  it('draws exactly `count` coins that never exceed the maximum total', () => {
    const grades = [
      { values: [1, 2, 5, 10], count: 4, max: 10 },
      { values: [1, 2, 5, 10], count: 4, max: 30 },
      { values: [1, 2, 5, 10, 20, 50], count: 6, max: 120 },
    ];
    for (const { values, count, max } of grades) {
      for (let seed = 1; seed <= 300; seed++) {
        const list = drawCoins(createSeededRng(seed), values, count, max);
        expect(list).toHaveLength(count);
        expect(list.every((v) => values.includes(v))).toBe(true);
        expect(sum(list)).toBeLessThanOrEqual(max);
      }
    }
  });
  it('is deterministic for a seed', () => {
    expect(drawCoins(createSeededRng(5), [1, 2, 5], 3, 12)).toEqual(drawCoins(createSeededRng(5), [1, 2, 5], 3, 12));
  });
  it('throws when the maximum cannot hold the coins', () => {
    expect(() => drawCoins(createSeededRng(1), [2, 5], 4, 7)).toThrow();
  });
});

describe('buildCoinTotal', () => {
  it('offers choices in grade 1 and a keypad answer from grade 2', () => {
    const g1 = buildCoinTotal(ctx(1, 0, 1), [5, 2, 1]);
    expect(g1.kind).toBe('choice');
    expect(g1.answer).toBe('8');
    expect((g1.opts ?? []).filter((o) => num(o) === 8)).toHaveLength(1);
    expect(g1.vis).toBe(coins([5, 2, 1]));
    expect(g1.why).toBe('5 + 2 + 1 = 8');
    const g2 = buildCoinTotal(ctx(2, 0, 1), [50, 20, 10, 5]);
    expect(g2.kind).toBe('num');
    expect(g2.answer).toBe(85);
    expect(buildCoinTotal(ctx(2, 0, 1, 'es'), [10, 5]).prompt).toBe('¿Cuánto dinero hay en total?');
  });
});

describe('dollar builders', () => {
  it('buildPriceSum adds two prices', () => {
    const q = buildPriceSum(ctx(3, 0, 1), 1.25, 3.5);
    expect(q.answer).toBe(4.75);
    expect(q.decimal).toBe(true);
    expect(tagValues(q.vis)).toEqual([1.25, 3.5]);
    expect(q.why).toBe('$1.25 + $3.50 = $4.75');
    expect(buildPriceSum(ctx(3, 0, 1, 'es'), 1.25, 3.5).why).toBe('$1,25 + $3,50 = $4,75');
  });
  it('buildChange subtracts the cost from the payment', () => {
    const q = buildChange(ctx(4, 0, 1), 20, 7.25);
    expect(q.answer).toBe(12.75);
    expect(q.prompt).toBe('You pay $20 for something that costs $7.25. How many dollars of change do you get?');
    expect(q.why).toBe('$20 − $7.25 = $12.75');
    expect(buildChange(ctx(4, 0, 1, 'es'), 5, 2).prompt).toBe(
      'Pagas $5 por algo que cuesta $2,00. ¿Cuántos dólares de cambio recibes?',
    );
    expect(() => buildChange(ctx(4, 0, 1), 5, 6)).toThrow();
  });
  it('buildQuantityPrice multiplies the unit price', () => {
    const q = buildQuantityPrice(ctx(5, 0, 1), 6, 3.75);
    expect(q.answer).toBe(22.5);
    expect(q.prompt).toBe('6 notebooks cost $3.75 each. What is the total cost in dollars?');
    expect(buildQuantityPrice(ctx(5, 0, 1, 'es'), 6, 3.75).prompt).toBe(
      '6 cuadernos cuestan $3,75 cada uno. ¿Cuál es el costo total en dólares?',
    );
  });
  it('buildDiscount subtracts the percentage of the price', () => {
    expect(buildDiscount(ctx(6, 0, 1), 80, 25).answer).toBe(60);
    expect(buildDiscount(ctx(6, 0, 1), 30, 15).answer).toBe(25.5);
    expect(buildDiscount(ctx(6, 0, 1), 130, 5).answer).toBe(123.5);
    expect(buildDiscount(ctx(6, 0, 1), 80, 25).prompt).toBe('A $80 jacket is 25% off. What is the new price in dollars?');
    expect(buildDiscount(ctx(6, 0, 1, 'es'), 80, 25).prompt).toBe(
      'Una chaqueta de $80 tiene 25% de descuento. ¿Cuál es el nuevo precio en dólares?',
    );
  });
  it('buildDiscount matches an independent computation', () => {
    for (let price = 20; price <= 200; price += 10) {
      for (const pct of [5, 10, 15, 20, 25, 30, 40, 50]) {
        const cents = price * 100 - price * pct;
        expect(buildDiscount(ctx(6, 2, 1), price, pct).answer).toBeCloseTo(cents / 100, 9);
      }
    }
  });
});

describe('moneyTopic correctness (English prompts)', () => {
  const seen = new Set<string>();
  const maxTotal = (grade: Grade, tier: Tier) => (grade === 1 ? [10, 20, 30][tier]! : 120);
  for (const grade of GRADES) {
    for (const tier of TIERS) {
      for (let seed = 1; seed <= 120; seed++) {
        const q = moneyTopic.generate(ctx(grade, tier, seed));
        const p = q.prompt;
        const tag = `g${grade}/t${tier}/seed${seed}: ${p}`;
        const answer = num(q.answer);
        let m: RegExpExecArray | null;
        if (p === 'How much money is this in total?') {
          seen.add(`coins${grade}`);
          const values = drawnValues(q.vis);
          expect(values.length, tag).toBeGreaterThanOrEqual(2);
          expect(answer, tag).toBe(sum(values));
          expect(answer, tag).toBeLessThanOrEqual(maxTotal(grade, tier));
          expect(q.kind, tag).toBe(grade === 1 ? 'choice' : 'num');
          if (q.kind === 'choice') expect((q.opts ?? []).filter((o) => num(o) === answer), tag).toHaveLength(1);
        } else if (p === 'What is the total cost in dollars?') {
          seen.add('priceSum');
          const prices = tagValues(q.vis);
          expect(prices, tag).toHaveLength(2);
          expect(answer, tag).toBeCloseTo(prices[0]! + prices[1]!, 9);
        } else if ((m = /^You pay \$(\d+) for something that costs \$([\d.]+)\. How many dollars of change do you get\?$/.exec(p))) {
          seen.add('change');
          expect(answer, tag).toBeCloseTo(Number(m[1]) - Number(m[2]), 9);
          expect(answer, tag).toBeGreaterThan(0);
        } else if ((m = /^(\d+) notebooks cost \$([\d.]+) each\. What is the total cost in dollars\?$/.exec(p))) {
          seen.add('quantity');
          expect(answer, tag).toBeCloseTo(Number(m[1]) * Number(m[2]), 9);
        } else if ((m = /^A \$(\d+) jacket is (\d+)% off\. What is the new price in dollars\?$/.exec(p))) {
          seen.add('discount');
          expect(answer, tag).toBeCloseTo((Number(m[1]) * (100 - Number(m[2]))) / 100, 9);
          expect(answer, tag).toBeLessThan(Number(m[1]));
        } else {
          throw new Error(`unrecognised money prompt: ${p}`);
        }
        if (grade >= 3) expect(q.decimal, tag).toBe(true);
      }
    }
  }
  it('covers every question type', () => {
    expect([...seen].sort()).toEqual(['change', 'coins1', 'coins2', 'discount', 'priceSum', 'quantity']);
  });
});

describe('moneyTopic metadata', () => {
  it('matches the prototype table', () => {
    expect(moneyTopic).toMatchObject({ id: 'money', accent: '#3aa845', title: { en: 'Money', es: 'Dinero' } });
    expect(moneyTopic.generate(ctx(1, 0, 1)).topic).toBe('money');
  });
});

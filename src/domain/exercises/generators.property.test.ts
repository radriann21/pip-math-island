import { describe, expect, it } from 'vitest';
import { checkAnswer } from './answer';
import { TOPICS } from './registry';
import { createSeededRng } from '../shared/rng';
import type { Grade, Locale, Question, Tier } from '../shared/types';

const GRADES: Grade[] = [1, 2, 3, 4, 5, 6];
const TIERS: Tier[] = [0, 1, 2];
const LOCALES: Locale[] = ['en', 'es'];
const SEEDS = 40;
const BAD = /NaN|undefined|Infinity|null|\[object/;

function checkQuestion(q: Question, tag: string): void {
  expect(q.prompt, `${tag} prompt`).not.toBe('');
  for (const field of ['prompt', 'vis', 'hint', 'why'] as const) {
    expect(typeof q[field], `${tag} ${field} type`).toBe('string');
    expect(q[field], `${tag} ${field}`).not.toMatch(BAD);
  }
  expect(q.hint, `${tag} hint`).not.toBe('');
  expect(q.why, `${tag} why`).not.toBe('');
  expect(['choice', 'num']).toContain(q.kind);

  if (q.kind === 'choice') {
    const opts = q.opts ?? [];
    expect(opts.length, `${tag} option count`).toBeGreaterThanOrEqual(2);
    expect(opts.length, `${tag} option count`).toBeLessThanOrEqual(4);
    expect(new Set(opts).size, `${tag} unique options ${JSON.stringify(opts)}`).toBe(opts.length);
    expect(opts, `${tag} answer in options`).toContain(q.answer);
    for (const o of opts) expect(o, `${tag} option text`).not.toMatch(BAD);
    expect(checkAnswer(q, String(q.answer)), `${tag} accepts answer`).toBe(true);
    expect(checkAnswer(q, `${String(q.answer)}!`), `${tag} rejects other`).toBe(false);
  } else {
    expect(typeof q.answer, `${tag} answer type`).toBe('number');
    const answer = q.answer as number;
    expect(Number.isFinite(answer), `${tag} finite`).toBe(true);
    expect(answer, `${tag} non-negative`).toBeGreaterThanOrEqual(0);
    expect(checkAnswer(q, String(answer)), `${tag} accepts answer`).toBe(true);
    expect(checkAnswer(q, String(answer).replace('.', ',')), `${tag} accepts comma`).toBe(true);
    expect(checkAnswer(q, String(answer + 1)), `${tag} rejects answer+1`).toBe(false);
    expect(q.opts).toBeUndefined();
  }
}

describe.each(TOPICS.map((t) => [t.id, t] as const))('generator %s', (_id, topic) => {
  for (const locale of LOCALES) {
    for (const grade of GRADES) {
      it(`yields valid questions: ${locale} grade ${grade}`, () => {
        for (const tier of TIERS) {
          for (let seed = 1; seed <= SEEDS; seed++) {
            const q = topic.generate({ grade, tier, locale, rng: createSeededRng(seed) });
            expect(q.topic).toBe(topic.id);
            checkQuestion(q, `${topic.id}/${locale}/g${grade}/t${tier}/seed${seed}`);
          }
        }
      });
    }
  }

  it('is deterministic for a seed and differs across seeds', () => {
    const make = (seed: number) =>
      Array.from({ length: 12 }, (_, i) => {
        const rng = createSeededRng(seed + i);
        return topic.generate({ grade: 4, tier: 1, locale: 'en', rng });
      });
    expect(make(100)).toEqual(make(100));
    expect(make(100)).not.toEqual(make(200));
  });

  it('reads the shared rng stream sequentially', () => {
    const run = (seed: number) => {
      const rng = createSeededRng(seed);
      return Array.from({ length: 10 }, () => topic.generate({ grade: 3, tier: 1, locale: 'es', rng }));
    };
    expect(run(9)).toEqual(run(9));
    expect(run(9)).not.toEqual(run(10));
  });

  it('writes Spanish prompts differently from English ones', () => {
    const ctx = (locale: Locale) => ({ grade: 2 as Grade, tier: 1 as Tier, locale, rng: createSeededRng(4) });
    const en = topic.generate(ctx('en'));
    const es = topic.generate(ctx('es'));
    expect(en.hint).not.toBe(es.hint);
  });
});

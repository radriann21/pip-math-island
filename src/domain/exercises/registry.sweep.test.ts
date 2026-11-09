import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../shared/rng';
import type { Grade, Locale, Question, Tier } from '../shared/types';
import { checkAnswer } from './answer';
import { TOPICS } from './registry';

const GRADES: Grade[] = [1, 2, 3, 4, 5, 6];
const TIERS: Tier[] = [0, 1, 2];
const LOCALES: Locale[] = ['en', 'es'];
const SEEDS = 25;
const BAD = /NaN|undefined|Infinity|null|\[object/;

/** Everything that is wrong with a question, as readable strings (empty when it is fine). */
function problemsIn(q: Question): string[] {
  const problems: string[] = [];
  const texts: [string, string][] = [
    ['prompt', q.prompt],
    ['vis', q.vis],
    ['hint', q.hint],
    ['why', q.why],
  ];
  if (typeof q.answer === 'string') texts.push(['answer', q.answer]);
  for (const [i, o] of (q.opts ?? []).entries()) texts.push([`opts[${i}]`, o]);
  for (const [field, text] of texts) if (BAD.test(text)) problems.push(`${field} contains a bad token: ${text.slice(0, 80)}`);

  if (q.kind === 'num') {
    if (typeof q.answer !== 'number' || !Number.isFinite(q.answer)) problems.push('numeric answer is not finite');
    else {
      if (q.answer < 0) problems.push(`negative answer ${q.answer}`);
      if (!checkAnswer(q, String(q.answer))) problems.push(`checkAnswer rejects ${q.answer}`);
      if (!checkAnswer(q, String(q.answer).replace('.', ','))) problems.push('checkAnswer rejects the comma form');
    }
  } else {
    const opts = q.opts ?? [];
    if (opts.length < 2 || opts.length > 4) problems.push(`${opts.length} options`);
    if (new Set(opts).size !== opts.length) problems.push(`duplicate options ${JSON.stringify(opts)}`);
    if (!opts.includes(q.answer as string)) problems.push('options do not contain the answer');
    if (!checkAnswer(q, String(q.answer))) problems.push('checkAnswer rejects the answer');
  }
  return problems;
}

describe('problemsIn', () => {
  const good: Question = {
    topic: 'add',
    kind: 'choice',
    prompt: '1 + 1',
    vis: '',
    hint: 'h',
    why: 'w',
    answer: '2',
    opts: ['2', '3'],
    decimal: false,
  };
  it('accepts a sound question and flags broken ones', () => {
    expect(problemsIn(good)).toEqual([]);
    expect(problemsIn({ ...good, prompt: 'NaN + 1' })).toHaveLength(1);
    expect(problemsIn({ ...good, opts: ['3', '3'] }).length).toBeGreaterThan(0);
    expect(problemsIn({ ...good, opts: ['3', '4'] }).length).toBeGreaterThan(0);
    expect(problemsIn({ ...good, kind: 'num', answer: -1, opts: undefined })).toContain('negative answer -1');
  });
});

describe('full registry sweep', () => {
  it('registers every topic once', () => {
    expect(TOPICS).toHaveLength(12);
  });

  describe.each(TOPICS.map((topic) => [topic.id, topic] as const))('%s', (_id, topic) => {
    for (const locale of LOCALES) {
      it(`generates sound questions for every grade and tier: ${locale}`, () => {
        for (const grade of GRADES) {
          for (const tier of TIERS) {
            for (let seed = 1; seed <= SEEDS; seed++) {
              const q = topic.generate({ grade, tier, locale, rng: createSeededRng(seed * 7919 + grade * 31 + tier) });
              expect(problemsIn(q), `${topic.id}/${locale}/g${grade}/t${tier}/seed${seed}: ${q.prompt}`).toEqual([]);
            }
          }
        }
      });
    }
  });
});

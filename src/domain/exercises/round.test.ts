import { describe, expect, it } from 'vitest';
import { createSeededRng, randInt } from '../shared/rng';
import type { GenContext, TopicDefinition, TopicId } from '../shared/types';
import { generateRound } from './round';
import { TOPICS } from './registry';

/** A topic whose prompts reveal which tier produced them. */
function tierProbe(): TopicDefinition {
  let n = 0;
  return {
    id: 'add',
    accent: '#000000',
    title: { en: 'probe', es: 'sonda' },
    generate: (ctx: GenContext) => ({
      topic: 'add',
      kind: 'num',
      prompt: `tier${ctx.tier}-${n++}`,
      vis: '',
      hint: 'h',
      why: 'w',
      answer: 1,
      decimal: false,
    }),
  };
}

describe('generateRound', () => {
  it('returns 10 questions by default, each stamped with its topic', () => {
    const round = generateRound('mul', 3, 1, 'en', createSeededRng(5));
    expect(round).toHaveLength(10);
    expect(round.every((q) => q.topic === 'mul')).toBe(true);
  });

  it('respects the size parameter', () => {
    expect(generateRound('add', 2, 0, 'es', createSeededRng(1), 4)).toHaveLength(4);
    expect(generateRound('add', 2, 0, 'es', createSeededRng(1), 0)).toHaveLength(0);
    expect(generateRound('add', 2, 0, 'es', createSeededRng(1), 15)).toHaveLength(15);
  });

  it('uses one tier lower for the first three questions', () => {
    const round = generateRound('add', 1, 2, 'en', createSeededRng(1), 10, [tierProbe()]);
    expect(round.map((q) => q.prompt.split('-')[0])).toEqual([
      'tier1', 'tier1', 'tier1', 'tier2', 'tier2', 'tier2', 'tier2', 'tier2', 'tier2', 'tier2',
    ]);
  });

  it('never goes below tier 0', () => {
    const round = generateRound('add', 1, 0, 'en', createSeededRng(1), 5, [tierProbe()]);
    expect(round.every((q) => q.prompt.startsWith('tier0'))).toBe(true);
  });

  it('retries a duplicate prompt', () => {
    let calls = 0;
    const flaky: TopicDefinition = {
      ...tierProbe(),
      generate: () => {
        calls++;
        return {
          topic: 'add', kind: 'num', vis: '', hint: 'h', why: 'w', answer: 1, decimal: false,
          prompt: calls % 2 === 1 ? 'dup' : `unique-${calls}`,
        };
      },
    };
    const round = generateRound('add', 1, 0, 'en', createSeededRng(1), 4, [flaky]);
    expect(new Set(round.map((q) => q.prompt)).size).toBe(4);
  });

  it('gives up after 8 attempts instead of looping forever', () => {
    let calls = 0;
    const stuck: TopicDefinition = {
      ...tierProbe(),
      generate: () => {
        calls++;
        return { topic: 'add', kind: 'num', vis: '', hint: 'h', why: 'w', answer: 1, decimal: false, prompt: 'same' };
      },
    };
    const round = generateRound('add', 1, 0, 'en', createSeededRng(1), 3, [stuck]);
    expect(round).toHaveLength(3);
    expect(calls).toBe(1 + 8 + 8);
  });

  it('produces mostly unique prompts for real topics', () => {
    for (const topic of TOPICS) {
      for (let grade = 1; grade <= 6; grade++) {
        const round = generateRound(topic.id, grade as 1, 1, 'en', createSeededRng(grade * 31));
        const unique = new Set(round.map((q) => q.prompt + q.vis)).size;
        expect(unique, `${topic.id} g${grade}`).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it('is deterministic per seed and varies across seeds', () => {
    const a = generateRound('sub', 4, 1, 'en', createSeededRng(7));
    const b = generateRound('sub', 4, 1, 'en', createSeededRng(7));
    const c = generateRound('sub', 4, 1, 'en', createSeededRng(8));
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('throws for an unknown topic', () => {
    expect(() => generateRound('nope' as TopicId, 1, 0, 'en', createSeededRng(1))).toThrow(/nope/);
  });

  it('draws only from the injected rng', () => {
    const rng = createSeededRng(3);
    const before = randInt(createSeededRng(3), 0, 1000);
    generateRound('count', 1, 0, 'en', rng, 1);
    expect(randInt(createSeededRng(3), 0, 1000)).toBe(before);
  });
});

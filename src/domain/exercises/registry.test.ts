import { describe, expect, it } from 'vitest';
import type { TopicId } from '../shared/types';
import { getTopic, TOPICS } from './registry';

describe('registry', () => {
  it('registers all 12 topics in prototype order, with unique ids', () => {
    const ids = TOPICS.map((t) => t.id);
    expect(ids).toEqual([
      'count',
      'add',
      'sub',
      'mul',
      'div',
      'frac',
      'place',
      'time',
      'money',
      'geo',
      'pattern',
      'word',
    ]);
    expect(new Set(ids).size).toBe(12);
  });
  it('looks topics up by id', () => {
    expect(getTopic('mul').title.es).toBe('Multiplicación');
  });
  it('finds every registered topic by its own id', () => {
    for (const topic of TOPICS) expect(getTopic(topic.id)).toBe(topic);
  });
  it('throws for a topic that is not registered', () => {
    expect(() => getTopic('nope' as TopicId)).toThrow(/nope/);
  });
  it('gives every topic a title in both languages and an accent colour', () => {
    for (const topic of TOPICS) {
      expect(topic.title.en).not.toBe('');
      expect(topic.title.es).not.toBe('');
      expect(topic.accent).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

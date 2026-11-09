import { describe, expect, it } from 'vitest';
import { getTopic, TOPICS } from './registry';

describe('registry', () => {
  it('lists the implemented topics in prototype order, with unique ids', () => {
    const ids = TOPICS.map((t) => t.id);
    expect(ids.slice(0, 5)).toEqual(['count', 'add', 'sub', 'mul', 'div']);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('looks topics up by id', () => {
    expect(getTopic('mul').title.es).toBe('Multiplicación');
  });
  it('throws for a topic that is not registered yet', () => {
    expect(() => getTopic('word')).toThrow(/word/);
  });
  it('gives every topic a title in both languages and an accent colour', () => {
    for (const topic of TOPICS) {
      expect(topic.title.en).not.toBe('');
      expect(topic.title.es).not.toBe('');
      expect(topic.accent).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

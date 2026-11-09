import { describe, expect, it } from 'vitest';
import { progressKey } from './model';

describe('progressKey', () => {
  it('joins grade and topic', () => {
    expect(progressKey(3, 'mul')).toBe('3:mul');
    expect(progressKey(1, 'count')).toBe('1:count');
  });
});

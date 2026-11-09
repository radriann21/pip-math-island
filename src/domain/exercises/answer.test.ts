import { describe, expect, it } from 'vitest';
import { checkAnswer } from './answer';
import { makeQuestion } from './options';

const num = (answer: number) => ({ ...makeQuestion({ kind: 'num', prompt: 'p', answer }), topic: 'add' as const });
const choice = (answer: string) => ({
  ...makeQuestion({ kind: 'choice', prompt: 'p', answer, opts: [answer, 'x'] }),
  topic: 'add' as const,
});

describe('checkAnswer', () => {
  it('matches choice answers exactly', () => {
    expect(checkAnswer(choice('1,000'), '1,000')).toBe(true);
    expect(checkAnswer(choice('1,000'), '1000')).toBe(false);
    expect(checkAnswer(choice('Even'), 'even')).toBe(false);
  });
  it('accepts dot and comma decimals for numeric answers', () => {
    expect(checkAnswer(num(2.5), '2.5')).toBe(true);
    expect(checkAnswer(num(2.5), '2,5')).toBe(true);
    expect(checkAnswer(num(12), '12')).toBe(true);
  });
  it('tolerates tiny float error but not real differences', () => {
    expect(checkAnswer(num(0.3), String(0.1 + 0.2))).toBe(true);
    expect(checkAnswer(num(0.3), '0.31')).toBe(false);
    expect(checkAnswer(num(12), '13')).toBe(false);
  });
  it('rejects empty, blank and non-numeric input', () => {
    expect(checkAnswer(num(0), '')).toBe(false);
    expect(checkAnswer(num(0), '   ')).toBe(false);
    expect(checkAnswer(num(0), 'abc')).toBe(false);
    expect(checkAnswer(num(0), '.')).toBe(false);
    expect(checkAnswer(num(0), 'NaN')).toBe(false);
    expect(checkAnswer(num(5), '5abc')).toBe(false);
  });
  it('trims surrounding whitespace', () => {
    expect(checkAnswer(num(7), ' 7 ')).toBe(true);
  });
  it('rejects numeric input for a question with a non numeric answer', () => {
    expect(checkAnswer({ ...num(1), answer: 'x' }, '1')).toBe(false);
  });
});

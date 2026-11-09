import type { Question } from '../shared/types';

const NUMBER_INPUT = /^-?(\d+([.,]\d*)?|[.,]\d+)$/;
const TOLERANCE = 1e-6;

/**
 * Whether `input` is a correct answer. Choice questions need the exact label. Numeric questions
 * accept a comma or a dot as the decimal separator and tolerate float noise (1e-6); empty,
 * blank and non-numeric input is rejected.
 */
export function checkAnswer(q: Question, input: string): boolean {
  if (q.kind === 'choice') return input === q.answer;
  if (typeof q.answer !== 'number') return false;
  const text = input.trim();
  if (!NUMBER_INPUT.test(text)) return false;
  const value = Number.parseFloat(text.replace(',', '.'));
  return Number.isFinite(value) && Math.abs(value - q.answer) < TOLERANCE;
}

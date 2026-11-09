import { formatNumber } from '../shared/locale';
import type { Rng } from '../shared/rng';
import { pick, randInt } from '../shared/rng';
import type { Grade, Locale } from '../shared/types';
import { numberOptions } from './options';

export interface RaceQuestion {
  prompt: string;
  answer: string;
  opts: string[];
}

const MAX_OPERAND = [10, 20, 100, 200, 500, 1000] as const;

function operatorsFor(grade: Grade): string[] {
  if (grade === 1) return ['+', '−'];
  if (grade === 2) return ['+', '−', '×'];
  if (grade === 3) return ['×', '÷', '+', '−'];
  return ['×', '÷', '+', '−', '×'];
}

/** A quick mental-maths question with four numeric choices for the 60-second race. */
export function generateRaceQuestion(grade: Grade, locale: Locale, rng: Rng): RaceQuestion {
  const fmt = (n: number) => formatNumber(locale, n);
  const max = MAX_OPERAND[grade - 1] as number;
  const op = pick(rng, operatorsFor(grade));
  const factorMax = grade >= 4 ? 12 : 10;
  let a: number;
  let b: number;
  let answer: number;
  if (op === '+') {
    a = randInt(rng, 1, max);
    b = randInt(rng, 1, max);
    answer = a + b;
  } else if (op === '−') {
    a = randInt(rng, 2, max);
    b = randInt(rng, 1, a);
    answer = a - b;
  } else if (op === '×') {
    a = pick(rng, grade <= 2 ? [2, 5, 10] : [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    b = randInt(rng, 2, factorMax);
    answer = a * b;
  } else {
    b = randInt(rng, 2, factorMax);
    answer = randInt(rng, 2, factorMax);
    a = b * answer;
  }
  return {
    prompt: `${fmt(a)} ${op} ${fmt(b)}`,
    answer: fmt(answer),
    opts: numberOptions(rng, answer, false).map(fmt),
  };
}

import { formatFixed, formatNumber, t } from '../shared/locale';
import { atGrade, atTier, roundTo } from '../shared/math';
import { randInt } from '../shared/rng';
import type { GenContext } from '../shared/types';
import { equation, operator } from './markup';
import { arithmeticQuestion, numericQuestion, type QuestionDraft } from './options';
import { defineTopic } from './topic';
import { items } from './visuals';

/** Decimal places used by the decimal grades (5: tenths, 6: hundredths). */
const decimalPlaces = (grade: number) => (grade === 5 ? 1 : 2);

/** Pure step from operands to a question: the answer is always `a + b`. */
export function buildAddition(ctx: GenContext, a: number, b: number): QuestionDraft {
  const { grade, locale } = ctx;
  if (grade >= 5) {
    const places = decimalPlaces(grade);
    const sum = roundTo(a + b, places);
    const aText = formatFixed(locale, a, places);
    const bText = formatFixed(locale, b, places);
    return numericQuestion({
      prompt: `${aText} + ${bText} = ?`,
      answer: sum,
      decimal: true,
      hint: t(
        locale,
        'Line up the decimal points, then add column by column.',
        'Alinea las comas decimales y suma columna por columna.',
      ),
      why: `${aText} + ${bText} = ${formatFixed(locale, sum, places)}`,
    });
  }
  const fmt = (n: number) => formatNumber(locale, n);
  const vis =
    grade === 1 && a + b <= 20
      ? equation(items(a, 'apple', { sz: 26 }), operator('+'), items(b, 'starc', { sz: 26 }))
      : '';
  const hint =
    grade === 1
      ? t(locale, 'Count all the objects together.', 'Cuenta todos los objetos juntos.')
      : grade === 2
        ? t(locale, 'Add the tens first, then the ones.', 'Suma primero las decenas y luego las unidades.')
        : t(
            locale,
            'Add ones, then tens, then hundreds. Carry when you need to.',
            'Suma unidades, luego decenas, luego centenas. Lleva cuando haga falta.',
          );
  return arithmeticQuestion(ctx, {
    prompt: `${fmt(a)} + ${fmt(b)} = ?`,
    vis,
    answer: a + b,
    hint,
    why: `${fmt(a)} + ${fmt(b)} = ${fmt(a + b)}`,
  });
}

const SMALL_MAX = [
  [5, 10, 20],
  [30, 60, 100],
  [200, 500, 1000],
  [2000, 5000, 10000],
] as const;
const DECIMAL_MAX = { 5: [99, 300, 990], 6: [999, 3000, 9990] } as const;

export const addTopic = defineTopic({
  id: 'add',
  accent: '#ef8a17',
  title: { en: 'Addition', es: 'Suma' },
  build(ctx) {
    const { grade, tier, rng } = ctx;
    if (grade >= 5) {
      const places = decimalPlaces(grade);
      const k = Math.pow(10, places);
      const hi = atTier(DECIMAL_MAX[grade === 5 ? 5 : 6], tier);
      const a = randInt(rng, k + 1, hi) / k;
      const b = randInt(rng, k + 1, hi) / k;
      return buildAddition(ctx, a, b);
    }
    const max = atTier(atGrade(SMALL_MAX, grade), tier);
    let a: number;
    let b: number;
    if (grade === 1) {
      a = randInt(rng, 1, max - 1);
      b = randInt(rng, 1, max - a);
    } else {
      a = randInt(rng, Math.ceil(max * 0.1), Math.ceil(max * 0.8));
      b = randInt(rng, 1, max - a);
    }
    return buildAddition(ctx, a, b);
  },
});

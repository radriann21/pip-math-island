import { formatFixed, formatNumber, t } from '../shared/locale';
import { atGrade, atTier, roundTo } from '../shared/math';
import { randInt } from '../shared/rng';
import type { GenContext } from '../shared/types';
import { equation } from './markup';
import { arithmeticQuestion, numericQuestion, type QuestionDraft } from './options';
import { defineTopic } from './topic';
import { items } from './visuals';

const decimalPlaces = (grade: number) => (grade === 5 ? 1 : 2);

/** Pure step from operands to a question: the answer is always `a - b` (requires a >= b). */
export function buildSubtraction(ctx: GenContext, a: number, b: number): QuestionDraft {
  if (a < b) throw new RangeError(`subtraction would be negative: ${a} - ${b}`);
  const { grade, locale } = ctx;
  if (grade >= 5) {
    const places = decimalPlaces(grade);
    const diff = roundTo(a - b, places);
    const aText = formatFixed(locale, a, places);
    const bText = formatFixed(locale, b, places);
    return numericQuestion({
      prompt: `${aText} − ${bText} = ?`,
      answer: diff,
      decimal: true,
      hint: t(
        locale,
        'Line up the decimal points, then subtract. Borrow when you need to.',
        'Alinea las comas decimales y resta. Pide prestado cuando haga falta.',
      ),
      why: `${aText} − ${bText} = ${formatFixed(locale, diff, places)}`,
    });
  }
  const fmt = (n: number) => formatNumber(locale, n);
  const vis = grade === 1 && a <= 20 ? equation(items(a, 'cookie', { sz: 26, cross: b })) : '';
  const hint =
    grade === 1
      ? t(locale, 'Start with all of them, then take away the crossed-out ones.', 'Empieza con todos y quita los tachados.')
      : grade === 2
        ? t(
            locale,
            'Subtract the tens, then the ones. Or count up from the small number.',
            'Resta las decenas y luego las unidades. O cuenta hacia arriba desde el número pequeño.',
          )
        : t(
            locale,
            'Subtract column by column. Borrow when the top digit is smaller.',
            'Resta columna por columna. Pide prestado cuando la cifra de arriba sea menor.',
          );
  return arithmeticQuestion(ctx, {
    prompt: `${fmt(a)} − ${fmt(b)} = ?`,
    vis,
    answer: a - b,
    hint,
    why: `${fmt(a)} − ${fmt(b)} = ${fmt(a - b)}`,
  });
}

const SMALL_MAX = [
  [5, 10, 20],
  [30, 60, 100],
  [200, 500, 1000],
  [2000, 5000, 10000],
] as const;
const DECIMAL_MAX = { 5: [99, 300, 990], 6: [999, 3000, 9990] } as const;

export const subTopic = defineTopic({
  id: 'sub',
  accent: '#c99700',
  title: { en: 'Subtraction', es: 'Resta' },
  build(ctx) {
    const { grade, tier, rng } = ctx;
    if (grade >= 5) {
      const places = decimalPlaces(grade);
      const k = Math.pow(10, places);
      const hi = atTier(DECIMAL_MAX[grade === 5 ? 5 : 6], tier);
      const top = randInt(rng, k + 2, hi);
      const low = randInt(rng, 1, top - 1);
      return buildSubtraction(ctx, top / k, low / k);
    }
    const max = atTier(atGrade(SMALL_MAX, grade), tier);
    let a: number;
    if (grade === 1) a = randInt(rng, 2, max);
    else a = randInt(rng, Math.ceil(max * 0.3), max);
    const b = randInt(rng, 1, a - 1);
    return buildSubtraction(ctx, a, b);
  },
});

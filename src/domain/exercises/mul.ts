import { formatNumber, t } from '../shared/locale';
import { atTier, roundTo } from '../shared/math';
import { pick, randInt } from '../shared/rng';
import type { GenContext } from '../shared/types';
import { arithmeticQuestion, type QuestionDraft } from './options';
import { defineTopic } from './topic';
import { dotsArray } from './visuals';

/** Pure step from operands to a question: the answer is always `a x b` (decimal operands in grade 6). */
export function buildMultiplication(ctx: GenContext, a: number, b: number): QuestionDraft {
  const { grade, locale } = ctx;
  const fmt = (n: number) => formatNumber(locale, n);
  const decimal = grade === 6;
  const answer = decimal ? roundTo(a * b, 3) : a * b;
  const vis = grade <= 2 && a * b <= 60 && a <= 10 && b <= 10 ? dotsArray(a, b) : '';
  const hint =
    grade <= 2
      ? t(locale, `Think of ${a} groups with ${b} in each group.`, `Piensa en ${a} grupos con ${b} en cada uno.`)
      : grade === 3
        ? t(locale, 'Use skip counting or a fact you already know.', 'Cuenta de salto en salto o usa un dato que ya sabes.')
        : decimal
          ? t(
              locale,
              'Ignore the decimal point, multiply, then put the point back.',
              'Ignora la coma, multiplica y luego vuelve a ponerla.',
            )
          : t(
              locale,
              'Break it into parts: multiply the biggest place first, then add the pieces.',
              'Sepáralo en partes: multiplica cada posición y suma los resultados.',
            );
  return arithmeticQuestion(ctx, {
    prompt: `${fmt(a)} × ${fmt(b)} = ?`,
    vis,
    answer,
    decimals: decimal,
    hint,
    why: `${fmt(a)} × ${fmt(b)} = ${fmt(answer)}`,
  });
}

export const mulTopic = defineTopic({
  id: 'mul',
  accent: '#2fa66a',
  title: { en: 'Multiplication', es: 'Multiplicación' },
  build(ctx) {
    const { grade, tier, rng } = ctx;
    const r = (min: number, max: number) => randInt(rng, min, max);
    let a: number;
    let b: number;
    if (grade === 1) {
      a = pick(rng, atTier([[2], [5, 10], [2, 3, 4, 5]], tier));
      b = r(1, 5);
    } else if (grade === 2) {
      a = pick(rng, atTier([[2, 5, 10], [2, 3, 4, 5, 10], [2, 3, 4, 5, 6, 7, 8, 9, 10]], tier));
      b = r(1, 10);
    } else if (grade === 3) {
      a = r(2, atTier([5, 8, 10], tier));
      b = r(2, 10);
    } else if (grade === 4) {
      a = tier === 0 ? r(11, 30) : tier === 1 ? r(11, 99) : r(101, 999);
      b = r(2, atTier([5, 9, 9], tier));
    } else if (grade === 5) {
      a = tier === 0 ? r(12, 40) : tier === 1 ? r(100, 500) : r(100, 999);
      b = tier === 0 ? r(11, 20) : tier === 1 ? r(11, 30) : r(12, 60);
    } else if (tier === 0) {
      a = r(11, 99) / 10;
      b = pick(rng, [10, 100]);
    } else if (tier === 1) {
      a = r(11, 99) / 10;
      b = r(2, 9);
    } else {
      a = r(101, 999) / 100;
      b = r(2, 9);
    }
    return buildMultiplication(ctx, a, b);
  },
});

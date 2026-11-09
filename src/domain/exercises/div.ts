import { formatNumber, t } from '../shared/locale';
import { atTier, roundTo } from '../shared/math';
import { pick, randInt } from '../shared/rng';
import type { GenContext } from '../shared/types';
import { equation, operator } from './markup';
import { arithmeticQuestion, type QuestionDraft } from './options';
import { defineTopic } from './topic';
import { items, plates } from './visuals';

/**
 * Pure step from operands to a question: the answer is `a / b`. Grades 1-5 expect an exact
 * division; grade 6 is a decimal quotient rounded to two places.
 */
export function buildDivision(ctx: GenContext, a: number, b: number): QuestionDraft {
  const { grade, locale } = ctx;
  const fmt = (n: number) => formatNumber(locale, n);
  const decimal = grade === 6;
  const answer = decimal ? roundTo(a / b, 2) : a / b;
  const vis =
    grade === 1 ? equation(items(a, 'cookie', { sz: 26 }), operator('→'), plates(b)) : '';
  const hint =
    grade === 1
      ? t(
          locale,
          'Give one to each plate again and again until none are left.',
          'Pon uno en cada plato una y otra vez hasta que no quede ninguno.',
        )
      : grade <= 3
        ? t(locale, `Ask yourself: ${b} times what number makes ${a}?`, `Pregúntate: ${b} por qué número da ${a}.`)
        : t(
            locale,
            'Divide one place at a time, from the left. Check by multiplying back.',
            'Divide una posición a la vez, desde la izquierda. Comprueba multiplicando.',
          );
  return arithmeticQuestion(ctx, {
    prompt: `${fmt(a)} ÷ ${fmt(b)} = ?`,
    vis,
    answer,
    decimals: decimal,
    hint,
    why: `${fmt(a)} ÷ ${fmt(b)} = ${fmt(answer)}`,
  });
}

export const divTopic = defineTopic({
  id: 'div',
  accent: '#1d9fb0',
  title: { en: 'Division', es: 'División' },
  build(ctx) {
    const { grade, tier, rng } = ctx;
    const r = (min: number, max: number) => randInt(rng, min, max);
    let divisor: number;
    let quotient: number;
    if (grade === 1) {
      divisor = tier === 0 ? 2 : pick(rng, [2, 3, 5]);
      quotient = r(1, 5);
    } else if (grade === 2) {
      divisor = pick(rng, atTier([[2, 5, 10], [2, 3, 4, 5, 10], [2, 3, 4, 5, 6, 7, 8, 9, 10]], tier));
      quotient = r(1, 10);
    } else if (grade === 3) {
      divisor = r(2, atTier([5, 8, 10], tier));
      quotient = r(2, 10);
    } else if (grade === 4) {
      divisor = r(2, atTier([5, 9, 9], tier));
      quotient = tier === 0 ? r(11, 30) : tier === 1 ? r(11, 99) : r(101, 300);
    } else if (grade === 5) {
      divisor = tier === 0 ? r(11, 15) : tier === 1 ? r(11, 30) : r(12, 45);
      quotient = tier === 0 ? r(11, 40) : tier === 1 ? r(20, 99) : r(50, 200);
    } else {
      divisor = pick(rng, [2, 4, 5]);
      return buildDivision(ctx, r(7, atTier([40, 99, 300], tier)), divisor);
    }
    return buildDivision(ctx, divisor * quotient, divisor);
  },
});

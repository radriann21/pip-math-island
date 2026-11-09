import { t } from '../shared/locale';
import { atTier, gcd, lcm } from '../shared/math';
import { pick, randInt } from '../shared/rng';
import type { GenContext } from '../shared/types';
import { equation, fraction } from './markup';
import { choiceQuestion, numericQuestion, type QuestionDraft } from './options';
import { defineTopic } from './topic';
import { bar, pie } from './visuals';

/** A fraction as `[numerator, denominator]`. */
export type Fraction = readonly [number, number];

/** Whether two fractions have the same value (cross-multiplication, exact for integers). */
export function sameFractionValue(a: Fraction, b: Fraction): boolean {
  return a[0] * b[1] === b[0] * a[1];
}

const label = (f: Fraction) => fraction(f[0], f[1]);

/**
 * Distractor labels for `answer`: candidates with a different value than the answer (and than
 * each other), so a choice can never offer two mathematically correct fractions.
 */
function distractors(answer: Fraction, candidates: readonly Fraction[]): string[] {
  const kept: Fraction[] = [];
  for (const c of candidates) {
    if (c[1] <= 0 || sameFractionValue(c, answer)) continue;
    if (kept.some((k) => sameFractionValue(k, c))) continue;
    kept.push(c);
  }
  return kept.map(label);
}

/** "What fraction of the circle (or bar) is colored?" for `n` of `den` equal parts. */
export function buildIdentifyFraction(
  ctx: GenContext,
  n: number,
  den: number,
  shape: 'pie' | 'bar' = 'pie',
): QuestionDraft {
  if (!(n > 0 && n < den)) throw new RangeError(`expected 0 < n < den, got ${n}/${den}`);
  const { locale, rng } = ctx;
  const answer: Fraction = [n, den];
  return choiceQuestion(rng, {
    prompt:
      shape === 'pie'
        ? t(locale, 'What fraction of the circle is colored?', '¿Qué fracción del círculo está coloreada?')
        : t(locale, 'What fraction of the bar is colored?', '¿Qué fracción de la barra está coloreada?'),
    vis: shape === 'pie' ? pie(n, den) : bar(n, den),
    answer: label(answer),
    wrong: distractors(answer, [
      [den - n, den],
      [n, den + 1],
      [Math.min(n + 1, den), den],
      [n, Math.max(den - 1, 2)],
    ]),
    hint: t(
      locale,
      'Count the colored parts (top number) and all the equal parts (bottom number).',
      'Cuenta las partes coloreadas (arriba) y todas las partes iguales (abajo).',
    ),
    why: t(locale, `${n} of ${den} equal parts are colored.`, `${n} de ${den} partes iguales están coloreadas.`),
  });
}

/** "Which fraction is bigger?" with the two fractions drawn as bars. They must differ in value. */
export function buildCompareFractions(ctx: GenContext, a: Fraction, b: Fraction): QuestionDraft {
  if (sameFractionValue(a, b)) throw new RangeError('cannot compare two fractions of equal value');
  const { locale, rng } = ctx;
  const big = a[0] * b[1] > b[0] * a[1] ? a : b;
  const hint =
    a[1] === b[1]
      ? t(
          locale,
          'Same bottom number: the bigger top number means more pieces.',
          'Mismo denominador: el numerador mayor significa más pedazos.',
        )
      : a[0] === b[0]
        ? t(
            locale,
            'Same top number: the smaller the bottom number, the bigger each piece.',
            'Mismo numerador: cuanto menor el denominador, más grande es cada pedazo.',
          )
        : t(locale, 'Compare how much of each bar is colored.', 'Compara cuánto de cada barra está coloreado.');
  return choiceQuestion(rng, {
    prompt: t(locale, 'Which fraction is bigger?', '¿Qué fracción es mayor?'),
    vis: equation(`<div>${bar(a[0], a[1])}</div>`, `<div>${bar(b[0], b[1])}</div>`),
    answer: label(big),
    wrong: [label(a), label(b)],
    hint,
    why: t(locale, `${big[0]}/${big[1]} covers more of the bar.`, `${big[0]}/${big[1]} cubre más de la barra.`),
  });
}

/** `a/b = ?/(b*k)`: the answer is the new numerator `a*k`. */
export function buildEquivalentFraction(ctx: GenContext, a: number, b: number, k: number): QuestionDraft {
  const { locale } = ctx;
  return numericQuestion({
    prompt: `${fraction(a, b)} = ${fraction('?', b * k)}`,
    answer: a * k,
    hint: t(locale, 'Multiply the top and the bottom by the same number.', 'Multiplica arriba y abajo por el mismo número.'),
    why: `${fraction(a, b)} = ${fraction(a * k, b * k)} (×${k})`,
  });
}

/** `a/den + b/den = ?/den`: the answer is the new numerator `a+b`. */
export function buildAddSameDenominator(ctx: GenContext, a: number, b: number, den: number): QuestionDraft {
  const { locale } = ctx;
  return numericQuestion({
    prompt: `${fraction(a, den)} + ${fraction(b, den)} = ${fraction('?', den)}`,
    answer: a + b,
    hint: t(
      locale,
      'The bottom number stays the same. Just add the top numbers.',
      'El denominador no cambia. Solo suma los numeradores.',
    ),
    why: `${fraction(a, den)} + ${fraction(b, den)} = ${fraction(a + b, den)}`,
  });
}

/** `n/dn of dn*k`: divide by the denominator, multiply by the numerator. */
export function buildFractionOfNumber(ctx: GenContext, n: number, dn: number, k: number): QuestionDraft {
  const { locale } = ctx;
  const total = dn * k;
  return numericQuestion({
    prompt: t(locale, `What is ${fraction(n, dn)} of ${total}?`, `¿Cuánto es ${fraction(n, dn)} de ${total}?`),
    answer: n * k,
    hint: t(locale, `Divide ${total} by ${dn}, then multiply by ${n}.`, `Divide ${total} entre ${dn} y multiplica por ${n}.`),
    why: `${total} ÷ ${dn} = ${k}; ${k} × ${n} = ${n * k}`,
  });
}

/** `x + y` over the least common denominator, with value-distinct distractors. */
export function buildAddUnlike(ctx: GenContext, x: Fraction, y: Fraction): QuestionDraft {
  const { locale, rng } = ctx;
  const den = lcm(x[1], y[1]);
  const answer: Fraction = [x[0] * (den / x[1]) + y[0] * (den / y[1]), den];
  return choiceQuestion(rng, {
    prompt: `${label(x)} + ${label(y)} = ?`,
    answer: label(answer),
    wrong: distractors(answer, [
      [x[0] + y[0], x[1] + y[1]],
      [answer[0], x[1]],
      [x[0] + y[0], den],
      [answer[0] + 1, den],
    ]),
    hint: t(
      locale,
      'First make the bottom numbers the same, then add the top numbers.',
      'Primero iguala los denominadores y luego suma los numeradores.',
    ),
    why: `${label(x)} + ${label(y)} = ${label(answer)}`,
  });
}

/** Simplify `p*k` to `p`; `p` must already be in lowest terms. */
export function buildSimplify(ctx: GenContext, p: Fraction, k: number): QuestionDraft {
  if (gcd(p[0], p[1]) !== 1) throw new RangeError(`${p[0]}/${p[1]} is not in lowest terms`);
  const { locale, rng } = ctx;
  const unreduced: Fraction = [p[0] * k, p[1] * k];
  return choiceQuestion(rng, {
    prompt: t(
      locale,
      `Write ${label(unreduced)} in simplest form.`,
      `Escribe ${label(unreduced)} en su forma más simple.`,
    ),
    answer: label(p),
    wrong: distractors(p, [
      [p[0] * k, p[1]],
      [p[0], p[1] + 1],
      [p[0] + 1, p[1]],
      [p[0] * k, p[1] * k + 1],
    ]),
    hint: t(
      locale,
      'Divide the top and the bottom by the same number until you can not go further.',
      'Divide arriba y abajo entre el mismo número hasta que no se pueda más.',
    ),
    why: `${label(unreduced)} = ${label(p)} (÷${k})`,
  });
}

type FracType = 'id' | 'cmp' | 'equiv' | 'addSame' | 'ofnum' | 'addUnlike' | 'simplify';

function typesFor(grade: number): FracType[] {
  if (grade === 1) return ['id'];
  if (grade === 2) return ['id', 'id', 'cmp'];
  if (grade === 3) return ['id', 'cmp', 'cmp'];
  if (grade === 4) return ['equiv', 'addSame', 'id'];
  if (grade === 5) return ['ofnum', 'addSame', 'equiv', 'addUnlike'];
  return ['simplify', 'addUnlike', 'ofnum', 'addUnlike'];
}

const SIMPLE_FRACTIONS: readonly Fraction[] = [
  [1, 2],
  [2, 3],
  [3, 4],
  [1, 3],
  [2, 5],
  [3, 5],
  [1, 4],
  [3, 8],
  [5, 6],
];

const UNLIKE_PAIRS: readonly (readonly [number, number])[] = [
  [2, 3],
  [2, 5],
  [3, 4],
  [3, 5],
  [2, 4],
];

export const fracTopic = defineTopic({
  id: 'frac',
  accent: '#4c8dff',
  title: { en: 'Fractions', es: 'Fracciones' },
  build(ctx): QuestionDraft {
    const { grade, tier, rng } = ctx;
    const r = (min: number, max: number) => randInt(rng, min, max);
    const type = pick(rng, typesFor(grade));

    if (type === 'id') {
      const dens =
        grade === 1 ? (tier === 0 ? [2, 4] : [2, 3, 4]) : grade === 2 ? [2, 3, 4, 6, 8] : [2, 3, 4, 5, 6, 8, 10];
      const den = pick(rng, dens);
      return buildIdentifyFraction(ctx, r(1, den - 1), den, pick(rng, ['pie', 'bar']));
    }

    if (type === 'cmp') {
      if (grade >= 3 && tier >= 1 && rng() < 0.5) {
        const x = pick(rng, [2, 3, 4, 5, 6, 8]);
        const y = pick(rng, [2, 3, 4, 5, 6, 8].filter((v) => v !== x));
        return buildCompareFractions(ctx, [1, x], [1, y]);
      }
      const den = pick(rng, [4, 5, 6, 8, 10]);
      const n1 = r(1, den - 1);
      let n2 = r(1, den - 1);
      if (n1 === n2) n2 = n1 === den - 1 ? 1 : n1 + 1;
      return buildCompareFractions(ctx, [n1, den], [n2, den]);
    }

    if (type === 'equiv') {
      const b = r(2, 6);
      return buildEquivalentFraction(ctx, r(1, b - 1), b, r(2, 5));
    }

    if (type === 'addSame') {
      const den = r(3, 12);
      const a = r(1, den - 2);
      const b = r(1, grade === 4 ? den - a : den - 1);
      return buildAddSameDenominator(ctx, a, b, den);
    }

    if (type === 'ofnum') {
      const dn = r(2, atTier([5, 8, 10], tier));
      return buildFractionOfNumber(ctx, r(1, dn - 1), dn, r(2, atTier([6, 8, 10], tier)));
    }

    if (type === 'addUnlike') {
      // Grade 5 pairs a denominator with its double; grade 6 uses coprime-ish pairs.
      const [b, e] =
        grade === 5
          ? (() => {
              const base = pick(rng, [2, 3, 4, 5]);
              return [base, base * 2] as const;
            })()
          : pick(rng, UNLIKE_PAIRS);
      return buildAddUnlike(ctx, [1, b], [r(1, e - 1), e]);
    }

    return buildSimplify(ctx, pick(rng, SIMPLE_FRACTIONS), r(2, 5));
  },
});

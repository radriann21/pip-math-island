import { formatNumber, t } from '../shared/locale';
import { atTier } from '../shared/math';
import { pick, randInt } from '../shared/rng';
import type { GenContext } from '../shared/types';
import { EMPTY_BOX } from './markup';
import { arithmeticQuestion, numericQuestion, type QuestionDraft } from './options';
import { defineTopic } from './topic';
import { sequenceBoxes } from './visuals';

/** How a sequence moves from one term to the next. A negative `step` descends. */
export type SequenceRule = { kind: 'add'; step: number } | { kind: 'multiply'; factor: number };

const nextTerm = (rule: SequenceRule, term: number) =>
  rule.kind === 'add' ? term + rule.step : term * rule.factor;

/**
 * `length` terms starting at `first`. Throws when a term would be negative or two neighbouring
 * terms would be equal, so a sequence never needs clamping and its gap has exactly one answer.
 */
export function sequenceTerms(first: number, rule: SequenceRule, length = 5): number[] {
  const terms = [first];
  for (let i = 1; i < length; i++) terms.push(nextTerm(rule, terms[i - 1] as number));
  if (terms.some((x) => x < 0)) throw new RangeError(`sequence ${terms.join(', ')} goes negative`);
  if (terms.some((x, i) => i > 0 && x === terms[i - 1])) {
    throw new RangeError(`sequence ${terms.join(', ')} repeats a term`);
  }
  return terms;
}

function describeRule(locale: GenContext['locale'], rule: SequenceRule): string {
  const fmt = (n: number) => formatNumber(locale, n);
  if (rule.kind === 'multiply') {
    return t(locale, `Each step multiplies by ${fmt(rule.factor)}`, `Cada paso multiplica por ${fmt(rule.factor)}`);
  }
  return rule.step >= 0
    ? t(locale, `Each step adds ${fmt(rule.step)}`, `Cada paso suma ${fmt(rule.step)}`)
    : t(locale, `Each step subtracts ${fmt(-rule.step)}`, `Cada paso resta ${fmt(-rule.step)}`);
}

/** "What number goes in the empty box?" for the term at `hide` (never the first one). */
export function buildSequenceQuestion(
  ctx: GenContext,
  terms: readonly number[],
  hide: number,
  rule: SequenceRule,
): QuestionDraft {
  if (hide < 1 || hide >= terms.length) throw new RangeError(`cannot hide term ${hide}`);
  if (terms.some((x, i) => i > 0 && x !== nextTerm(rule, terms[i - 1] as number))) {
    throw new RangeError('the terms do not follow the rule');
  }
  const { locale } = ctx;
  const answer = terms[hide] as number;
  return arithmeticQuestion(ctx, {
    prompt: t(locale, 'What number goes in the empty box?', '¿Qué número va en el recuadro vacío?'),
    vis: sequenceBoxes(locale, terms, hide),
    answer,
    hint: t(
      locale,
      'Look at how much the numbers change from one box to the next. Find the rule.',
      'Mira cuánto cambian los números de una casilla a la siguiente. Encuentra la regla.',
    ),
    why: t(
      locale,
      `${describeRule(locale, rule)}, so the missing number is ${formatNumber(locale, answer)}.`,
      `${describeRule(locale, rule)}, así que el número que falta es ${formatNumber(locale, answer)}.`,
    ),
  });
}

/** An equation with one empty box; the fields name the numbers a child sees or must find. */
export type MissingNumberSpec =
  | { kind: 'addend'; missing: number; other: number } // □ + other = missing + other
  | { kind: 'subtrahend'; missing: number; difference: number } // (missing + difference) − □ = difference
  | { kind: 'factor'; missing: number; other: number } // other × □ = other * missing
  | { kind: 'dividend'; divisor: number; quotient: number }; // □ ÷ divisor = quotient

export function buildMissingNumber(ctx: GenContext, spec: MissingNumberSpec): QuestionDraft {
  const { locale } = ctx;
  if (spec.kind === 'addend') {
    const { missing, other } = spec;
    return numericQuestion({
      prompt: `${EMPTY_BOX} + ${other} = ${missing + other}`,
      answer: missing,
      hint: t(locale, 'Undo the adding: subtract.', 'Deshaz la suma: resta.'),
      why: `${missing + other} − ${other} = ${missing}`,
    });
  }
  if (spec.kind === 'subtrahend') {
    const { missing, difference } = spec;
    return numericQuestion({
      prompt: `${missing + difference} − ${EMPTY_BOX} = ${difference}`,
      answer: missing,
      hint: t(
        locale,
        'How much was taken away? Subtract the result from the start.',
        '¿Cuánto se quitó? Resta el resultado del inicio.',
      ),
      why: `${missing + difference} − ${difference} = ${missing}`,
    });
  }
  if (spec.kind === 'factor') {
    const { missing, other } = spec;
    return numericQuestion({
      prompt: `${other} × ${EMPTY_BOX} = ${other * missing}`,
      answer: missing,
      hint: t(locale, 'Undo the multiplying: divide.', 'Deshaz la multiplicación: divide.'),
      why: `${other * missing} ÷ ${other} = ${missing}`,
    });
  }
  const { divisor, quotient } = spec;
  return numericQuestion({
    prompt: `${EMPTY_BOX} ÷ ${divisor} = ${quotient}`,
    answer: divisor * quotient,
    hint: t(locale, 'Undo the dividing: multiply.', 'Deshaz la división: multiplica.'),
    why: `${quotient} × ${divisor} = ${divisor * quotient}`,
  });
}

/** An equation in `x` solved by one or two inverse steps. */
export type AlgebraSpec =
  | { kind: 'add'; x: number; b: number } // x + b = ...
  | { kind: 'multiply'; x: number; m: number } // mx = ...
  | { kind: 'twoStep'; x: number; m: number; b: number } // mx + b = ...
  | { kind: 'divide'; m: number; quotient: number }; // x ÷ m = quotient

export function buildAlgebra(ctx: GenContext, spec: AlgebraSpec): QuestionDraft {
  const { locale } = ctx;
  if (spec.kind === 'add') {
    const { x, b } = spec;
    return numericQuestion({
      prompt: `x + ${b} = ${x + b}`,
      answer: x,
      hint: t(locale, 'Subtract the same number from both sides.', 'Resta el mismo número en ambos lados.'),
      why: `x = ${x + b} − ${b} = ${x}`,
    });
  }
  if (spec.kind === 'multiply') {
    const { x, m } = spec;
    return numericQuestion({
      prompt: `${m}x = ${m * x}`,
      answer: x,
      hint: t(
        locale,
        'Divide both sides by the number next to x.',
        'Divide ambos lados entre el número junto a x.',
      ),
      why: `x = ${m * x} ÷ ${m} = ${x}`,
    });
  }
  if (spec.kind === 'twoStep') {
    const { x, m, b } = spec;
    return numericQuestion({
      prompt: `${m}x + ${b} = ${m * x + b}`,
      answer: x,
      hint: t(locale, 'First subtract, then divide.', 'Primero resta y luego divide.'),
      why: `${m * x + b} − ${b} = ${m * x}; ${m * x} ÷ ${m} = ${x}`,
    });
  }
  const { m, quotient } = spec;
  return numericQuestion({
    prompt: `x ÷ ${m} = ${quotient}`,
    answer: m * quotient,
    hint: t(locale, 'Multiply both sides by the number.', 'Multiplica ambos lados por el número.'),
    why: `x = ${quotient} × ${m} = ${m * quotient}`,
  });
}

export const patternTopic = defineTopic({
  id: 'pattern',
  accent: '#f06a3c',
  title: { en: 'Patterns & Puzzles', es: 'Patrones y acertijos' },
  build(ctx): QuestionDraft {
    const { grade, tier, rng } = ctx;
    const r = (min: number, max: number) => randInt(rng, min, max);
    const ascending = (step: number, startMultiple: number, hideFrom = 1) => {
      const rule: SequenceRule = { kind: 'add', step };
      return buildSequenceQuestion(ctx, sequenceTerms(startMultiple, rule), r(hideFrom, 4), rule);
    };

    if (grade === 1) {
      const step = pick(rng, tier === 0 ? [1, 2] : [1, 2, 5, 10]);
      const rule: SequenceRule = { kind: 'add', step };
      return buildSequenceQuestion(ctx, sequenceTerms(r(0, 10), rule), 4, rule);
    }
    if (grade === 2) {
      const step = pick(rng, [2, 3, 4, 5, 10]);
      return ascending(step, r(0, 3) * step);
    }
    if (grade === 3) {
      const step = pick(rng, atTier([[3, 4, 6, 7], [6, 7, 8, 9, 25], [12, 25, 50, 100]], tier));
      const start = r(0, 5) * step;
      if (rng() < 0.3) {
        // Descend from the top of the ascending run so the last term is still the (non-negative) start.
        const rule: SequenceRule = { kind: 'add', step: -step };
        return buildSequenceQuestion(ctx, sequenceTerms(start + 4 * step, rule), r(1, 4), rule);
      }
      return ascending(step, start);
    }
    if (grade === 4) {
      if (rng() < 0.5) {
        const rule: SequenceRule = { kind: 'multiply', factor: pick(rng, tier === 0 ? [2] : [2, 3]) };
        return buildSequenceQuestion(ctx, sequenceTerms(r(1, 5), rule), r(3, 4), rule);
      }
      const step = pick(rng, [13, 17, 25, 35, 125]);
      return ascending(step, r(0, 5) * step);
    }

    const kind = pick(rng, ['a', 'b', 'c', 'd'] as const);
    if (grade === 5) {
      const x = r(2, atTier([12, 30, 60], tier));
      const b = r(2, atTier([9, 20, 50], tier));
      const m = r(2, 9);
      const y = r(2, atTier([9, 12, 12], tier));
      if (kind === 'a') return buildMissingNumber(ctx, { kind: 'addend', missing: x, other: b });
      if (kind === 'b') return buildMissingNumber(ctx, { kind: 'subtrahend', missing: b, difference: x });
      if (kind === 'c') return buildMissingNumber(ctx, { kind: 'factor', missing: y, other: m });
      return buildMissingNumber(ctx, { kind: 'dividend', divisor: m, quotient: y });
    }
    const x = r(2, atTier([12, 25, 50], tier));
    const b = r(2, atTier([12, 30, 60], tier));
    const m = r(2, 9);
    if (kind === 'a') return buildAlgebra(ctx, { kind: 'add', x, b });
    if (kind === 'b') return buildAlgebra(ctx, { kind: 'multiply', x, m });
    if (kind === 'c') return buildAlgebra(ctx, { kind: 'twoStep', x, m, b });
    return buildAlgebra(ctx, { kind: 'divide', m, quotient: x });
  },
});

import { formatNumber } from '../shared/locale';
import { roundTo } from '../shared/math';
import type { Rng } from '../shared/rng';
import { shuffle } from '../shared/rng';
import type { GenContext, Question } from '../shared/types';

/** A question before the round/topic stamps `topic` on it. Generators build drafts. */
export type QuestionDraft = Omit<Question, 'topic'>;

type DraftInput = Partial<QuestionDraft> & Pick<QuestionDraft, 'kind' | 'prompt' | 'answer'>;

/** Fills the optional question fields with their defaults. */
export function makeQuestion(input: DraftInput): QuestionDraft {
  return { vis: '', hint: '', why: '', decimal: false, ...input };
}

const INTEGER_STEPS = [1, -1, 2, -2, 10, -10, 5, -5, 100, -100, 3, -3];
const DECIMAL_STEPS = [0.1, -0.1, 0.01, -0.01, 1, -1, 10, -10, 0.5, -0.5];

/**
 * Four unique, non-negative numbers that include `answer`, shuffled. Distractors are near misses
 * (+-1, +-10, ...). With `decimals` the steps are fractional and values keep two decimals.
 */
export function numberOptions(rng: Rng, answer: number, decimals: boolean): number[] {
  const places = decimals ? 2 : 0;
  const set = new Set<number>([answer]);
  for (const step of shuffle(rng, decimals ? DECIMAL_STEPS : INTEGER_STEPS)) {
    if (set.size >= 4) break;
    const candidate = roundTo(answer + step, places);
    if (candidate >= 0 && !set.has(candidate)) set.add(candidate);
  }
  let k = 3;
  while (set.size < 4) {
    set.add(roundTo(answer + k * (decimals ? 0.1 : 1), places));
    k++;
  }
  return shuffle(rng, Array.from(set));
}

export interface ChoiceSpec {
  prompt: string;
  vis?: string;
  answer: string;
  /** Distractors; duplicates and the answer itself are dropped, at most 3 are kept. */
  wrong: readonly string[];
  hint: string;
  why: string;
}

/** A multiple-choice question from a correct label and distractor labels. */
export function choiceQuestion(rng: Rng, spec: ChoiceSpec): QuestionDraft {
  const labels = [spec.answer];
  for (const w of spec.wrong) if (!labels.includes(w)) labels.push(w);
  return makeQuestion({
    kind: 'choice',
    prompt: spec.prompt,
    vis: spec.vis ?? '',
    answer: spec.answer,
    opts: shuffle(rng, labels.slice(0, 4)),
    hint: spec.hint,
    why: spec.why,
  });
}

export interface NumberSpec {
  prompt: string;
  vis?: string;
  answer: number;
  /** Choice distractors use decimal steps (choice) / keypad shows the decimal key (num). */
  decimals?: boolean;
  hint: string;
  why: string;
}

/** A multiple-choice question whose labels are locale-formatted numbers. */
export function numberChoiceQuestion(
  ctx: Pick<GenContext, 'rng' | 'locale'>,
  spec: NumberSpec,
): QuestionDraft {
  const fmt = (n: number) => formatNumber(ctx.locale, n);
  return makeQuestion({
    kind: 'choice',
    prompt: spec.prompt,
    vis: spec.vis ?? '',
    answer: fmt(spec.answer),
    opts: numberOptions(ctx.rng, spec.answer, spec.decimals ?? false).map(fmt),
    hint: spec.hint,
    why: spec.why,
  });
}

/** A keypad question with a numeric answer. */
export function numericQuestion(spec: Omit<NumberSpec, 'decimals'> & { decimal?: boolean }): QuestionDraft {
  return makeQuestion({
    kind: 'num',
    prompt: spec.prompt,
    vis: spec.vis ?? '',
    answer: spec.answer,
    decimal: spec.decimal ?? false,
    hint: spec.hint,
    why: spec.why,
  });
}

/**
 * Younger children get choices, older ones type the answer: choice when grade <= 2 or
 * (grade 3 and tier 0), otherwise numeric.
 */
export function arithmeticQuestion(
  ctx: Pick<GenContext, 'grade' | 'tier' | 'rng' | 'locale'>,
  spec: NumberSpec,
): QuestionDraft {
  const choice = ctx.grade <= 2 || (ctx.grade === 3 && ctx.tier === 0);
  return choice
    ? numberChoiceQuestion(ctx, spec)
    : numericQuestion({ ...spec, decimal: spec.decimals ?? false });
}

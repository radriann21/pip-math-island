import { t } from '../shared/locale';
import { atGrade, atTier } from '../shared/math';
import { pick, randInt } from '../shared/rng';
import type { GenContext } from '../shared/types';
import { numberChoiceQuestion, numericQuestion, type QuestionDraft } from './options';
import { defineTopic } from './topic';

export interface WordItem {
  en: string;
  es: string;
  /** Spanish grammatical gender of the plural noun: "cuántas manzanas" vs "cuántos libros". */
  feminine: boolean;
}

export const WORD_ITEMS: readonly WordItem[] = [
  { en: 'apples', es: 'manzanas', feminine: true },
  { en: 'stickers', es: 'stickers', feminine: false },
  { en: 'marbles', es: 'canicas', feminine: true },
  { en: 'books', es: 'libros', feminine: false },
  { en: 'cookies', es: 'galletas', feminine: true },
  { en: 'pencils', es: 'lápices', feminine: false },
  { en: 'balloons', es: 'globos', feminine: false },
  { en: 'shells', es: 'conchas', feminine: true },
];

export const WORD_NAMES: readonly string[] = ['Mia', 'Leo', 'Sofía', 'Max', 'Zoe', 'Sam', 'Ana', 'Noah', 'Luca', 'Emma'];

/** Who is in the story: the main character, a second person and what they count. */
export interface WordScene {
  name: string;
  other: string;
  item: WordItem;
}

export type WordSpec =
  | { op: 'add'; a: number; b: number }
  | { op: 'sub'; a: number; b: number }
  | { op: 'mul'; groups: number; each: number }
  | { op: 'div'; groups: number; each: number }
  /** `packs` packs of `each`, then `change` more received (gain) or given away. */
  | { op: 'two'; packs: number; each: number; change: number; gain: boolean };

/**
 * A word problem for one scene. The Spanish "cuántas/cuántos" follows the gender of the item.
 * Grade 1 gets choices, later grades a keypad. Throws when the answer would not be a positive whole number.
 */
export function buildWordProblem(ctx: GenContext, scene: WordScene, spec: WordSpec): QuestionDraft {
  const { locale } = ctx;
  const { name: nm, other: nm2 } = scene;
  const th = t(locale, scene.item.en, scene.item.es);
  const C = scene.item.feminine ? 'Cuántas' : 'Cuántos';
  let prompt: string;
  let answer: number;
  let why: string;

  if (spec.op === 'add') {
    const { a, b } = spec;
    answer = a + b;
    why = `${a} + ${b} = ${answer}`;
    prompt = t(
      locale,
      `${nm} has ${a} ${th}. ${nm2} gives ${nm} ${b} more. How many ${th} does ${nm} have now?`,
      `${nm} tiene ${a} ${th}. ${nm2} le da ${b} más. ¿${C} ${th} tiene ${nm} ahora?`,
    );
  } else if (spec.op === 'sub') {
    const { a, b } = spec;
    answer = a - b;
    why = `${a} − ${b} = ${answer}`;
    prompt = t(
      locale,
      `${nm} has ${a} ${th} and gives ${b} to ${nm2}. How many ${th} does ${nm} have left?`,
      `${nm} tiene ${a} ${th} y le regala ${b} a ${nm2}. ¿${C} le quedan a ${nm}?`,
    );
  } else if (spec.op === 'mul') {
    const { groups, each } = spec;
    answer = groups * each;
    why = `${groups} × ${each} = ${answer}`;
    prompt = t(
      locale,
      `There are ${groups} boxes. Each box has ${each} ${th}. How many ${th} are there in all?`,
      `Hay ${groups} cajas. Cada caja tiene ${each} ${th}. ¿${C} ${th} hay en total?`,
    );
  } else if (spec.op === 'div') {
    const { groups, each } = spec;
    const total = groups * each;
    answer = each;
    why = `${total} ÷ ${groups} = ${each}`;
    prompt = t(
      locale,
      `${nm} shares ${total} ${th} equally among ${groups} friends. How many ${th} does each friend get?`,
      `${nm} reparte ${total} ${th} en partes iguales entre ${groups} amigos. ¿${C} ${th} recibe cada amigo?`,
    );
  } else {
    const { packs, each, change, gain } = spec;
    const product = packs * each;
    answer = gain ? product + change : product - change;
    why = `${packs} × ${each} = ${product}; ${product} ${gain ? '+' : '−'} ${change} = ${answer}`;
    const buys = t(
      locale,
      `${nm} buys ${packs} packs with ${each} ${th} in each pack.`,
      `${nm} compra ${packs} paquetes con ${each} ${th} cada uno.`,
    );
    prompt = gain
      ? `${buys} ${t(
          locale,
          `Then ${nm2} gives ${nm} ${change} more. How many ${th} does ${nm} have now?`,
          `Luego ${nm2} le da ${change} más. ¿${C} ${th} tiene ${nm} ahora?`,
        )}`
      : `${buys} ${t(
          locale,
          `Then ${nm} gives away ${change}. How many ${th} are left?`,
          `Luego regala ${change}. ¿${C} le quedan?`,
        )}`;
  }

  if (!(answer > 0) || !Number.isInteger(answer)) {
    throw new RangeError(`word problem needs a positive whole answer, got ${answer}`);
  }
  const hint = t(
    locale,
    'Decide: do you add, subtract, multiply or divide? Look for clue words.',
    'Decide: ¿sumas, restas, multiplicas o divides? Busca palabras clave.',
  );
  const base = { prompt, answer, hint, why };
  return ctx.grade === 1 ? numberChoiceQuestion(ctx, base) : numericQuestion(base);
}

type WordOp = WordSpec['op'];

function opsFor(grade: number): WordOp[] {
  if (grade === 1) return ['add', 'sub'];
  if (grade === 2) return ['add', 'sub', 'mul'];
  if (grade === 3) return ['add', 'sub', 'mul', 'div'];
  if (grade === 4) return ['mul', 'div', 'two', 'two'];
  return ['two', 'div', 'mul', 'two'];
}

const MAX_TOTAL = [
  [10, 15, 20],
  [40, 70, 100],
  [200, 500, 900],
  [900, 2000, 5000],
  [900, 2000, 5000],
  [900, 2000, 5000],
] as const;

export const wordTopic = defineTopic({
  id: 'word',
  accent: '#5a6bd8',
  title: { en: 'Word Problems', es: 'Problemas con texto' },
  build(ctx): QuestionDraft {
    const { grade, tier, rng } = ctx;
    const r = (min: number, max: number) => randInt(rng, min, max);
    const name = pick(rng, WORD_NAMES);
    const scene: WordScene = {
      name,
      other: pick(rng, WORD_NAMES.filter((n) => n !== name)),
      item: pick(rng, WORD_ITEMS),
    };
    const op = pick(rng, opsFor(grade));
    const max = atTier(atGrade(MAX_TOTAL, grade), tier);

    if (op === 'add') {
      const a = r(2, Math.floor(max * 0.6));
      return buildWordProblem(ctx, scene, { op, a, b: r(2, max - a) });
    }
    if (op === 'sub') {
      const a = r(5, max);
      return buildWordProblem(ctx, scene, { op, a, b: r(1, a - 1) });
    }
    if (op === 'mul') {
      return buildWordProblem(ctx, scene, {
        op,
        groups: r(2, grade <= 2 ? 5 : 9),
        each: r(2, grade <= 2 ? (tier === 0 ? 5 : 10) : 12),
      });
    }
    if (op === 'div') {
      return buildWordProblem(ctx, scene, {
        op,
        groups: r(2, atTier([5, 9, 10], tier)),
        each: r(2, atTier([10, 12, 20], tier)),
      });
    }
    const packs = r(2, grade >= 5 ? 12 : 9);
    const each = r(3, grade >= 5 ? 25 : 12);
    const gain = rng() < 0.5;
    const change = gain ? r(5, grade >= 5 ? 90 : 30) : r(1, packs * each - 1);
    return buildWordProblem(ctx, scene, { op, packs, each, change, gain });
  },
});

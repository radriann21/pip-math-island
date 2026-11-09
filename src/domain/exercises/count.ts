import { formatNumber, t } from '../shared/locale';
import { atGrade, atTier } from '../shared/math';
import { pick, randInt } from '../shared/rng';
import type { GenContext } from '../shared/types';
import {
  choiceQuestion,
  numberChoiceQuestion,
  type QuestionDraft,
} from './options';
import { defineTopic } from './topic';
import { items } from './visuals';

export interface CountItem {
  /** Sprite symbol id (`#i-<symbol>`). */
  symbol: string;
  en: string;
  es: string;
  /** Spanish grammatical gender of the plural noun. */
  feminine: boolean;
}

export const COUNT_ITEMS: readonly CountItem[] = [
  { symbol: 'apple', en: 'apples', es: 'manzanas', feminine: true },
  { symbol: 'balloon', en: 'balloons', es: 'globos', feminine: false },
  { symbol: 'cookie', en: 'cookies', es: 'galletas', feminine: true },
  { symbol: 'starc', en: 'stars', es: 'estrellas', feminine: true },
];

/** "How many <things> do you see?" with `n` pictured things, gendered correctly in Spanish. */
export function buildCountingQuestion(ctx: GenContext, n: number, item: CountItem): QuestionDraft {
  const { locale } = ctx;
  const quantity = item.feminine ? 'Cuántas' : 'Cuántos';
  return numberChoiceQuestion(ctx, {
    prompt: t(locale, `How many ${item.en} do you see?`, `¿${quantity} ${item.es} ves?`),
    vis: items(n, item.symbol, { per: 5, sz: 36 }),
    answer: n,
    hint: t(
      locale,
      'Touch each one as you count. Say the numbers out loud.',
      'Toca cada una mientras cuentas. Di los números en voz alta.',
    ),
    why: t(locale, `There are ${n}.`, `Hay ${n}.`),
  });
}

const HIGHEST = [
  [10, 15, 20],
  [20, 50, 100],
  [100, 500, 1000],
  [1e4, 5e4, 1e5],
  [1e5, 5e5, 1e6],
  [1e6, 5e6, 1e7],
] as const;

type CountType = 'count' | 'cmp' | 'next' | 'parity' | 'between' | 'neg';

function typesFor(grade: number): CountType[] {
  if (grade === 1) return ['count', 'count', 'cmp', 'next'];
  if (grade === 2) return ['count', 'cmp', 'next', 'parity', 'between'];
  if (grade === 3) return ['cmp', 'next', 'parity', 'between'];
  if (grade < 6) return ['cmp', 'next', 'between', 'parity'];
  return ['cmp', 'neg', 'between', 'parity'];
}

export const countTopic = defineTopic({
  id: 'count',
  accent: '#e8504f',
  title: { en: 'Numbers & Counting', es: 'Números y conteo' },
  build(ctx): QuestionDraft {
    const { grade, tier, locale, rng } = ctx;
    const r = (min: number, max: number) => randInt(rng, min, max);
    const fmt = (n: number) => formatNumber(locale, n);
    const hi = atTier(atGrade(HIGHEST, grade), tier);
    const type = pick(rng, typesFor(grade));

    if (type === 'count') {
      const n = r(3, grade === 1 ? atTier([8, 12, 20], tier) : 20);
      return buildCountingQuestion(ctx, n, pick(rng, COUNT_ITEMS));
    }

    if (type === 'cmp') {
      const biggest = rng() < 0.5;
      const wanted = tier === 0 ? 2 : 3;
      const values = new Set<number>();
      let guard = 0;
      while (values.size < wanted && guard++ < 50) {
        values.add(r(grade === 1 ? 0 : Math.ceil(hi / 10), hi));
      }
      const list = Array.from(values);
      const answer = biggest ? Math.max(...list) : Math.min(...list);
      return choiceQuestion(rng, {
        prompt: t(
          locale,
          biggest ? 'Which number is the biggest?' : 'Which number is the smallest?',
          biggest ? '¿Cuál es el número más grande?' : '¿Cuál es el número más pequeño?',
        ),
        answer: fmt(answer),
        wrong: list.map(fmt),
        hint: t(
          locale,
          'Compare the digits from the left. The number with more tens, hundreds... is bigger.',
          'Compara las cifras desde la izquierda. El que tiene más decenas, centenas... es mayor.',
        ),
        why: t(
          locale,
          `${fmt(answer)} is the ${biggest ? 'biggest' : 'smallest'}.`,
          `${fmt(answer)} es el ${biggest ? 'más grande' : 'más pequeño'}.`,
        ),
      });
    }

    if (type === 'next') {
      const kind = grade < 3 ? pick(rng, ['after', 'before']) : pick(rng, ['after', 'before', 'p10', 'm10', 'p100']);
      let n = r(grade === 1 ? 1 : 10, Math.max(12, hi - 1));
      let answer: number;
      let prompt: string;
      if (kind === 'after') {
        answer = n + 1;
        prompt = t(locale, `What number comes right after ${fmt(n)}?`, `¿Qué número va justo después de ${fmt(n)}?`);
      } else if (kind === 'before') {
        answer = n - 1;
        prompt = t(locale, `What number comes right before ${fmt(n)}?`, `¿Qué número va justo antes de ${fmt(n)}?`);
      } else if (kind === 'p10') {
        answer = n + 10;
        prompt = t(locale, `What is 10 more than ${fmt(n)}?`, `¿Cuánto es 10 más que ${fmt(n)}?`);
      } else if (kind === 'm10') {
        n = Math.max(n, 20);
        answer = n - 10;
        prompt = t(locale, `What is 10 less than ${fmt(n)}?`, `¿Cuánto es 10 menos que ${fmt(n)}?`);
      } else {
        n = Math.max(n, 200);
        answer = n + 100;
        prompt = t(locale, `What is 100 more than ${fmt(n)}?`, `¿Cuánto es 100 más que ${fmt(n)}?`);
      }
      return numberChoiceQuestion(ctx, {
        prompt,
        answer,
        hint: t(
          locale,
          'Think of a number line. More means move right, less means move left.',
          'Piensa en una recta numérica. Más es a la derecha, menos es a la izquierda.',
        ),
        why: fmt(answer),
      });
    }

    if (type === 'parity') {
      const n = r(2, Math.min(hi, grade < 4 ? 99 : 9999));
      const even = n % 2 === 0;
      const evenLabel = t(locale, 'Even', 'Par');
      const oddLabel = t(locale, 'Odd', 'Impar');
      return choiceQuestion(rng, {
        prompt: t(locale, `Is ${fmt(n)} even or odd?`, `¿${fmt(n)} es par o impar?`),
        answer: even ? evenLabel : oddLabel,
        wrong: [evenLabel, oddLabel],
        hint: t(
          locale,
          'Look at the last digit. 0, 2, 4, 6, 8 means even.',
          'Mira la última cifra. 0, 2, 4, 6, 8 es par.',
        ),
        why: t(
          locale,
          `The last digit is ${n % 10}, so ${fmt(n)} is ${even ? 'even' : 'odd'}.`,
          `La última cifra es ${n % 10}, así que ${fmt(n)} es ${even ? 'par' : 'impar'}.`,
        ),
      });
    }

    if (type === 'between') {
      const lower = r(grade === 1 ? 1 : 10, Math.max(12, Math.min(hi, 999)));
      const offset = r(1, 3);
      const upper = lower + 4;
      const answer = lower + offset;
      // Distractors must lie outside (lower, upper): the prototype's +-1..3 steps could produce a
      // second number that was also between the two, making the question ambiguous.
      const outside = [lower, upper, lower - 1, upper + 1, lower - 2, upper + 2].filter((v) => v >= 0);
      return choiceQuestion(rng, {
        prompt: t(
          locale,
          `Which number is between ${fmt(lower)} and ${fmt(upper)}?`,
          `¿Qué número está entre ${fmt(lower)} y ${fmt(upper)}?`,
        ),
        answer: fmt(answer),
        wrong: outside.slice(0, 3).map(fmt),
        hint: t(
          locale,
          'It must be bigger than the first number and smaller than the second.',
          'Debe ser mayor que el primero y menor que el segundo.',
        ),
        why: `${fmt(lower)} < ${fmt(answer)} < ${fmt(upper)}`,
      });
    }

    const temperatures = new Set<number>();
    while (temperatures.size < 3) temperatures.add(r(-10, 10));
    const list = Array.from(temperatures);
    const coldest = Math.min(...list);
    return choiceQuestion(rng, {
      prompt: t(locale, 'Which temperature is the coldest?', '¿Qué temperatura es la más fría?'),
      answer: `${coldest}°`,
      wrong: list.map((x) => `${x}°`),
      hint: t(
        locale,
        'On a number line, numbers further left are smaller. Negative numbers are left of zero.',
        'En la recta numérica, los números más a la izquierda son menores. Los negativos están a la izquierda del cero.',
      ),
      why: t(locale, `${coldest}° is the smallest.`, `${coldest}° es el menor.`),
    });
  },
});

import { formatFixed, formatNumber, t } from '../shared/locale';
import { atTier, roundTo } from '../shared/math';
import type { Rng } from '../shared/rng';
import { pick, randInt, shuffle } from '../shared/rng';
import type { GenContext, Locale } from '../shared/types';
import { EMPTY_BOX, promptLine } from './markup';
import { choiceQuestion, numericQuestion, type QuestionDraft } from './options';
import { defineTopic } from './topic';
import { baseTenBlocks } from './visuals';

/** Rounds `n` to the nearest multiple of `step` (an even integer or 1), halves going up. */
export function roundHalfUp(n: number, step: number): number {
  return Math.floor((n + step / 2) / step) * step;
}

/** `len` distinct digits whose first digit is never 0. */
export function distinctDigits(rng: Rng, len: number): number[] {
  const digits = shuffle(rng, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  if (digits[0] === 0) {
    const i = digits.findIndex((d) => d !== 0);
    [digits[0], digits[i]] = [digits[i] as number, 0];
  }
  return digits.slice(0, len);
}

const PLACE_NAMES: readonly Record<Locale, string>[] = [
  { en: 'ones', es: 'unidades' },
  { en: 'tens', es: 'decenas' },
  { en: 'hundreds', es: 'centenas' },
  { en: 'thousands', es: 'unidades de millar' },
  { en: 'ten thousands', es: 'decenas de millar' },
  { en: 'hundred thousands', es: 'centenas de millar' },
];

/** "What number do the blocks show?" for `n` (11..999). */
export function buildBlocks(ctx: GenContext, n: number): QuestionDraft {
  const { locale } = ctx;
  const [hundreds, tens, ones] = [Math.floor(n / 100), Math.floor(n / 10) % 10, n % 10];
  return numericQuestion({
    prompt: t(locale, 'What number do the blocks show?', '¿Qué número muestran los bloques?'),
    vis: baseTenBlocks(n),
    answer: n,
    hint: t(
      locale,
      'Big squares are 100, long rods are 10, small cubes are 1.',
      'Los cuadrados grandes valen 100, las barras 10 y los cubitos 1.',
    ),
    why: t(
      locale,
      `${hundreds} hundreds, ${tens} tens, ${ones} ones = ${n}`,
      `${hundreds} centenas, ${tens} decenas, ${ones} unidades = ${n}`,
    ),
  });
}

/**
 * The value of the non-zero digit at `pos` in the number written by `digits`. The digit must
 * appear only once, otherwise the question would be ambiguous.
 */
export function buildDigitValue(ctx: GenContext, digits: readonly number[], pos: number): QuestionDraft {
  const digit = digits[pos];
  if (digit === undefined || digit === 0) throw new RangeError('the asked digit must exist and be non-zero');
  if (digits.filter((d) => d === digit).length !== 1) throw new RangeError('the asked digit must appear once');
  const { locale, rng } = ctx;
  const fmt = (n: number) => formatNumber(locale, n);
  const power = digits.length - 1 - pos;
  const value = digit * 10 ** power;
  const place = PLACE_NAMES[power];
  if (!place) throw new RangeError(`unsupported number length ${digits.length}`);
  return choiceQuestion(rng, {
    prompt: t(
      locale,
      `What is the value of the digit ${digit} in ${fmt(Number(digits.join('')))}?`,
      `¿Cuál es el valor de la cifra ${digit} en ${fmt(Number(digits.join('')))}?`,
    ),
    answer: fmt(value),
    wrong: [digit, digit * 10, digit * 100, digit * 1000].filter((x) => x !== value).map(fmt),
    hint: t(
      locale,
      'Find which place the digit is in: ones, tens, hundreds, thousands...',
      'Busca en qué posición está la cifra: unidades, decenas, centenas, millares...',
    ),
    why: t(
      locale,
      `${digit} is in the ${place.en} place, so it is worth ${fmt(value)}.`,
      `${digit} está en las ${place.es}, vale ${fmt(value)}.`,
    ),
  });
}

/** Round `n` to the nearest `step` (10, 100, 1000 or 10000), halves going up. */
export function buildRounding(ctx: GenContext, n: number, step: number): QuestionDraft {
  const { locale, rng } = ctx;
  const fmt = (x: number) => formatNumber(locale, x);
  const answer = roundHalfUp(n, step);
  const wrong = [
    Math.floor(n / step) * step,
    Math.ceil(n / step) * step,
    roundHalfUp(n, step * 10),
    roundHalfUp(n, step / 10),
    answer + step,
    answer - step,
    answer + step * 10,
  ].filter((x) => x >= 0 && x !== answer);
  return choiceQuestion(rng, {
    prompt: t(locale, `Round ${fmt(n)} to the nearest ${fmt(step)}.`, `Redondea ${fmt(n)} al ${fmt(step)} más cercano.`),
    answer: fmt(answer),
    wrong: wrong.map(fmt),
    hint: t(
      locale,
      'Look at the digit to the right. 5 or more rounds up, 4 or less rounds down.',
      'Mira la cifra de la derecha. 5 o más sube, 4 o menos baja.',
    ),
    why: t(
      locale,
      `Rounded to the nearest ${fmt(step)}: ${fmt(n)} ≈ ${fmt(answer)}`,
      `Redondeado al ${fmt(step)} más cercano: ${fmt(n)} ≈ ${fmt(answer)}`,
    ),
  });
}

const SYMBOLS = ['<', '=', '>'];

/** "Which symbol goes in the box?" for two whole numbers. */
export function buildCompareWithSymbols(ctx: GenContext, a: number, b: number): QuestionDraft {
  const { locale, rng } = ctx;
  const fmt = (n: number) => formatNumber(locale, n);
  const symbol = a < b ? '<' : a > b ? '>' : '=';
  return choiceQuestion(rng, {
    prompt: t(locale, 'Which symbol goes in the box?', '¿Qué signo va en el recuadro?'),
    vis: promptLine(`${fmt(a)} ${EMPTY_BOX} ${fmt(b)}`),
    answer: symbol,
    wrong: SYMBOLS,
    hint: t(
      locale,
      'Compare digits from the left. The first different digit decides.',
      'Compara las cifras desde la izquierda. La primera cifra distinta decide.',
    ),
    why: `${fmt(a)} ${symbol} ${fmt(b)}`,
  });
}

/**
 * The value of the tenths or hundredths digit in `whole.tenths hundredths`. The three digits
 * must be distinct and the asked one non-zero, so the question has one answer.
 */
export function buildDecimalDigitValue(
  ctx: GenContext,
  digits: readonly [number, number, number],
  place: 'tenth' | 'hundredth',
): QuestionDraft {
  const [whole, tenths, hundredths] = digits;
  const digit = place === 'tenth' ? tenths : hundredths;
  if (digit === 0) throw new RangeError('the asked digit must be non-zero');
  if (new Set(digits).size !== 3) throw new RangeError('the digits must be distinct');
  const { locale, rng } = ctx;
  const fmt = (n: number) => formatNumber(locale, n);
  const shown = formatFixed(locale, (whole * 100 + tenths * 10 + hundredths) / 100, 2);
  const value = roundTo(place === 'tenth' ? digit / 10 : digit / 100, 2);
  return choiceQuestion(rng, {
    prompt: t(
      locale,
      `In ${shown}, what is the value of the digit ${digit}?`,
      `En ${shown}, ¿cuál es el valor de la cifra ${digit}?`,
    ),
    answer: fmt(value),
    wrong: [digit, roundTo(digit / 10, 2), roundTo(digit / 100, 2), digit * 10].filter((x) => x !== value).map(fmt),
    hint: t(
      locale,
      'After the decimal point: tenths first, then hundredths.',
      'Después de la coma: primero décimas y luego centésimas.',
    ),
    why: t(
      locale,
      `${digit} is in the ${place}s place: ${fmt(value)}.`,
      `${digit} está en las ${place === 'tenth' ? 'décimas' : 'centésimas'}: ${fmt(value)}.`,
    ),
  });
}

/**
 * "Which symbol goes in the box?" for two decimals, both written with two decimals (the
 * prototype wrote the left one with one or two). Compared in whole hundredths to avoid float noise.
 */
export function buildCompareDecimals(ctx: GenContext, a: number, b: number): QuestionDraft {
  const { locale, rng } = ctx;
  const [ha, hb] = [Math.round(a * 100), Math.round(b * 100)];
  const symbol = ha < hb ? '<' : ha > hb ? '>' : '=';
  const shown = (hundredths: number) => formatFixed(locale, hundredths / 100, 2);
  return choiceQuestion(rng, {
    prompt: t(locale, 'Which symbol goes in the box?', '¿Qué signo va en el recuadro?'),
    vis: promptLine(`${shown(ha)} ${EMPTY_BOX} ${shown(hb)}`),
    answer: symbol,
    wrong: SYMBOLS,
    hint: t(
      locale,
      'Give both numbers the same number of decimal places, then compare.',
      'Escribe ambos con las mismas cifras decimales y compara.',
    ),
    why: `${shown(ha)} ${symbol} ${shown(hb)}`,
  });
}

/** Round a number given in whole hundredths (e.g. 235 = 2.35) to a tenth or a whole number. */
export function buildDecimalRounding(ctx: GenContext, hundredths: number, places: 0 | 1): QuestionDraft {
  const { locale, rng } = ctx;
  const fmt = (n: number) => formatNumber(locale, n);
  const unit = places === 1 ? 10 : 100;
  const answer = roundHalfUp(hundredths, unit);
  const wrong = [
    Math.floor(hundredths / unit) * unit,
    Math.ceil(hundredths / unit) * unit,
    answer + unit,
    answer - unit,
    answer + 2 * unit,
  ].filter((x) => x >= 0 && x !== answer);
  const shown = formatFixed(locale, hundredths / 100, 2);
  return choiceQuestion(rng, {
    prompt: t(
      locale,
      `Round ${shown} to the nearest ${places === 1 ? 'tenth' : 'whole number'}.`,
      `Redondea ${shown} a ${places === 1 ? 'la décima más cercana' : 'la unidad más cercana'}.`,
    ),
    answer: fmt(answer / 100),
    wrong: wrong.map((x) => fmt(roundTo(x / 100, 2))),
    hint: t(
      locale,
      'Look at the next digit to the right. 5 or more rounds up.',
      'Mira la cifra de la derecha. 5 o más sube.',
    ),
    why: `${shown} ≈ ${fmt(answer / 100)}`,
  });
}

type PlaceType = 'blocks' | 'digit' | 'round' | 'cmp' | 'decDigit' | 'cmpDec' | 'roundDec';

function typesFor(grade: number): PlaceType[] {
  if (grade === 1) return ['blocks'];
  if (grade === 2) return ['blocks', 'digit'];
  if (grade === 3) return ['round', 'digit', 'blocks'];
  if (grade === 4) return ['digit', 'round', 'cmp'];
  if (grade === 5) return ['decDigit', 'cmpDec', 'roundDec'];
  return ['roundDec', 'cmpDec', 'decDigit'];
}

export const placeTopic = defineTopic({
  id: 'place',
  accent: '#7a5cf5',
  title: { en: 'Place Value', es: 'Valor posicional' },
  build(ctx): QuestionDraft {
    const { grade, tier, rng } = ctx;
    const r = (min: number, max: number) => randInt(rng, min, max);
    const type = pick(rng, typesFor(grade));

    if (type === 'blocks') {
      const max = grade === 1 ? atTier([30, 60, 99], tier) : atTier([199, 299, 499], tier);
      return buildBlocks(ctx, r(grade === 1 ? 11 : 101, max));
    }

    if (type === 'digit') {
      const len = grade === 2 ? 3 : grade === 3 ? 4 : 6;
      const digits = distinctDigits(rng, len);
      const positions = digits.flatMap((d, i) => (d === 0 ? [] : [i]));
      return buildDigitValue(ctx, digits, pick(rng, positions));
    }

    if (type === 'round') {
      if (grade === 3) {
        return buildRounding(ctx, r(11, tier === 0 ? 99 : 999), tier === 0 ? 10 : pick(rng, [10, 100]));
      }
      return buildRounding(ctx, r(1001, 99999), pick(rng, [100, 1000, 10000]));
    }

    if (type === 'cmp') {
      const a = r(1000, 9999);
      const b = rng() < 0.2 ? a : a + r(-99, 99) * (rng() < 0.5 ? 1 : 10);
      return buildCompareWithSymbols(ctx, a, b);
    }

    if (type === 'decDigit') {
      const digits = distinctDigits(rng, 3) as [number, number, number];
      const places = (['tenth', 'hundredth'] as const).filter((_, i) => digits[i + 1] !== 0);
      return buildDecimalDigitValue(ctx, digits, pick(rng, places));
    }

    if (type === 'cmpDec') {
      const a = r(1, 99) / 10;
      return buildCompareDecimals(ctx, a, rng() < 0.2 ? a : r(1, 999) / 100);
    }

    return buildDecimalRounding(ctx, r(101, 9999), rng() < 0.5 ? 1 : 0);
  },
});

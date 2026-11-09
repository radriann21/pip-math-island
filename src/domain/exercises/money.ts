import { formatFixed, formatNumber, t } from '../shared/locale';
import { atTier, roundTo } from '../shared/math';
import type { Rng } from '../shared/rng';
import { pick, randInt } from '../shared/rng';
import type { GenContext } from '../shared/types';
import { equation, operator, priceTag } from './markup';
import { numberChoiceQuestion, numericQuestion, type QuestionDraft } from './options';
import { defineTopic } from './topic';
import { coins } from './visuals';

/**
 * `count` coin values from `values` whose total never exceeds `maxTotal`. Each coin is drawn from
 * the values that still leave room for the remaining coins, so the result is always valid
 * (the prototype retried 40 times and then silently swapped in a fixed list).
 */
export function drawCoins(rng: Rng, values: readonly number[], count: number, maxTotal: number): number[] {
  const smallest = Math.min(...values);
  if (smallest * count > maxTotal) throw new RangeError(`${count} coins cannot fit in ${maxTotal}`);
  const list: number[] = [];
  let total = 0;
  for (let i = 0; i < count; i++) {
    const room = maxTotal - total - (count - i - 1) * smallest;
    const value = pick(rng, values.filter((v) => v <= room));
    list.push(value);
    total += value;
  }
  return list;
}

const dollars = (ctx: Pick<GenContext, 'locale'>, amount: number) => `$${formatFixed(ctx.locale, amount, 2)}`;

/** "How much money is this in total?": a choice in grade 1, a keypad answer from grade 2. */
export function buildCoinTotal(ctx: GenContext, list: readonly number[]): QuestionDraft {
  const { locale } = ctx;
  const total = list.reduce((a, b) => a + b, 0);
  const spec = {
    prompt: t(locale, 'How much money is this in total?', '¿Cuánto dinero hay en total?'),
    vis: coins(list),
    answer: total,
    hint:
      ctx.grade === 1
        ? t(locale, 'Start with the biggest coin, then add the others.', 'Empieza por la moneda más grande y suma las demás.')
        : t(locale, 'Add the big ones first, then the small ones.', 'Suma primero las grandes y luego las pequeñas.'),
    why: `${list.join(' + ')} = ${total}`,
  };
  return ctx.grade === 1 ? numberChoiceQuestion(ctx, spec) : numericQuestion(spec);
}

/** "What is the total cost in dollars?" for two prices. */
export function buildPriceSum(ctx: GenContext, a: number, b: number): QuestionDraft {
  const { locale } = ctx;
  const sum = roundTo(a + b, 2);
  return numericQuestion({
    prompt: t(locale, 'What is the total cost in dollars?', '¿Cuál es el costo total en dólares?'),
    vis: equation(priceTag(dollars(ctx, a)), operator('+'), priceTag(dollars(ctx, b))),
    answer: sum,
    decimal: true,
    hint: t(locale, 'Line up the decimal points and add.', 'Alinea las comas y suma.'),
    why: `${dollars(ctx, a)} + ${dollars(ctx, b)} = ${dollars(ctx, sum)}`,
  });
}

/** Change from paying `pay` dollars for something that costs `cost`. */
export function buildChange(ctx: GenContext, pay: number, cost: number): QuestionDraft {
  if (cost > pay) throw new RangeError('the cost cannot exceed the payment');
  const { locale } = ctx;
  const change = roundTo(pay - cost, 2);
  return numericQuestion({
    prompt: t(
      locale,
      `You pay $${pay} for something that costs ${dollars(ctx, cost)}. How many dollars of change do you get?`,
      `Pagas $${pay} por algo que cuesta ${dollars(ctx, cost)}. ¿Cuántos dólares de cambio recibes?`,
    ),
    vis: priceTag(dollars(ctx, cost)),
    answer: change,
    decimal: true,
    hint: t(locale, 'Change = what you paid minus the cost.', 'Cambio = lo que pagaste menos el costo.'),
    why: `$${pay} − ${dollars(ctx, cost)} = ${dollars(ctx, change)}`,
  });
}

/** `qty` notebooks at `unit` dollars each. */
export function buildQuantityPrice(ctx: GenContext, qty: number, unit: number): QuestionDraft {
  const { locale } = ctx;
  const total = roundTo(qty * unit, 2);
  return numericQuestion({
    prompt: t(
      locale,
      `${qty} notebooks cost ${dollars(ctx, unit)} each. What is the total cost in dollars?`,
      `${qty} cuadernos cuestan ${dollars(ctx, unit)} cada uno. ¿Cuál es el costo total en dólares?`,
    ),
    answer: total,
    decimal: true,
    hint: t(
      locale,
      'Multiply the price of one by how many you buy.',
      'Multiplica el precio de uno por cuántos compras.',
    ),
    why: `${qty} × ${dollars(ctx, unit)} = ${dollars(ctx, total)}`,
  });
}

/** New price of a `price` dollar item with `pct` percent off. */
export function buildDiscount(ctx: GenContext, price: number, pct: number): QuestionDraft {
  const { locale } = ctx;
  const fmt = (n: number) => formatNumber(locale, n);
  const saved = roundTo((price * pct) / 100, 2);
  const sale = roundTo((price * (100 - pct)) / 100, 2);
  return numericQuestion({
    prompt: t(
      locale,
      `A $${price} jacket is ${pct}% off. What is the new price in dollars?`,
      `Una chaqueta de $${price} tiene ${pct}% de descuento. ¿Cuál es el nuevo precio en dólares?`,
    ),
    answer: sale,
    decimal: true,
    hint: t(
      locale,
      `Find ${pct}% of the price, then subtract it.`,
      `Calcula el ${pct}% del precio y réstalo.`,
    ),
    why: `${pct}% of ${price} = ${fmt(saved)}; ${price} − ${fmt(saved)} = ${fmt(sale)}`,
  });
}

export const moneyTopic = defineTopic({
  id: 'money',
  accent: '#3aa845',
  title: { en: 'Money', es: 'Dinero' },
  build(ctx): QuestionDraft {
    const { grade, tier, rng } = ctx;
    const r = (min: number, max: number) => randInt(rng, min, max);
    /** A price in whole quarter dollars, `r(2, maxQuarters)` quarters. */
    const quarters = (maxQuarters: number) => r(2, maxQuarters) * 0.25;

    if (grade === 1) {
      return buildCoinTotal(ctx, drawCoins(rng, [1, 2, 5, 10], r(2, atTier([3, 4, 4], tier)), atTier([10, 20, 30], tier)));
    }
    if (grade === 2) {
      const list = drawCoins(rng, [1, 2, 5, 10, 20, 50], r(3, atTier([4, 5, 6], tier)), 120);
      return buildCoinTotal(ctx, list.sort((a, b) => b - a));
    }
    if (grade === 3) {
      const maxQuarters = atTier([20, 40, 40], tier);
      return buildPriceSum(ctx, quarters(maxQuarters), quarters(maxQuarters));
    }
    if (grade === 4) {
      const pay = pick(rng, [5, 10, 20]);
      return buildChange(ctx, pay, r(4, pay * 4 - 1) * 0.25);
    }
    if (grade === 5) {
      return buildQuantityPrice(ctx, r(2, 9), r(4, atTier([24, 40, 60], tier)) * 0.25);
    }
    const percents = atTier([[10, 50], [10, 20, 25, 50], [5, 10, 15, 20, 25, 30, 40, 50]], tier);
    return buildDiscount(ctx, r(2, 20) * 10, pick(rng, percents));
  },
});

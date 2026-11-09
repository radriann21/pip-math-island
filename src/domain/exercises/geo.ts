import { t } from '../shared/locale';
import { atTier } from '../shared/math';
import { pick, randInt, shuffle } from '../shared/rng';
import type { GenContext } from '../shared/types';
import { choiceQuestion, numberChoiceQuestion, numericQuestion, type QuestionDraft } from './options';
import { defineTopic } from './topic';
import { angle, box, rectangle, SHAPES, shapeDrawing, triangle, type ShapeInfo } from './visuals';

/** "What is the name of this shape?" The other names come from `pool`. */
export function buildShapeName(ctx: GenContext, shape: ShapeInfo, pool: readonly ShapeInfo[]): QuestionDraft {
  const { locale, rng } = ctx;
  const name = (s: ShapeInfo) => t(locale, s.en, s.es);
  // A square is also a rectangle, so offering "rectangle" next to a drawn square would give two right answers.
  const others = pool.filter((s) => s.key !== shape.key && !(shape.key === 'square' && s.key === 'rectangle'));
  const article = /^[aeiou]/.test(shape.en) ? 'an' : 'a';
  return choiceQuestion(rng, {
    prompt: t(locale, 'What is the name of this shape?', '¿Cómo se llama esta figura?'),
    vis: shapeDrawing(shape.key),
    answer: name(shape),
    wrong: shuffle(rng, others).slice(0, 3).map(name),
    hint: t(
      locale,
      'Count the sides and corners. Does it have curves?',
      'Cuenta los lados y las esquinas. ¿Tiene curvas?',
    ),
    why: t(locale, `It is ${article} ${shape.en}.`, `Es un ${shape.es}.`),
  });
}

/** "How many sides does this shape have?" */
export function buildShapeSides(ctx: GenContext, shape: ShapeInfo): QuestionDraft {
  const { locale } = ctx;
  return numberChoiceQuestion(ctx, {
    prompt: t(locale, 'How many sides does this shape have?', '¿Cuántos lados tiene esta figura?'),
    vis: shapeDrawing(shape.key),
    answer: shape.sides,
    hint: t(
      locale,
      'Put a finger on one side and count all the way around.',
      'Pon un dedo en un lado y cuenta dando toda la vuelta.',
    ),
    why: t(locale, `${shape.sides} sides.`, `${shape.sides} lados.`),
  });
}

/** Perimeter of a `w` by `h` rectangle. */
export function buildPerimeter(ctx: GenContext, w: number, h: number): QuestionDraft {
  const { locale } = ctx;
  return numericQuestion({
    prompt: t(locale, 'What is the perimeter?', '¿Cuál es el perímetro?'),
    vis: rectangle(w, h, w, h, false),
    answer: 2 * (w + h),
    hint: t(
      locale,
      'Perimeter is the distance all the way around: add all four sides.',
      'El perímetro es la distancia alrededor: suma los cuatro lados.',
    ),
    why: `${w} + ${h} + ${w} + ${h} = ${2 * (w + h)}`,
  });
}

/** Area of a `w` by `h` rectangle drawn on a unit grid. */
export function buildGridArea(ctx: GenContext, w: number, h: number): QuestionDraft {
  const { locale } = ctx;
  return numericQuestion({
    prompt: t(locale, 'Each square is 1 unit. What is the area?', 'Cada cuadrito mide 1 unidad. ¿Cuál es el área?'),
    vis: rectangle(w, h, w, h, true),
    answer: w * h,
    hint: t(
      locale,
      'Area is how many squares fit inside. Multiply rows by columns.',
      'El área es cuántos cuadritos caben. Multiplica filas por columnas.',
    ),
    why: `${w} × ${h} = ${w * h}`,
  });
}

/** Acute, right or obtuse? `deg` is between 1 and 179. */
export function buildAngleType(ctx: GenContext, deg: number): QuestionDraft {
  const { locale, rng } = ctx;
  const acute = t(locale, 'Acute', 'Agudo');
  const right = t(locale, 'Right', 'Recto');
  const obtuse = t(locale, 'Obtuse', 'Obtuso');
  const answer = deg < 90 ? acute : deg === 90 ? right : obtuse;
  return choiceQuestion(rng, {
    prompt: t(locale, 'What kind of angle is this?', '¿Qué tipo de ángulo es este?'),
    vis: angle(deg),
    answer,
    wrong: [acute, right, obtuse],
    hint: t(
      locale,
      'Right angles look like the corner of a book. Smaller is acute, wider is obtuse.',
      'Un ángulo recto es como la esquina de un libro. Más pequeño es agudo, más abierto es obtuso.',
    ),
    why: t(
      locale,
      `It is ${deg < 90 ? 'smaller than' : deg === 90 ? 'exactly' : 'bigger than'} a right angle.`,
      `Es ${deg < 90 ? 'menor que' : deg === 90 ? 'igual a' : 'mayor que'} un ángulo recto.`,
    ),
  });
}

/** Area of a triangle with base `b` and height `h`; `b * h` must be even so the area is whole. */
export function buildTriangleArea(ctx: GenContext, b: number, h: number): QuestionDraft {
  if ((b * h) % 2 !== 0) throw new RangeError(`base ${b} x height ${h} is odd, the area would not be whole`);
  const { locale } = ctx;
  return numericQuestion({
    prompt: t(locale, 'What is the area of this triangle?', '¿Cuál es el área de este triángulo?'),
    vis: triangle(locale, b, h),
    answer: (b * h) / 2,
    hint: t(
      locale,
      'A triangle is half of a rectangle: base × height ÷ 2.',
      'Un triángulo es la mitad de un rectángulo: base × altura ÷ 2.',
    ),
    why: `${b} × ${h} ÷ 2 = ${(b * h) / 2}`,
  });
}

/** Volume of a `l` by `w` by `h` box in cubic units. */
export function buildBoxVolume(ctx: GenContext, l: number, w: number, h: number): QuestionDraft {
  const { locale } = ctx;
  return numericQuestion({
    prompt: t(
      locale,
      'What is the volume of this box (cubic units)?',
      '¿Cuál es el volumen de esta caja (unidades cúbicas)?',
    ),
    vis: box(l, w, h),
    answer: l * w * h,
    hint: t(locale, 'Volume = length × width × height.', 'Volumen = largo × ancho × alto.'),
    why: `${l} × ${w} × ${h} = ${l * w * h}`,
  });
}

const ANGLE_DEGREES = [30, 45, 60, 90, 120, 135, 150];

export const geoTopic = defineTopic({
  id: 'geo',
  accent: '#e8588a',
  title: { en: 'Shapes & Geometry', es: 'Figuras y geometría' },
  build(ctx): QuestionDraft {
    const { grade, tier, rng } = ctx;
    const r = (min: number, max: number) => randInt(rng, min, max);

    if (grade <= 2) {
      const pool = grade === 1 ? SHAPES.slice(0, 4) : SHAPES.slice(1);
      const shape = pick(rng, pool);
      const ask =
        grade === 1
          ? tier === 0
            ? 'name'
            : pick(rng, ['name', 'sides'])
          : tier === 0
            ? 'sides'
            : pick(rng, ['sides', 'name']);
      return ask === 'name' ? buildShapeName(ctx, shape, pool) : buildShapeSides(ctx, shape);
    }

    if (grade === 3) {
      const square = tier === 0 && rng() < 0.5;
      const w = r(2, 12);
      return buildPerimeter(ctx, w, square ? w : r(2, 9));
    }

    if (grade === 4) {
      if (rng() < 0.5) {
        return buildGridArea(ctx, r(3, atTier([6, 8, 8], tier)), r(2, atTier([4, 5, 6], tier)));
      }
      return buildAngleType(ctx, pick(rng, ANGLE_DEGREES));
    }

    if (grade === 5 || rng() < 0.5) {
      const base = r(3, atTier([8, 10, 12], tier));
      const height = r(2, atTier([6, 8, 10], tier));
      return buildTriangleArea(ctx, (base * height) % 2 ? base + 1 : base, height);
    }
    return buildBoxVolume(ctx, r(2, atTier([6, 8, 10], tier)), r(2, 6), r(2, 6));
  },
});

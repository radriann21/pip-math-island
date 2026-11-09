import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../shared/rng';
import type { GenContext, Grade, Locale, Tier } from '../shared/types';
import {
  buildAngleType,
  buildBoxVolume,
  buildGridArea,
  buildPerimeter,
  buildShapeName,
  buildShapeSides,
  buildTriangleArea,
  geoTopic,
} from './geo';
import { angle, box, rectangle, SHAPES, shapeDrawing, triangle } from './visuals';

const ctx = (grade: Grade, tier: Tier, seed: number, locale: Locale = 'en'): GenContext => ({
  grade,
  tier,
  locale,
  rng: createSeededRng(seed),
});
const GRADES: Grade[] = [1, 2, 3, 4, 5, 6];
const TIERS: Tier[] = [0, 1, 2];
const ANGLES = [30, 45, 60, 90, 120, 135, 150];
const shapeNamed = (name: string) => SHAPES.find((s) => s.en === name || s.es === name)!;
/** Numbers written in `class="lbl"` labels of a drawing. */
const labels = (vis: string) => [...vis.matchAll(/class="lbl"[^>]*>(?:[a-z]+ = )?(\d+)</g)].map((m) => Number(m[1]));
const classify = (deg: number) => (deg < 90 ? 'Acute' : deg === 90 ? 'Right' : 'Obtuse');

describe('buildShapeName', () => {
  it('names the drawn shape among the others of the pool', () => {
    const pool = SHAPES.slice(0, 4);
    const q = buildShapeName(ctx(1, 0, 1), shapeNamed('triangle'), pool);
    expect(q.answer).toBe('triangle');
    expect(q.vis).toBe(shapeDrawing('triangle'));
    expect((q.opts ?? []).length).toBe(4);
    expect(new Set(q.opts).size).toBe(4);
    expect(buildShapeName(ctx(1, 0, 1, 'es'), shapeNamed('triangle'), pool).answer).toBe('triángulo');
  });
  it('never offers "rectangle" for a square, since a square is also a rectangle', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const q = buildShapeName(ctx(2, 0, seed), shapeNamed('square'), SHAPES);
      expect(q.opts).not.toContain('rectangle');
      expect(q.opts).toContain('square');
    }
    const asked = new Set<string>();
    for (let seed = 1; seed <= 100; seed++) {
      for (const o of buildShapeName(ctx(2, 0, seed), shapeNamed('rectangle'), SHAPES).opts ?? []) asked.add(o);
    }
    expect(asked.has('square')).toBe(true);
  });
  it('uses the right article in English and the masculine in Spanish', () => {
    expect(buildShapeName(ctx(2, 0, 1), shapeNamed('octagon'), SHAPES).why).toBe('It is an octagon.');
    expect(buildShapeName(ctx(2, 0, 1), shapeNamed('hexagon'), SHAPES).why).toBe('It is a hexagon.');
    expect(buildShapeName(ctx(2, 0, 1, 'es'), shapeNamed('octagon'), SHAPES).why).toBe('Es un octágono.');
  });
});

describe('buildShapeSides', () => {
  it('answers the number of sides with exactly one matching option', () => {
    for (const shape of SHAPES) {
      const q = buildShapeSides(ctx(2, 0, 1), shape);
      expect(q.answer).toBe(String(shape.sides));
      expect(q.vis).toBe(shapeDrawing(shape.key));
      expect((q.opts ?? []).filter((o) => Number(o) === shape.sides)).toHaveLength(1);
    }
    expect(buildShapeSides(ctx(2, 0, 1, 'es'), shapeNamed('hexagon')).why).toBe('6 lados.');
  });
});

describe('measurement builders', () => {
  it('buildPerimeter adds the four sides', () => {
    const q = buildPerimeter(ctx(3, 0, 1), 3, 5);
    expect(q.answer).toBe(16);
    expect(q.vis).toBe(rectangle(3, 5, 3, 5, false));
    expect(q.why).toBe('3 + 5 + 3 + 5 = 16');
    expect(buildPerimeter(ctx(3, 0, 1, 'es'), 4, 4).prompt).toBe('¿Cuál es el perímetro?');
  });
  it('buildGridArea multiplies rows by columns on a grid', () => {
    const q = buildGridArea(ctx(4, 0, 1), 4, 3);
    expect(q.answer).toBe(12);
    expect(q.vis).toBe(rectangle(4, 3, 4, 3, true));
    expect(q.why).toBe('4 × 3 = 12');
  });
  it('buildTriangleArea halves base times height', () => {
    const q = buildTriangleArea(ctx(5, 0, 1), 6, 4);
    expect(q.answer).toBe(12);
    expect(q.vis).toBe(triangle('en', 6, 4));
    expect(q.why).toBe('6 × 4 ÷ 2 = 12');
    expect(() => buildTriangleArea(ctx(5, 0, 1), 5, 3)).toThrow();
  });
  it('buildBoxVolume multiplies the three edges', () => {
    const q = buildBoxVolume(ctx(6, 0, 1), 2, 3, 4);
    expect(q.answer).toBe(24);
    expect(q.vis).toBe(box(2, 3, 4));
    expect(q.why).toBe('2 × 3 × 4 = 24');
  });
});

describe('buildAngleType', () => {
  it('classifies every angle against a right angle with exactly one correct option', () => {
    for (const deg of ANGLES) {
      const q = buildAngleType(ctx(4, 1, deg), deg);
      expect(q.vis).toBe(angle(deg));
      expect(q.answer).toBe(classify(deg));
      expect((q.opts ?? []).filter((o) => o === classify(deg))).toHaveLength(1);
    }
    expect(buildAngleType(ctx(4, 1, 1, 'es'), 135).answer).toBe('Obtuso');
    expect(buildAngleType(ctx(4, 1, 1, 'es'), 90).answer).toBe('Recto');
    expect(buildAngleType(ctx(4, 1, 1), 30).why).toBe('It is smaller than a right angle.');
  });
});

describe('geoTopic correctness (English prompts)', () => {
  const seen = new Set<string>();
  for (const grade of GRADES) {
    for (const tier of TIERS) {
      for (let seed = 1; seed <= 100; seed++) {
        const q = geoTopic.generate(ctx(grade, tier, seed));
        const p = q.prompt;
        const tag = `g${grade}/t${tier}/seed${seed}: ${p}`;
        const opts = q.opts ?? [];
        if (p === 'What is the name of this shape?') {
          seen.add('name');
          const shape = shapeNamed(String(q.answer));
          expect(q.vis, tag).toBe(shapeDrawing(shape.key));
          expect(grade <= 2, tag).toBe(true);
          if (grade === 2) expect(shape.key, tag).not.toBe('circle');
          if (shape.key === 'square') expect(opts, tag).not.toContain('rectangle');
          expect(opts.filter((o) => shapeNamed(o).key === shape.key), tag).toHaveLength(1);
        } else if (p === 'How many sides does this shape have?') {
          seen.add('sides');
          const shape = SHAPES.find((s) => shapeDrawing(s.key) === q.vis)!;
          expect(shape, tag).toBeDefined();
          expect(Number(q.answer), tag).toBe(shape.sides);
          expect(opts.filter((o) => Number(o) === shape.sides), tag).toHaveLength(1);
        } else if (p === 'What is the perimeter?') {
          seen.add('perimeter');
          const [w, h] = labels(q.vis);
          expect(q.answer, tag).toBe(2 * (w! + h!));
          expect(grade, tag).toBe(3);
        } else if (p === 'Each square is 1 unit. What is the area?') {
          seen.add('gridArea');
          const [w, h] = labels(q.vis);
          expect(q.answer, tag).toBe(w! * h!);
          expect((q.vis.match(/<line/g) ?? []).length, tag).toBe(w! - 1 + (h! - 1));
        } else if (p === 'What kind of angle is this?') {
          seen.add('angle');
          const deg = ANGLES.find((d) => angle(d) === q.vis)!;
          expect(deg, tag).toBeDefined();
          expect(q.answer, tag).toBe(classify(deg));
        } else if (p === 'What is the area of this triangle?') {
          seen.add('triangle');
          const [b, h] = labels(q.vis);
          expect((b! * h!) % 2, tag).toBe(0);
          expect(q.answer, tag).toBe((b! * h!) / 2);
        } else if (p === 'What is the volume of this box (cubic units)?') {
          seen.add('volume');
          const [length, height, width] = labels(q.vis);
          expect(q.answer, tag).toBe(length! * height! * width!);
          expect(grade, tag).toBe(6);
        } else {
          throw new Error(`unrecognised geometry prompt: ${p}`);
        }
      }
    }
  }
  it('covers every question type', () => {
    expect([...seen].sort()).toEqual(['angle', 'gridArea', 'name', 'perimeter', 'sides', 'triangle', 'volume']);
  });
});

describe('geoTopic by grade', () => {
  it('draws only circle, square, triangle or rectangle in grade 1', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const q = geoTopic.generate(ctx(1, 1, seed));
      const keys = SHAPES.slice(0, 4).map((s) => shapeDrawing(s.key));
      expect(keys).toContain(q.vis);
    }
  });
  it('speaks Spanish', () => {
    expect(geoTopic.generate(ctx(3, 0, 1, 'es')).prompt).toBe('¿Cuál es el perímetro?');
  });
});

describe('geoTopic metadata', () => {
  it('matches the prototype table', () => {
    expect(geoTopic).toMatchObject({
      id: 'geo',
      accent: '#e8588a',
      title: { en: 'Shapes & Geometry', es: 'Figuras y geometría' },
    });
    expect(geoTopic.generate(ctx(1, 0, 1)).topic).toBe('geo');
  });
});

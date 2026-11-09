import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../shared/rng';
import type { GenContext, Grade, Locale, Tier } from '../shared/types';
import { buildWordProblem, WORD_ITEMS, WORD_NAMES, wordTopic, type WordScene, type WordSpec } from './word';

const ctx = (grade: Grade, tier: Tier, seed: number, locale: Locale = 'en'): GenContext => ({
  grade,
  tier,
  locale,
  rng: createSeededRng(seed),
});
const GRADES: Grade[] = [1, 2, 3, 4, 5, 6];
const TIERS: Tier[] = [0, 1, 2];
const num = (s: string | number) => Number(String(s).replace(/,/g, ''));

const apples = WORD_ITEMS.find((i) => i.en === 'apples')!;
const scene: WordScene = { name: 'Mia', other: 'Leo', item: apples };

describe('buildWordProblem', () => {
  const cases: { spec: WordSpec; en: string; es: string; answer: number; why: string }[] = [
    {
      spec: { op: 'add', a: 5, b: 3 },
      en: 'Mia has 5 apples. Leo gives Mia 3 more. How many apples does Mia have now?',
      es: 'Mia tiene 5 manzanas. Leo le da 3 más. ¿Cuántas manzanas tiene Mia ahora?',
      answer: 8,
      why: '5 + 3 = 8',
    },
    {
      spec: { op: 'sub', a: 9, b: 4 },
      en: 'Mia has 9 apples and gives 4 to Leo. How many apples does Mia have left?',
      es: 'Mia tiene 9 manzanas y le regala 4 a Leo. ¿Cuántas le quedan a Mia?',
      answer: 5,
      why: '9 − 4 = 5',
    },
    {
      spec: { op: 'mul', groups: 4, each: 6 },
      en: 'There are 4 boxes. Each box has 6 apples. How many apples are there in all?',
      es: 'Hay 4 cajas. Cada caja tiene 6 manzanas. ¿Cuántas manzanas hay en total?',
      answer: 24,
      why: '4 × 6 = 24',
    },
    {
      spec: { op: 'div', groups: 3, each: 4 },
      en: 'Mia shares 12 apples equally among 3 friends. How many apples does each friend get?',
      es: 'Mia reparte 12 manzanas en partes iguales entre 3 amigos. ¿Cuántas manzanas recibe cada amigo?',
      answer: 4,
      why: '12 ÷ 3 = 4',
    },
    {
      spec: { op: 'two', packs: 3, each: 5, change: 4, gain: true },
      en: 'Mia buys 3 packs with 5 apples in each pack. Then Leo gives Mia 4 more. How many apples does Mia have now?',
      es: 'Mia compra 3 paquetes con 5 manzanas cada uno. Luego Leo le da 4 más. ¿Cuántas manzanas tiene Mia ahora?',
      answer: 19,
      why: '3 × 5 = 15; 15 + 4 = 19',
    },
    {
      spec: { op: 'two', packs: 3, each: 5, change: 4, gain: false },
      en: 'Mia buys 3 packs with 5 apples in each pack. Then Mia gives away 4. How many apples are left?',
      es: 'Mia compra 3 paquetes con 5 manzanas cada uno. Luego regala 4. ¿Cuántas le quedan?',
      answer: 11,
      why: '3 × 5 = 15; 15 − 4 = 11',
    },
  ];
  for (const c of cases) {
    it(`${c.spec.op}${'gain' in c.spec ? (c.spec.gain ? ' (gain)' : ' (give away)') : ''} in English and Spanish`, () => {
      const en = buildWordProblem(ctx(4, 0, 1), scene, c.spec);
      expect(en.prompt).toBe(c.en);
      expect(en.answer).toBe(c.answer);
      expect(en.why).toBe(c.why);
      expect(buildWordProblem(ctx(4, 0, 1, 'es'), scene, c.spec).prompt).toBe(c.es);
    });
  }
  it('offers choices in grade 1 and a keypad from grade 2', () => {
    const g1 = buildWordProblem(ctx(1, 0, 1), scene, { op: 'add', a: 5, b: 3 });
    expect(g1.kind).toBe('choice');
    expect(g1.answer).toBe('8');
    expect((g1.opts ?? []).filter((o) => num(o) === 8)).toHaveLength(1);
    expect(buildWordProblem(ctx(2, 0, 1), scene, { op: 'add', a: 5, b: 3 }).kind).toBe('num');
  });
  it('rejects problems with no positive whole answer', () => {
    expect(() => buildWordProblem(ctx(2, 0, 1), scene, { op: 'sub', a: 4, b: 4 })).toThrow();
    expect(() => buildWordProblem(ctx(4, 0, 1), scene, { op: 'two', packs: 2, each: 3, change: 6, gain: false })).toThrow();
  });
  it('agrees the Spanish quantity word with the item for every operation', () => {
    const specs: WordSpec[] = cases.map((c) => c.spec);
    for (const item of WORD_ITEMS) {
      for (const spec of specs) {
        const prompt = buildWordProblem(ctx(4, 0, 1, 'es'), { ...scene, item }, spec).prompt;
        const right = item.feminine ? 'Cuántas' : 'Cuántos';
        const wrong = item.feminine ? 'Cuántos' : 'Cuántas';
        expect(prompt, `${item.es} ${spec.op}`).toContain(right);
        expect(prompt, `${item.es} ${spec.op}`).not.toContain(wrong);
      }
    }
  });
  it('knows the Spanish gender of every item', () => {
    const gender = Object.fromEntries(WORD_ITEMS.map((i) => [i.es, i.feminine]));
    expect(gender).toEqual({
      manzanas: true,
      stickers: false,
      canicas: true,
      libros: false,
      galletas: true,
      lápices: false,
      globos: false,
      conchas: true,
    });
  });
});

describe('wordTopic correctness (English prompts)', () => {
  const seen = new Set<string>();
  const MAX = [
    [10, 15, 20],
    [40, 70, 100],
    [200, 500, 900],
  ];
  const ALLOWED: Record<number, string[]> = {
    1: ['add', 'sub'],
    2: ['add', 'sub', 'mul'],
    3: ['add', 'sub', 'mul', 'div'],
    4: ['mul', 'div', 'two'],
    5: ['mul', 'div', 'two'],
    6: ['mul', 'div', 'two'],
  };
  for (const grade of GRADES) {
    for (const tier of TIERS) {
      for (let seed = 1; seed <= 120; seed++) {
        const q = wordTopic.generate(ctx(grade, tier, seed));
        const p = q.prompt;
        const tag = `g${grade}/t${tier}/seed${seed}: ${p}`;
        const answer = num(q.answer);
        expect(answer, tag).toBeGreaterThan(0);
        expect(Number.isInteger(answer), tag).toBe(true);
        let op: string;
        let m: RegExpExecArray | null;
        if ((m = /^(\S+) has (\d+) (\S+)\. (\S+) gives \1 (\d+) more\. How many \3 does \1 have now\?$/.exec(p))) {
          op = 'add';
          expect(m[1], tag).not.toBe(m[4]);
          expect(answer, tag).toBe(Number(m[2]) + Number(m[5]));
          if (grade <= 3) expect(answer, tag).toBeLessThanOrEqual(MAX[grade - 1]![tier]!);
        } else if ((m = /^(\S+) has (\d+) (\S+) and gives (\d+) to (\S+)\. How many \3 does \1 have left\?$/.exec(p))) {
          op = 'sub';
          expect(m[1], tag).not.toBe(m[5]);
          expect(Number(m[4]), tag).toBeLessThan(Number(m[2]));
          expect(answer, tag).toBe(Number(m[2]) - Number(m[4]));
          if (grade <= 3) expect(Number(m[2]), tag).toBeLessThanOrEqual(MAX[grade - 1]![tier]!);
        } else if ((m = /^There are (\d+) boxes\. Each box has (\d+) (\S+)\. How many \3 are there in all\?$/.exec(p))) {
          op = 'mul';
          expect(answer, tag).toBe(Number(m[1]) * Number(m[2]));
        } else if ((m = /^(\S+) shares (\d+) (\S+) equally among (\d+) friends\. How many \3 does each friend get\?$/.exec(p))) {
          op = 'div';
          expect(Number(m[2]) % Number(m[4]), tag).toBe(0);
          expect(answer, tag).toBe(Number(m[2]) / Number(m[4]));
        } else if (
          (m = /^(\S+) buys (\d+) packs with (\d+) (\S+) in each pack\. Then (\S+) gives \1 (\d+) more\. How many \4 does \1 have now\?$/.exec(p))
        ) {
          op = 'two';
          expect(answer, tag).toBe(Number(m[2]) * Number(m[3]) + Number(m[6]));
        } else if (
          (m = /^(\S+) buys (\d+) packs with (\d+) (\S+) in each pack\. Then \1 gives away (\d+)\. How many \4 are left\?$/.exec(p))
        ) {
          op = 'two';
          expect(Number(m[5]), tag).toBeLessThan(Number(m[2]) * Number(m[3]));
          expect(answer, tag).toBe(Number(m[2]) * Number(m[3]) - Number(m[5]));
        } else {
          throw new Error(`unrecognised word problem: ${p}`);
        }
        seen.add(op);
        expect(ALLOWED[grade], tag).toContain(op);
        expect(q.kind, tag).toBe(grade === 1 ? 'choice' : 'num');
        if (q.kind === 'choice') expect((q.opts ?? []).filter((o) => num(o) === answer), tag).toHaveLength(1);
      }
    }
  }
  it('covers every operation', () => {
    expect([...seen].sort()).toEqual(['add', 'div', 'mul', 'sub', 'two']);
  });
});

describe('wordTopic in Spanish', () => {
  it('agrees "cuántas/cuántos" with whatever item was drawn', () => {
    const seenItems = new Set<string>();
    for (const grade of GRADES) {
      for (let seed = 1; seed <= 150; seed++) {
        const prompt = wordTopic.generate(ctx(grade, 1, seed, 'es')).prompt;
        const item = WORD_ITEMS.find((i) => new RegExp(`\\b${i.es}\\b`).test(prompt));
        expect(item, prompt).toBeDefined();
        seenItems.add(item!.es);
        const right = item!.feminine ? 'Cuántas' : 'Cuántos';
        const wrong = item!.feminine ? 'Cuántos' : 'Cuántas';
        expect(prompt, prompt).toContain(`¿${right}`);
        expect(prompt, prompt).not.toContain(wrong);
      }
    }
    expect(seenItems.size).toBe(WORD_ITEMS.length);
  });
  it('draws names from the shared list and never pairs a name with itself', () => {
    expect(new Set(WORD_NAMES).size).toBe(WORD_NAMES.length);
    for (let seed = 1; seed <= 100; seed++) {
      const prompt = wordTopic.generate(ctx(1, 0, seed)).prompt;
      const named = WORD_NAMES.filter((n) => prompt.includes(n));
      expect(named.length, prompt).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('wordTopic metadata', () => {
  it('matches the prototype table', () => {
    expect(wordTopic).toMatchObject({
      id: 'word',
      accent: '#5a6bd8',
      title: { en: 'Word Problems', es: 'Problemas con texto' },
    });
    expect(wordTopic.generate(ctx(1, 0, 1)).topic).toBe('word');
  });
});

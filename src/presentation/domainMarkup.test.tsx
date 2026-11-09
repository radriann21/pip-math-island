import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
// The domain is imported by this TEST only, to prove the presentation layer satisfies the domain's markup contract.
import { TOPICS, generateRaceQuestion, generateRound } from '@/domain/exercises';
import { createSeededRng } from '@/domain/shared/rng';
import type { Grade, Locale, Tier } from '@/domain/shared/types';
import { Sprite } from './atoms';

// Read from disk: vitest stubs CSS imports, so `?raw` would not give the real stylesheet.
const visualsCss = readFileSync(join(process.cwd(), 'src/presentation/styles/visuals.css'), 'utf8');

const GRADES: Grade[] = [1, 2, 3, 4, 5, 6];
const TIERS: Tier[] = [0, 1, 2];
const LOCALES: Locale[] = ['en', 'es'];
const SEEDS = [1, 2, 3, 4, 5, 6];

/** Ids referenced through `href="#id"` and `url(#id)`. */
function referencedIds(markup: string): string[] {
  const ids: string[] = [];
  for (const m of markup.matchAll(/href="#([\w-]+)"/g)) ids.push(m[1] as string);
  for (const m of markup.matchAll(/url\(#([\w-]+)\)/g)) ids.push(m[1] as string);
  return ids;
}

/** Class tokens used in the markup (`class="hand m"` yields hand and m). */
function usedClasses(markup: string): string[] {
  const classes: string[] = [];
  for (const m of markup.matchAll(/class="([^"]*)"/g)) classes.push(...(m[1] as string).split(/\s+/).filter(Boolean));
  return classes;
}

function everyQuestionMarkup(): string[] {
  const out: string[] = [];
  for (const topic of TOPICS) {
    for (const grade of GRADES) {
      for (const tier of TIERS) {
        for (const locale of LOCALES) {
          for (const seed of SEEDS) {
            const rng = createSeededRng(seed * 7919 + grade * 31 + tier);
            for (const q of generateRound(topic.id, grade, tier, locale, rng)) {
              out.push(q.prompt, q.vis, q.hint, q.why, ...(q.opts ?? []));
            }
          }
        }
      }
    }
  }
  for (const grade of GRADES) {
    for (const locale of LOCALES) {
      const rq = generateRaceQuestion(grade, locale, createSeededRng(grade));
      out.push(rq.prompt, ...rq.opts);
    }
  }
  return out;
}

describe('domain markup contract', () => {
  const markup = everyQuestionMarkup();

  it('every referenced svg id exists in the rendered Sprite', () => {
    const { container } = render(<Sprite />);
    const defined = new Set(Array.from(container.querySelectorAll('[id]'), (el) => el.id));

    const referenced = new Set(markup.flatMap(referencedIds));
    expect(referenced.size).toBeGreaterThan(0);
    const missing = [...referenced].filter((id) => !defined.has(id));
    expect(missing).toEqual([]);
  });

  it('actually uses the sprite: items, base-ten patterns and star symbols all show up', () => {
    const referenced = new Set(markup.flatMap(referencedIds));
    for (const id of ['i-apple', 'i-balloon', 'i-cookie', 'i-starc', 'pgH', 'pgT', 'pgO']) {
      expect(referenced.has(id), id).toBe(true);
    }
  });

  it('every css class used by domain markup is styled by visuals.css', () => {
    const used = new Set(markup.flatMap(usedClasses));
    expect(used.size).toBeGreaterThan(5);
    const unstyled = [...used].filter((cls) => !new RegExp(`\\.${cls}(?![\\w-])`).test(visualsCss));
    expect(unstyled).toEqual([]);
  });

  it('detects a missing id (negative control)', () => {
    const { container } = render(<Sprite />);
    const defined = new Set(Array.from(container.querySelectorAll('[id]'), (el) => el.id));
    const ids = referencedIds('<svg><use href="#i-nope"/><rect fill="url(#pgX)"/></svg>');
    expect(ids.filter((id) => !defined.has(id))).toEqual(['i-nope', 'pgX']);
  });
});

import { describe, expect, it } from 'vitest';
import { BADGES, newlyEarned } from './badges';
import type { PlayerSnapshot } from './badges';

const EMPTY: PlayerSnapshot = {
  xp: 0,
  streak: 0,
  roundsTotal: 0,
  totalStars: 0,
  topicsTried: 0,
  hasMaster: false,
  raceBest: 0,
  perfectRound: false,
  bestCombo: 0,
};
const snap = (over: Partial<PlayerSnapshot>): PlayerSnapshot => ({ ...EMPTY, ...over });
const badge = (id: string) => {
  const b = BADGES.find((x) => x.id === id);
  if (!b) throw new Error(`missing badge ${id}`);
  return b;
};

describe('BADGES catalogue', () => {
  it('has the 12 prototype ids in order', () => {
    expect(BADGES.map((b) => b.id)).toEqual([
      'first', 'perfect', 'combo5', 'explorer', 'stars15', 'stars40',
      'master', 'streak3', 'streak7', 'racer', 'racer2', 'lvl5',
    ]);
  });
  it('has unique ids, colors, bilingual texts and valid glyphs', () => {
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(12);
    for (const b of BADGES) {
      expect(['star', 'flame', 'bolt', 'crown', 'heart', 'medal']).toContain(b.glyph);
      expect(b.color).toMatch(/^#[0-9a-f]{6}$/);
      for (const loc of ['en', 'es'] as const) {
        expect(b.title[loc].length).toBeGreaterThan(0);
        expect(b.description[loc].length).toBeGreaterThan(0);
      }
    }
  });
  it('copies a few prototype texts verbatim', () => {
    expect(badge('first').title).toEqual({ en: 'First Steps', es: 'Primeros pasos' });
    expect(badge('combo5').description.es).toBe('Acierta 5 seguidas a la primera');
    expect(badge('lvl5').glyph).toBe('medal');
    expect(badge('perfect').color).toBe('#e8588a');
  });
  it('earns nothing with an empty snapshot', () => {
    for (const b of BADGES) expect(b.isEarned(EMPTY)).toBe(false);
  });
});

describe('badge boundaries', () => {
  it.each([
    ['first', 'roundsTotal', 0, 1],
    ['combo5', 'bestCombo', 4, 5],
    ['explorer', 'topicsTried', 5, 6],
    ['stars15', 'totalStars', 14, 15],
    ['stars40', 'totalStars', 39, 40],
    ['streak3', 'streak', 2, 3],
    ['streak7', 'streak', 6, 7],
    ['racer', 'raceBest', 14, 15],
    ['racer2', 'raceBest', 29, 30],
  ] as const)('%s needs %s: not at %s, yes at %s', (id, key, below, at) => {
    expect(badge(id).isEarned(snap({ [key]: below }))).toBe(false);
    expect(badge(id).isEarned(snap({ [key]: at }))).toBe(true);
  });
  it('perfect needs a perfect round', () => {
    expect(badge('perfect').isEarned(snap({ perfectRound: false }))).toBe(false);
    expect(badge('perfect').isEarned(snap({ perfectRound: true }))).toBe(true);
  });
  it('master needs hasMaster', () => {
    expect(badge('master').isEarned(snap({ hasMaster: false }))).toBe(false);
    expect(badge('master').isEarned(snap({ hasMaster: true }))).toBe(true);
  });
  it('lvl5 needs level 5 (960 xp)', () => {
    expect(badge('lvl5').isEarned(snap({ xp: 959 }))).toBe(false);
    expect(badge('lvl5').isEarned(snap({ xp: 960 }))).toBe(true);
  });
});

describe('newlyEarned', () => {
  it('returns earned badges that are not owned, in catalogue order', () => {
    const s = snap({ roundsTotal: 1, streak: 3, perfectRound: true });
    expect(newlyEarned(new Set(), s).map((b) => b.id)).toEqual(['first', 'perfect', 'streak3']);
  });
  it('skips owned badges', () => {
    const s = snap({ roundsTotal: 1, streak: 3 });
    expect(newlyEarned(new Set(['first']), s).map((b) => b.id)).toEqual(['streak3']);
  });
  it('returns nothing when everything earned is owned', () => {
    expect(newlyEarned(new Set(['first']), snap({ roundsTotal: 1 }))).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import type { Child, PlayerState, SavedRace, SavedRound } from './model';
import { applyRace, applyRound, emptyPlayer } from './projection';

const CHILD: Child = { id: 'c1', name: 'Ana', grade: 2, locale: 'en', soundEnabled: true };

function round(over: Partial<SavedRound> = {}): SavedRound {
  return {
    topic: 'add',
    grade: 2,
    tierBefore: 0,
    tierAfter: 1,
    firstTry: 7,
    secondTry: 2,
    missed: 1,
    bestCombo: 4,
    stars: 2,
    xpGained: 100,
    bonusXp: 0,
    details: [],
    today: '2026-05-10',
    streak: 1,
    newBadgeIds: [],
    ...over,
  };
}

describe('emptyPlayer', () => {
  it('starts with nothing and an untouched day', () => {
    expect(emptyPlayer(CHILD, '2026-05-10')).toEqual({
      child: CHILD,
      xp: 0,
      streak: 0,
      lastPlayed: null,
      roundsTotal: 0,
      raceBest: 0,
      progress: {},
      badges: [],
      today: { day: '2026-05-10', rounds: 0, bonusClaimed: false },
    });
  });
});

describe('applyRound (mirrors the record_round SQL function)', () => {
  const base = emptyPlayer(CHILD, '2026-05-10');

  it('creates the topic row with tierAfter, stars, answered and correct', () => {
    const next = applyRound(base, round());
    expect(next.progress['2:add']).toEqual({ tier: 1, bestStars: 2, answered: 10, correct: 9 });
  });
  it('accumulates answered and correct and keeps the best stars', () => {
    const once = applyRound(base, round({ stars: 3, tierAfter: 2 }));
    const twice = applyRound(once, round({ stars: 1, tierAfter: 1, firstTry: 3, secondTry: 2, missed: 5 }));
    expect(twice.progress['2:add']).toEqual({ tier: 1, bestStars: 3, answered: 20, correct: 14 });
  });
  it('raises best stars when a later round is better', () => {
    const once = applyRound(base, round({ stars: 1 }));
    expect(applyRound(once, round({ stars: 3 })).progress['2:add']?.bestStars).toBe(3);
  });
  it('keeps other topics and grades separate', () => {
    const next = applyRound(applyRound(base, round()), round({ topic: 'sub', grade: 3 }));
    expect(Object.keys(next.progress).sort()).toEqual(['2:add', '3:sub']);
  });
  it('adds xp (gained plus bonus), sets streak, last played and counts the round', () => {
    const next = applyRound(base, round({ xpGained: 90, bonusXp: 30, streak: 4 }));
    expect(next.xp).toBe(120);
    expect(next.streak).toBe(4);
    expect(next.lastPlayed).toBe('2026-05-10');
    expect(next.roundsTotal).toBe(1);
  });
  it('never moves last played backwards', () => {
    const played = { ...base, lastPlayed: '2026-05-12' };
    expect(applyRound(played, round({ today: '2026-05-10' })).lastPlayed).toBe('2026-05-12');
  });
  it('counts daily rounds and ORs the bonus flag', () => {
    const r1 = applyRound(base, round());
    expect(r1.today).toEqual({ day: '2026-05-10', rounds: 1, bonusClaimed: false });
    const r2 = applyRound(r1, round({ bonusXp: 30 }));
    expect(r2.today).toEqual({ day: '2026-05-10', rounds: 2, bonusClaimed: true });
    const r3 = applyRound(r2, round());
    expect(r3.today).toEqual({ day: '2026-05-10', rounds: 3, bonusClaimed: true });
  });
  it('starts a new daily row on a new day', () => {
    const r1 = applyRound(base, round({ bonusXp: 30 }));
    const r2 = applyRound(r1, round({ today: '2026-05-11' }));
    expect(r2.today).toEqual({ day: '2026-05-11', rounds: 1, bonusClaimed: false });
  });
  it('unions badges without duplicates and keeps order', () => {
    const r1 = applyRound(base, round({ newBadgeIds: ['first'] }));
    const r2 = applyRound(r1, round({ newBadgeIds: ['first', 'perfect'] }));
    expect(r2.badges).toEqual(['first', 'perfect']);
  });
  it('does not mutate its input', () => {
    const snapshot = structuredClone(base);
    applyRound(base, round({ newBadgeIds: ['first'] }));
    expect(base).toEqual(snapshot);
  });
});

describe('applyRace (mirrors the record_race SQL function)', () => {
  const race = (over: Partial<SavedRace> = {}): SavedRace => ({
    grade: 2,
    score: 12,
    bestCombo: 5,
    xpGained: 24,
    newBadgeIds: [],
    ...over,
  });
  const base: PlayerState = { ...emptyPlayer(CHILD, '2026-05-10'), xp: 10, raceBest: 8 };

  it('raises the record and adds xp', () => {
    const next = applyRace(base, race());
    expect(next.raceBest).toBe(12);
    expect(next.xp).toBe(34);
  });
  it('keeps the record when the score is lower', () => {
    expect(applyRace(base, race({ score: 5, xpGained: 10 })).raceBest).toBe(8);
  });
  it('unions badges', () => {
    const next = applyRace({ ...base, badges: ['first'] }, race({ newBadgeIds: ['first', 'racer'] }));
    expect(next.badges).toEqual(['first', 'racer']);
  });
  it('does not touch rounds, streak or progress', () => {
    const next = applyRace(base, race());
    expect(next.roundsTotal).toBe(0);
    expect(next.streak).toBe(0);
    expect(next.progress).toEqual({});
  });
});

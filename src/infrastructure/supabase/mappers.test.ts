import { describe, expect, it } from 'vitest';
import type { SavedRace, SavedRound } from '@/application/model';
import {
  childFromRow,
  childPatchToUpdate,
  childToInsert,
  historyFromRow,
  playerFromRows,
  raceToRpcArgs,
  roundToRpcArgs,
} from './mappers';

const childRow = {
  id: 'c1',
  parent_id: 'p1',
  name: 'Ana',
  grade: 3,
  locale: 'es',
  sound_enabled: false,
  xp: 250,
  streak: 4,
  last_played: '2026-05-09',
  rounds_total: 12,
  race_best: 17,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
};

describe('childFromRow', () => {
  it('maps a valid row', () => {
    expect(childFromRow(childRow)).toEqual({ id: 'c1', name: 'Ana', grade: 3, locale: 'es', soundEnabled: false });
  });
  it('coerces out-of-range grade and unknown locale', () => {
    expect(childFromRow({ ...childRow, grade: 11, locale: 'fr' })).toMatchObject({ grade: 6, locale: 'en' });
    expect(childFromRow({ ...childRow, grade: 0 })).toMatchObject({ grade: 1 });
  });
});

describe('child write mappers', () => {
  it('builds an insert row with the parent id and a trimmed name', () => {
    expect(childToInsert({ name: ' Ana ', grade: 2, locale: 'en', soundEnabled: true }, 'p1')).toEqual({
      parent_id: 'p1',
      name: 'Ana',
      grade: 2,
      locale: 'en',
      sound_enabled: true,
    });
  });
  it('builds an update containing only the provided fields', () => {
    expect(childPatchToUpdate({ soundEnabled: false })).toEqual({ sound_enabled: false });
    expect(childPatchToUpdate({ name: ' Bo ', grade: 4, locale: 'es' })).toEqual({ name: 'Bo', grade: 4, locale: 'es' });
    expect(childPatchToUpdate({})).toEqual({});
  });
});

describe('playerFromRows', () => {
  const topics = [
    { child_id: 'c1', grade: 3, topic: 'add', tier: 2, best_stars: 3, answered: 40, correct: 35, updated_at: 'x' },
    { child_id: 'c1', grade: 3, topic: 'frac', tier: 1, best_stars: 1, answered: 10, correct: 5, updated_at: 'x' },
    { child_id: 'c1', grade: 3, topic: 'bogus', tier: 1, best_stars: 1, answered: 10, correct: 5, updated_at: 'x' },
  ];
  it('assembles a full player from rows', () => {
    const state = playerFromRows({
      child: childRow,
      topics,
      badges: [
        { child_id: 'c1', badge_id: 'first', earned_at: 'a' },
        { child_id: 'c1', badge_id: 'streak3', earned_at: 'b' },
      ],
      daily: { child_id: 'c1', day: '2026-05-10', rounds: 2, bonus_claimed: false },
      today: '2026-05-10',
    });
    expect(state).toEqual({
      child: { id: 'c1', name: 'Ana', grade: 3, locale: 'es', soundEnabled: false },
      xp: 250,
      streak: 4,
      lastPlayed: '2026-05-09',
      roundsTotal: 12,
      raceBest: 17,
      progress: {
        '3:add': { tier: 2, bestStars: 3, answered: 40, correct: 35 },
        '3:frac': { tier: 1, bestStars: 1, answered: 10, correct: 5 },
      },
      badges: ['first', 'streak3'],
      today: { day: '2026-05-10', rounds: 2, bonusClaimed: false },
    });
  });
  it('falls back to an untouched day when there is no activity row', () => {
    const state = playerFromRows({ child: { ...childRow, last_played: null }, topics: [], badges: [], daily: null, today: '2026-05-10' });
    expect(state.today).toEqual({ day: '2026-05-10', rounds: 0, bonusClaimed: false });
    expect(state.lastPlayed).toBeNull();
    expect(state.progress).toEqual({});
  });
  it('clamps inconsistent numbers defensively', () => {
    const state = playerFromRows({
      child: { ...childRow, xp: -5 },
      topics: [{ ...topics[0]!, tier: 9, best_stars: 8, correct: 99 }],
      badges: [],
      daily: null,
      today: '2026-05-10',
    });
    expect(state.xp).toBe(0);
    expect(state.progress['3:add']).toEqual({ tier: 2, bestStars: 3, answered: 40, correct: 40 });
  });
});

describe('historyFromRow', () => {
  const row = {
    id: 'r1',
    child_id: 'c1',
    grade: 2,
    topic: 'sub',
    tier_before: 0,
    tier_after: 1,
    first_try: 8,
    second_try: 1,
    missed: 1,
    best_combo: 6,
    stars: 2,
    xp_gained: 95,
    details: [
      { index: 0, prompt: '5-2', correct: true, tries: 1 },
      { index: 1, prompt: 'bad', correct: 'yes' },
      'junk',
    ],
    played_at: '2026-05-10T10:00:00Z',
  };
  it('maps a row and keeps only well-formed details', () => {
    expect(historyFromRow(row)).toEqual({
      id: 'r1',
      topic: 'sub',
      grade: 2,
      stars: 2,
      firstTry: 8,
      secondTry: 1,
      missed: 1,
      xpGained: 95,
      playedAt: '2026-05-10T10:00:00Z',
      details: [{ index: 0, prompt: '5-2', correct: true, tries: 1 }],
    });
  });
  it('tolerates details that are not an array', () => {
    expect(historyFromRow({ ...row, details: { a: 1 } })?.details).toEqual([]);
    expect(historyFromRow({ ...row, details: null })?.details).toEqual([]);
  });
  it('returns null for an unknown topic', () => {
    expect(historyFromRow({ ...row, topic: 'zzz' })).toBeNull();
  });
});

describe('RPC argument mappers', () => {
  const round: SavedRound = {
    topic: 'mul',
    grade: 4,
    tierBefore: 1,
    tierAfter: 2,
    firstTry: 8,
    secondTry: 1,
    missed: 1,
    bestCombo: 6,
    stars: 2,
    xpGained: 95,
    bonusXp: 30,
    details: [{ index: 0, prompt: '3x4', correct: true, tries: 1 }],
    today: '2026-05-10',
    streak: 3,
    newBadgeIds: ['first', 'streak3'],
  };
  it('maps a round to the exact record_round parameter names', () => {
    expect(roundToRpcArgs('c1', round)).toEqual({
      p_child_id: 'c1',
      p_grade: 4,
      p_topic: 'mul',
      p_tier_before: 1,
      p_tier_after: 2,
      p_first_try: 8,
      p_second_try: 1,
      p_missed: 1,
      p_best_combo: 6,
      p_stars: 2,
      p_xp_gained: 95,
      p_bonus_xp: 30,
      p_details: [{ index: 0, prompt: '3x4', correct: true, tries: 1 }],
      p_today: '2026-05-10',
      p_streak: 3,
      p_badges: ['first', 'streak3'],
    });
  });
  it('maps a race to the exact record_race parameter names', () => {
    const race: SavedRace = { grade: 5, score: 21, bestCombo: 7, xpGained: 42, newBadgeIds: ['racer'] };
    expect(raceToRpcArgs('c1', race)).toEqual({
      p_child_id: 'c1',
      p_grade: 5,
      p_score: 21,
      p_best_combo: 7,
      p_xp_gained: 42,
      p_badges: ['racer'],
    });
  });
});

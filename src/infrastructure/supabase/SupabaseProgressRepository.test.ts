import { describe, expect, it } from 'vitest';
import { AuthError, NotFoundError, StorageError, ValidationError } from '@/application/errors';
import type { SavedRace, SavedRound } from '@/application/model';
import { FixedClock } from '@/application/testing';
import { SupabaseProgressRepository } from './SupabaseProgressRepository';
import { type FakeSupabaseOptions, createFakeSupabase } from './testing/fakeSupabase';

const childRow = {
  id: 'c1',
  parent_id: 'parent-1',
  name: 'Ana',
  grade: 2,
  locale: 'en',
  sound_enabled: true,
  xp: 130,
  streak: 2,
  last_played: '2026-05-09',
  rounds_total: 3,
  race_best: 9,
  created_at: 'x',
  updated_at: 'x',
};
const tables = (over: Record<string, unknown> = {}): NonNullable<FakeSupabaseOptions['tables']> => ({
  children: { data: childRow, error: null },
  topic_progress: {
    data: [{ child_id: 'c1', grade: 2, topic: 'add', tier: 1, best_stars: 2, answered: 20, correct: 17, updated_at: 'x' }],
    error: null,
  },
  child_badges: { data: [{ child_id: 'c1', badge_id: 'first', earned_at: 'x' }], error: null },
  daily_activity: { data: { child_id: 'c1', day: '2026-05-10', rounds: 1, bonus_claimed: false }, error: null },
  ...(over as NonNullable<FakeSupabaseOptions['tables']>),
});
const clock = () => new FixedClock('2026-05-10');
const pg = (code: string) => ({ code, message: 'raw sql', details: '', hint: '' });

const round: SavedRound = {
  topic: 'add',
  grade: 2,
  tierBefore: 0,
  tierAfter: 1,
  firstTry: 9,
  secondTry: 1,
  missed: 0,
  bestCombo: 9,
  stars: 3,
  xpGained: 120,
  bonusXp: 30,
  details: [{ index: 0, prompt: '1+1', correct: true, tries: 1 }],
  today: '2026-05-10',
  streak: 3,
  newBadgeIds: ['first', 'perfect'],
};
const race: SavedRace = { grade: 2, score: 12, bestCombo: 5, xpGained: 24, newBadgeIds: ['racer'] };

describe('SupabaseProgressRepository.load', () => {
  it('assembles the player from four table reads, using the clock for the daily row', async () => {
    const f = createFakeSupabase({ tables: tables() });
    const state = await new SupabaseProgressRepository(f.client, clock()).load('c1');
    expect(state).toEqual({
      child: { id: 'c1', name: 'Ana', grade: 2, locale: 'en', soundEnabled: true },
      xp: 130,
      streak: 2,
      lastPlayed: '2026-05-09',
      roundsTotal: 3,
      raceBest: 9,
      progress: { '2:add': { tier: 1, bestStars: 2, answered: 20, correct: 17 } },
      badges: ['first'],
      today: { day: '2026-05-10', rounds: 1, bonusClaimed: false },
    });
    const byTable = Object.fromEntries(f.calls.map((c) => [c.table, c.ops]));
    expect(Object.keys(byTable).sort()).toEqual(['child_badges', 'children', 'daily_activity', 'topic_progress']);
    expect(byTable.children).toContainEqual({ method: 'eq', args: ['id', 'c1'] });
    expect(byTable.topic_progress).toContainEqual({ method: 'eq', args: ['child_id', 'c1'] });
    expect(byTable.child_badges).toContainEqual({ method: 'eq', args: ['child_id', 'c1'] });
    expect(byTable.daily_activity).toContainEqual({ method: 'eq', args: ['day', '2026-05-10'] });
  });
  it('treats a missing daily row as an untouched day', async () => {
    const f = createFakeSupabase({ tables: tables({ daily_activity: { data: null, error: null } }) });
    expect((await new SupabaseProgressRepository(f.client, clock()).load('c1')).today).toEqual({
      day: '2026-05-10',
      rounds: 0,
      bonusClaimed: false,
    });
  });
  it('throws NotFoundError when the child is not visible', async () => {
    const f = createFakeSupabase({ tables: tables({ children: { data: null, error: null } }) });
    await expect(new SupabaseProgressRepository(f.client, clock()).load('c1')).rejects.toBeInstanceOf(NotFoundError);
  });
  it('maps a failure of any of the reads', async () => {
    for (const table of ['children', 'topic_progress', 'child_badges', 'daily_activity']) {
      const f = createFakeSupabase({ tables: tables({ [table]: { data: null, error: pg('XX000') } }) });
      await expect(new SupabaseProgressRepository(f.client, clock()).load('c1')).rejects.toBeInstanceOf(StorageError);
    }
  });
});

describe('SupabaseProgressRepository.saveRound / saveRace', () => {
  it('saveRound calls record_round with the exact arguments, then reloads', async () => {
    const f = createFakeSupabase({ tables: tables() });
    const state = await new SupabaseProgressRepository(f.client, clock()).saveRound('c1', round);
    expect(f.rpcCalls).toEqual([
      {
        name: 'record_round',
        args: {
          p_child_id: 'c1',
          p_grade: 2,
          p_topic: 'add',
          p_tier_before: 0,
          p_tier_after: 1,
          p_first_try: 9,
          p_second_try: 1,
          p_missed: 0,
          p_best_combo: 9,
          p_stars: 3,
          p_xp_gained: 120,
          p_bonus_xp: 30,
          p_details: [{ index: 0, prompt: '1+1', correct: true, tries: 1 }],
          p_today: '2026-05-10',
          p_streak: 3,
          p_badges: ['first', 'perfect'],
        },
      },
    ]);
    expect(f.calls.length).toBe(4);
    expect(state.child.id).toBe('c1');
  });
  it('saveRace calls record_race with the exact arguments, then reloads', async () => {
    const f = createFakeSupabase({ tables: tables() });
    await new SupabaseProgressRepository(f.client, clock()).saveRace('c1', race);
    expect(f.rpcCalls).toEqual([
      {
        name: 'record_race',
        args: { p_child_id: 'c1', p_grade: 2, p_score: 12, p_best_combo: 5, p_xp_gained: 24, p_badges: ['racer'] },
      },
    ]);
    expect(f.calls.length).toBe(4);
  });
  it('does not reload when the RPC fails and maps each error class', async () => {
    const cases: Array<[string, new (...a: never[]) => Error]> = [
      ['42501', NotFoundError],
      ['23514', ValidationError],
      ['22003', ValidationError],
      ['PGRST301', AuthError],
      ['08006', StorageError],
    ];
    for (const [code, ctor] of cases) {
      const f = createFakeSupabase({ tables: tables(), rpc: { record_round: { data: null, error: pg(code) }, record_race: { data: null, error: pg(code) } } });
      const repo = new SupabaseProgressRepository(f.client, clock());
      await expect(repo.saveRound('c1', round)).rejects.toBeInstanceOf(ctor);
      await expect(repo.saveRace('c1', race)).rejects.toBeInstanceOf(ctor);
      expect(f.calls).toHaveLength(0);
    }
  });
});

describe('SupabaseProgressRepository.history', () => {
  const dbRound = (id: string, topic = 'add') => ({
    id,
    child_id: 'c1',
    grade: 2,
    topic,
    tier_before: 0,
    tier_after: 1,
    first_try: 9,
    second_try: 1,
    missed: 0,
    best_combo: 9,
    stars: 3,
    xp_gained: 120,
    details: [{ index: 0, prompt: '1+1', correct: true, tries: 1 }, 'junk'],
    played_at: '2026-05-10T10:00:00Z',
  });
  it('selects newest first with a limit and maps rows defensively', async () => {
    const f = createFakeSupabase({ tables: { rounds: { data: [dbRound('r1'), dbRound('r2', 'unknown-topic')], error: null } } });
    const items = await new SupabaseProgressRepository(f.client, clock()).history('c1', 5);
    expect(items.map((i) => i.id)).toEqual(['r1']);
    expect(items[0]?.details).toEqual([{ index: 0, prompt: '1+1', correct: true, tries: 1 }]);
    expect(f.calls[0]?.table).toBe('rounds');
    expect(f.calls[0]?.ops).toEqual([
      { method: 'select', args: ['*'] },
      { method: 'eq', args: ['child_id', 'c1'] },
      { method: 'order', args: ['played_at', { ascending: false }] },
      { method: 'limit', args: [5] },
    ]);
  });
  it('defaults the limit to 20 and maps errors', async () => {
    const f = createFakeSupabase({ tables: { rounds: { data: [], error: null } } });
    await new SupabaseProgressRepository(f.client, clock()).history('c1');
    expect(f.calls[0]?.ops.at(-1)).toEqual({ method: 'limit', args: [20] });
    const bad = createFakeSupabase({ tables: { rounds: { data: null, error: pg('XX000') } } });
    await expect(new SupabaseProgressRepository(bad.client, clock()).history('c1')).rejects.toBeInstanceOf(StorageError);
  });
});

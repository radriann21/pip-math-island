import { describe, expect, it } from 'vitest';
import { NotFoundError, StorageError, ValidationError } from '@/application/errors';
import type { Child, SavedRace, SavedRound } from '@/application/model';
import { FixedClock, InMemoryChildRepository, InMemoryProgressRepository } from '@/application/testing';
import { LocalChildRepository } from './LocalChildRepository';
import { LocalProgressRepository, MAX_HISTORY } from './LocalProgressRepository';
import { MemoryStorage } from './MemoryStorage';
import { progressKeyFor } from './keys';

const round = (over: Partial<SavedRound> = {}): SavedRound => ({
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
  bonusXp: 0,
  details: [{ index: 0, prompt: '1+1', correct: true, tries: 1 }],
  today: '2026-05-10',
  streak: 1,
  newBadgeIds: ['first'],
  ...over,
});
const race: SavedRace = { grade: 2, score: 12, bestCombo: 5, xpGained: 24, newBadgeIds: ['racer'] };

async function setup(initial: Record<string, string> = {}) {
  const storage = new MemoryStorage(initial);
  const clock = new FixedClock('2026-05-10');
  let n = 0;
  const newId = () => `r-${++n}`;
  const children = new LocalChildRepository(storage, () => `c-${++n}`);
  const progress = new LocalProgressRepository(storage, children, clock, newId);
  const child: Child = await children.create({ name: 'Ana', grade: 2, locale: 'en', soundEnabled: true });
  return { storage, clock, children, progress, child };
}

describe('LocalProgressRepository', () => {
  it('loads an empty player for a known child and rejects unknown ones', async () => {
    const { progress, child } = await setup();
    const s = await progress.load(child.id);
    expect(s).toMatchObject({ child, xp: 0, streak: 0, lastPlayed: null, roundsTotal: 0, raceBest: 0, badges: [] });
    expect(s.today).toEqual({ day: '2026-05-10', rounds: 0, bonusClaimed: false });
    await expect(progress.load('ghost')).rejects.toBeInstanceOf(NotFoundError);
    await expect(progress.saveRound('ghost', round())).rejects.toBeInstanceOf(NotFoundError);
    await expect(progress.saveRace('ghost', race)).rejects.toBeInstanceOf(NotFoundError);
    await expect(progress.history('ghost')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('behaves like the reference in-memory repository for a sequence of rounds and races', async () => {
    const { progress, child, clock } = await setup();
    const refChildren = new InMemoryChildRepository();
    const refClock = new FixedClock('2026-05-10');
    const ref = new InMemoryProgressRepository(refChildren, refClock);
    const refChild = await refChildren.create({ name: 'Ana', grade: 2, locale: 'en', soundEnabled: true });
    const steps: Array<(c: string, repo: typeof progress | typeof ref) => Promise<unknown>> = [
      (c, r) => r.saveRound(c, round()),
      (c, r) => r.saveRound(c, round({ topic: 'sub', stars: 1, tierAfter: 0, firstTry: 5, secondTry: 0, missed: 5, bonusXp: 30, newBadgeIds: ['first', 'x'] })),
      (c, r) => r.saveRace(c, race),
      (c, r) => r.saveRound(c, round({ stars: 2, today: '2026-05-10', streak: 2 })),
    ];
    for (const step of steps) {
      await step(child.id, progress);
      await step(refChild.id, ref);
    }
    const a = await progress.load(child.id);
    const b = await ref.load(refChild.id);
    expect({ ...a, child: undefined }).toEqual({ ...b, child: undefined });
    clock.advanceDays(1);
    refClock.advanceDays(1);
    expect((await progress.load(child.id)).today).toEqual((await ref.load(refChild.id)).today);
  });

  it('persists to a namespaced key and reloads in a fresh instance', async () => {
    const { progress, child, storage, children, clock } = await setup();
    await progress.saveRound(child.id, round());
    expect(storage.getItem(progressKeyFor(child.id))).not.toBeNull();
    const fresh = new LocalProgressRepository(storage, children, clock);
    expect((await fresh.load(child.id)).xp).toBe(120);
    expect(await fresh.history(child.id)).toHaveLength(1);
  });

  it('reflects child profile updates and resets the daily counter on a new day', async () => {
    const { progress, child, children, clock } = await setup();
    await progress.saveRound(child.id, round({ bonusXp: 30 }));
    expect((await progress.load(child.id)).today).toEqual({ day: '2026-05-10', rounds: 1, bonusClaimed: true });
    await children.update(child.id, { name: 'Anita' });
    clock.advanceDays(1);
    const s = await progress.load(child.id);
    expect(s.child.name).toBe('Anita');
    expect(s.today).toEqual({ day: '2026-05-11', rounds: 0, bonusClaimed: false });
  });

  it('applies the same input checks as the SQL functions', async () => {
    const { progress, child } = await setup();
    await expect(progress.saveRound(child.id, round({ bonusXp: 101 }))).rejects.toBeInstanceOf(ValidationError);
    await expect(progress.saveRound(child.id, round({ bonusXp: -1 }))).rejects.toBeInstanceOf(ValidationError);
    await expect(progress.saveRound(child.id, round({ firstTry: 5 }))).rejects.toBeInstanceOf(ValidationError);
    await expect(progress.saveRound(child.id, round({ xpGained: 201 }))).rejects.toBeInstanceOf(ValidationError);
    await expect(progress.saveRace(child.id, { ...race, xpGained: 1001 })).rejects.toBeInstanceOf(ValidationError);
    await expect(progress.saveRace(child.id, { ...race, score: 501 })).rejects.toBeInstanceOf(ValidationError);
    expect((await progress.load(child.id)).xp).toBe(0);
  });

  it('lists history newest first, honours the limit and bounds it to the last 50 rounds', async () => {
    const { progress, child } = await setup();
    for (let i = 0; i < MAX_HISTORY + 5; i++) await progress.saveRound(child.id, round({ xpGained: i }));
    const all = await progress.history(child.id, 500);
    expect(all).toHaveLength(MAX_HISTORY);
    expect(all[0]?.xpGained).toBe(MAX_HISTORY + 4);
    expect(all.at(-1)?.xpGained).toBe(5);
    expect(await progress.history(child.id, 3)).toHaveLength(3);
    expect((await progress.history(child.id)).length).toBeLessThanOrEqual(20);
    expect((await progress.load(child.id)).roundsTotal).toBe(MAX_HISTORY + 5);
  });

  it('recovers from a corrupt progress blob with a fresh player', async () => {
    const { progress, child, storage } = await setup();
    storage.setItem(progressKeyFor(child.id), '}{ nope');
    const s = await progress.load(child.id);
    expect(s.xp).toBe(0);
    expect(await progress.history(child.id)).toEqual([]);
    expect((await progress.saveRound(child.id, round())).xp).toBe(120);
  });

  it('sanitises a structurally wrong blob field by field', async () => {
    const { progress, child, storage } = await setup();
    storage.setItem(
      progressKeyFor(child.id),
      JSON.stringify({
        xp: 'many',
        streak: -4,
        lastPlayed: 12,
        roundsTotal: 3.7,
        raceBest: null,
        progress: {
          '2:add': { tier: 9, bestStars: 7, answered: 'x', correct: 5 },
          'bad-key': { tier: 1, bestStars: 1, answered: 1, correct: 1 },
          '3:nope': { tier: 1, bestStars: 1, answered: 1, correct: 1 },
          '2:sub': 'junk',
        },
        badges: ['ok', 3, null, 'ok'],
        today: { day: 'yesterday', rounds: 'a', bonusClaimed: 1 },
        history: [{ id: 'h', topic: 'add', grade: 2, stars: 2, firstTry: 8, secondTry: 1, missed: 1, xpGained: 90, playedAt: '2026-05-01T10:00:00.000Z', details: [] }, 'junk', { topic: 'zzz' }],
      }),
    );
    const s = await progress.load(child.id);
    expect(s).toMatchObject({ xp: 0, streak: 0, lastPlayed: null, roundsTotal: 4, raceBest: 0, badges: ['ok'] });
    expect(s.progress).toEqual({ '2:add': { tier: 2, bestStars: 3, answered: 0, correct: 0 } });
    expect(s.today).toEqual({ day: '2026-05-10', rounds: 0, bonusClaimed: false });
    const h = await progress.history(child.id);
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({ id: 'h', topic: 'add', stars: 2 });
  });

  it('wraps storage write failures in StorageError', async () => {
    const { progress, child, storage } = await setup();
    storage.setItem = () => {
      throw new Error('quota');
    };
    await expect(progress.saveRound(child.id, round())).rejects.toBeInstanceOf(StorageError);
  });
});

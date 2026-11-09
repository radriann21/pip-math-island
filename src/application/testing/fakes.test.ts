import { describe, expect, it, vi } from 'vitest';
import { AuthError, NotFoundError, ValidationError } from '../errors';
import type { SavedRace, SavedRound } from '../model';
import { FixedClock } from './FixedClock';
import { InMemoryAuthGateway } from './InMemoryAuthGateway';
import { InMemoryChildRepository } from './InMemoryChildRepository';
import { InMemoryProgressRepository } from './InMemoryProgressRepository';
import { createTestDeps } from './index';

describe('FixedClock', () => {
  it('reports the configured day and moves by days', () => {
    const clock = new FixedClock('2026-02-28');
    expect(clock.today()).toBe('2026-02-28');
    clock.advanceDays(1);
    expect(clock.today()).toBe('2026-03-01');
    clock.setToday('2024-02-29');
    expect(clock.today()).toBe('2024-02-29');
  });
  it('derives now() from the day and moves forward with it', () => {
    const clock = new FixedClock('2026-05-10');
    const first = clock.now();
    expect(new Date(first).toISOString().startsWith('2026-05-10')).toBe(true);
    clock.advanceDays(1);
    expect(clock.now()).toBeGreaterThan(first);
  });
});

describe('InMemoryAuthGateway', () => {
  it('signs up, signs in and out, notifying listeners', async () => {
    const auth = new InMemoryAuthGateway();
    const seen: Array<string | null> = [];
    const off = auth.onChange((s) => seen.push(s?.email ?? null));
    const up = await auth.signUp('a@b.co', 'secret1');
    expect(up.needsEmailConfirmation).toBe(false);
    expect(up.session?.guest).toBe(false);
    await auth.signOut();
    expect(await auth.getSession()).toBeNull();
    const session = await auth.signIn('a@b.co', 'secret1');
    expect(session.email).toBe('a@b.co');
    expect(await auth.getSession()).toEqual(session);
    off();
    await auth.signOut();
    expect(seen).toEqual(['a@b.co', null, 'a@b.co']);
  });
  it('can require email confirmation on sign up', async () => {
    const auth = new InMemoryAuthGateway({ requireEmailConfirmation: true });
    const up = await auth.signUp('a@b.co', 'secret1');
    expect(up).toEqual({ session: null, needsEmailConfirmation: true });
    expect(await auth.getSession()).toBeNull();
  });
  it('rejects duplicate accounts, bad credentials and short passwords with AuthError', async () => {
    const auth = new InMemoryAuthGateway();
    await auth.signUp('a@b.co', 'secret1');
    await expect(auth.signUp('A@b.co', 'secret1')).rejects.toBeInstanceOf(AuthError);
    await expect(auth.signUp('c@d.co', '123')).rejects.toBeInstanceOf(AuthError);
    await expect(auth.signIn('a@b.co', 'wrong')).rejects.toBeInstanceOf(AuthError);
    await expect(auth.signIn('nobody@b.co', 'secret1')).rejects.toBeInstanceOf(AuthError);
  });
  it('supports guest mode', async () => {
    const auth = new InMemoryAuthGateway();
    const cb = vi.fn();
    auth.onChange(cb);
    const guest = await auth.continueAsGuest();
    expect(guest).toEqual({ userId: 'guest', email: null, guest: true });
    expect(cb).toHaveBeenCalledWith(guest);
  });
});

describe('InMemoryChildRepository', () => {
  it('creates, lists, updates and removes', async () => {
    const repo = new InMemoryChildRepository();
    const a = await repo.create({ name: 'Ana', grade: 2, locale: 'es', soundEnabled: true });
    const b = await repo.create({ name: 'Bo', grade: 3, locale: 'en', soundEnabled: false });
    expect(a.id).not.toBe(b.id);
    expect(await repo.list()).toEqual([a, b]);
    const updated = await repo.update(a.id, { grade: 4 });
    expect(updated).toEqual({ ...a, grade: 4 });
    await repo.remove(a.id);
    expect(await repo.list()).toEqual([b]);
  });
  it('throws NotFoundError for unknown ids', async () => {
    const repo = new InMemoryChildRepository();
    await expect(repo.update('nope', { name: 'x' })).rejects.toBeInstanceOf(NotFoundError);
    await expect(repo.remove('nope')).rejects.toBeInstanceOf(NotFoundError);
  });
  it('returns copies so callers cannot mutate storage', async () => {
    const repo = new InMemoryChildRepository();
    const a = await repo.create({ name: 'Ana', grade: 2, locale: 'es', soundEnabled: true });
    a.name = 'Hacked';
    expect((await repo.list())[0]?.name).toBe('Ana');
  });
});

describe('InMemoryProgressRepository', () => {
  async function setup() {
    const clock = new FixedClock('2026-05-10');
    const children = new InMemoryChildRepository();
    const progress = new InMemoryProgressRepository(children, clock);
    const child = await children.create({ name: 'Ana', grade: 2, locale: 'en', soundEnabled: true });
    return { clock, children, progress, child };
  }
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

  it('loads an empty player for a known child and fails for an unknown one', async () => {
    const { progress, child } = await setup();
    const state = await progress.load(child.id);
    expect(state.child).toEqual(child);
    expect(state.xp).toBe(0);
    expect(state.today).toEqual({ day: '2026-05-10', rounds: 0, bonusClaimed: false });
    await expect(progress.load('missing')).rejects.toBeInstanceOf(NotFoundError);
    await expect(progress.saveRound('missing', round())).rejects.toBeInstanceOf(NotFoundError);
    await expect(progress.saveRace('missing', { grade: 2, score: 1, bestCombo: 1, xpGained: 2, newBadgeIds: [] })).rejects.toBeInstanceOf(NotFoundError);
  });
  it('applies a round and persists it for the next load', async () => {
    const { progress, child } = await setup();
    const saved = await progress.saveRound(child.id, round());
    expect(saved.xp).toBe(120);
    expect(saved.progress['2:add']).toEqual({ tier: 1, bestStars: 3, answered: 10, correct: 10 });
    expect(saved.badges).toEqual(['first']);
    expect(await progress.load(child.id)).toEqual(saved);
  });
  it('resets the daily counter when the clock moves to another day', async () => {
    const { progress, child, clock } = await setup();
    await progress.saveRound(child.id, round());
    clock.advanceDays(1);
    expect((await progress.load(child.id)).today).toEqual({ day: '2026-05-11', rounds: 0, bonusClaimed: false });
  });
  it('reflects child profile updates', async () => {
    const { progress, child, children } = await setup();
    await progress.saveRound(child.id, round());
    await children.update(child.id, { name: 'Anita' });
    expect((await progress.load(child.id)).child.name).toBe('Anita');
  });
  it('rejects a bonus outside 0..100 like the SQL check', async () => {
    const { progress, child } = await setup();
    await expect(progress.saveRound(child.id, round({ bonusXp: 101 }))).rejects.toBeInstanceOf(ValidationError);
    await expect(progress.saveRound(child.id, round({ bonusXp: -1 }))).rejects.toBeInstanceOf(ValidationError);
  });
  it('applies a race and rejects xp outside 0..1000', async () => {
    const { progress, child } = await setup();
    const race: SavedRace = { grade: 2, score: 12, bestCombo: 5, xpGained: 24, newBadgeIds: [] };
    const saved = await progress.saveRace(child.id, race);
    expect(saved.raceBest).toBe(12);
    expect(saved.xp).toBe(24);
    await expect(progress.saveRace(child.id, { ...race, xpGained: 1001 })).rejects.toBeInstanceOf(ValidationError);
  });
  it('lists history newest first and honours the limit', async () => {
    const { progress, child, clock } = await setup();
    await progress.saveRound(child.id, round({ stars: 1 }));
    clock.advanceDays(1);
    await progress.saveRound(child.id, round({ stars: 2, today: '2026-05-11' }));
    clock.advanceDays(1);
    await progress.saveRound(child.id, round({ stars: 3, today: '2026-05-12' }));
    const all = await progress.history(child.id);
    expect(all.map((h) => h.stars)).toEqual([3, 2, 1]);
    expect(all[0]?.playedAt.startsWith('2026-05-12')).toBe(true);
    expect(new Set(all.map((h) => h.id)).size).toBe(3);
    expect(await progress.history(child.id, 2)).toHaveLength(2);
    await expect(progress.history('missing')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('createTestDeps', () => {
  it('wires every port with deterministic defaults', async () => {
    const t = createTestDeps();
    expect(t.deps.clock).toBe(t.clock);
    expect(typeof t.deps.rng()).toBe('number');
    const child = await t.deps.children.create({ name: 'Ana', grade: 1, locale: 'en', soundEnabled: true });
    expect((await t.deps.progress.load(child.id)).child.id).toBe(child.id);
  });
});

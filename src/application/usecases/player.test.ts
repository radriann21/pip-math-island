import { describe, expect, it } from 'vitest';
import { NotFoundError } from '../errors';
import { emptyPlayer } from '../projection';
import { createTestDeps } from '../testing';
import { buildSnapshot } from './buildSnapshot';
import { loadPlayer } from './loadPlayer';
import { startRound } from './startRound';
import { details, setupPlayer } from './testHelpers';
import { finishRound } from './finishRound';

describe('loadPlayer', () => {
  it('returns the child state', async () => {
    const { state, child } = await setupPlayer();
    expect(state.child).toEqual(child);
    expect(state.xp).toBe(0);
  });
  it('throws NotFoundError for an unknown child', async () => {
    const { deps } = createTestDeps();
    await expect(loadPlayer(deps, 'nope')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('buildSnapshot', () => {
  const child = { id: 'c', name: 'A', grade: 2 as const, locale: 'en' as const, soundEnabled: true };
  it('is empty for a fresh player', () => {
    expect(buildSnapshot(emptyPlayer(child, '2026-05-10'))).toEqual({
      xp: 0,
      streak: 0,
      roundsTotal: 0,
      totalStars: 0,
      topicsTried: 0,
      hasMaster: false,
      raceBest: 0,
      perfectRound: false,
      bestCombo: 0,
    });
  });
  it('sums stars across grades, counts distinct topics played and detects a master', () => {
    const state = {
      ...emptyPlayer(child, '2026-05-10'),
      xp: 70,
      streak: 2,
      roundsTotal: 5,
      raceBest: 9,
      progress: {
        '2:add': { tier: 1 as const, bestStars: 3 as const, answered: 20, correct: 18 },
        '3:add': { tier: 0 as const, bestStars: 1 as const, answered: 10, correct: 5 },
        '2:sub': { tier: 0 as const, bestStars: 2 as const, answered: 10, correct: 8 },
        '2:mul': { tier: 0 as const, bestStars: 0 as const, answered: 0, correct: 0 },
      },
    };
    expect(buildSnapshot(state, { perfectRound: true, bestCombo: 6 })).toEqual({
      xp: 70,
      streak: 2,
      roundsTotal: 5,
      totalStars: 6,
      topicsTried: 2,
      hasMaster: true,
      raceBest: 9,
      perfectRound: true,
      bestCombo: 6,
    });
  });
});

describe('startRound', () => {
  it('builds ten questions for the topic at the stored tier', async () => {
    const { deps, state } = await setupPlayer({ grade: 3, locale: 'es' });
    const { questions, tier } = startRound(deps, { state, topic: 'add' });
    expect(tier).toBe(0);
    expect(questions).toHaveLength(10);
    expect(questions.every((q) => q.topic === 'add')).toBe(true);
  });
  it('uses the stored tier and is deterministic for the same rng seed', async () => {
    const a = await setupPlayer({ grade: 4 });
    const b = await setupPlayer({ grade: 4 });
    const withTier = (s: typeof a.state) => ({
      ...s,
      progress: { '4:mul': { tier: 2 as const, bestStars: 1 as const, answered: 10, correct: 7 } },
    });
    const ra = startRound(a.deps, { state: withTier(a.state), topic: 'mul' });
    const rb = startRound(b.deps, { state: withTier(b.state), topic: 'mul' });
    expect(ra.tier).toBe(2);
    expect(ra.questions).toEqual(rb.questions);
  });
  it('uses the progress of the child current grade only', async () => {
    const { deps, state } = await setupPlayer({ grade: 2 });
    const other = { ...state, progress: { '3:add': { tier: 2 as const, bestStars: 3 as const, answered: 10, correct: 10 } } };
    expect(startRound(deps, { state: other, topic: 'add' }).tier).toBe(0);
  });
});

describe('finishRound', () => {
  it('scores a perfect round, persists it and awards badges once', async () => {
    const { deps, state } = await setupPlayer();
    const out = await finishRound(deps, { state, topic: 'add', tierBefore: 0, details: details(10) });
    expect(out.score).toEqual({ stars: 3, tierAfter: 1, xpGained: 135, perfect: true });
    expect(out.bonusXp).toBe(0);
    expect(out.newBadges.map((b) => b.id)).toEqual(['first', 'perfect', 'combo5', 'master']);
    expect(out.state.xp).toBe(135);
    expect(out.state.roundsTotal).toBe(1);
    expect(out.state.progress['2:add']).toEqual({ tier: 1, bestStars: 3, answered: 10, correct: 10 });
    expect(out.state.badges).toEqual(['first', 'perfect', 'combo5', 'master']);
    expect(await loadPlayer(deps, state.child.id)).toEqual(out.state);

    const again = await finishRound(deps, { state: out.state, topic: 'add', tierBefore: 1, details: details(10) });
    expect(again.newBadges).toEqual([]);
    expect(again.state.badges).toEqual(['first', 'perfect', 'combo5', 'master']);
  });
  it('records the round in the history', async () => {
    const { deps, state } = await setupPlayer();
    await finishRound(deps, { state, topic: 'sub', tierBefore: 0, details: details(6, 2, 2) });
    const [item] = await deps.progress.history(state.child.id);
    expect(item).toMatchObject({ topic: 'sub', grade: 2, stars: 2, firstTry: 6, secondTry: 2, missed: 2 });
  });
  it('lowers the tier after a poor round without stars', async () => {
    const { deps, state } = await setupPlayer();
    const out = await finishRound(deps, { state, topic: 'add', tierBefore: 1, details: details(2, 1, 7) });
    expect(out.score.stars).toBe(0);
    expect(out.state.progress['2:add']?.tier).toBe(0);
    expect(out.newBadges.map((b) => b.id)).toEqual(['first']);
  });
  it('flags a player level-up only when the level changes', async () => {
    const { deps, state } = await setupPlayer();
    const low = { ...state, xp: 10 };
    const small = await finishRound(deps, { state: low, topic: 'add', tierBefore: 0, details: details(0, 1, 9) });
    expect(small.levelUp).toBe(false);
    const { deps: d2, state: s2 } = await setupPlayer();
    const nearly = await d2.progress.saveRace(s2.child.id, { grade: 2, score: 25, bestCombo: 3, xpGained: 50, newBadgeIds: [] });
    expect(nearly.xp).toBe(50);
    const out = await finishRound(d2, { state: nearly, topic: 'add', tierBefore: 0, details: details(10) });
    expect(out.levelUp).toBe(true); // 50 -> 185 crosses 60
  });
  it('rejects inconsistent details with ValidationError and saves nothing', async () => {
    const { deps, state } = await setupPlayer();
    const bad = details(3).map((d) => ({ ...d, correct: false }));
    await expect(finishRound(deps, { state, topic: 'add', tierBefore: 0, details: bad })).rejects.toMatchObject({
      name: 'ValidationError',
    });
    await expect(finishRound(deps, { state, topic: 'add', tierBefore: 0, details: [] })).rejects.toMatchObject({
      name: 'ValidationError',
    });
    expect((await loadPlayer(deps, state.child.id)).roundsTotal).toBe(0);
  });
  it('throws NotFoundError when the child does not exist', async () => {
    const { deps, state } = await setupPlayer();
    const ghost = { ...state, child: { ...state.child, id: 'ghost' } };
    await expect(finishRound(deps, { state: ghost, topic: 'add', tierBefore: 0, details: details(10) })).rejects.toBeInstanceOf(NotFoundError);
  });

  describe('daily goal', () => {
    it('grants the bonus exactly once, on the third round of the day', async () => {
      const t = await setupPlayer();
      let state = t.state;
      const bonuses: number[] = [];
      for (let i = 0; i < 5; i++) {
        const out = await finishRound(t.deps, { state, topic: 'add', tierBefore: 0, details: details(0, 10) });
        bonuses.push(out.bonusXp);
        state = out.state;
      }
      expect(bonuses).toEqual([0, 0, 30, 0, 0]);
      expect(state.today).toEqual({ day: '2026-05-10', rounds: 5, bonusClaimed: true });
      expect(state.xp).toBe(5 * 50 + 30);
    });
    it('starts a fresh goal the next day', async () => {
      const t = await setupPlayer();
      let state = t.state;
      for (let i = 0; i < 3; i++) {
        state = (await finishRound(t.deps, { state, topic: 'add', tierBefore: 0, details: details(0, 10) })).state;
      }
      t.clock.advanceDays(1);
      state = await loadPlayer(t.deps, state.child.id);
      expect(state.today).toEqual({ day: '2026-05-11', rounds: 0, bonusClaimed: false });
      const bonuses: number[] = [];
      for (let i = 0; i < 3; i++) {
        const out = await finishRound(t.deps, { state, topic: 'add', tierBefore: 0, details: details(0, 10) });
        bonuses.push(out.bonusXp);
        state = out.state;
      }
      expect(bonuses).toEqual([0, 0, 30]);
    });
  });

  describe('streak', () => {
    const play = async (t: Awaited<ReturnType<typeof setupPlayer>>, state: typeof t.state) =>
      (await finishRound(t.deps, { state, topic: 'add', tierBefore: 0, details: details(5, 0, 5) })).state;

    it('grows on consecutive days, stays within a day and resets after a gap', async () => {
      const t = await setupPlayer({ today: '2026-04-29' });
      let s = await play(t, t.state);
      expect(s.streak).toBe(1);
      s = await play(t, s);
      expect(s.streak).toBe(1);
      t.clock.advanceDays(1); // 04-30
      s = await play(t, await loadPlayer(t.deps, s.child.id));
      expect(s.streak).toBe(2);
      t.clock.advanceDays(1); // 05-01, across the month end
      s = await play(t, await loadPlayer(t.deps, s.child.id));
      expect(s.streak).toBe(3);
      expect(s.badges).toContain('streak3');
      t.clock.advanceDays(2); // gap
      s = await play(t, await loadPlayer(t.deps, s.child.id));
      expect(s.streak).toBe(1);
      expect(s.lastPlayed).toBe('2026-05-03');
    });
  });

  describe('badges', () => {
    it('awards the explorer sticker after six different topics and stars badges on thresholds', async () => {
      const t = await setupPlayer();
      let state = t.state;
      const topics = ['add', 'sub', 'mul', 'div', 'count', 'frac'] as const;
      let last: string[] = [];
      for (const topic of topics) {
        const out = await finishRound(t.deps, { state, topic, tierBefore: 0, details: details(9, 1) }); // 3 stars
        state = out.state;
        last = out.newBadges.map((b) => b.id);
      }
      expect(last).toContain('explorer');
      expect(state.badges).toContain('stars15'); // 6 topics x 3 stars = 18
      expect(state.badges).not.toContain('stars40');
    });
    it('awards the level 5 sticker when xp reaches 960', async () => {
      const t = await setupPlayer();
      const race = await t.deps.progress.saveRace(t.state.child.id, { grade: 2, score: 1, bestCombo: 1, xpGained: 900, newBadgeIds: [] });
      const out = await finishRound(t.deps, { state: race, topic: 'add', tierBefore: 0, details: details(10) });
      expect(out.state.xp).toBe(1035);
      expect(out.newBadges.map((b) => b.id)).toContain('lvl5');
    });
  });
});

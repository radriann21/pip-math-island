import { describe, expect, it } from 'vitest';
import { RACE_SECONDS, answerRace, initialRace } from '@/domain/progression';
import { NotFoundError, ValidationError } from '../errors';
import { finishRace } from './finishRace';
import { finishRound } from './finishRound';
import { getParentReport } from './getParentReport';
import { startRace } from './startRace';
import { details, setupPlayer } from './testHelpers';

describe('startRace', () => {
  it('returns the duration, a fresh tracker and a question source for the child grade', async () => {
    const { deps, state } = await setupPlayer({ grade: 3, locale: 'es' });
    const race = startRace(deps, state);
    expect(race.seconds).toBe(RACE_SECONDS);
    expect(race.tracker).toEqual(initialRace());
    const q = race.nextQuestion();
    expect(q.opts).toHaveLength(4);
    expect(q.opts).toContain(q.answer);
  });
  it('is deterministic for the same seed', async () => {
    const a = await setupPlayer();
    const b = await setupPlayer();
    expect(startRace(a.deps, a.state).nextQuestion()).toEqual(startRace(b.deps, b.state).nextQuestion());
  });
  it('works with the domain tracker', async () => {
    const { deps, state } = await setupPlayer();
    const race = startRace(deps, state);
    expect(answerRace(race.tracker, true).score).toBe(1);
  });
});

describe('finishRace', () => {
  it('awards 2 xp per point and flags a new record', async () => {
    const { deps, state } = await setupPlayer();
    const out = await finishRace(deps, { state, score: 8, bestCombo: 4 });
    expect(out.xpGained).toBe(16);
    expect(out.record).toBe(true);
    expect(out.state.raceBest).toBe(8);
    expect(out.state.xp).toBe(16);
    expect(out.newBadges).toEqual([]);
  });
  it('does not flag a record for an equal or lower score and keeps the best', async () => {
    const { deps, state } = await setupPlayer();
    const first = await finishRace(deps, { state, score: 8, bestCombo: 4 });
    const tie = await finishRace(deps, { state: first.state, score: 8, bestCombo: 2 });
    expect(tie.record).toBe(false);
    const lower = await finishRace(deps, { state: tie.state, score: 3, bestCombo: 1 });
    expect(lower.record).toBe(false);
    expect(lower.state.raceBest).toBe(8);
    expect(lower.state.xp).toBe(16 + 16 + 6);
  });
  it('does not call a zero score a record', async () => {
    const { deps, state } = await setupPlayer();
    const out = await finishRace(deps, { state, score: 0, bestCombo: 0 });
    expect(out.record).toBe(false);
  });
  it('awards the race badges once at 15 and 30', async () => {
    const { deps, state } = await setupPlayer();
    const at14 = await finishRace(deps, { state, score: 14, bestCombo: 5 });
    expect(at14.newBadges).toEqual([]);
    const at15 = await finishRace(deps, { state: at14.state, score: 15, bestCombo: 5 });
    expect(at15.newBadges.map((b) => b.id)).toEqual(['racer']);
    const at30 = await finishRace(deps, { state: at15.state, score: 30, bestCombo: 9 });
    expect(at30.newBadges.map((b) => b.id)).toEqual(['racer2']);
    const again = await finishRace(deps, { state: at30.state, score: 30, bestCombo: 9 });
    expect(again.newBadges).toEqual([]);
    expect(again.state.badges).toEqual(['racer', 'racer2']);
  });
  it('does not award the combo sticker from a race combo (prototype behaviour)', async () => {
    const { deps, state } = await setupPlayer();
    const out = await finishRace(deps, { state, score: 10, bestCombo: 10 });
    expect(out.newBadges.map((b) => b.id)).not.toContain('combo5');
  });
  it('awards the level 5 sticker when race xp reaches the threshold', async () => {
    const { deps, state } = await setupPlayer();
    const out = await finishRace(deps, { state: { ...state, xp: 940 }, score: 10, bestCombo: 2 });
    expect(out.newBadges.map((b) => b.id)).toContain('lvl5');
  });
  it('validates the score', async () => {
    const { deps, state } = await setupPlayer();
    for (const score of [-1, 1.5, Number.NaN, 501]) {
      await expect(finishRace(deps, { state, score, bestCombo: 0 })).rejects.toBeInstanceOf(ValidationError);
    }
    await expect(finishRace(deps, { state, score: 5, bestCombo: 6 })).rejects.toBeInstanceOf(ValidationError);
  });
  it('throws NotFoundError for an unknown child', async () => {
    const { deps, state } = await setupPlayer();
    const ghost = { ...state, child: { ...state.child, id: 'ghost' } };
    await expect(finishRace(deps, { state: ghost, score: 5, bestCombo: 1 })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('getParentReport', () => {
  it('is empty for a new child', async () => {
    const { deps, child } = await setupPlayer();
    const report = await getParentReport(deps, child.id);
    expect(report).toEqual({
      child,
      level: 1,
      totals: { xp: 0, roundsTotal: 0, stars: 0, accuracy: 0 },
      topics: [],
      weakTopics: [],
      recentRounds: [],
    });
  });
  it('throws NotFoundError for an unknown child', async () => {
    const { deps } = await setupPlayer();
    await expect(getParentReport(deps, 'nope')).rejects.toBeInstanceOf(NotFoundError);
  });
  it('computes totals, per-topic accuracy and recent rounds', async () => {
    const t = await setupPlayer();
    let state = t.state;
    // add: 10 right (3 stars); sub: 5 of 10 (1 star)
    state = (await finishRound(t.deps, { state, topic: 'add', tierBefore: 0, details: details(10) })).state;
    state = (await finishRound(t.deps, { state, topic: 'sub', tierBefore: 0, details: details(5, 0, 5) })).state;
    const report = await getParentReport(t.deps, t.child.id);
    expect(report.level).toBe(state.xp >= 60 ? 2 : 1);
    expect(report.totals).toEqual({ xp: state.xp, roundsTotal: 2, stars: 4, accuracy: 15 / 20 });
    expect(report.topics.map((r) => [r.topic, r.accuracy, r.bestStars, r.answered, r.correct])).toEqual([
      ['add', 1, 3, 10, 10],
      ['sub', 0.5, 1, 10, 5],
    ]);
    expect(report.topics[0]).toMatchObject({ grade: 2, tier: 1 });
    expect(report.recentRounds.map((r) => r.topic)).toEqual(['sub', 'add']);
  });
  it('lists only topics of the current grade but totals every grade', async () => {
    const t = await setupPlayer({ grade: 2 });
    let state = t.state;
    state = (await finishRound(t.deps, { state, topic: 'add', tierBefore: 0, details: details(10) })).state;
    await t.deps.children.update(t.child.id, { grade: 3 });
    state = await t.deps.progress.load(t.child.id);
    await finishRound(t.deps, { state, topic: 'mul', tierBefore: 0, details: details(6, 0, 4) });
    const report = await getParentReport(t.deps, t.child.id);
    expect(report.child.grade).toBe(3);
    expect(report.topics.map((r) => `${r.grade}:${r.topic}`)).toEqual(['3:mul']);
    expect(report.totals.roundsTotal).toBe(2);
    expect(report.totals.accuracy).toBe(16 / 20);
  });
  it('picks up to 3 weak topics with at least 10 answers, lowest accuracy first', async () => {
    const t = await setupPlayer();
    let state = t.state;
    const plays: Array<[Parameters<typeof finishRound>[1]['topic'], number]> = [
      ['count', 9], ['add', 3], ['sub', 6], ['mul', 4], ['div', 8],
    ];
    for (const [topic, right] of plays) {
      state = (await finishRound(t.deps, { state, topic, tierBefore: 0, details: details(right, 0, 10 - right) })).state;
    }
    const report = await getParentReport(t.deps, t.child.id);
    expect(report.weakTopics.map((r) => r.topic)).toEqual(['add', 'mul', 'sub']);
    expect(report.weakTopics.map((r) => r.accuracy)).toEqual([0.3, 0.4, 0.6]);
  });
  it('ignores topics with fewer than 10 answers when ranking weak topics', async () => {
    const t = await setupPlayer();
    const state = t.state;
    // Seed a topic with 5 answers directly through the fake: low accuracy but too few answers.
    await t.deps.progress.saveRound(t.child.id, {
      topic: 'geo', grade: 2, tierBefore: 0, tierAfter: 0, firstTry: 0, secondTry: 0, missed: 5, bestCombo: 0,
      stars: 0, xpGained: 0, bonusXp: 0, details: [], today: '2026-05-10', streak: 1, newBadgeIds: [],
    });
    const report = await getParentReport(t.deps, state.child.id);
    expect(report.topics[0]).toMatchObject({ topic: 'geo', answered: 5, accuracy: 0 });
    expect(report.weakTopics).toEqual([]);
  });
  it('limits recent rounds to the 10 newest', async () => {
    const t = await setupPlayer();
    let state = t.state;
    for (let i = 0; i < 12; i++) {
      state = (await finishRound(t.deps, { state, topic: 'add', tierBefore: 0, details: details(5, 0, 5) })).state;
    }
    expect((await getParentReport(t.deps, t.child.id)).recentRounds).toHaveLength(10);
  });
});

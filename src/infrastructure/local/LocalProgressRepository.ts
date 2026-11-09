import { NotFoundError, ValidationError } from '@/application/errors';
import type {
  AnswerDetail,
  Child,
  DailyActivity,
  PlayerState,
  RoundHistoryItem,
  SavedRace,
  SavedRound,
  TopicProgress,
} from '@/application/model';
import type { ChildRepository, Clock, ProgressRepository } from '@/application/ports';
import { applyRace, applyRound, emptyPlayer } from '@/application/projection';
import { asRecord, clampInt, isTopicId, toGrade, toStars, toTier } from '../coerce';
import { type IdFactory, defaultIdFactory, readJson, writeJson } from './json';
import type { KeyValueStorage } from './KeyValueStorage';
import { progressKeyFor } from './keys';

/** Only the most recent rounds are kept in guest mode. */
export const MAX_HISTORY = 50;
const DEFAULT_HISTORY_LIMIT = 20;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const PROGRESS_KEY = /^([1-6]):([a-z]+)$/;

/** What is persisted per child: the player state without the (separately stored) profile, plus the history. */
interface StoredPlayer extends Omit<PlayerState, 'child'> {
  history: RoundHistoryItem[];
}

const count = (v: unknown): number => clampInt(v, 0, Number.MAX_SAFE_INTEGER, 0);

function parseDetails(value: unknown): AnswerDetail[] {
  if (!Array.isArray(value)) return [];
  const out: AnswerDetail[] = [];
  for (const item of value) {
    const r = asRecord(item);
    if (!r || typeof r.prompt !== 'string' || typeof r.correct !== 'boolean') continue;
    out.push({ index: count(r.index), prompt: r.prompt, correct: r.correct, tries: r.tries === 2 ? 2 : 1 });
  }
  return out;
}

function parseHistory(value: unknown): RoundHistoryItem[] {
  if (!Array.isArray(value)) return [];
  const out: RoundHistoryItem[] = [];
  for (const item of value) {
    const r = asRecord(item);
    if (!r || typeof r.id !== 'string' || !isTopicId(r.topic) || typeof r.playedAt !== 'string') continue;
    out.push({
      id: r.id,
      topic: r.topic,
      grade: toGrade(r.grade),
      stars: toStars(r.stars),
      firstTry: clampInt(r.firstTry, 0, 10, 0),
      secondTry: clampInt(r.secondTry, 0, 10, 0),
      missed: clampInt(r.missed, 0, 10, 0),
      xpGained: clampInt(r.xpGained, 0, 200, 0),
      playedAt: r.playedAt,
      details: parseDetails(r.details),
    });
  }
  return out.slice(-MAX_HISTORY);
}

function parseProgress(value: unknown): Record<string, TopicProgress> {
  const out: Record<string, TopicProgress> = {};
  const r = asRecord(value);
  if (!r) return out;
  for (const [key, entry] of Object.entries(r)) {
    const match = PROGRESS_KEY.exec(key);
    const e = asRecord(entry);
    if (!match || !e || !isTopicId(match[2])) continue;
    const answered = count(e.answered);
    out[key] = {
      tier: toTier(e.tier),
      bestStars: toStars(e.bestStars),
      answered,
      correct: Math.min(count(e.correct), answered),
    };
  }
  return out;
}

function parseToday(value: unknown): DailyActivity | null {
  const r = asRecord(value);
  if (!r || typeof r.day !== 'string' || !ISO_DAY.test(r.day)) return null;
  return { day: r.day, rounds: count(r.rounds), bonusClaimed: r.bonusClaimed === true };
}

function parseStored(raw: unknown, today: string): StoredPlayer {
  const r = asRecord(raw) ?? {};
  const badges = Array.isArray(r.badges) ? [...new Set(r.badges.filter((b): b is string => typeof b === 'string'))] : [];
  return {
    xp: count(r.xp),
    streak: count(r.streak),
    lastPlayed: typeof r.lastPlayed === 'string' && ISO_DAY.test(r.lastPlayed) ? r.lastPlayed : null,
    roundsTotal: count(r.roundsTotal),
    raceBest: count(r.raceBest),
    progress: parseProgress(r.progress),
    badges,
    today: parseToday(r.today) ?? { day: today, rounds: 0, bonusClaimed: false },
    history: parseHistory(r.history),
  };
}

function checkRound(r: SavedRound): void {
  if (r.bonusXp < 0 || r.bonusXp > 100) throw new ValidationError('invalid bonus xp');
  if (r.xpGained < 0 || r.xpGained > 200) throw new ValidationError('invalid xp');
  if (r.firstTry + r.secondTry + r.missed !== 10) throw new ValidationError('a round has exactly 10 answers');
}

function checkRace(r: SavedRace): void {
  if (r.xpGained < 0 || r.xpGained > 1000) throw new ValidationError('invalid xp');
  if (r.score < 0 || r.score > 500) throw new ValidationError('invalid score');
}

/**
 * Guest-mode progress in localStorage, one JSON blob per child. State changes go through the same
 * `applyRound` / `applyRace` projection as the SQL functions, so both modes agree.
 */
export class LocalProgressRepository implements ProgressRepository {
  constructor(
    private readonly storage: KeyValueStorage,
    private readonly children: ChildRepository,
    private readonly clock: Clock,
    private readonly newId: IdFactory = defaultIdFactory,
  ) {}

  async load(childId: string): Promise<PlayerState> {
    const { state } = await this.read(childId);
    return state;
  }

  async saveRound(childId: string, r: SavedRound): Promise<PlayerState> {
    checkRound(r);
    const { state, history } = await this.read(childId);
    const next = applyRound(state, r);
    const item: RoundHistoryItem = {
      id: this.newId(),
      topic: r.topic,
      grade: r.grade,
      stars: r.stars,
      firstTry: r.firstTry,
      secondTry: r.secondTry,
      missed: r.missed,
      xpGained: r.xpGained,
      playedAt: new Date(this.clock.now()).toISOString(),
      details: r.details.map((d) => ({ ...d })),
    };
    this.write(childId, next, [...history, item].slice(-MAX_HISTORY));
    return next;
  }

  async saveRace(childId: string, r: SavedRace): Promise<PlayerState> {
    checkRace(r);
    const { state, history } = await this.read(childId);
    const next = applyRace(state, r);
    this.write(childId, next, history);
    return next;
  }

  async history(childId: string, limit = DEFAULT_HISTORY_LIMIT): Promise<RoundHistoryItem[]> {
    const { history } = await this.read(childId);
    return [...history].reverse().slice(0, Math.max(0, limit));
  }

  private async read(childId: string): Promise<{ state: PlayerState; history: RoundHistoryItem[] }> {
    const child = (await this.children.list()).find((c: Child) => c.id === childId);
    if (!child) throw new NotFoundError(`child ${childId} not found`);
    const today = this.clock.today();
    const { history, ...stored } = parseStored(readJson(this.storage, progressKeyFor(childId)), today);
    const base = emptyPlayer(child, today);
    const day = stored.today.day === today ? stored.today : base.today;
    return { state: { ...base, ...stored, child, today: day }, history };
  }

  private write(childId: string, state: PlayerState, history: RoundHistoryItem[]): void {
    const { child, ...rest } = state;
    void child;
    const stored: StoredPlayer = { ...rest, history };
    writeJson(this.storage, progressKeyFor(childId), stored);
  }
}

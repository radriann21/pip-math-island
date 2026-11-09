import type { Child, DailyActivity, PlayerState, RoundHistoryItem, SavedRace, SavedRound, TopicProgress } from '@/application/model';
import { progressKey } from '@/application/model';
import { clampInt, isTopicId, parseAnswerDetails, toGrade, toLocale, toStars, toTier } from '../coerce';
import type { Database, Json } from './database.types';

type Tables = Database['public']['Tables'];
export type ChildRow = Tables['children']['Row'];
export type TopicProgressRow = Tables['topic_progress']['Row'];
export type ChildBadgeRow = Tables['child_badges']['Row'];
export type DailyActivityRow = Tables['daily_activity']['Row'];
export type RoundRow = Tables['rounds']['Row'];
export type ChildInsert = Tables['children']['Insert'];
export type ChildUpdate = Tables['children']['Update'];
export type RecordRoundArgs = Database['public']['Functions']['record_round']['Args'];
export type RecordRaceArgs = Database['public']['Functions']['record_race']['Args'];

const count = (v: unknown): number => clampInt(v, 0, Number.MAX_SAFE_INTEGER, 0);

/** Row -> domain. Values are coerced, never trusted, so a bad row cannot crash the UI. */
export function childFromRow(row: ChildRow): Child {
  return {
    id: row.id,
    name: row.name,
    grade: toGrade(row.grade),
    locale: toLocale(row.locale),
    soundEnabled: row.sound_enabled !== false,
  };
}

export function childToInsert(input: Omit<Child, 'id'>, parentId: string): ChildInsert {
  return {
    parent_id: parentId,
    name: input.name.trim(),
    grade: input.grade,
    locale: input.locale,
    sound_enabled: input.soundEnabled,
  };
}

export function childPatchToUpdate(patch: Partial<Omit<Child, 'id'>>): ChildUpdate {
  const out: ChildUpdate = {};
  if (patch.name !== undefined) out.name = patch.name.trim();
  if (patch.grade !== undefined) out.grade = patch.grade;
  if (patch.locale !== undefined) out.locale = patch.locale;
  if (patch.soundEnabled !== undefined) out.sound_enabled = patch.soundEnabled;
  return out;
}

function progressFromRows(rows: readonly TopicProgressRow[]): Record<string, TopicProgress> {
  const out: Record<string, TopicProgress> = {};
  for (const row of rows) {
    if (!isTopicId(row.topic)) continue;
    const answered = count(row.answered);
    out[progressKey(toGrade(row.grade), row.topic)] = {
      tier: toTier(row.tier),
      bestStars: toStars(row.best_stars),
      answered,
      correct: Math.min(count(row.correct), answered),
    };
  }
  return out;
}

export function playerFromRows(input: {
  child: ChildRow;
  topics: readonly TopicProgressRow[];
  badges: readonly ChildBadgeRow[];
  daily: DailyActivityRow | null;
  today: string;
}): PlayerState {
  const { child, topics, badges, daily, today } = input;
  const dailyActivity: DailyActivity = daily
    ? { day: daily.day, rounds: count(daily.rounds), bonusClaimed: daily.bonus_claimed === true }
    : { day: today, rounds: 0, bonusClaimed: false };
  return {
    child: childFromRow(child),
    xp: count(child.xp),
    streak: count(child.streak),
    lastPlayed: child.last_played,
    roundsTotal: count(child.rounds_total),
    raceBest: count(child.race_best),
    progress: progressFromRows(topics),
    badges: badges.map((b) => b.badge_id),
    today: dailyActivity,
  };
}

/** A history row, or null when its topic is unknown to this build of the app. */
export function historyFromRow(row: RoundRow): RoundHistoryItem | null {
  if (!isTopicId(row.topic)) return null;
  return {
    id: row.id,
    topic: row.topic,
    grade: toGrade(row.grade),
    stars: toStars(row.stars),
    firstTry: clampInt(row.first_try, 0, 10, 0),
    secondTry: clampInt(row.second_try, 0, 10, 0),
    missed: clampInt(row.missed, 0, 10, 0),
    xpGained: clampInt(row.xp_gained, 0, 200, 0),
    playedAt: row.played_at,
    details: parseAnswerDetails(row.details),
  };
}

export function roundToRpcArgs(childId: string, r: SavedRound): RecordRoundArgs {
  const details: Json = r.details.map((d) => ({ index: d.index, prompt: d.prompt, correct: d.correct, tries: d.tries }));
  return {
    p_child_id: childId,
    p_grade: r.grade,
    p_topic: r.topic,
    p_tier_before: r.tierBefore,
    p_tier_after: r.tierAfter,
    p_first_try: r.firstTry,
    p_second_try: r.secondTry,
    p_missed: r.missed,
    p_best_combo: r.bestCombo,
    p_stars: r.stars,
    p_xp_gained: r.xpGained,
    p_bonus_xp: r.bonusXp,
    p_details: details,
    p_today: r.today,
    p_streak: r.streak,
    p_badges: r.newBadgeIds,
  };
}

export function raceToRpcArgs(childId: string, r: SavedRace): RecordRaceArgs {
  return {
    p_child_id: childId,
    p_grade: r.grade,
    p_score: r.score,
    p_best_combo: r.bestCombo,
    p_xp_gained: r.xpGained,
    p_badges: r.newBadgeIds,
  };
}

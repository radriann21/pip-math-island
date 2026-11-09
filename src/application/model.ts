import type { AnswerDetail, BadgeDefinition } from '@/domain/progression';
import type { Grade, Locale, Stars, Tier, TopicId } from '@/domain/shared/types';

export type { AnswerDetail, BadgeDefinition };

export interface Child {
  id: string;
  name: string;
  grade: Grade;
  locale: Locale;
  soundEnabled: boolean;
}

export interface TopicProgress {
  tier: Tier;
  bestStars: Stars;
  answered: number;
  correct: number;
}

export interface DailyActivity {
  /** ISO yyyy-mm-dd */
  day: string;
  rounds: number;
  bonusClaimed: boolean;
}

export interface PlayerState {
  child: Child;
  xp: number;
  streak: number;
  lastPlayed: string | null;
  roundsTotal: number;
  raceBest: number;
  /** Keyed by `progressKey(grade, topic)`. */
  progress: Record<string, TopicProgress>;
  /** Owned badge ids. */
  badges: string[];
  today: DailyActivity;
}

export interface Session {
  userId: string;
  email: string | null;
  guest: boolean;
}

/** Everything the domain computed for a finished round; adapters only persist it. */
export interface SavedRound {
  topic: TopicId;
  grade: Grade;
  tierBefore: Tier;
  tierAfter: Tier;
  firstTry: number;
  secondTry: number;
  missed: number;
  bestCombo: number;
  stars: Stars;
  xpGained: number;
  bonusXp: number;
  details: AnswerDetail[];
  /** ISO date the round was played. */
  today: string;
  /** Streak after this round. */
  streak: number;
  newBadgeIds: string[];
}

export interface SavedRace {
  grade: Grade;
  score: number;
  bestCombo: number;
  xpGained: number;
  newBadgeIds: string[];
}

export interface RoundHistoryItem {
  id: string;
  topic: TopicId;
  grade: Grade;
  stars: Stars;
  firstTry: number;
  secondTry: number;
  missed: number;
  xpGained: number;
  /** ISO timestamp */
  playedAt: string;
  details: AnswerDetail[];
}

export interface TopicReportRow {
  topic: TopicId;
  grade: Grade;
  tier: Tier;
  bestStars: Stars;
  answered: number;
  correct: number;
  /** correct / answered, 0..1 */
  accuracy: number;
}

export interface ParentReport {
  child: Child;
  level: number;
  totals: { xp: number; roundsTotal: number; stars: number; accuracy: number };
  /** Topics the child has played in their current grade. */
  topics: TopicReportRow[];
  /** Up to 3 topics with the lowest accuracy among those with at least 10 answers. */
  weakTopics: TopicReportRow[];
  recentRounds: RoundHistoryItem[];
}

export function progressKey(grade: Grade, topic: TopicId): string {
  return `${grade}:${topic}`;
}

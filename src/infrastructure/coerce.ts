import { TOPICS } from '@/domain/exercises';
import type { Grade, Locale, Stars, Tier, TopicId } from '@/domain/shared/types';

/** Defensive coercion helpers shared by adapters. Stored or remote data is never trusted blindly. */

export function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** Rounds to an integer inside [min, max]; anything that is not a finite number yields `fallback`. */
export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export const toGrade = (v: unknown): Grade => clampInt(v, 1, 6, 1) as Grade;
export const toStars = (v: unknown): Stars => clampInt(v, 0, 3, 0) as Stars;
export const toTier = (v: unknown): Tier => clampInt(v, 0, 2, 0) as Tier;
export const toLocale = (v: unknown): Locale => (v === 'es' ? 'es' : 'en');

const TOPIC_IDS: ReadonlySet<string> = new Set(TOPICS.map((t) => t.id));

export function isTopicId(value: unknown): value is TopicId {
  return typeof value === 'string' && TOPIC_IDS.has(value);
}

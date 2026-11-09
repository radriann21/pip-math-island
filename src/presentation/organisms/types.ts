import type { BadgeDefinition } from '@/domain/progression';
import type { TopicId } from '@/domain/shared/types';

/**
 * View models consumed by organisms. They are plain, already-localised data: pages and containers map
 * domain/application objects into them, so presentational components never import those layers' use cases.
 */

/** A sticker as shown on screen (title/description already in the active language). */
export interface BadgeView {
  id: string;
  glyph: BadgeDefinition['glyph'];
  color: string;
  title: string;
  description: string;
}

export interface StickerView extends BadgeView {
  owned: boolean;
}

export interface TopicView {
  id: TopicId;
  title: string;
  accent: string;
  /** Best stars, 0..3. */
  stars: number;
  /** Difficulty tier, 0..2. */
  tier: number;
}

import type { Rng } from './rng';

export type { Rng };

export type Locale = 'en' | 'es';
export type Grade = 1 | 2 | 3 | 4 | 5 | 6;
export type Tier = 0 | 1 | 2;
export type Stars = 0 | 1 | 2 | 3;
export type TopicId =
  | 'count'
  | 'add'
  | 'sub'
  | 'mul'
  | 'div'
  | 'frac'
  | 'place'
  | 'time'
  | 'money'
  | 'geo'
  | 'pattern'
  | 'word';

/** Everything a generator needs. Randomness and language are injected, never global. */
export interface GenContext {
  grade: Grade;
  tier: Tier;
  locale: Locale;
  rng: Rng;
}

export interface Question {
  topic: TopicId;
  kind: 'choice' | 'num';
  /** Rich text: plain text plus trusted markup built by markup.ts (fractions, boxes). Never user input. */
  prompt: string;
  /** Trusted SVG/HTML markup built by exercises/visuals (may be ''). */
  vis: string;
  hint: string;
  why: string;
  /** choice: the exact label string in opts. num: a finite number. */
  answer: string | number;
  /** choice only: 2..4 unique labels, includes the answer. */
  opts?: string[];
  /** num only: whether the keypad shows a decimal key. */
  decimal: boolean;
}

export interface TopicDefinition {
  id: TopicId;
  accent: string;
  title: Record<Locale, string>;
  generate(ctx: GenContext): Question;
}

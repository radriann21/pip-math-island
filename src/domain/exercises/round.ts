import type { Rng } from '../shared/rng';
import type { Grade, Locale, Question, Tier, TopicDefinition, TopicId } from '../shared/types';
import { getTopic, TOPICS } from './registry';

export const DEFAULT_ROUND_SIZE = 10;
/** How many of the first questions are warm-ups one tier below the child's level. */
const WARM_UP_QUESTIONS = 3;
const MAX_ATTEMPTS = 8;

/**
 * A round of `size` questions for one topic. The first three use one tier lower (never below 0)
 * as a warm-up. Questions with a prompt+visual already in the round are regenerated, up to 8 attempts.
 */
export function generateRound(
  topicId: TopicId,
  grade: Grade,
  tier: Tier,
  locale: Locale,
  rng: Rng,
  size: number = DEFAULT_ROUND_SIZE,
  registry: readonly TopicDefinition[] = TOPICS,
): Question[] {
  const topic = getTopic(topicId, registry);
  const questions: Question[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < size; i++) {
    const questionTier = (i < WARM_UP_QUESTIONS ? Math.max(0, tier - 1) : tier) as Tier;
    let question: Question;
    let attempts = 0;
    do {
      question = topic.generate({ grade, tier: questionTier, locale, rng });
      attempts++;
    } while (seen.has(question.prompt + question.vis) && attempts < MAX_ATTEMPTS);
    seen.add(question.prompt + question.vis);
    questions.push({ ...question, topic: topicId });
  }
  return questions;
}

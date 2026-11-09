import { generateRound } from '@/domain/exercises';
import type { Question, Tier, TopicId } from '@/domain/shared/types';
import type { PlayerState } from '../model';
import { progressKey } from '../model';
import type { Deps } from '../ports';

/** Ten questions for a topic at the tier the child reached in their current grade. */
export function startRound(
  deps: Pick<Deps, 'rng'>,
  input: { state: PlayerState; topic: TopicId },
): { questions: Question[]; tier: Tier } {
  const { child, progress } = input.state;
  const tier = progress[progressKey(child.grade, input.topic)]?.tier ?? 0;
  const questions = generateRound(input.topic, child.grade, tier, child.locale, deps.rng);
  return { questions, tier };
}

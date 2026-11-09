import { TOPICS } from '@/domain/exercises';
import { levelInfo } from '@/domain/progression';
import type { Grade, Stars, Tier, TopicId } from '@/domain/shared/types';
import type { ParentReport, TopicReportRow } from '../model';
import type { Deps } from '../ports';
import { buildSnapshot } from './buildSnapshot';

const WEAK_MIN_ANSWERED = 10;
const MAX_WEAK_TOPICS = 3;
const RECENT_ROUNDS = 10;

/** Progress summary for the grown-ups corner. Throws NotFoundError for an unknown child. */
export async function getParentReport(
  deps: Pick<Deps, 'progress'>,
  childId: string,
): Promise<ParentReport> {
  const state = await deps.progress.load(childId);
  const recentRounds = await deps.progress.history(childId, RECENT_ROUNDS);
  const grade = state.child.grade;

  let answered = 0;
  let correct = 0;
  for (const p of Object.values(state.progress)) {
    answered += p.answered;
    correct += p.correct;
  }

  const topics: TopicReportRow[] = [];
  for (const topic of TOPICS) {
    const p = state.progress[`${grade}:${topic.id}`];
    if (!p) continue;
    topics.push(row(topic.id, grade, p.tier, p.bestStars, p.answered, p.correct));
  }

  const weakTopics = topics
    .filter((r) => r.answered >= WEAK_MIN_ANSWERED)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, MAX_WEAK_TOPICS);

  return {
    child: state.child,
    level: levelInfo(state.xp).level,
    totals: {
      xp: state.xp,
      roundsTotal: state.roundsTotal,
      stars: buildSnapshot(state).totalStars,
      accuracy: answered === 0 ? 0 : correct / answered,
    },
    topics,
    weakTopics,
    recentRounds,
  };
}

function row(
  topic: TopicId,
  grade: Grade,
  tier: Tier,
  bestStars: Stars,
  answered: number,
  correct: number,
): TopicReportRow {
  return { topic, grade, tier, bestStars, answered, correct, accuracy: answered === 0 ? 0 : correct / answered };
}

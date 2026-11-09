import type { GenContext, Locale, TopicDefinition, TopicId } from '../shared/types';
import type { QuestionDraft } from './options';

interface TopicSpec {
  id: TopicId;
  accent: string;
  title: Record<Locale, string>;
  /** Builds a question without its topic; `defineTopic` stamps the id. */
  build(ctx: GenContext): QuestionDraft;
}

/** Wraps a draft builder into a `TopicDefinition` whose questions carry the topic id. */
export function defineTopic(spec: TopicSpec): TopicDefinition {
  return {
    id: spec.id,
    accent: spec.accent,
    title: spec.title,
    generate: (ctx) => ({ ...spec.build(ctx), topic: spec.id }),
  };
}

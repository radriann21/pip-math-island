import type { TopicDefinition, TopicId } from '../shared/types';
import { addTopic } from './add';
import { countTopic } from './count';
import { divTopic } from './div';
import { fracTopic } from './frac';
import { mulTopic } from './mul';
import { subTopic } from './sub';

/** Every available topic, in the order the island map shows them. Append new topics here. */
export const TOPICS: readonly TopicDefinition[] = [countTopic, addTopic, subTopic, mulTopic, divTopic, fracTopic];

/** Finds a topic by id. Throws when the topic is not registered. */
export function getTopic(id: TopicId, registry: readonly TopicDefinition[] = TOPICS): TopicDefinition {
  const topic = registry.find((t) => t.id === id);
  if (!topic) throw new Error(`unknown topic: ${id}`);
  return topic;
}

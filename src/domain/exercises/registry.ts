import type { TopicDefinition, TopicId } from '../shared/types';
import { addTopic } from './add';
import { countTopic } from './count';
import { divTopic } from './div';
import { fracTopic } from './frac';
import { geoTopic } from './geo';
import { moneyTopic } from './money';
import { mulTopic } from './mul';
import { placeTopic } from './place';
import { subTopic } from './sub';
import { timeTopic } from './time';

/** Every available topic, in the order the island map shows them. Append new topics here. */
export const TOPICS: readonly TopicDefinition[] = [countTopic, addTopic, subTopic, mulTopic, divTopic, fracTopic, placeTopic, timeTopic, moneyTopic, geoTopic];

/** Finds a topic by id. Throws when the topic is not registered. */
export function getTopic(id: TopicId, registry: readonly TopicDefinition[] = TOPICS): TopicDefinition {
  const topic = registry.find((t) => t.id === id);
  if (!topic) throw new Error(`unknown topic: ${id}`);
  return topic;
}

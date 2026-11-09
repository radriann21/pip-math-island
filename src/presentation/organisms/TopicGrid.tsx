import type { ReactNode } from 'react';
import type { TopicId } from '@/domain/shared/types';
import { TopicCard } from '../molecules';
import type { TopicView } from './types';

interface TopicGridProps {
  topics: readonly TopicView[];
  onSelect(id: TopicId): void;
  /** Extra full-width cards after the topics (e.g. the quick race). */
  children?: ReactNode;
}

export function TopicGrid({ topics, onSelect, children }: TopicGridProps) {
  return (
    <div className="pip-grid">
      {topics.map((topic) => (
        <TopicCard
          key={topic.id}
          id={topic.id}
          title={topic.title}
          accent={topic.accent}
          stars={topic.stars}
          tier={topic.tier}
          onSelect={onSelect}
        />
      ))}
      {children}
    </div>
  );
}

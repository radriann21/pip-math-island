import type { CSSProperties } from 'react';
import type { TopicId } from '@/domain/shared/types';
import { Icon, Stars } from '../atoms';
import { useI18n } from '../i18n';

interface TopicCardProps {
  id: TopicId;
  title: string;
  /** Topic colour, exposed to CSS as `--c`. */
  accent: string;
  /** Best stars so far, 0..3. */
  stars: number;
  /** Difficulty tier, 0..2 (shown as level 1..3). */
  tier: number;
  onSelect(id: TopicId): void;
}

export function TopicCard({ id, title, accent, stars, tier, onSelect }: TopicCardProps) {
  const { t } = useI18n();
  return (
    <button type="button" className="pip-island" style={{ '--c': accent } as CSSProperties} onClick={() => onSelect(id)}>
      <span className="pip-tile">
        <Icon name={id} />
      </span>
      <h3>{title}</h3>
      <Stars value={stars} max={3} />
      <span className="pip-island__tier">{t('topic.level', { n: tier + 1 })}</span>
    </button>
  );
}

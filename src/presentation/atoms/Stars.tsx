import { useI18n } from '../i18n';

interface StarsProps {
  value: number;
  max?: number;
  /** `lg` is the big celebratory row used on the result screen. */
  size?: 'md' | 'lg';
  /** Pops the earned stars in one after another. */
  animated?: boolean;
}

/** Earned stars out of `max`, announced as a single image with a translated label. */
export function Stars({ value, max = 3, size = 'md', animated = false }: StarsProps) {
  const { t } = useI18n();
  const earned = Math.max(0, Math.min(max, Math.round(value)));
  return (
    <span
      className={`pip-stars pip-stars--${size}`}
      role="img"
      aria-label={t('topic.stars', { n: earned, max })}
    >
      {Array.from({ length: max }, (_, i) => {
        const on = i < earned;
        return (
          <svg
            key={i}
            className={`pip-stars__star${on ? '' : ' pip-stars__star--off'}${on && animated ? ' pip-pop' : ''}`}
            style={on && animated ? { animationDelay: `${i * 0.25}s` } : undefined}
            aria-hidden="true"
          >
            <use href="#i-star" />
          </svg>
        );
      })}
    </span>
  );
}

import type { BadgeDefinition } from '@/domain/progression';
import { useI18n } from '../i18n';

interface StickerBadgeProps {
  glyph: BadgeDefinition['glyph'];
  color: string;
  title: string;
  description?: string;
  locked?: boolean;
  /** Small variant for result screens: only the title, under the sticker. */
  compact?: boolean;
}

export function StickerBadge({ glyph, color, title, description, locked = false, compact = false }: StickerBadgeProps) {
  const { t } = useI18n();
  const name = locked ? `${title} (${t('stickers.locked')})` : title;
  return (
    <div className={['pip-sticker', locked && 'pip-sticker--locked', compact && 'pip-sticker--compact'].filter(Boolean).join(' ')}>
      <svg viewBox="0 0 64 64" role="img" aria-label={name}>
        <circle cx="32" cy="32" r="29" fill={locked ? 'var(--line)' : color} />
        <circle
          cx="32"
          cy="32"
          r="24"
          fill="none"
          stroke="#fff"
          strokeOpacity={locked ? 0.3 : 0.7}
          strokeWidth="2.5"
          strokeDasharray="3 4"
        />
        <use href={`#i-${glyph}`} x="16" y="16" width="32" height="32" style={{ color: locked ? 'var(--muted)' : '#fff' }} />
      </svg>
      {compact ? (
        <small>{title}</small>
      ) : (
        <>
          <b>{title}</b>
          {description && <small>{description}</small>}
        </>
      )}
    </div>
  );
}

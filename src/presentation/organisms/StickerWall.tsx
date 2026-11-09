import { useI18n } from '../i18n';
import { StickerBadge } from '../molecules';
import type { StickerView } from './types';

interface StickerWallProps {
  stickers: readonly StickerView[];
}

export function StickerWall({ stickers }: StickerWallProps) {
  const { t } = useI18n();
  const owned = stickers.filter((s) => s.owned).length;
  return (
    <section>
      <h2 className="pip-sec">{t('stickers.title', { owned, total: stickers.length })}</h2>
      <div className="pip-stk">
        {stickers.map((s) => (
          <StickerBadge
            key={s.id}
            glyph={s.glyph}
            color={s.color}
            title={s.title}
            description={s.description}
            locked={!s.owned}
          />
        ))}
      </div>
    </section>
  );
}

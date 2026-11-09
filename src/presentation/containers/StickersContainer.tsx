import { BADGES } from '@/domain/progression';
import { useI18n } from '../i18n';
import { StickerWall } from '../organisms';
import { usePlayerContext } from './PlayerContext';

export function StickersContainer() {
  const { locale } = useI18n();
  const { player } = usePlayerContext();
  const owned = new Set(player.badges);
  return (
    <StickerWall
      stickers={BADGES.map((b) => ({
        id: b.id,
        glyph: b.glyph,
        color: b.color,
        title: b.title[locale],
        description: b.description[locale],
        owned: owned.has(b.id),
      }))}
    />
  );
}

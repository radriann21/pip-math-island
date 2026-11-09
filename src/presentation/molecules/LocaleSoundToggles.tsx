import { Chip } from '../atoms';
import { useI18n } from '../i18n';

interface LocaleSoundTogglesProps {
  soundEnabled: boolean;
  onToggleLocale(): void;
  onToggleSound(): void;
}

/** The two quick toggles of the top bar. The language chip shows the active language first ("EN · ES"). */
export function LocaleSoundToggles({ soundEnabled, onToggleLocale, onToggleSound }: LocaleSoundTogglesProps) {
  const { t } = useI18n();
  return (
    <div className="pip-chips">
      <Chip onClick={onToggleLocale} aria-label={t('locale.toggleLabel')}>
        {t('locale.toggle')}
      </Chip>
      <Chip pressed={soundEnabled} onClick={onToggleSound}>
        {soundEnabled ? t('sound.on') : t('sound.off')}
      </Chip>
    </div>
  );
}

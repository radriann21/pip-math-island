import type { ReactNode } from 'react';
import { Button, Pip } from '../atoms';
import { useI18n } from '../i18n';
import { LocaleSoundToggles } from '../molecules';

interface TopBarProps {
  /** When set the mascot is replaced by a back button. */
  onBack?: () => void;
  soundEnabled: boolean;
  onToggleLocale(): void;
  onToggleSound(): void;
  /** Extra controls (e.g. sign out, switch child) shown after the toggles. */
  actions?: ReactNode;
}

export function TopBar({ onBack, soundEnabled, onToggleLocale, onToggleSound, actions }: TopBarProps) {
  const { t } = useI18n();
  return (
    <header className="pip-top">
      <div className="pip-logo">
        {onBack ? (
          <Button variant="alt" size="sm" aria-label={t('common.back')} onClick={onBack}>
            ←
          </Button>
        ) : (
          <Pip size={44} />
        )}
        <span>{t('app.name')}</span>
      </div>
      <div className="pip-row">
        <LocaleSoundToggles soundEnabled={soundEnabled} onToggleLocale={onToggleLocale} onToggleSound={onToggleSound} />
        {actions}
      </div>
    </header>
  );
}

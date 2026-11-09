import { Button } from '../atoms';
import { useI18n } from '../i18n';

interface StatePanelProps {
  kind: 'loading' | 'empty' | 'error';
  /** Overrides the default message for the state (e.g. a translated error from the owner). */
  message?: string;
  onRetry?: () => void;
}

/** Loading, empty and error states with the right live-region semantics. */
export function StatePanel({ kind, message, onRetry }: StatePanelProps) {
  const { t } = useI18n();
  const text = message ?? t(kind === 'loading' ? 'state.loading' : kind === 'empty' ? 'state.empty' : 'state.error');
  return (
    <div
      className={`pip-state pip-state--${kind}`}
      role={kind === 'error' ? 'alert' : kind === 'loading' ? 'status' : undefined}
    >
      <p>{text}</p>
      {kind === 'error' && onRetry && (
        <Button variant="alt" size="sm" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
}

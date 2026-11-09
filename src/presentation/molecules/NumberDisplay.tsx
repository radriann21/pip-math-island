import { useI18n } from '../i18n';

interface NumberDisplayProps {
  /** Raw value using "." as decimal separator; shown with the locale symbol. */
  value: string;
  status?: 'idle' | 'correct' | 'wrong';
}

export function NumberDisplay({ value, status = 'idle' }: NumberDisplayProps) {
  const { t, locale } = useI18n();
  const classes = ['pip-disp', status !== 'idle' && `pip-disp--${status}`].filter(Boolean).join(' ');
  return (
    <output className={classes} aria-live="polite" aria-label={t('keypad.answer')}>
      {value === '' ? <span className="pip-disp__ph">?</span> : value.replace('.', locale === 'es' ? ',' : '.')}
    </output>
  );
}

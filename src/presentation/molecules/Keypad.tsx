import { useI18n } from '../i18n';

export type KeypadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'del';

const LAYOUT: readonly KeypadKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];

interface KeypadProps {
  /** Whether the answer may have decimals. When false the decimal key is shown disabled. */
  decimal: boolean;
  disabled?: boolean;
  onKey(key: KeypadKey): void;
}

/** Number pad. The decimal key always emits "." and only *shows* the locale symbol. */
export function Keypad({ decimal, disabled = false, onKey }: KeypadProps) {
  const { t, locale } = useI18n();
  const decimalSymbol = locale === 'es' ? ',' : '.';
  return (
    <div className="pip-keys" role="group" aria-label={t('keypad.label')}>
      {LAYOUT.map((key) => {
        const isDot = key === '.';
        const isDel = key === 'del';
        return (
          <button
            key={key}
            type="button"
            className="pip-key"
            disabled={disabled || (isDot && !decimal)}
            aria-label={isDel ? t('keypad.delete') : isDot ? decimalSymbol : undefined}
            onClick={() => onKey(key)}
          >
            {isDel ? '⌫' : isDot ? decimalSymbol : key}
          </button>
        );
      })}
    </div>
  );
}

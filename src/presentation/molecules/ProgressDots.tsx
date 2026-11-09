import { useI18n } from '../i18n';

/** How a finished question went: first try, second try, or missed. */
export type DotResult = 'first' | 'second' | 'missed';

interface ProgressDotsProps {
  total: number;
  /** Zero-based index of the question being answered. */
  current: number;
  /** Outcome per finished question, by index. */
  results: readonly (DotResult | undefined)[];
}

export function ProgressDots({ total, current, results }: ProgressDotsProps) {
  const { t } = useI18n();
  return (
    <div className="pip-dots" role="img" aria-label={t('quiz.questionOf', { n: current + 1, total })}>
      {Array.from({ length: total }, (_, i) => {
        const state = i === current ? 'current' : (results[i] ?? 'todo');
        return <i key={i} className={`pip-dot pip-dot--${state}`} data-state={state} />;
      })}
    </div>
  );
}

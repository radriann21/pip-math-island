import { RichText } from '../atoms';

export type ChoiceState = 'idle' | 'correct' | 'wrong' | 'disabled';

interface ChoiceGridProps {
  /** Option labels. They may contain trusted domain markup (e.g. fractions). */
  options: readonly string[];
  /** Per-option state, aligned by index. Missing entries are `idle`. */
  states?: readonly ChoiceState[];
  /** Disables every option (e.g. while feedback is shown). */
  disabled?: boolean;
  /** Show the 1-4 key hint on each option. */
  showKeys?: boolean;
  onSelect(index: number): void;
}

/** Big tappable answer options. Wrong options stay locked; number keys are wired by the parent view. */
export function ChoiceGrid({ options, states = [], disabled = false, showKeys = true, onSelect }: ChoiceGridProps) {
  return (
    <div className="pip-opts">
      {options.map((option, index) => {
        const state = states[index] ?? 'idle';
        const locked = disabled || state === 'wrong' || state === 'disabled';
        const classes = ['pip-opt', state === 'correct' && 'pip-opt--correct', state === 'wrong' && 'pip-opt--wrong']
          .filter(Boolean)
          .join(' ');
        return (
          <button
            key={`${index}:${option}`}
            type="button"
            className={classes}
            disabled={locked}
            aria-keyshortcuts={String(index + 1)}
            onClick={() => onSelect(index)}
          >
            {showKeys && (
              <kbd className="pip-opt__key" aria-hidden="true">
                {index + 1}
              </kbd>
            )}
            <RichText html={option} />
          </button>
        );
      })}
    </div>
  );
}

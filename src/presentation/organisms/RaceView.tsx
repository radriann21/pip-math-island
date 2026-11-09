import { Button, Chip } from '../atoms';
import { hasModifier, useDocumentKeydown } from '../hooks/useDocumentKeydown';
import { useI18n } from '../i18n';
import { ChoiceGrid } from '../molecules';
import type { ChoiceState } from '../molecules';

export interface RaceQuestionView {
  /** Plain text such as "7 × 8" (the " = ?" is added here). */
  prompt: string;
  options: readonly string[];
}

interface RaceViewProps {
  score: number;
  combo: number;
  secondsLeft: number;
  /** Length of the race, for the timer bar. */
  totalSeconds?: number;
  question: RaceQuestionView;
  optionStates?: readonly ChoiceState[];
  /** After a wrong pick the answers are shown briefly and input is ignored. */
  locked?: boolean;
  onPick(index: number): void;
  onBack(): void;
}

export function RaceView({
  score,
  combo,
  secondsLeft,
  totalSeconds = 60,
  question,
  optionStates,
  locked = false,
  onPick,
  onBack,
}: RaceViewProps) {
  const { t } = useI18n();
  const left = Math.max(0, Math.min(totalSeconds, Math.ceil(secondsLeft)));

  useDocumentKeydown((e) => {
    if (hasModifier(e) || locked || !/^[1-9]$/.test(e.key)) return;
    const i = Number(e.key) - 1;
    if (question.options[i] !== undefined) onPick(i);
  });

  return (
    <div className="pip-quiz">
      <div className="pip-qtop">
        <Button variant="alt" size="sm" aria-label={t('common.back')} onClick={onBack}>
          ←
        </Button>
        <div
          className="pip-timer"
          role="progressbar"
          aria-label={t('race.timeLeft', { n: left })}
          aria-valuemin={0}
          aria-valuemax={totalSeconds}
          aria-valuenow={left}
        >
          <i style={{ transform: `scaleX(${left / totalSeconds})` }} />
        </div>
        <Chip>{t('race.seconds', { n: left })}</Chip>
      </div>
      <div className="pip-row pip-row--center pip-race-stats">
        <Chip>
          {t('race.score')}: <b>{score}</b>
        </Chip>
        <Chip>
          {t('race.combo')}: <b>{combo}</b>
        </Chip>
      </div>
      <section className="pip-qcard">
        <div className="pip-rq">{t('race.question', { prompt: question.prompt })}</div>
        <ChoiceGrid options={question.options} states={optionStates} disabled={locked} onSelect={onPick} />
      </section>
    </div>
  );
}

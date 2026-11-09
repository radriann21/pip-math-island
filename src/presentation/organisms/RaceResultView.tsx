import { Button, Pip } from '../atoms';
import { useI18n } from '../i18n';
import { StickerBadge } from '../molecules';
import type { BadgeView } from './types';

interface RaceResultViewProps {
  score: number;
  /** The score beat the previous record. */
  isRecord: boolean;
  bestCombo: number;
  /** Personal record after this race. */
  record: number;
  xp: number;
  newBadges: readonly BadgeView[];
  onAgain(): void;
  onHome(): void;
}

export function RaceResultView({ score, isRecord, bestCombo, record, xp, newBadges, onAgain, onHome }: RaceResultViewProps) {
  const { t } = useI18n();
  return (
    <div className="pip-quiz pip-center">
      <Pip mood={score >= 10 ? 'cheer' : 'happy'} size={130} />
      <h1>{isRecord && score > 0 ? t('race.newRecord') : t('race.timesUp')}</h1>
      <p className="pip-race-score">{score}</p>
      <p>
        {t('race.answersRight')} · {t('race.bestCombo')}: {bestCombo} · {t('race.record')}: {record} · {t('result.xp', { xp })}
      </p>
      {newBadges.length > 0 && (
        <div className="pip-row pip-row--center">
          {newBadges.map((b) => (
            <div key={b.id} className="pip-pop">
              <StickerBadge glyph={b.glyph} color={b.color} title={b.title} compact />
            </div>
          ))}
        </div>
      )}
      <div className="pip-row pip-row--center pip-actions">
        <Button autoFocus onClick={onAgain}>
          {t('race.again')}
        </Button>
        <Button variant="alt" onClick={onHome}>
          {t('common.home')}
        </Button>
      </div>
    </div>
  );
}

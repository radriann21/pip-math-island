import { Button, Chip, Pip, RichText, Stars } from '../atoms';
import { useI18n } from '../i18n';
import { StickerBadge } from '../molecules';
import type { BadgeView } from './types';

export interface MissedQuestionView {
  /** Trusted domain markup. */
  prompt: string;
  /** Trusted domain markup of the right answer (already formatted). */
  answer: string;
  /** Trusted domain markup of the explanation. */
  why: string;
}

interface ResultViewProps {
  /** Stars earned this round, 0..3. */
  stars: number;
  firstTry: number;
  secondTry: number;
  /** Total XP gained, including the daily bonus. */
  xp: number;
  tierBefore: number;
  tierAfter: number;
  /** Set when the player level went up; the new level. */
  playerLevel?: number;
  /** Set when the daily goal was completed this round; the bonus XP. */
  dailyBonusXp?: number;
  newBadges: readonly BadgeView[];
  missed: readonly MissedQuestionView[];
  onPlayAgain(): void;
  onHome(): void;
}

export function ResultView(props: ResultViewProps) {
  const { t } = useI18n();
  const stars = Math.max(0, Math.min(3, Math.round(props.stars)));
  const messageKey = `result.stars.${stars}` as 'result.stars.0';
  const mood = stars > 1 ? 'cheer' : stars === 1 ? 'happy' : 'think';

  return (
    <div className="pip-quiz pip-center">
      <Pip mood={mood} size={130} />
      <h1>{t(messageKey)}</h1>
      <Stars value={stars} max={3} size="lg" animated />
      <p>
        <b>{props.firstTry}</b> {t('result.firstTry')} · <b>{props.secondTry}</b> {t('result.secondTry')} ·{' '}
        {t('result.xp', { xp: props.xp })}
      </p>

      <div className="pip-row pip-row--center">
        {props.tierAfter > props.tierBefore && <Chip tone="good">{t('result.tierUp', { n: props.tierAfter + 1 })}</Chip>}
        {props.tierAfter < props.tierBefore && <Chip>{t('result.tierDown')}</Chip>}
        {props.playerLevel !== undefined && <Chip tone="violet">{t('result.playerLevel', { n: props.playerLevel })}</Chip>}
        {props.dailyBonusXp !== undefined && <Chip tone="good">{t('result.daily', { bonus: props.dailyBonusXp })}</Chip>}
      </div>

      {props.newBadges.length > 0 && (
        <section>
          <h2 className="pip-sec">{t('result.newStickers')}</h2>
          <div className="pip-row pip-row--center">
            {props.newBadges.map((b) => (
              <div key={b.id} className="pip-pop">
                <StickerBadge glyph={b.glyph} color={b.color} title={b.title} compact />
              </div>
            ))}
          </div>
        </section>
      )}

      {props.missed.length > 0 && (
        <section>
          <h2 className="pip-sec">{t('result.review')}</h2>
          <ul className="pip-list">
            {props.missed.map((m, i) => (
              <li key={i} className="pip-list__item">
                <RichText className="pip-list__eq" html={m.prompt} />
                <span>
                  → <RichText as="b" html={m.answer} />
                </span>
                <RichText as="small" className="pip-list__why" html={m.why} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="pip-row pip-row--center pip-actions">
        <Button autoFocus onClick={props.onPlayAgain}>
          {t('result.again')}
        </Button>
        <Button variant="alt" onClick={props.onHome}>
          {t('common.home')}
        </Button>
      </div>
    </div>
  );
}

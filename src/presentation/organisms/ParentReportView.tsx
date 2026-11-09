import type { Grade, TopicId } from '@/domain/shared/types';
import { formatNumber } from '@/domain/shared/locale';
import { Button, Card, Stars } from '../atoms';
import { useI18n } from '../i18n';
import { StatCard } from '../molecules';

export interface ReportRowView {
  topicId: TopicId;
  title: string;
  answered: number;
  /** 0..100, or null when nothing was answered yet. */
  accuracyPct: number | null;
  stars: number;
  /** Difficulty tier 0..2. */
  tier: number;
}

export interface WeakTopicView {
  title: string;
  accuracyPct: number;
}

export interface ParentReportViewProps {
  childName: string;
  grade: Grade;
  totals: { level: number; xp: number; rounds: number; stars: number; accuracyPct: number | null };
  rows: readonly ReportRowView[];
  weakTopics: readonly WeakTopicView[];
  /** Where progress lives, for the privacy note. */
  storage: 'cloud' | 'local';
  /** Two-step reset: `confirm` shows the warning with the final button. */
  resetStage: 'idle' | 'confirm';
  onEditChild(): void;
  onSwitchChild?: () => void;
  onRequestReset(): void;
  onConfirmReset(): void;
  onCancelReset(): void;
}

export function ParentReportView(props: ParentReportViewProps) {
  const { t, locale } = useI18n();
  const pct = (value: number | null) => (value === null ? t('common.none') : `${Math.round(value)}%`);

  return (
    <div className="pip-report">
      <h2 className="pip-sec">{t('parent.title')}</h2>

      <Card>
        <p className="pip-report__intro">{t('parent.intro', { name: props.childName, grade: props.grade })}</p>

        <div className="pip-stats">
          <StatCard label={t('parent.totals.level')}>{props.totals.level}</StatCard>
          <StatCard label={t('parent.totals.xp')}>{formatNumber(locale, props.totals.xp)}</StatCard>
          <StatCard label={t('parent.totals.rounds')}>{props.totals.rounds}</StatCard>
          <StatCard label={t('parent.totals.stars')}>{props.totals.stars}</StatCard>
          <StatCard label={t('parent.totals.accuracy')}>{pct(props.totals.accuracyPct)}</StatCard>
        </div>

        <div className="pip-tw">
          <table className="pip-table">
            <thead>
              <tr>
                <th scope="col">{t('parent.table.topic')}</th>
                <th scope="col">{t('parent.table.questions')}</th>
                <th scope="col">{t('parent.table.accuracy')}</th>
                <th scope="col">{t('parent.table.stars')}</th>
                <th scope="col">{t('parent.table.difficulty')}</th>
              </tr>
            </thead>
            <tbody>
              {props.rows.map((row) => (
                <tr key={row.topicId}>
                  <td>{row.title}</td>
                  <td>{row.answered}</td>
                  <td>{pct(row.accuracyPct)}</td>
                  <td>
                    <Stars value={row.stars} max={3} />
                  </td>
                  <td>{row.tier + 1}/3</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="pip-report__weak">
        <h3>{t('parent.weak.title')}</h3>
        {props.weakTopics.length === 0 ? (
          <p>{t('parent.weak.empty')}</p>
        ) : (
          <ul>
            {props.weakTopics.map((w) => (
              <li key={w.title}>{t('parent.weak.item', { topic: w.title, pct: Math.round(w.accuracyPct) })}</li>
            ))}
          </ul>
        )}
      </Card>

      <div className="pip-row pip-report__actions">
        <Button variant="alt" onClick={props.onEditChild}>
          {t('parent.editChild')}
        </Button>
        {props.onSwitchChild && (
          <Button variant="alt" onClick={props.onSwitchChild}>
            {t('parent.switchChild')}
          </Button>
        )}
        {props.resetStage === 'idle' && (
          <Button variant="alt" onClick={props.onRequestReset}>
            {t('parent.reset')}
          </Button>
        )}
      </div>

      {props.resetStage === 'confirm' && (
        <div className="pip-confirm" role="alertdialog" aria-labelledby="reset-title" aria-describedby="reset-body">
          <strong id="reset-title">{t('parent.resetConfirmTitle', { name: props.childName })}</strong>
          <p id="reset-body">{t('parent.resetConfirmBody')}</p>
          <div className="pip-row">
            <Button onClick={props.onConfirmReset}>{t('parent.resetConfirm')}</Button>
            <Button variant="alt" onClick={props.onCancelReset}>
              {t('parent.resetCancel')}
            </Button>
          </div>
        </div>
      )}

      <p className="pip-report__note">{props.storage === 'cloud' ? t('parent.storage.cloud') : t('parent.storage.local')}</p>
    </div>
  );
}

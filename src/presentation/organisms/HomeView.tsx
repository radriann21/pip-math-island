import type { CSSProperties } from 'react';
import type { Grade, TopicId } from '@/domain/shared/types';
import { formatNumber } from '@/domain/shared/locale';
import { Button, Chip, Icon, Meter, Pip } from '../atoms';
import { useI18n } from '../i18n';
import { SpeechBubble, StatCard } from '../molecules';
import { TopicGrid } from './TopicGrid';
import type { TopicView } from './types';

const GRADES: readonly Grade[] = [1, 2, 3, 4, 5, 6];

interface HomeViewProps {
  /** Child's name; an empty name falls back to a friendly word. */
  name: string;
  /** Pip's line for today, already translated. */
  message: string;
  grade: Grade;
  level: number;
  xp: number;
  /** Progress to the next level, 0..100. */
  levelPct: number;
  totalStars: number;
  streak: number;
  roundsToday: number;
  dailyGoal: number;
  dailyBonusXp: number;
  topics: readonly TopicView[];
  raceBest: number;
  stickersOwned: number;
  stickersTotal: number;
  onGradeChange(grade: Grade): void;
  onSelectTopic(id: TopicId): void;
  onRace(): void;
  onStickers(): void;
  onGrownups(): void;
}

export function HomeView(props: HomeViewProps) {
  const { t, locale } = useI18n();
  const { roundsToday, dailyGoal } = props;
  const todayRounds = Math.min(roundsToday, dailyGoal);

  return (
    <div className="pip-home">
      <div className="pip-hero">
        <div className="pip-hero__pip pip-bounce">
          <Pip mood="happy" size={110} />
        </div>
        <SpeechBubble>
          <b>{t('home.greeting', { name: props.name || t('home.friend') })}</b> {props.message}
        </SpeechBubble>
      </div>

      <div className="pip-chips pip-home__grades">
        <Chip>{t('home.grade')}</Chip>
        {GRADES.map((g) => (
          <Chip key={g} pressed={g === props.grade} aria-label={t('home.gradeN', { n: g })} onClick={() => props.onGradeChange(g)}>
            {g}
          </Chip>
        ))}
      </div>

      <div className="pip-stats">
        <StatCard
          label={t('stat.level', { level: props.level })}
          footer={<Meter value={props.levelPct} label={t('stat.level', { level: props.level })} />}
        >
          {t('stat.xp', { xp: formatNumber(locale, props.xp) })}
        </StatCard>
        <StatCard label={t('stat.stars')}>{props.totalStars} ★</StatCard>
        <StatCard label={t('stat.streak')}>
          {props.streak}{' '}
          <svg width="22" height="22" style={{ color: 'var(--accent)', verticalAlign: '-3px' }} aria-hidden="true">
            <use href="#i-flame" />
          </svg>
        </StatCard>
        <StatCard
          label={t('stat.daily', { rounds: dailyGoal, bonus: props.dailyBonusXp })}
          footer={<Meter value={(todayRounds / dailyGoal) * 100} label={t('stat.daily', { rounds: dailyGoal, bonus: props.dailyBonusXp })} />}
        >
          {todayRounds}/{dailyGoal}
        </StatCard>
      </div>

      <h2 className="pip-sec">{t('home.chooseIsland')}</h2>
      <TopicGrid topics={props.topics} onSelect={props.onSelectTopic}>
        <button
          type="button"
          className="pip-island pip-island--wide"
          style={{ '--c': '#5b3df5' } as CSSProperties}
          onClick={props.onRace}
        >
          <span className="pip-tile">
            <Icon name="race" />
          </span>
          <span>
            <h3>{t('race.title')}</h3>
            <span className="pip-island__tier">
              {t('race.subtitle')} {t('race.best', { n: props.raceBest })}
            </span>
          </span>
        </button>
      </TopicGrid>

      <div className="pip-foot">
        <Button variant="alt" onClick={props.onStickers}>
          {t('home.stickers', { owned: props.stickersOwned, total: props.stickersTotal })}
        </Button>
        <Button variant="alt" onClick={props.onGrownups}>
          {t('home.grownups')}
        </Button>
      </div>
    </div>
  );
}

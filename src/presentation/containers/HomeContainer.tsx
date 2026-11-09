import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeps } from '@/app/context';
import { progressKey } from '@/application/model';
import { buildSnapshot, updateChild } from '@/application/usecases';
import { TOPICS } from '@/domain/exercises';
import { BADGES, DAILY_BONUS_XP, DAILY_GOAL_ROUNDS, levelInfo, liveStreak } from '@/domain/progression';
import type { Grade } from '@/domain/shared/types';
import { useI18n } from '../i18n';
import type { MessageKey } from '../i18n';
import { HomeView } from '../organisms';
import { describeError } from './errors';
import { usePlayerContext } from './PlayerContext';

export function HomeContainer() {
  const { t, locale } = useI18n();
  const deps = useDeps();
  const navigate = useNavigate();
  const { player, setPlayer } = usePlayerContext();
  const [error, setError] = useState<string>();
  const child = player.child;
  const today = deps.clock.today();
  const level = levelInfo(player.xp);
  const messageNo = (Number(today.slice(-2)) % 4) + 1;

  const topics = TOPICS.map((def) => {
    const p = player.progress[progressKey(child.grade, def.id)];
    return { id: def.id, title: def.title[locale], accent: def.accent, stars: p?.bestStars ?? 0, tier: p?.tier ?? 0 };
  });

  const changeGrade = async (grade: Grade) => {
    setError(undefined);
    try {
      const updated = await updateChild(deps, child.id, { grade });
      setPlayer({ ...player, child: updated });
    } catch (e) {
      const d = describeError(e);
      setError(t(d.key, d.params));
    }
  };

  return (
    <>
      <HomeView
        name={child.name}
        message={t(`home.message.${messageNo}` as MessageKey)}
        grade={child.grade}
        level={level.level}
        xp={player.xp}
        levelPct={level.pct}
        totalStars={buildSnapshot(player).totalStars}
        streak={liveStreak(player.streak, player.lastPlayed, today)}
        roundsToday={player.today.day === today ? player.today.rounds : 0}
        dailyGoal={DAILY_GOAL_ROUNDS}
        dailyBonusXp={DAILY_BONUS_XP}
        topics={topics}
        raceBest={player.raceBest}
        stickersOwned={player.badges.filter((id) => BADGES.some((b) => b.id === id)).length}
        stickersTotal={BADGES.length}
        onGradeChange={(g) => void changeGrade(g)}
        onSelectTopic={(id) => navigate(`/play/${id}`)}
        onRace={() => navigate('/race')}
        onStickers={() => navigate('/stickers')}
        onGrownups={() => navigate('/parent')}
      />
      {error && (
        <p className="pip-field__error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

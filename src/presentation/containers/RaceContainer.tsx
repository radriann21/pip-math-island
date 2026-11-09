import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, useDeps } from '@/app/context';
import { finishRace, startRace } from '@/application/usecases';
import type { FinishRaceResult } from '@/application/usecases';
import type { RaceQuestion } from '@/domain/exercises';
import { answerRace, raceXp } from '@/domain/progression';
import type { RaceTracker } from '@/domain/progression';
import { Button } from '../atoms';
import { useConfetti } from '../hooks/useConfetti';
import { useSound } from '../hooks/useSound';
import { useI18n } from '../i18n';
import { RaceResultView, RaceView } from '../organisms';
import type { ChoiceState } from '../molecules';
import { describeError } from './errors';
import { usePlayerContext } from './PlayerContext';

const TICK_MS = 150;
const LOCK_MS = 550;

type Phase = 'playing' | 'saving' | 'result' | 'error';

export function RaceContainer() {
  const { t, locale } = useI18n();
  const deps = useDeps();
  const navigate = useNavigate();
  const { soundEnabled } = useApp();
  const { player, setPlayer } = usePlayerContext();
  const play = useSound(soundEnabled);
  const confetti = useConfetti();

  const playerRef = useRef(player);
  useEffect(() => {
    playerRef.current = player;
  });

  const [round, setRound] = useState(0);
  const [game, setGame] = useState(() => {
    const g = startRace(deps, player);
    return { seconds: g.seconds, nextQuestion: g.nextQuestion, question: g.nextQuestion() as RaceQuestion };
  });
  const [tracker, setTracker] = useState<RaceTracker>(() => startRace(deps, player).tracker);
  const trackerRef = useRef(tracker);
  const [secondsLeft, setSecondsLeft] = useState(game.seconds);
  const [phase, setPhase] = useState<Phase>('playing');
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<FinishRaceResult>();
  const [saveError, setSaveError] = useState<string>();
  const finishedRef = useRef(false);
  const finalRef = useRef<{ score: number; bestCombo: number }>({ score: 0, bestCombo: 0 });
  const lockTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(lockTimer.current);
    };
  }, []);

  const save = useCallback(async () => {
    setPhase('saving');
    setSaveError(undefined);
    try {
      const r = await finishRace(deps, { state: playerRef.current, ...finalRef.current });
      if (!mounted.current) return;
      setPlayer(r.state);
      setResult(r);
      setPhase('result');
      play('win');
      if (r.record || finalRef.current.score >= 10) confetti.fire();
    } catch (e) {
      if (!mounted.current) return;
      const d = describeError(e);
      setSaveError(t(d.key, d.params));
      setPhase('error');
    }
  }, [deps, setPlayer, play, confetti, t]);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    finalRef.current = { score: trackerRef.current.score, bestCombo: trackerRef.current.bestCombo };
    void save();
  }, [save]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const startedAt = Date.now();
    const id = setInterval(() => {
      const left = game.seconds - (Date.now() - startedAt) / 1000;
      if (left <= 0) {
        clearInterval(id);
        setSecondsLeft(0);
        finish();
      } else {
        setSecondsLeft(left);
      }
    }, TICK_MS);
    return () => clearInterval(id);
    // Only restart the clock for a new race, not when the phase flips back from a failed save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, phase === 'playing']);

  const handlePick = (index: number) => {
    if (phase !== 'playing' || picked !== null || finishedRef.current) return;
    const q = game.question;
    const correct = q.opts[index] === q.answer;
    const next = answerRace(trackerRef.current, correct);
    trackerRef.current = next;
    setTracker(next);
    play(correct ? 'ok' : 'no');
    if (correct) {
      setGame((g) => ({ ...g, question: g.nextQuestion() }));
    } else {
      setPicked(index);
      lockTimer.current = setTimeout(() => {
        setPicked(null);
        setGame((g) => ({ ...g, question: g.nextQuestion() }));
      }, LOCK_MS);
    }
  };

  const again = () => {
    clearTimeout(lockTimer.current);
    const g = startRace(deps, playerRef.current);
    finishedRef.current = false;
    trackerRef.current = g.tracker;
    setTracker(g.tracker);
    setGame({ seconds: g.seconds, nextQuestion: g.nextQuestion, question: g.nextQuestion() });
    setSecondsLeft(g.seconds);
    setPicked(null);
    setResult(undefined);
    setPhase('playing');
    setRound((r) => r + 1);
  };

  void locale;

  if (phase === 'result' && result) {
    return (
      <>
        {confetti.canvas}
        <RaceResultView
          score={finalRef.current.score}
          isRecord={result.record}
          bestCombo={finalRef.current.bestCombo}
          record={result.state.raceBest}
          xp={raceXp(finalRef.current.score)}
          newBadges={result.newBadges.map((b) => ({
            id: b.id,
            glyph: b.glyph,
            color: b.color,
            title: b.title[locale],
            description: b.description[locale],
          }))}
          onAgain={again}
          onHome={() => navigate('/')}
        />
      </>
    );
  }

  if (phase === 'error') {
    return (
      <div className="pip-center">
        <p className="pip-field__error" role="alert">
          {saveError}
        </p>
        <div className="pip-row pip-row--center">
          <Button onClick={() => void save()}>{t('common.retry')}</Button>
          <Button variant="alt" onClick={() => navigate('/')}>
            {t('common.home')}
          </Button>
        </div>
      </div>
    );
  }

  const q = game.question;
  const states: ChoiceState[] | undefined =
    picked === null
      ? undefined
      : q.opts.map((o, i) => (o === q.answer ? 'correct' : i === picked ? 'wrong' : 'disabled'));

  return (
    <>
      {confetti.canvas}
      <RaceView
        score={tracker.score}
        combo={tracker.combo}
        secondsLeft={secondsLeft}
        totalSeconds={game.seconds}
        question={{ prompt: q.prompt, options: q.opts }}
        optionStates={states}
        locked={picked !== null || phase !== 'playing'}
        onPick={handlePick}
        onBack={() => navigate('/')}
      />
    </>
  );
}

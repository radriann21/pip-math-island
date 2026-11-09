import { useEffect, useReducer, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, useDeps } from '@/app/context';
import { finishRound, startRound } from '@/application/usecases';
import type { FinishRoundResult } from '@/application/usecases';
import { getTopic } from '@/domain/exercises';
import { levelInfo } from '@/domain/progression';
import { formatNumber } from '@/domain/shared/locale';
import type { Question, TopicId } from '@/domain/shared/types';
import { useConfetti } from '../hooks/useConfetti';
import { useSound } from '../hooks/useSound';
import { useToasts } from '../hooks/useToasts';
import { useI18n } from '../i18n';
import { StatePanel, ToastStack } from '../molecules';
import { QuizView, ResultView } from '../organisms';
import type { MissedQuestionView, QuizFeedbackView } from '../organisms';
import { usePlayerContext } from './PlayerContext';
import { initialQuiz, quizReducer } from './quizMachine';
import type { Msg } from './quizMachine';

function QuizRound({ topic, onAgain }: { topic: TopicId; onAgain(): void }) {
  const { t, locale } = useI18n();
  const deps = useDeps();
  const navigate = useNavigate();
  const { soundEnabled } = useApp();
  const { player, setPlayer } = usePlayerContext();
  const play = useSound(soundEnabled);
  const confetti = useConfetti();
  const toasts = useToasts();
  const [state, dispatch] = useReducer(quizReducer, undefined, () => {
    const round = startRound(deps, { state: player, topic });
    return initialQuiz(round.questions, round.tier);
  });
  const [save, setSave] = useState<'idle' | 'saving' | 'failed'>('idle');
  const [result, setResult] = useState<FinishRoundResult | null>(null);
  const inFlight = useRef(false);
  const confettiTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(confettiTimer.current), []);

  const def = getTopic(topic);
  const q = state.questions[state.index] as Question;
  const isLast = state.index === state.questions.length - 1;
  const msg = (m: Msg) => t(m.key, m.params);

  const finish = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSave('saving');
    try {
      const r = await finishRound(deps, { state: player, topic, tierBefore: state.tier, details: state.details });
      setPlayer(r.state);
      setResult(r);
      play(r.score.stars > 0 ? 'win' : 'no');
      if (r.score.stars >= 2) confettiTimer.current = setTimeout(confetti.fire, 200);
      for (const b of r.newBadges) toasts.push(t('toast.sticker', { name: b.title[locale] }));
    } catch {
      setSave('failed');
      inFlight.current = false;
    }
  };

  const answer = (action: Parameters<typeof dispatch>[0]) => {
    const before = state;
    const after = quizReducer(before, action);
    if (after === before) return;
    dispatch(action);
    if (after.details.length > before.details.length) {
      const d = after.details[after.details.length - 1];
      play(d?.correct ? 'ok' : 'no');
    } else if (action.type === 'choose' || action.type === 'submit') play('no');
  };

  if (result) {
    const { score, state: next } = result;
    const missed: MissedQuestionView[] = state.details
      .filter((d) => !d.correct)
      .map((d) => {
        const mq = state.questions[d.index] as Question;
        return {
          prompt: mq.prompt,
          answer: mq.kind === 'num' ? formatNumber(locale, Number(mq.answer)) : String(mq.answer),
          why: mq.why,
        };
      });
    return (
      <>
        <ResultView
          stars={score.stars}
          firstTry={state.details.filter((d) => d.correct && d.tries === 1).length}
          secondTry={state.details.filter((d) => d.correct && d.tries === 2).length}
          xp={score.xpGained + result.bonusXp}
          tierBefore={state.tier}
          tierAfter={score.tierAfter}
          playerLevel={result.levelUp ? levelInfo(next.xp).level : undefined}
          dailyBonusXp={result.bonusXp > 0 ? result.bonusXp : undefined}
          newBadges={result.newBadges.map((b) => ({
            id: b.id,
            glyph: b.glyph,
            color: b.color,
            title: b.title[locale],
            description: b.description[locale],
          }))}
          missed={missed}
          onPlayAgain={onAgain}
          onHome={() => navigate('/')}
        />
        <ToastStack messages={toasts.messages} />
        {confetti.canvas}
      </>
    );
  }

  const fb = state.feedback;
  let feedback: QuizFeedbackView | undefined;
  if (fb) {
    let body = fb.body;
    if (fb.answer !== undefined) {
      const shown = q.kind === 'num' ? formatNumber(locale, Number(q.answer)) : fb.answer;
      body = `<b>${t('quiz.answerIs', { answer: shown })}</b> ${fb.body ?? ''}`;
    }
    feedback = { kind: fb.kind, title: fb.title.map(msg).join(' '), body, showNext: fb.showNext && save === 'idle' };
  }

  return (
    <>
      <QuizView
        question={{ kind: q.kind, prompt: q.prompt, vis: q.vis, options: q.opts, decimal: q.decimal }}
        index={state.index}
        total={state.questions.length}
        results={state.results}
        topicId={topic}
        topicAccent={def.accent}
        mood={state.mood}
        bubble={msg(state.bubble)}
        input={state.input}
        inputStatus={state.inputStatus}
        optionStates={state.optionStates}
        locked={state.locked}
        feedback={feedback}
        isLast={isLast}
        onBack={() => navigate('/')}
        onChoose={(i) => answer({ type: 'choose', index: i })}
        onKey={(key) => dispatch({ type: 'key', key })}
        onSubmit={() => answer({ type: 'submit' })}
        onHint={() => dispatch({ type: 'hint' })}
        onNext={() => {
          if (!state.locked) return;
          if (isLast) void finish();
          else dispatch({ type: 'next' });
        }}
      />
      {save === 'failed' && <StatePanel kind="error" message={t('quiz.saveFailed')} onRetry={() => void finish()} />}
    </>
  );
}

export function QuizContainer({ topic }: { topic: TopicId }) {
  const [run, setRun] = useState(0);
  return <QuizRound key={run} topic={topic} onAgain={() => setRun((r) => r + 1)} />;
}

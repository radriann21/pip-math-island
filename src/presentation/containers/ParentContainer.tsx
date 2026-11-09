import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, useAppMode, useDeps } from '@/app/context';
import { getParentReport, removeChild, updateChild } from '@/application/usecases';
import { TOPICS } from '@/domain/exercises';
import { Button } from '../atoms';
import { useI18n } from '../i18n';
import { StatePanel } from '../molecules';
import { ChildForm, ParentGate, ParentReportView } from '../organisms';
import type { ChildFormValues } from '../organisms';
import { checkGateAnswer, makeGateChallenge } from '../organisms/parentGate';
import { describeError } from './errors';
import { usePlayerContext } from './PlayerContext';
import { useAsyncData } from './useAsyncData';
import { useAuth } from './useAuth';

export function ParentContainer() {
  const deps = useDeps();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState(() => makeGateChallenge(deps.rng));
  const [wrong, setWrong] = useState(false);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <ParentGate
        question={challenge.question}
        error={wrong}
        onSubmit={(answer) => {
          if (checkGateAnswer(challenge, answer)) {
            setOpen(true);
          } else {
            setWrong(true);
            setChallenge(makeGateChallenge(deps.rng));
          }
        }}
        onCancel={() => navigate('/')}
      />
    );
  }
  return <ParentReport />;
}

function ParentReport() {
  const { t, locale } = useI18n();
  const deps = useDeps();
  const navigate = useNavigate();
  const auth = useAuth();
  const { mode } = useAppMode();
  const { setActiveChildId } = useApp();
  const { player, setPlayer } = usePlayerContext();
  const childId = player.child.id;
  const { state, reload } = useAsyncData(() => getParentReport(deps, childId), `report:${childId}`);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  if (state.status === 'loading') return <StatePanel kind="loading" />;
  if (state.status === 'error') {
    const d = describeError(state.error);
    return <StatePanel kind="error" message={t(d.key, d.params)} onRetry={reload} />;
  }
  const report = state.data;

  const fail = (e: unknown) => {
    const d = describeError(e);
    setError(t(d.key, d.params));
    setBusy(false);
  };

  const saveProfile = async (values: ChildFormValues) => {
    setBusy(true);
    setError(undefined);
    try {
      const child = await updateChild(deps, childId, values);
      setPlayer({ ...player, child });
      setEditing(false);
      setBusy(false);
      reload();
    } catch (e) {
      fail(e);
    }
  };

  const deleteProfile = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await removeChild(deps, childId);
      setActiveChildId(null);
      navigate('/children', { replace: true });
    } catch (e) {
      fail(e);
    }
  };

  if (editing) {
    return (
      <ChildForm
        mode="edit"
        initial={{ name: report.child.name, grade: report.child.grade, locale: report.child.locale }}
        onSubmit={(v) => void saveProfile(v)}
        onCancel={() => setEditing(false)}
        submitting={busy}
        error={error}
      />
    );
  }

  const pct = (n: number, answered: number) => (answered === 0 ? null : n * 100);
  const title = (id: string) => TOPICS.find((d) => d.id === id)?.title[locale] ?? id;

  return (
    <>
      <ParentReportView
        childName={report.child.name}
        grade={report.child.grade}
        totals={{
          level: report.level,
          xp: report.totals.xp,
          rounds: report.totals.roundsTotal,
          stars: report.totals.stars,
          accuracyPct: report.totals.roundsTotal === 0 ? null : report.totals.accuracy * 100,
        }}
        rows={report.topics.map((r) => ({
          topicId: r.topic,
          title: title(r.topic),
          answered: r.answered,
          accuracyPct: pct(r.accuracy, r.answered),
          stars: r.bestStars,
          tier: r.tier,
        }))}
        weakTopics={report.weakTopics.map((r) => ({ title: title(r.topic), accuracyPct: r.accuracy * 100 }))}
        storage={mode === 'guest' ? 'local' : 'cloud'}
        resetStage={confirming ? 'confirm' : 'idle'}
        onEditChild={() => setEditing(true)}
        onSwitchChild={() => navigate('/children')}
        onRequestReset={() => setConfirming(true)}
        onConfirmReset={() => void deleteProfile()}
        onCancelReset={() => setConfirming(false)}
      />
      {error && (
        <p className="pip-field__error" role="alert">
          {error}
        </p>
      )}
      <div className="pip-row pip-row--center">
        <Button variant="alt" onClick={() => navigate('/')}>
          {t('common.home')}
        </Button>
        <Button variant="alt" onClick={() => void auth.signOut()}>
          {t('auth.signOut')}
        </Button>
      </div>
    </>
  );
}

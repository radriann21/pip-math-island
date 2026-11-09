import { useEffect, useRef } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { NotFoundError } from '@/application/errors';
import { PlayerContext } from '@/presentation/containers/PlayerContext';
import { describeError } from '@/presentation/containers/errors';
import { usePlayer } from '@/presentation/containers/usePlayer';
import { useI18n } from '@/presentation/i18n';
import { StatePanel } from '@/presentation/molecules';
import { PageShell } from '@/presentation/pages/PageShell';
import { useApp } from './context';

/** Parents and guests alike need a session; everyone else goes to the login page. */
export function RequireSession() {
  const { session, sessionReady } = useApp();
  if (!sessionReady) return <StatePanel kind="loading" />;
  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function PlayerBoundary({ childId }: { childId: string }) {
  const { t } = useI18n();
  const { setActiveChildId, setLocale, setSoundEnabled } = useApp();
  const { state, retry, setPlayer } = usePlayer(childId);
  const synced = useRef<string | null>(null);

  const missing = state.status === 'error' && state.error instanceof NotFoundError;
  useEffect(() => {
    if (missing) setActiveChildId(null);
  }, [missing, setActiveChildId]);

  const child = state.status === 'ready' ? state.data.child : null;
  useEffect(() => {
    if (!child || synced.current === child.id) return;
    synced.current = child.id;
    setLocale(child.locale);
    setSoundEnabled(child.soundEnabled);
  }, [child, setLocale, setSoundEnabled]);

  if (missing) return <Navigate to="/children" replace />;
  if (state.status === 'loading') return <StatePanel kind="loading" />;
  if (state.status === 'error') {
    const d = describeError(state.error);
    return (
      <PageShell>
        <StatePanel kind="error" message={t(d.key, d.params)} onRetry={retry} />
      </PageShell>
    );
  }
  return (
    <PlayerContext.Provider value={{ player: state.data, setPlayer }}>
      <Outlet />
    </PlayerContext.Provider>
  );
}

/** Routes that need a chosen child: loads the child's state and shares it with the pages below. */
export function RequireChild() {
  const { activeChildId } = useApp();
  if (!activeChildId) return <Navigate to="/children" replace />;
  return <PlayerBoundary key={activeChildId} childId={activeChildId} />;
}

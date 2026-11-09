import { useMemo } from 'react';
import { useApp, useDeps } from '@/app/context';
import type { Session } from '@/application/model';
import { continueAsGuest, signIn, signOut, signUp } from '@/application/usecases';

/** Session state plus the authentication actions, already wired to the dependencies. */
export function useAuth() {
  const deps = useDeps();
  const { session, sessionReady, applySession } = useApp();
  return useMemo(
    () => ({
      session,
      ready: sessionReady,
      async signIn(email: string, password: string): Promise<Session> {
        const next = await signIn(deps, email, password);
        applySession(next);
        return next;
      },
      async signUp(email: string, password: string) {
        const result = await signUp(deps, email, password);
        if (result.session) applySession(result.session);
        return result;
      },
      async continueAsGuest(): Promise<Session> {
        const next = await continueAsGuest(deps);
        applySession(next);
        return next;
      },
      async signOut(): Promise<void> {
        await signOut(deps);
        applySession(null);
      },
    }),
    [deps, session, sessionReady, applySession],
  );
}

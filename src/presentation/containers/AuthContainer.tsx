import { useEffect, useRef, useState } from 'react';
import { useAppMode } from '@/app/context';
import { Button } from '../atoms';
import { useI18n } from '../i18n';
import { AuthForm } from '../organisms';
import type { AuthMode, Credentials } from '../organisms';
import { describeError } from './errors';
import { useAuth } from './useAuth';

interface AuthContainerProps {
  /** Whether "play as guest" is offered. */
  guestAvailable?: boolean;
}

export function AuthContainer({ guestAvailable = true }: AuthContainerProps) {
  const { t } = useI18n();
  const auth = useAuth();
  const { mode, cloudAvailable, switchToCloud, switchToGuest } = useAppMode();
  const [authMode, setAuthMode] = useState<AuthMode>('signIn');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [confirmEmailFor, setConfirmEmailFor] = useState<string>();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const fail = (e: unknown) => {
    const { key, params } = describeError(e);
    if (mounted.current) setError(t(key, params));
  };

  const handleSubmit = async ({ email, password }: Credentials) => {
    setLoading(true);
    setError(undefined);
    setConfirmEmailFor(undefined);
    try {
      if (authMode === 'signIn') {
        await auth.signIn(email, password);
      } else {
        const result = await auth.signUp(email, password);
        if (result.needsEmailConfirmation && mounted.current) {
          setConfirmEmailFor(email);
          setAuthMode('signIn');
        }
      }
    } catch (e) {
      fail(e);
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  const handleGuest = async () => {
    setError(undefined);
    try {
      // In cloud mode the guest adapters have to be wired first; they pick the guest flag up on their own.
      if (mode === 'guest') await auth.continueAsGuest();
      else switchToGuest();
    } catch (e) {
      fail(e);
    }
  };

  return (
    <>
      <AuthForm
        mode={authMode}
        onModeChange={(next) => {
          setAuthMode(next);
          setError(undefined);
        }}
        onSubmit={(c) => void handleSubmit(c)}
        loading={loading}
        error={error}
        confirmEmailFor={confirmEmailFor}
        guestAvailable={guestAvailable}
        onGuest={() => void handleGuest()}
      />
      {mode === 'guest' && cloudAvailable && (
        <div className="pip-auth__guest">
          <Button variant="alt" onClick={switchToCloud}>
            {t('auth.useAccount')}
          </Button>
        </div>
      )}
    </>
  );
}

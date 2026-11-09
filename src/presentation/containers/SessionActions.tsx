import { useAppMode } from '@/app/context';
import { Button } from '../atoms';
import { useI18n } from '../i18n';
import { useAuth } from './useAuth';

/** Top bar actions for a signed-in parent: leave, and (for guests) move to a real account. */
export function SessionActions() {
  const { t } = useI18n();
  const auth = useAuth();
  const { mode, cloudAvailable, switchToCloud } = useAppMode();
  return (
    <>
      {mode === 'guest' && cloudAvailable && (
        <Button variant="alt" size="sm" onClick={switchToCloud}>
          {t('auth.useAccount')}
        </Button>
      )}
      <Button variant="alt" size="sm" onClick={() => void auth.signOut()}>
        {t('auth.signOut')}
      </Button>
    </>
  );
}

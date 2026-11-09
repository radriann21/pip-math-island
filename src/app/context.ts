import { createContext, useContext } from 'react';
import type { Session } from '@/application/model';
import type { Deps } from '@/application/ports';
import type { Locale } from '@/domain/shared/types';
import type { AppMode } from './container';

export const DepsContext = createContext<Deps | null>(null);

export interface AppValue {
  mode: AppMode;
  /** Supabase is configured, so an account can be used. */
  cloudAvailable: boolean;
  switchToGuest(): void;
  switchToCloud(): void;
  session: Session | null;
  /** False until the first session lookup finished, so guards do not redirect too early. */
  sessionReady: boolean;
  /** Applies a session returned by a use case right away (the auth listener confirms it later). */
  applySession(session: Session | null): void;
  activeChildId: string | null;
  setActiveChildId(id: string | null): void;
  locale: Locale;
  setLocale(locale: Locale): void;
  soundEnabled: boolean;
  setSoundEnabled(enabled: boolean): void;
}

export const AppContext = createContext<AppValue | null>(null);

export function useDeps(): Deps {
  const deps = useContext(DepsContext);
  if (!deps) throw new Error('useDeps must be used inside <AppProviders>');
  return deps;
}

export function useApp(): AppValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside <AppProviders>');
  return value;
}

export function useAppMode(): Pick<AppValue, 'mode' | 'cloudAvailable' | 'switchToGuest' | 'switchToCloud'> {
  const { mode, cloudAvailable, switchToGuest, switchToCloud } = useApp();
  return { mode, cloudAvailable, switchToGuest, switchToCloud };
}

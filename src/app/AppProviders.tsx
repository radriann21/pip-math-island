import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@/application/model';
import type { Deps } from '@/application/ports';
import { getSession } from '@/application/usecases';
import type { Locale } from '@/domain/shared/types';
import type { KeyValueStorage } from '@/infrastructure/local/KeyValueStorage';
import { MemoryStorage } from '@/infrastructure/local/MemoryStorage';
import { SystemClock } from '@/infrastructure/system/SystemClock';
import { Sprite } from '@/presentation/atoms';
import { I18nProvider } from '@/presentation/i18n';
import { ErrorBoundary } from './ErrorBoundary';
import { type AppMode, createDeps, resolveMode, setPreferredMode } from './container';
import { AppContext, DepsContext } from './context';
import type { AppValue } from './context';
import { readSupabaseEnv } from './env';
import { ACTIVE_CHILD_KEY, LOCALE_KEY, SOUND_KEY } from './storageKeys';

interface AppProvidersProps {
  children: ReactNode;
  /** Tests inject ready-made dependencies; the app builds them from the mode otherwise. */
  deps?: Deps;
  storage?: KeyValueStorage;
  /** Tests start with a known session instead of asking the gateway. */
  initialSession?: Session | null;
  /** Vite-style env (defaults to `import.meta.env`). */
  env?: Record<string, unknown>;
}

function defaultStorage(): KeyValueStorage {
  try {
    const probe = '__pip_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return new MemoryStorage();
  }
}

function safeGet(storage: KeyValueStorage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(storage: KeyValueStorage, key: string, value: string | null): void {
  try {
    if (value === null) storage.removeItem(key);
    else storage.setItem(key, value);
  } catch {
    // The value only lasts for this page load.
  }
}

function initialLocale(storage: KeyValueStorage): Locale {
  const stored = safeGet(storage, LOCALE_KEY);
  if (stored === 'en' || stored === 'es') return stored;
  const language = typeof navigator === 'undefined' ? 'en' : navigator.language;
  return language.toLowerCase().startsWith('es') ? 'es' : 'en';
}

export function AppProviders({ children, deps: injected, storage: injectedStorage, initialSession, env }: AppProvidersProps) {
  // Fixed for the life of the app: where we read configuration and persist small preferences.
  const [fixed] = useState(() => {
    const storage = injectedStorage ?? defaultStorage();
    const environment = env ?? (import.meta.env as Record<string, unknown>);
    const supabaseConfig = readSupabaseEnv(environment);
    return { storage, supabaseConfig, injected };
  });
  const { storage, supabaseConfig } = fixed;

  const build = useCallback(
    (mode: AppMode): Deps =>
      fixed.injected ??
      createDeps({ mode, supabaseConfig, storage, clock: new SystemClock(), rng: Math.random }),
    [fixed, supabaseConfig, storage],
  );

  const [mode, setMode] = useState<AppMode>(() =>
    injected ? 'guest' : resolveMode({ env: env ?? (import.meta.env as Record<string, unknown>), storage }),
  );
  const [deps, setDeps] = useState<Deps>(() => build(mode));

  const [session, setSession] = useState<Session | null>(initialSession ?? null);
  const [sessionReady, setSessionReady] = useState(initialSession !== undefined);
  const [activeChildId, setActiveChild] = useState<string | null>(() => safeGet(storage, ACTIVE_CHILD_KEY));
  const [locale, setLocaleState] = useState<Locale>(() => initialLocale(storage));
  const [soundEnabled, setSoundState] = useState<boolean>(() => safeGet(storage, SOUND_KEY) !== 'off');

  const firstDeps = useRef(deps);

  const setActiveChildId = useCallback(
    (id: string | null) => {
      setActiveChild(id);
      safeSet(storage, ACTIVE_CHILD_KEY, id);
    },
    [storage],
  );

  const applySession = useCallback(
    (next: Session | null) => {
      setSession(next);
      setSessionReady(true);
      if (next === null) setActiveChildId(null);
    },
    [setActiveChildId],
  );

  useEffect(() => {
    let cancelled = false;
    // An auth event is newer than the initial lookup, so it wins if both arrive.
    let eventSeen = false;
    const unsubscribe = deps.auth.onChange((next) => {
      eventSeen = true;
      if (!cancelled) applySession(next);
    });
    if (!(initialSession !== undefined && deps === firstDeps.current)) {
      getSession(deps).then(
        (found) => {
          if (!cancelled && !eventSeen) applySession(found);
        },
        () => {
          if (!cancelled && !eventSeen) applySession(null);
        },
      );
    }
    return () => {
      cancelled = true;
      unsubscribe();
    };
    // `initialSession` only matters for the very first dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps, applySession]);

  const switchTo = useCallback(
    (next: AppMode) => {
      setPreferredMode(storage, next);
      setMode(next);
      setDeps(build(next));
      setSession(null);
      setSessionReady(false);
      setActiveChildId(null);
    },
    [build, storage, setActiveChildId],
  );
  const switchToGuest = useCallback(() => switchTo('guest'), [switchTo]);
  const switchToCloud = useCallback(() => {
    if (supabaseConfig) switchTo('cloud');
  }, [supabaseConfig, switchTo]);

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      safeSet(storage, LOCALE_KEY, next);
    },
    [storage],
  );
  const setSoundEnabled = useCallback(
    (enabled: boolean) => {
      setSoundState(enabled);
      safeSet(storage, SOUND_KEY, enabled ? null : 'off');
    },
    [storage],
  );

  const value = useMemo<AppValue>(
    () => ({
      mode,
      cloudAvailable: supabaseConfig !== null,
      switchToGuest,
      switchToCloud,
      session,
      sessionReady,
      applySession,
      activeChildId,
      setActiveChildId,
      locale,
      setLocale,
      soundEnabled,
      setSoundEnabled,
    }),
    [
      mode,
      supabaseConfig,
      switchToGuest,
      switchToCloud,
      session,
      sessionReady,
      applySession,
      activeChildId,
      setActiveChildId,
      locale,
      setLocale,
      soundEnabled,
      setSoundEnabled,
    ],
  );

  return (
    <I18nProvider locale={locale} onLocaleChange={setLocale}>
      <ErrorBoundary>
        <DepsContext.Provider value={deps}>
          <AppContext.Provider value={value}>
            <Sprite />
            {children}
          </AppContext.Provider>
        </DepsContext.Provider>
      </ErrorBoundary>
    </I18nProvider>
  );
}

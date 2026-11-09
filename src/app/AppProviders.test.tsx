import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestDeps } from '@/application/testing';
import { MemoryStorage } from '@/infrastructure/local/MemoryStorage';
import { useI18n } from '@/presentation/i18n';
import { AppProviders } from './AppProviders';
import { ErrorBoundary } from './ErrorBoundary';
import { useAppMode, useApp, useDeps } from './context';
import { ACTIVE_CHILD_KEY, LOCALE_KEY } from './storageKeys';

const ENV = { VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x' };

function Probe() {
  const app = useApp();
  const { cloudAvailable, mode, switchToCloud, switchToGuest } = useAppMode();
  const deps = useDeps();
  const { t } = useI18n();
  return (
    <div>
      <p data-testid="mode">{mode}</p>
      <p data-testid="cloud">{String(cloudAvailable)}</p>
      <p data-testid="ready">{String(app.sessionReady)}</p>
      <p data-testid="session">{app.session ? app.session.userId : 'none'}</p>
      <p data-testid="child">{app.activeChildId ?? 'none'}</p>
      <p data-testid="locale">{app.locale}</p>
      <p data-testid="sound">{String(app.soundEnabled)}</p>
      <p data-testid="name">{t('app.name')}</p>
      <p data-testid="clock">{deps.clock.today()}</p>
      <button onClick={switchToCloud}>cloud</button>
      <button onClick={switchToGuest}>guest</button>
      <button onClick={() => app.setActiveChildId('c-1')}>pick</button>
      <button onClick={() => app.setLocale('es')}>es</button>
      <button onClick={() => app.setSoundEnabled(false)}>mute</button>
      <button onClick={() => void deps.auth.signOut()}>out</button>
    </div>
  );
}

function setup(props: Partial<React.ComponentProps<typeof AppProviders>> = {}) {
  const t = createTestDeps({ today: '2026-05-10' });
  const storage = new MemoryStorage();
  const view = render(
    <AppProviders deps={t.deps} storage={storage} env={{}} {...props}>
      <Probe />
    </AppProviders>,
  );
  return { ...t, storage, ...view };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AppProviders', () => {
  it('provides the injected deps and defaults to guest mode without Supabase env', async () => {
    setup();
    expect(screen.getByTestId('clock')).toHaveTextContent('2026-05-10');
    expect(screen.getByTestId('mode')).toHaveTextContent('guest');
    expect(screen.getByTestId('cloud')).toHaveTextContent('false');
    await waitFor(() => expect(screen.getByTestId('ready')).toHaveTextContent('true'));
    expect(screen.getByTestId('session')).toHaveTextContent('none');
  });

  it('reports cloud as available when the Supabase env is configured', () => {
    setup({ env: ENV });
    expect(screen.getByTestId('cloud')).toHaveTextContent('true');
  });

  it('renders the SVG sprite exactly once', () => {
    const { container } = setup();
    expect(container.querySelectorAll('symbol#i-star')).toHaveLength(1);
  });

  it('uses the injected initial session without asking the gateway', async () => {
    const t = createTestDeps();
    const spy = vi.spyOn(t.auth, 'getSession');
    render(
      <AppProviders deps={t.deps} storage={new MemoryStorage()} env={{}} initialSession={{ userId: 'u1', email: null, guest: true }}>
        <Probe />
      </AppProviders>,
    );
    expect(screen.getByTestId('session')).toHaveTextContent('u1');
    expect(screen.getByTestId('ready')).toHaveTextContent('true');
    expect(spy).not.toHaveBeenCalled();
  });

  it('follows auth changes and clears the active child on sign out', async () => {
    const user = userEvent.setup();
    const t = setup();
    await act(async () => {
      await t.auth.continueAsGuest();
    });
    expect(screen.getByTestId('session')).toHaveTextContent('guest');
    await user.click(screen.getByText('pick'));
    expect(screen.getByTestId('child')).toHaveTextContent('c-1');
    expect(t.storage.getItem(ACTIVE_CHILD_KEY)).toBe('c-1');
    await user.click(screen.getByText('out'));
    expect(screen.getByTestId('session')).toHaveTextContent('none');
    expect(screen.getByTestId('child')).toHaveTextContent('none');
    expect(t.storage.getItem(ACTIVE_CHILD_KEY)).toBeNull();
  });

  it('unsubscribes from auth changes on unmount', () => {
    const t = createTestDeps();
    const off = vi.fn();
    vi.spyOn(t.auth, 'onChange').mockReturnValue(off);
    const { unmount } = render(
      <AppProviders deps={t.deps} storage={new MemoryStorage()} env={{}}>
        <Probe />
      </AppProviders>,
    );
    unmount();
    expect(off).toHaveBeenCalled();
  });

  it('survives StrictMode double mounting with a single live subscription', async () => {
    const t = createTestDeps();
    const spy = vi.spyOn(t.auth, 'onChange');
    const offs: ReturnType<typeof vi.fn>[] = [];
    spy.mockImplementation(() => {
      const off = vi.fn();
      offs.push(off);
      return off;
    });
    render(
      <StrictMode>
        <AppProviders deps={t.deps} storage={new MemoryStorage()} env={{}}>
          <Probe />
        </AppProviders>
      </StrictMode>,
    );
    await waitFor(() => expect(screen.getByTestId('ready')).toHaveTextContent('true'));
    const live = offs.filter((off) => off.mock.calls.length === 0);
    expect(live).toHaveLength(1);
  });

  it('restores the active child from storage', () => {
    const t = createTestDeps();
    render(
      <AppProviders deps={t.deps} storage={new MemoryStorage({ [ACTIVE_CHILD_KEY]: 'c-9' })} env={{}}>
        <Probe />
      </AppProviders>,
    );
    expect(screen.getByTestId('child')).toHaveTextContent('c-9');
  });

  it('switches mode, persists the choice and resets the session and active child', async () => {
    const user = userEvent.setup();
    const t = setup({ env: ENV });
    await act(async () => {
      await t.auth.continueAsGuest();
    });
    await user.click(screen.getByText('pick'));
    await user.click(screen.getByText('cloud'));
    expect(screen.getByTestId('mode')).toHaveTextContent('cloud');
    expect(t.storage.getItem('pip.v2.mode')).toBeNull();
    expect(screen.getByTestId('child')).toHaveTextContent('none');
    await user.click(screen.getByText('guest'));
    expect(screen.getByTestId('mode')).toHaveTextContent('guest');
    expect(t.storage.getItem('pip.v2.mode')).toBe('guest');
  });

  describe('locale and sound', () => {
    it('defaults the locale from the browser language', () => {
      vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('es-MX');
      setup();
      expect(screen.getByTestId('locale')).toHaveTextContent('es');
      expect(screen.getByTestId('name')).toHaveTextContent("La Isla Matemática de Pip");
      expect(document.documentElement.lang).toBe('es');
    });

    it('falls back to English and prefers the stored locale', () => {
      vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('fr-FR');
      render(
        <AppProviders deps={createTestDeps().deps} storage={new MemoryStorage({ [LOCALE_KEY]: 'es' })} env={{}}>
          <Probe />
        </AppProviders>,
      );
      expect(screen.getByTestId('locale')).toHaveTextContent('es');
    });

    it('persists locale and sound changes', async () => {
      vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('en-US');
      const user = userEvent.setup();
      const t = setup();
      await user.click(screen.getByText('es'));
      expect(t.storage.getItem(LOCALE_KEY)).toBe('es');
      await user.click(screen.getByText('mute'));
      expect(screen.getByTestId('sound')).toHaveTextContent('false');
    });
  });
});

describe('ErrorBoundary', () => {
  function Boom(): never {
    throw new Error('kaboom');
  }

  it('shows a friendly localized message with a reload button', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const user = userEvent.setup();
    const onReload = vi.fn();
    render(
      <ErrorBoundary onReload={onReload}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.queryByText('kaboom')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reload the page' }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });
});

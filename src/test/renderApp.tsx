import { render } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '@/app/router';
import { AppProviders } from '@/app/AppProviders';
import type { AppMode } from '@/app/container';
import type { Session } from '@/application/model';
import type { Deps } from '@/application/ports';
import { createTestDeps } from '@/application/testing';
import type { KeyValueStorage } from '@/infrastructure/local/KeyValueStorage';
import { MemoryStorage } from '@/infrastructure/local/MemoryStorage';

export const CLOUD_ENV = { VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x' };

export const GUEST_SESSION: Session = { userId: 'guest', email: null, guest: true };

interface RenderAppOptions {
  route?: string;
  deps?: Deps;
  storage?: KeyValueStorage;
  session?: Session | null;
  env?: Record<string, unknown>;
  mode?: AppMode;
  strict?: boolean;
  testDeps?: ReturnType<typeof createTestDeps>;
}

/** Renders the whole app (providers + routes) on an in-memory router with fake adapters. */
export function renderApp(options: RenderAppOptions = {}) {
  const t = options.testDeps ?? createTestDeps({ today: '2026-05-10' });
  const storage = options.storage ?? new MemoryStorage();
  const tree = (
    <AppProviders
      deps={options.deps ?? t.deps}
      storage={storage}
      env={options.env ?? {}}
      mode={options.mode}
      initialSession={options.session}
    >
      <MemoryRouter initialEntries={[options.route ?? '/']}>
        <AppRoutes />
      </MemoryRouter>
    </AppProviders>
  );
  const view = render(options.strict ? <StrictMode>{tree}</StrictMode> : tree);
  return { ...t, storage, ...view };
}

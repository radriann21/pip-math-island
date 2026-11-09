import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppProviders } from '@/app/AppProviders';
import { createTestDeps } from '@/application/testing';
import { AuthContainer } from './AuthContainer';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

function setup(guestAvailable?: boolean) {
  return render(
    <AppProviders deps={createTestDeps().deps} storage={memoryStorage()} env={{}}>
      <AuthContainer guestAvailable={guestAvailable} />
    </AppProviders>,
  );
}

describe('AuthContainer', () => {
  it('shows the guest button by default', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Play as guest' })).toBeInTheDocument();
  });

  it('hides the guest button when guests are not allowed', () => {
    setup(false);
    expect(screen.queryByRole('button', { name: 'Play as guest' })).not.toBeInTheDocument();
  });
});

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AuthError } from '@/application/errors';
import { createTestDeps } from '@/application/testing';
import { MemoryStorage } from '@/infrastructure/local/MemoryStorage';
import { CLOUD_ENV, GUEST_SESSION, renderApp } from '@/test/renderApp';
import { ACTIVE_CHILD_KEY, LOCALE_KEY } from './storageKeys';

const heading = (name: string | RegExp) => screen.findByRole('heading', { name });

describe('route guards', () => {
  it('sends a visitor without a session to the login page', async () => {
    renderApp({ route: '/' });
    expect(await heading('Welcome back')).toBeInTheDocument();
  });

  it('sends a session without an active child to the child picker', async () => {
    renderApp({ route: '/', session: GUEST_SESSION });
    expect(await heading('Who is playing?')).toBeInTheDocument();
  });

  it('protects the child list behind the session too', async () => {
    renderApp({ route: '/children' });
    expect(await heading('Welcome back')).toBeInTheDocument();
  });

  it('keeps signed-in users away from the login page', async () => {
    renderApp({ route: '/login', session: GUEST_SESSION });
    expect(await heading('Who is playing?')).toBeInTheDocument();
  });

  it('redirects unknown paths to the start', async () => {
    renderApp({ route: '/nope', session: GUEST_SESSION });
    expect(await heading('Who is playing?')).toBeInTheDocument();
  });
});

describe('page chrome', () => {
  it('sets the document title and moves focus to the page heading', async () => {
    renderApp({ route: '/children', session: GUEST_SESSION });
    const h = await heading('Who is playing?');
    expect(document.title).toBe("Who is playing? · Pip's Math Island");
    await waitFor(() => expect(h).toHaveFocus());
  });
});

describe('guest flow', () => {
  it('continues as guest, creates a child and lists the profile', async () => {
    const user = userEvent.setup();
    const t = renderApp({ route: '/' });
    await heading('Welcome back');
    await user.click(screen.getByRole('button', { name: 'Play as guest' }));
    await heading('Who is playing?');
    expect(screen.getByText(/No profiles yet/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add child' }));
    await heading('New child');
    await user.type(screen.getByLabelText('Name or nickname'), 'Ana');
    await user.click(screen.getByRole('button', { name: '3' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('button', { name: 'Play as Ana' })).toBeInTheDocument();
    expect(screen.getByText('Grade 3')).toBeInTheDocument();
    expect((await t.children.list()).map((c) => [c.name, c.grade])).toEqual([['Ana', 3]]);
  });

  it('shows a validation problem instead of saving an empty name', async () => {
    const user = userEvent.setup();
    renderApp({ route: '/children/new', session: GUEST_SESSION });
    await heading('New child');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Enter a name.')).toBeInTheDocument();
  });

  it('edits an existing child and goes back to the list', async () => {
    const user = userEvent.setup();
    const t = createTestDeps();
    const child = await t.children.create({ name: 'Ana', grade: 2, locale: 'en', soundEnabled: true });
    renderApp({ testDeps: t, route: `/children/${child.id}/edit`, session: GUEST_SESSION });
    await heading('Edit child');
    const name = screen.getByLabelText('Name or nickname');
    expect(name).toHaveValue('Ana');
    await user.clear(name);
    await user.type(name, 'Bea');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('button', { name: 'Play as Bea' })).toBeInTheDocument();
  });

  it('asks for confirmation before deleting a child and forgets it if it was active', async () => {
    const user = userEvent.setup();
    const t = createTestDeps();
    const child = await t.children.create({ name: 'Ana', grade: 2, locale: 'en', soundEnabled: true });
    const storage = new MemoryStorage({ [ACTIVE_CHILD_KEY]: child.id });
    renderApp({ testDeps: t, storage, route: '/children', session: GUEST_SESSION });
    await screen.findByRole('button', { name: 'Play as Ana' });

    await user.click(screen.getByRole('button', { name: 'Delete Ana' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Delete Ana?');
    await user.click(screen.getByRole('button', { name: 'Keep' }));
    expect(await t.children.list()).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Delete Ana' }));
    await user.click(screen.getByRole('button', { name: 'Yes, delete' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Play as Ana' })).not.toBeInTheDocument());
    expect(await t.children.list()).toEqual([]);
    expect(storage.getItem(ACTIVE_CHILD_KEY)).toBeNull();
  });

  it('shows a retry when the list cannot load', async () => {
    const user = userEvent.setup();
    const t = createTestDeps();
    const original = t.children.list.bind(t.children);
    let calls = 0;
    t.children.list = async () => {
      if (++calls === 1) throw new Error('offline');
      return original();
    };
    renderApp({ testDeps: t, route: '/children', session: GUEST_SESSION });
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await heading('Who is playing?')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('language toggle', () => {
  it('switches the interface language and remembers it', async () => {
    const user = userEvent.setup();
    const t = renderApp({ route: '/login' });
    await heading('Welcome back');
    await user.click(screen.getByRole('button', { name: 'Language' }));
    expect(await heading('Te damos la bienvenida')).toBeInTheDocument();
    expect(t.storage.getItem(LOCALE_KEY)).toBe('es');
    expect(document.documentElement.lang).toBe('es');
  });
});

describe('login page', () => {
  it('tells the parent to confirm their email after sign up', async () => {
    const user = userEvent.setup();
    renderApp({
      testDeps: createTestDeps({ requireEmailConfirmation: true }),
      mode: 'cloud',
      env: CLOUD_ENV,
      route: '/login',
    });
    await heading('Welcome back');
    await user.click(screen.getByRole('button', { name: 'New here? Create an account' }));
    await user.type(screen.getByLabelText('Email'), 'mum@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret12');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    const notice = await screen.findByRole('status');
    expect(notice).toHaveTextContent('Check your email');
    expect(notice).toHaveTextContent('mum@example.com');
  });

  it('signs in and lands on the child picker', async () => {
    const user = userEvent.setup();
    const t = createTestDeps();
    await t.auth.signUp('mum@example.com', 'secret12');
    await t.auth.signOut();
    renderApp({ testDeps: t, mode: 'cloud', env: CLOUD_ENV, route: '/login' });
    await heading('Welcome back');
    await user.type(screen.getByLabelText('Email'), 'mum@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret12');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await heading('Who is playing?')).toBeInTheDocument();
  });

  it.each([
    ['invalid_credentials', 'That email and password do not match.'],
    ['email_not_confirmed', 'Please confirm your email first. Check your inbox.'],
    ['email_taken', 'An account with this email already exists. Try signing in.'],
    ['rate_limited', 'Too many tries. Please wait a moment and try again.'],
    ['auth_failed', "We couldn't sign you in. Please try again."],
  ])('shows a friendly message for the %s code', async (code, message) => {
    const user = userEvent.setup();
    const t = createTestDeps();
    t.auth.signIn = async () => {
      throw new AuthError(code);
    };
    renderApp({ testDeps: t, mode: 'cloud', env: CLOUD_ENV, route: '/login' });
    await heading('Welcome back');
    await user.type(screen.getByLabelText('Email'), 'mum@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret12');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByText(code)).not.toBeInTheDocument();
  });

  it('offers to use an account only when a cloud is configured and the app is in guest mode', async () => {
    const user = userEvent.setup();
    const first = renderApp({ route: '/login', mode: 'guest', env: {} });
    await heading('Welcome back');
    expect(screen.queryByRole('button', { name: 'Use my account' })).not.toBeInTheDocument();
    first.unmount();

    renderApp({ route: '/login', mode: 'guest', env: CLOUD_ENV });
    await user.click(await screen.findByRole('button', { name: 'Use my account' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Use my account' })).not.toBeInTheDocument());
  });
});

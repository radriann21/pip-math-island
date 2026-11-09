import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import {
  AuthForm,
  CHILD_NAME_MAX,
  ChildForm,
  ChildPicker,
  PASSWORD_MIN,
  ParentGate,
  ParentReportView,
  checkGateAnswer,
  makeGateChallenge,
  validateChildName,
  validateCredentials,
} from '.';
import type { ParentReportViewProps } from '.';

describe('validateCredentials', () => {
  it('requires a valid email', () => {
    expect(validateCredentials('signIn', { email: '', password: 'secret1' }).email).toBe('auth.error.emailRequired');
    expect(validateCredentials('signIn', { email: 'nope', password: 'secret1' }).email).toBe('auth.error.emailInvalid');
    expect(validateCredentials('signIn', { email: ' a@b.co ', password: 'secret1' })).toEqual({});
  });

  it('requires a password and enforces the minimum length only when signing up', () => {
    expect(validateCredentials('signIn', { email: 'a@b.co', password: '' }).password).toBe('auth.error.passwordRequired');
    expect(validateCredentials('signIn', { email: 'a@b.co', password: '123' })).toEqual({});
    expect(validateCredentials('signUp', { email: 'a@b.co', password: '1'.repeat(PASSWORD_MIN - 1) }).password).toBe(
      'auth.error.passwordShort',
    );
  });
});

describe('AuthForm', () => {
  function setup(overrides: Partial<React.ComponentProps<typeof AuthForm>> = {}) {
    const handlers = { onSubmit: vi.fn(), onModeChange: vi.fn(), onGuest: vi.fn() };
    render(<AuthForm mode="signIn" guestAvailable={false} {...handlers} {...overrides} />);
    return handlers;
  }

  it('labels its fields for assistive technology', () => {
    setup();
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password');
  });

  it('submits trimmed credentials from the sign-in form', async () => {
    const h = setup();
    await userEvent.type(screen.getByLabelText('Email'), ' mum@example.com ');
    await userEvent.type(screen.getByLabelText('Password'), 'secret1');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(h.onSubmit).toHaveBeenCalledWith({ email: 'mum@example.com', password: 'secret1' });
  });

  it('submits with Enter', async () => {
    const h = setup();
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.co');
    await userEvent.type(screen.getByLabelText('Password'), 'secret1{Enter}');
    expect(h.onSubmit).toHaveBeenCalledOnce();
  });

  it('blocks submission and explains empty fields', async () => {
    const h = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(h.onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Enter your email.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('rejects a malformed email', async () => {
    const h = setup();
    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email');
    await userEvent.type(screen.getByLabelText('Password'), 'secret1');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(h.onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
  });

  it('sign-up mode asks for a longer password and uses new-password autocomplete', async () => {
    const h = setup({ mode: 'signUp' });
    expect(screen.getByRole('heading', { name: 'Create a parent account' })).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByText(`At least ${PASSWORD_MIN} characters.`)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.co');
    await userEvent.type(screen.getByLabelText('Password'), '123');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(h.onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(`Use at least ${PASSWORD_MIN} characters.`)).toBeInTheDocument();
  });

  it('switches between sign in and sign up', async () => {
    const h = setup();
    await userEvent.click(screen.getByRole('button', { name: 'New here? Create an account' }));
    expect(h.onModeChange).toHaveBeenCalledWith('signUp');
  });

  it('offers the way back from sign up', async () => {
    const h = setup({ mode: 'signUp' });
    await userEvent.click(screen.getByRole('button', { name: 'Already have an account? Sign in' }));
    expect(h.onModeChange).toHaveBeenCalledWith('signIn');
  });

  it('shows the guest button only when guest mode is available', async () => {
    const { unmount } = render(
      <AuthForm mode="signIn" guestAvailable={false} onSubmit={() => undefined} onModeChange={() => undefined} onGuest={() => undefined} />,
    );
    expect(screen.queryByRole('button', { name: 'Play as guest' })).toBeNull();
    unmount();

    const onGuest = vi.fn();
    render(<AuthForm mode="signIn" guestAvailable onSubmit={() => undefined} onModeChange={() => undefined} onGuest={onGuest} />);
    await userEvent.click(screen.getByRole('button', { name: 'Play as guest' }));
    expect(onGuest).toHaveBeenCalledOnce();
  });

  it('shows a server error as an alert', () => {
    setup({ error: 'Invalid login credentials' });
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid login credentials');
  });

  it('disables submitting while loading and says so', () => {
    setup({ loading: true });
    const button = screen.getByRole('button', { name: 'Please wait…' });
    expect(button).toBeDisabled();
  });

  it('does not submit twice while loading', async () => {
    const h = setup({ loading: true });
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.co');
    await userEvent.type(screen.getByLabelText('Password'), 'secret1{Enter}');
    expect(h.onSubmit).not.toHaveBeenCalled();
  });

  it('tells the parent to confirm their email', () => {
    setup({ mode: 'signIn', confirmEmailFor: 'mum@example.com' });
    const notice = screen.getByRole('status');
    expect(notice).toHaveTextContent('Check your email');
    expect(notice).toHaveTextContent('We sent a confirmation link to mum@example.com.');
  });

  it('is translated', () => {
    render(
      <I18nProvider initialLocale="es">
        <AuthForm mode="signIn" guestAvailable onSubmit={() => undefined} onModeChange={() => undefined} onGuest={() => undefined} />
      </I18nProvider>,
    );
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jugar como invitado' })).toBeInTheDocument();
  });
});

describe('ChildPicker', () => {
  const profiles = [
    { id: 'c1', name: 'Lia', grade: 2 as const },
    { id: 'c2', name: 'Max', grade: 5 as const },
  ];

  function setup(list = profiles) {
    const h = { onSelect: vi.fn(), onAdd: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn() };
    render(<ChildPicker profiles={list} {...h} />);
    return h;
  }

  it('lists the profiles and picks one to play', async () => {
    const h = setup();
    expect(screen.getByText('Grade 5')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Play as Max' }));
    expect(h.onSelect).toHaveBeenCalledWith('c2');
  });

  it('adds and edits children', async () => {
    const h = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Add child' }));
    await userEvent.click(screen.getByRole('button', { name: 'Edit Lia' }));
    expect(h.onAdd).toHaveBeenCalledOnce();
    expect(h.onEdit).toHaveBeenCalledWith('c1');
  });

  it('asks for confirmation before deleting', async () => {
    const h = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Delete Lia' }));
    expect(h.onDelete).not.toHaveBeenCalled();
    expect(screen.getByText('Delete Lia? All progress will be erased.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Yes, delete' }));
    expect(h.onDelete).toHaveBeenCalledWith('c1');
  });

  it('lets the parent back out of a deletion', async () => {
    const h = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Delete Lia' }));
    await userEvent.click(screen.getByRole('button', { name: 'Keep' }));
    expect(h.onDelete).not.toHaveBeenCalled();
    expect(screen.queryByText(/All progress will be erased/)).toBeNull();
  });

  it('invites the parent to add the first child when there are none', () => {
    setup([]);
    expect(screen.getByText('No profiles yet. Add your first child to start playing.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add child' })).toBeInTheDocument();
  });
});

describe('validateChildName', () => {
  it('accepts 1..24 characters after trimming', () => {
    expect(validateChildName('A')).toBeNull();
    expect(validateChildName('a'.repeat(CHILD_NAME_MAX))).toBeNull();
    expect(validateChildName('  Lia  ')).toBeNull();
  });

  it('rejects empty, blank and over-long names', () => {
    expect(validateChildName('')).toBe('child.error.nameRequired');
    expect(validateChildName('   ')).toBe('child.error.nameRequired');
    expect(validateChildName('a'.repeat(CHILD_NAME_MAX + 1))).toBe('child.error.nameTooLong');
  });

  it('counts characters, not UTF-16 units', () => {
    expect(validateChildName('😀'.repeat(CHILD_NAME_MAX))).toBeNull();
  });
});

describe('ChildForm', () => {
  function setup(overrides: Partial<React.ComponentProps<typeof ChildForm>> = {}) {
    const h = { onSubmit: vi.fn(), onCancel: vi.fn() };
    render(<ChildForm mode="create" {...h} {...overrides} />);
    return h;
  }

  it('submits a trimmed name with the chosen grade and language', async () => {
    const h = setup();
    await userEvent.type(screen.getByLabelText('Name or nickname'), '  Lia ');
    await userEvent.click(screen.getByRole('button', { name: '4' }));
    await userEvent.click(screen.getByRole('button', { name: 'Español' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(h.onSubmit).toHaveBeenCalledWith({ name: 'Lia', grade: 4, locale: 'es' });
  });

  it('rejects an empty name', async () => {
    const h = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(h.onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Enter a name.')).toBeInTheDocument();
    expect(screen.getByLabelText('Name or nickname')).toHaveAttribute('aria-invalid', 'true');
  });

  it('rejects a 25 character name', async () => {
    const h = setup();
    await userEvent.type(screen.getByLabelText('Name or nickname'), 'a'.repeat(CHILD_NAME_MAX + 1));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(h.onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(`Use at most ${CHILD_NAME_MAX} characters.`)).toBeInTheDocument();
  });

  it('accepts a 24 character name', async () => {
    const h = setup();
    await userEvent.type(screen.getByLabelText('Name or nickname'), 'a'.repeat(CHILD_NAME_MAX));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(h.onSubmit).toHaveBeenCalledOnce();
  });

  it('starts from the current values when editing', async () => {
    const h = setup({ mode: 'edit', initial: { name: 'Max', grade: 5, locale: 'es' } });
    expect(screen.getByRole('heading', { name: 'Edit child' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name or nickname')).toHaveValue('Max');
    expect(screen.getByRole('button', { name: '5' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Español' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(h.onSubmit).toHaveBeenCalledWith({ name: 'Max', grade: 5, locale: 'es' });
  });

  it('defaults the language to the active interface language', async () => {
    const onSubmit = vi.fn();
    render(
      <I18nProvider initialLocale="es">
        <ChildForm mode="create" onSubmit={onSubmit} onCancel={() => undefined} />
      </I18nProvider>,
    );
    await userEvent.type(screen.getByLabelText('Nombre o apodo'), 'Ana');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Ana', grade: 1, locale: 'es' });
  });

  it('cancels', async () => {
    const h = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(h.onCancel).toHaveBeenCalledOnce();
  });

  it('shows a server error and disables saving while submitting', () => {
    setup({ error: 'Could not save', submitting: true });
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save');
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  });
});

describe('parent gate challenge', () => {
  it('creates a multiplication question whose answer checks out', () => {
    const challenge = makeGateChallenge(() => 0.5);
    expect(challenge.question).toMatch(/^\d+ × \d+$/);
    const [a, b] = challenge.question.split(' × ').map(Number) as [number, number];
    expect(challenge.answer).toBe(a * b);
    expect(a).toBeGreaterThanOrEqual(6);
    expect(b).toBeGreaterThanOrEqual(6);
  });

  it('accepts only the right answer', () => {
    const challenge = { question: '7 × 8', answer: 56 };
    expect(checkGateAnswer(challenge, '56')).toBe(true);
    expect(checkGateAnswer(challenge, ' 56 ')).toBe(true);
    expect(checkGateAnswer(challenge, '54')).toBe(false);
    expect(checkGateAnswer(challenge, '')).toBe(false);
    expect(checkGateAnswer(challenge, '56abc')).toBe(false);
  });
});

describe('ParentGate', () => {
  it('asks the question and hands back what was typed', async () => {
    const onSubmit = vi.fn();
    render(<ParentGate question="7 × 8" onSubmit={onSubmit} onCancel={() => undefined} />);
    expect(screen.getByText('What is 7 × 8?')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Your answer'), '56');
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(onSubmit).toHaveBeenCalledWith('56');
  });

  it('submits with Enter', async () => {
    const onSubmit = vi.fn();
    render(<ParentGate question="7 × 8" onSubmit={onSubmit} onCancel={() => undefined} />);
    await userEvent.type(screen.getByLabelText('Your answer'), '12{Enter}');
    expect(onSubmit).toHaveBeenCalledWith('12');
  });

  it('does not submit an empty answer', async () => {
    const onSubmit = vi.fn();
    render(<ParentGate question="7 × 8" onSubmit={onSubmit} onCancel={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Open' })).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Your answer'), '{Enter}');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the error after a wrong answer', () => {
    render(<ParentGate question="7 × 8" error onSubmit={() => undefined} onCancel={() => undefined} />);
    expect(screen.getByRole('alert')).toHaveTextContent("That's not right. Try again.");
    expect(screen.getByLabelText('Your answer')).toHaveAttribute('aria-invalid', 'true');
  });

  it('can be cancelled', async () => {
    const onCancel = vi.fn();
    render(<ParentGate question="7 × 8" onSubmit={() => undefined} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});

describe('ParentReportView', () => {
  const baseProps: ParentReportViewProps = {
    childName: 'Lia',
    grade: 3,
    totals: { level: 4, xp: 1234, rounds: 20, stars: 18, accuracyPct: 82 },
    rows: [
      { topicId: 'add', title: 'Addition', answered: 40, accuracyPct: 75, stars: 2, tier: 1 },
      { topicId: 'mul', title: 'Multiplication', answered: 0, accuracyPct: null, stars: 0, tier: 0 },
    ],
    weakTopics: [{ title: 'Addition', accuracyPct: 75 }],
    storage: 'cloud',
    resetStage: 'idle',
    onEditChild: () => undefined,
    onRequestReset: () => undefined,
    onConfirmReset: () => undefined,
    onCancelReset: () => undefined,
  };

  it('explains the progress for the child and grade', () => {
    render(<ParentReportView {...baseProps} />);
    expect(screen.getByText(/Progress for Lia, grade 3\./)).toBeInTheDocument();
  });

  it('shows a row per topic with questions, accuracy, stars and difficulty', () => {
    render(<ParentReportView {...baseProps} />);
    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(3);
    const add = within(rows[1]!);
    expect(add.getByText('Addition')).toBeInTheDocument();
    expect(add.getByText('40')).toBeInTheDocument();
    expect(add.getByText('75%')).toBeInTheDocument();
    expect(add.getByRole('img', { name: '2 of 3 stars' })).toBeInTheDocument();
    expect(add.getByText('2/3')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('—')).toBeInTheDocument();
    expect(within(table).getAllByRole('columnheader')).toHaveLength(5);
  });

  it('summarises totals', () => {
    render(<ParentReportView {...baseProps} />);
    expect(screen.getByText('82%')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('lists weak topics, or says there are none', () => {
    const { rerender } = render(<ParentReportView {...baseProps} />);
    expect(screen.getByText('Addition: 75% correct')).toBeInTheDocument();
    rerender(<ParentReportView {...baseProps} weakTopics={[]} />);
    expect(screen.getByText('No weak spots yet. Keep playing to see where to help.')).toBeInTheDocument();
  });

  it('says where progress is stored', () => {
    const { rerender } = render(<ParentReportView {...baseProps} storage="cloud" />);
    expect(screen.getByText(/saved to your account/)).toBeInTheDocument();
    rerender(<ParentReportView {...baseProps} storage="local" />);
    expect(screen.getByText(/saved only in this browser/)).toBeInTheDocument();
  });

  it('offers to edit the child and, when allowed, to switch child', async () => {
    const onEditChild = vi.fn();
    const onSwitchChild = vi.fn();
    const { rerender } = render(<ParentReportView {...baseProps} onEditChild={onEditChild} />);
    expect(screen.queryByRole('button', { name: 'Switch child' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Change name, grade or language' }));
    expect(onEditChild).toHaveBeenCalledOnce();
    rerender(<ParentReportView {...baseProps} onSwitchChild={onSwitchChild} />);
    await userEvent.click(screen.getByRole('button', { name: 'Switch child' }));
    expect(onSwitchChild).toHaveBeenCalledOnce();
  });

  it('needs two steps to reset: request, then confirm', async () => {
    const onRequestReset = vi.fn();
    const onConfirmReset = vi.fn();
    const onCancelReset = vi.fn();
    const { rerender } = render(
      <ParentReportView {...baseProps} onRequestReset={onRequestReset} onConfirmReset={onConfirmReset} onCancelReset={onCancelReset} />,
    );
    expect(screen.queryByRole('button', { name: 'Yes, erase everything' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Reset all progress' }));
    expect(onRequestReset).toHaveBeenCalledOnce();
    expect(onConfirmReset).not.toHaveBeenCalled();

    rerender(
      <ParentReportView
        {...baseProps}
        resetStage="confirm"
        onRequestReset={onRequestReset}
        onConfirmReset={onConfirmReset}
        onCancelReset={onCancelReset}
      />,
    );
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Erase all progress for Lia?');
    expect(screen.queryByRole('button', { name: 'Reset all progress' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Keep progress' }));
    expect(onCancelReset).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: 'Yes, erase everything' }));
    expect(onConfirmReset).toHaveBeenCalledOnce();
  });
});

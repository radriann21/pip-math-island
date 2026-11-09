import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button, TextField } from '../atoms';
import { useI18n } from '../i18n';
import type { MessageKey } from '../i18n';

export type AuthMode = 'signIn' | 'signUp';

export interface Credentials {
  email: string;
  password: string;
}

export interface CredentialErrors {
  email?: MessageKey;
  password?: MessageKey;
}

/** Minimum password length for new accounts (matches the Supabase default). */
export const PASSWORD_MIN = 6;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Client-side checks only; the server stays the authority. The email is judged after trimming. */
export function validateCredentials(mode: AuthMode, { email, password }: Credentials): CredentialErrors {
  const errors: CredentialErrors = {};
  const trimmed = email.trim();
  if (trimmed === '') errors.email = 'auth.error.emailRequired';
  else if (!EMAIL_PATTERN.test(trimmed)) errors.email = 'auth.error.emailInvalid';
  if (password === '') errors.password = 'auth.error.passwordRequired';
  else if (mode === 'signUp' && password.length < PASSWORD_MIN) errors.password = 'auth.error.passwordShort';
  return errors;
}

interface AuthFormProps {
  mode: AuthMode;
  onModeChange(mode: AuthMode): void;
  onSubmit(credentials: Credentials): void;
  loading?: boolean;
  /** Already-translated error from the owner (e.g. wrong password). */
  error?: string;
  /** Set to the address a confirmation link was sent to, to show the "check your email" notice. */
  confirmEmailFor?: string;
  /** Show the "play as guest" button. */
  guestAvailable: boolean;
  onGuest(): void;
}

export function AuthForm({ mode, onModeChange, onSubmit, loading = false, error, confirmEmailFor, guestAvailable, onGuest }: AuthFormProps) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<CredentialErrors>({});
  const isSignUp = mode === 'signUp';

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const found = validateCredentials(mode, { email, password });
    setErrors(found);
    if (found.email || found.password) return;
    onSubmit({ email: email.trim(), password });
  };

  return (
    <div className="pip-auth">
      <h1>{isSignUp ? t('auth.title.signUp') : t('auth.title.signIn')}</h1>
      <p className="pip-auth__intro">{t('auth.intro')}</p>

      {confirmEmailFor && (
        <div className="pip-notice" role="status">
          <strong>{t('auth.confirmEmail.title')}</strong>
          <p>{t('auth.confirmEmail.body', { email: confirmEmailFor })}</p>
        </div>
      )}

      <form className="pip-auth__form" onSubmit={handleSubmit} noValidate>
        <TextField
          id="auth-email"
          label={t('auth.email')}
          type="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email ? t(errors.email) : undefined}
        />
        <TextField
          id="auth-password"
          label={t('auth.password')}
          type="password"
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint={isSignUp ? t('auth.passwordHint', { min: PASSWORD_MIN }) : undefined}
          error={errors.password ? t(errors.password, { min: PASSWORD_MIN }) : undefined}
        />
        {error && (
          <p className="pip-field__error" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" size="big" disabled={loading}>
          {loading ? t('auth.submitting') : isSignUp ? t('auth.signUp') : t('auth.signIn')}
        </Button>
      </form>

      <Button variant="alt" size="sm" onClick={() => onModeChange(isSignUp ? 'signIn' : 'signUp')}>
        {isSignUp ? t('auth.switchToSignIn') : t('auth.switchToSignUp')}
      </Button>

      {guestAvailable && (
        <div className="pip-auth__guest">
          <Button variant="alt" onClick={onGuest}>
            {t('auth.guest')}
          </Button>
          <small>{t('auth.guestNote')}</small>
        </div>
      )}
    </div>
  );
}

import type { InputHTMLAttributes } from 'react';

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string;
  label: string;
  hint?: string;
  error?: string;
}

/** Labelled input. The error (role=alert) wins over the hint as the accessible description. */
export function TextField({ id, label, hint, error, className, ...rest }: TextFieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;
  return (
    <div className="pip-field">
      <label className="pip-field__label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={['pip-field__input', className].filter(Boolean).join(' ')}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
      {hint && !error && (
        <p id={hintId} className="pip-field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="pip-field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

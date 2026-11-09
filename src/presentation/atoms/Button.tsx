import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'alt';
  size?: 'sm' | 'big';
}

/** Chunky tactile button. Always a real <button>; `type` defaults to "button" so it never submits by accident. */
export function Button({ variant = 'primary', size, className, type = 'button', ...rest }: ButtonProps) {
  const classes = ['pip-btn', variant === 'alt' && 'pip-btn--alt', size && `pip-btn--${size}`, className]
    .filter(Boolean)
    .join(' ');
  return <button type={type} className={classes} {...rest} />;
}

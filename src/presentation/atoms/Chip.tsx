import type { ReactNode } from 'react';

interface ChipProps {
  children: ReactNode;
  /** Makes the chip a toggle button and sets aria-pressed. */
  pressed?: boolean;
  /** Makes the chip a button. Without it (and without `pressed`) the chip is plain information. */
  onClick?: () => void;
  tone?: 'good' | 'violet';
  className?: string;
  'aria-label'?: string;
}

export function Chip({ children, pressed, onClick, tone, className, 'aria-label': ariaLabel }: ChipProps) {
  const classes = ['pip-chip', tone && `pip-chip--${tone}`, className].filter(Boolean).join(' ');
  if (onClick || pressed !== undefined) {
    return (
      <button type="button" className={classes} aria-pressed={pressed} aria-label={ariaLabel} onClick={onClick}>
        {children}
      </button>
    );
  }
  return (
    <span className={classes} aria-label={ariaLabel}>
      {children}
    </span>
  );
}

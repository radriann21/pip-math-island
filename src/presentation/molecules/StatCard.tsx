import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  children: ReactNode;
  /** Extra content under the value, e.g. a Meter. */
  footer?: ReactNode;
}

export function StatCard({ label, children, footer }: StatCardProps) {
  return (
    <div className="pip-stat">
      <small>{label}</small>
      <b>{children}</b>
      {footer}
    </div>
  );
}

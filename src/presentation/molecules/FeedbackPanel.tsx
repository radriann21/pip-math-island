import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Button } from '../atoms';

interface FeedbackPanelProps {
  kind: 'good' | 'bad' | 'tip';
  title: ReactNode;
  children?: ReactNode;
  /** When set, a Next button is shown and receives focus so Enter continues. */
  onNext?: () => void;
  nextLabel?: string;
}

export function FeedbackPanel({ kind, title, children, onNext, nextLabel }: FeedbackPanelProps) {
  const nextRef = useRef<HTMLButtonElement>(null);
  const hasNext = onNext !== undefined;

  useEffect(() => {
    if (hasNext) nextRef.current?.focus();
  }, [hasNext]);

  return (
    <div className={`pip-fb pip-fb--${kind}`}>
      <strong className="pip-fb__title">{title}</strong>
      {children}
      {onNext && (
        <Button ref={nextRef} onClick={onNext}>
          {nextLabel}
        </Button>
      )}
    </div>
  );
}

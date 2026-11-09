import type { ReactNode } from 'react';

interface SpeechBubbleProps {
  children: ReactNode;
  /** Smaller bubble used next to Pip on the quiz screen. */
  compact?: boolean;
}

export function SpeechBubble({ children, compact = false }: SpeechBubbleProps) {
  return <div className={compact ? 'pip-bubble pip-bubble--compact' : 'pip-bubble'}>{children}</div>;
}

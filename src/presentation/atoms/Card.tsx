import { createElement } from 'react';
import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: 'div' | 'section' | 'article';
}

export function Card({ as = 'div', className, ...rest }: CardProps) {
  return createElement(as, { ...rest, className: ['pip-card', className].filter(Boolean).join(' ') });
}

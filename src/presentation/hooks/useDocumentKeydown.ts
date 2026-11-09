import { useEffect, useRef } from 'react';

/** True when the event comes from a text field, where shortcuts must not hijack typing. */
export function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
}

/** True when a modifier is held, so browser/OS shortcuts keep working. */
export function hasModifier(e: KeyboardEvent): boolean {
  return e.ctrlKey || e.metaKey || e.altKey;
}

/** Subscribes to document keydown once; the handler may change every render without resubscribing. */
export function useDocumentKeydown(handler: (e: KeyboardEvent) => void): void {
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });
  useEffect(() => {
    const listener = (e: KeyboardEvent) => latest.current(e);
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, []);
}

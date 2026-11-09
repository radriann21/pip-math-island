import { useCallback, useEffect, useRef, useState } from 'react';
import type { ToastMessage } from '../molecules';

const TOAST_MS = 3200;

/** Short-lived messages. Render `messages` with `<ToastStack>`. */
export function useToasts(): { messages: ToastMessage[]; push(text: string): void } {
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const counter = useRef(0);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  const push = useCallback((text: string) => {
    const id = `toast-${++counter.current}`;
    setMessages((current) => [...current, { id, text }]);
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      setMessages((current) => current.filter((m) => m.id !== id));
    }, TOAST_MS);
    timers.current.add(timer);
  }, []);

  return { messages, push };
}

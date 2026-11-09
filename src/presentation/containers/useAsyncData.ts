import { useCallback, useEffect, useRef, useState } from 'react';

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; error: unknown };

/**
 * Runs `load` on mount and whenever `key` changes or `reload()` is called. Stale answers are ignored,
 * which also makes it safe under React StrictMode's double effects. A reload keeps showing the old data.
 */
export function useAsyncData<T>(load: () => Promise<T>, key: string) {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const [version, setVersion] = useState(0);
  const latest = useRef(load);
  useEffect(() => {
    latest.current = load;
  });

  useEffect(() => {
    let cancelled = false;
    setState((prev) => (prev.status === 'ready' ? prev : { status: 'loading' }));
    latest.current().then(
      (data) => {
        if (!cancelled) setState({ status: 'ready', data });
      },
      (error: unknown) => {
        if (!cancelled) setState({ status: 'error', error });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key, version]);

  const reload = useCallback(() => {
    setState((prev) => (prev.status === 'error' ? { status: 'loading' } : prev));
    setVersion((v) => v + 1);
  }, []);
  const setData = useCallback((data: T) => setState({ status: 'ready', data }), []);

  return { state, reload, setData };
}

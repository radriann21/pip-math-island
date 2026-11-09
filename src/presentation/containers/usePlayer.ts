import { useDeps } from '@/app/context';
import { loadPlayer } from '@/application/usecases';
import { useAsyncData } from './useAsyncData';

/** Loads the child's state with loading/error states; `retry` reloads after a failure. */
export function usePlayer(childId: string) {
  const deps = useDeps();
  const { state, reload, setData } = useAsyncData(() => loadPlayer(deps, childId), `player:${childId}`);
  return { state, retry: reload, setPlayer: setData };
}

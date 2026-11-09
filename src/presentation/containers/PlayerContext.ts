import { createContext, useContext } from 'react';
import type { PlayerState } from '@/application/model';

export interface PlayerValue {
  player: PlayerState;
  /** Replaces the loaded state (use cases return the new state after saving). */
  setPlayer(next: PlayerState): void;
}

export const PlayerContext = createContext<PlayerValue | null>(null);

/** The active child's loaded state; throws outside a child route. */
export function usePlayerContext(): PlayerValue {
  const value = useContext(PlayerContext);
  if (!value) throw new Error('usePlayerContext must be used inside a child route');
  return value;
}

export function useOptionalPlayer(): PlayerValue | null {
  return useContext(PlayerContext);
}

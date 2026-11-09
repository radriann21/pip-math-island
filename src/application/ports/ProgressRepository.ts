import type { PlayerState, RoundHistoryItem, SavedRace, SavedRound } from '../model';

export interface ProgressRepository {
  load(childId: string): Promise<PlayerState>;
  saveRound(childId: string, r: SavedRound): Promise<PlayerState>;
  saveRace(childId: string, r: SavedRace): Promise<PlayerState>;
  history(childId: string, limit?: number): Promise<RoundHistoryItem[]>;
}

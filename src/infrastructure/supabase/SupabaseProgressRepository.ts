import { NotFoundError } from '@/application/errors';
import type { PlayerState, RoundHistoryItem, SavedRace, SavedRound } from '@/application/model';
import type { Clock, ProgressRepository } from '@/application/ports';
import type { PipSupabaseClient } from './client';
import { mapPostgrestError, mapThrown } from './errors';
import { historyFromRow, playerFromRows, raceToRpcArgs, roundToRpcArgs } from './mappers';

const RESOURCE = 'child';
const DEFAULT_HISTORY_LIMIT = 20;

/** Progress in Postgres. Writes go through the atomic `record_round` / `record_race` functions. */
export class SupabaseProgressRepository implements ProgressRepository {
  constructor(
    private readonly client: PipSupabaseClient,
    private readonly clock: Clock,
  ) {}

  async load(childId: string): Promise<PlayerState> {
    try {
      const today = this.clock.today();
      const db = this.client;
      const [child, topics, badges, daily] = await Promise.all([
        db.from('children').select('*').eq('id', childId).maybeSingle(),
        db.from('topic_progress').select('*').eq('child_id', childId),
        db.from('child_badges').select('*').eq('child_id', childId),
        db.from('daily_activity').select('*').eq('child_id', childId).eq('day', today).maybeSingle(),
      ]);
      for (const res of [child, topics, badges, daily]) {
        if (res.error) throw mapPostgrestError(res.error, { resource: RESOURCE });
      }
      if (!child.data) throw new NotFoundError(`${RESOURCE} not found`);
      return playerFromRows({
        child: child.data,
        topics: topics.data ?? [],
        badges: badges.data ?? [],
        daily: daily.data ?? null,
        today,
      });
    } catch (e) {
      throw mapThrown(e);
    }
  }

  async saveRound(childId: string, r: SavedRound): Promise<PlayerState> {
    try {
      const { error } = await this.client.rpc('record_round', roundToRpcArgs(childId, r));
      if (error) throw mapPostgrestError(error, { resource: RESOURCE });
      return await this.load(childId);
    } catch (e) {
      throw mapThrown(e);
    }
  }

  async saveRace(childId: string, r: SavedRace): Promise<PlayerState> {
    try {
      const { error } = await this.client.rpc('record_race', raceToRpcArgs(childId, r));
      if (error) throw mapPostgrestError(error, { resource: RESOURCE });
      return await this.load(childId);
    } catch (e) {
      throw mapThrown(e);
    }
  }

  async history(childId: string, limit = DEFAULT_HISTORY_LIMIT): Promise<RoundHistoryItem[]> {
    try {
      const { data, error } = await this.client
        .from('rounds')
        .select('*')
        .eq('child_id', childId)
        .order('played_at', { ascending: false })
        .limit(limit);
      if (error) throw mapPostgrestError(error, { resource: RESOURCE });
      return (data ?? []).flatMap((row) => historyFromRow(row) ?? []);
    } catch (e) {
      throw mapThrown(e);
    }
  }
}

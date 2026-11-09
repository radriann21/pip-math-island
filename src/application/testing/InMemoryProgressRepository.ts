import { NotFoundError, ValidationError } from '../errors';
import type { PlayerState, RoundHistoryItem, SavedRace, SavedRound } from '../model';
import type { Clock, ProgressRepository } from '../ports';
import { applyRace, applyRound, emptyPlayer } from '../projection';
import type { InMemoryChildRepository } from './InMemoryChildRepository';

const DEFAULT_HISTORY_LIMIT = 20;

/**
 * In-memory ProgressRepository. Applying a saved round or race follows the SQL functions
 * `record_round` / `record_race` (see ../projection.ts), including their input checks.
 */
export class InMemoryProgressRepository implements ProgressRepository {
  private readonly players = new Map<string, PlayerState>();
  private readonly rounds = new Map<string, RoundHistoryItem[]>();
  private counter = 0;

  constructor(
    private readonly children: InMemoryChildRepository,
    private readonly clock: Clock,
  ) {}

  async load(childId: string): Promise<PlayerState> {
    const child = this.children.find(childId);
    if (!child) throw new NotFoundError(`child ${childId} not found`);
    const today = this.clock.today();
    const stored = this.players.get(childId) ?? emptyPlayer(child, today);
    const day = stored.today.day === today ? stored.today : { day: today, rounds: 0, bonusClaimed: false };
    return structuredClone({ ...stored, child, today: day });
  }

  async saveRound(childId: string, r: SavedRound): Promise<PlayerState> {
    if (r.bonusXp < 0 || r.bonusXp > 100) throw new ValidationError('invalid bonus xp');
    const next = applyRound(await this.load(childId), r);
    this.players.set(childId, next);
    const history = this.rounds.get(childId) ?? [];
    history.push({
      id: `round-${++this.counter}`,
      topic: r.topic,
      grade: r.grade,
      stars: r.stars,
      firstTry: r.firstTry,
      secondTry: r.secondTry,
      missed: r.missed,
      xpGained: r.xpGained,
      playedAt: new Date(this.clock.now() + this.counter).toISOString(),
      details: structuredClone(r.details),
    });
    this.rounds.set(childId, history);
    return this.load(childId);
  }

  async saveRace(childId: string, r: SavedRace): Promise<PlayerState> {
    if (r.xpGained < 0 || r.xpGained > 1000) throw new ValidationError('invalid xp');
    this.players.set(childId, applyRace(await this.load(childId), r));
    return this.load(childId);
  }

  async history(childId: string, limit = DEFAULT_HISTORY_LIMIT): Promise<RoundHistoryItem[]> {
    await this.load(childId);
    return structuredClone([...(this.rounds.get(childId) ?? [])].reverse().slice(0, limit));
  }
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function toUtc(iso: string): number {
  const m = ISO_DATE.exec(iso);
  if (!m) throw new RangeError(`invalid ISO date: ${iso}`);
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(year, month - 1, day);
  const back = new Date(ms);
  if (back.getUTCFullYear() !== year || back.getUTCMonth() !== month - 1 || back.getUTCDate() !== day) {
    throw new RangeError(`invalid ISO date: ${iso}`);
  }
  return ms;
}

/** Adds (or subtracts) whole days to an ISO yyyy-mm-dd date using UTC math, so DST never interferes. */
export function addDays(iso: string, days: number): string {
  return new Date(toUtc(iso) + days * 86_400_000).toISOString().slice(0, 10);
}

/** Streak after playing on `today`: same day unchanged, the day after +1, anything else restarts at 1. */
export function nextStreak(
  prev: { streak: number; lastPlayed: string | null },
  today: string,
): { streak: number; lastPlayed: string } {
  if (prev.lastPlayed === today) return { streak: prev.streak, lastPlayed: today };
  if (prev.lastPlayed !== null && addDays(prev.lastPlayed, 1) === today) {
    return { streak: prev.streak + 1, lastPlayed: today };
  }
  return { streak: 1, lastPlayed: today };
}

/** Streak to display: 0 unless the child played today or yesterday. */
export function liveStreak(streak: number, lastPlayed: string | null, today: string): number {
  if (lastPlayed === null) return 0;
  return lastPlayed === today || lastPlayed === addDays(today, -1) ? streak : 0;
}

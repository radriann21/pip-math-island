/** Rounds to `decimals` places (prototype `rnd`), avoiding binary float noise such as 0.1 + 0.2. */
export function roundTo(x: number, decimals: number): number {
  const k = Math.pow(10, decimals);
  return Math.round(x * k) / k;
}

/** Row for a one-based grade from a per-grade table. Throws if the table is too short. */
export function atGrade<T>(rows: readonly T[], grade: number): T {
  const row = rows[grade - 1];
  if (row === undefined) throw new RangeError(`no table entry for grade ${grade}`);
  return row;
}

/** Entry for a zero-based tier from a per-tier table. Throws if the table is too short. */
export function atTier<T>(entries: readonly T[], tier: number): T {
  const entry = entries[tier];
  if (entry === undefined) throw new RangeError(`no table entry for tier ${tier}`);
  return entry;
}

/** Greatest common divisor of two non-negative integers (Euclid). */
export function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** Least common multiple of two positive integers. */
export function lcm(a: number, b: number): number {
  return (a / gcd(a, b)) * b;
}

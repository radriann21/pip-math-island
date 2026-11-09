/** Rounds to `decimals` places (prototype `rnd`), avoiding binary float noise such as 0.1 + 0.2. */
export function roundTo(x: number, decimals: number): number {
  const k = Math.pow(10, decimals);
  return Math.round(x * k) / k;
}

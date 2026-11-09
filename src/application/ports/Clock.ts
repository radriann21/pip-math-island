export interface Clock {
  /** Local ISO date, yyyy-mm-dd. */
  today(): string;
  /** Epoch milliseconds. */
  now(): number;
}

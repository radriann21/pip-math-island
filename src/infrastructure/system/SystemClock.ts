import type { Clock } from '@/application/ports';

const pad = (n: number): string => String(n).padStart(2, '0');

/** Wall clock. `today()` is the device's LOCAL calendar date, never the UTC date. */
export class SystemClock implements Clock {
  today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  now(): number {
    return Date.now();
  }
}

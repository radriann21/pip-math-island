import { addDays } from '@/domain/progression';
import type { Clock } from '../ports';

/** A clock whose day is set by the test. `now()` is noon UTC of that day. */
export class FixedClock implements Clock {
  private day: string;

  constructor(day = '2026-05-10') {
    this.day = day;
  }

  today(): string {
    return this.day;
  }

  now(): number {
    return Date.parse(`${this.day}T12:00:00.000Z`);
  }

  setToday(day: string): void {
    this.day = day;
  }

  advanceDays(days: number): void {
    this.day = addDays(this.day, days);
  }
}

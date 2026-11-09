import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SystemClock } from './SystemClock';

describe('SystemClock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports the LOCAL calendar date just before midnight', () => {
    vi.setSystemTime(new Date(2026, 4, 10, 23, 59, 59, 900));
    expect(new SystemClock().today()).toBe('2026-05-10');
  });
  it('rolls over at local midnight', () => {
    vi.setSystemTime(new Date(2026, 4, 10, 23, 59, 59, 900));
    const clock = new SystemClock();
    vi.advanceTimersByTime(200);
    expect(clock.today()).toBe('2026-05-11');
  });
  it('zero-pads month and day and handles year boundaries', () => {
    vi.setSystemTime(new Date(2027, 0, 1, 0, 0, 1));
    expect(new SystemClock().today()).toBe('2027-01-01');
    vi.setSystemTime(new Date(2024, 1, 29, 12));
    expect(new SystemClock().today()).toBe('2024-02-29');
  });
  it('now() returns epoch milliseconds', () => {
    const at = new Date(2026, 4, 10, 8, 30).getTime();
    vi.setSystemTime(at);
    expect(new SystemClock().now()).toBe(at);
  });
});

import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../shared/rng';
import type { GenContext, Grade, Locale, Tier } from '../shared/types';
import {
  buildClockReading,
  buildElapsedEnd,
  buildElapsedMinutes,
  buildToTwelveHour,
  buildToTwentyFourHour,
  formatClock,
  timeTopic,
} from './time';
import { clock } from './visuals';

const ctx = (grade: Grade, tier: Tier, seed: number, locale: Locale = 'en'): GenContext => ({
  grade,
  tier,
  locale,
  rng: createSeededRng(seed),
});
const GRADES: Grade[] = [1, 2, 3, 4, 5, 6];
const TIERS: Tier[] = [0, 1, 2];

/** Minutes since midnight for "h:mm", "h:mm AM" or "h:mm PM"; null when the label is not a real time. */
function minutesOfDay(label: string, twentyFour: boolean): number | null {
  const m = /^(\d{1,2}):(\d\d)(?: (AM|PM))?$/.exec(label);
  if (!m) return null;
  const [h, min] = [Number(m[1]), Number(m[2])];
  if (min > 59) return null;
  if (twentyFour) return h <= 23 && !m[3] ? h * 60 + min : null;
  if (h < 1 || h > 12 || !m[3]) return null;
  return ((h % 12) + (m[3] === 'PM' ? 12 : 0)) * 60 + min;
}
const twelveHourLabel = (total: number) => `${Math.floor(total / 60) % 12 || 12}:${String(total % 60).padStart(2, '0')}`;

describe('formatClock', () => {
  it('pads the minutes only', () => {
    expect(formatClock(3, 0)).toBe('3:00');
    expect(formatClock(12, 5)).toBe('12:05');
    expect(formatClock(11, 45)).toBe('11:45');
  });
});

describe('buildClockReading', () => {
  it('answers the time drawn on the clock', () => {
    const q = buildClockReading(ctx(1, 0, 1), 3, 30);
    expect(q.answer).toBe('3:30');
    expect(q.vis).toBe(clock(3, 30));
    expect(q.prompt).toBe('What time does the clock show?');
    expect(buildClockReading(ctx(1, 0, 1, 'es'), 3, 30).prompt).toBe('¿Qué hora marca el reloj?');
  });
  it('offers unique, valid, wrong times for every possible reading', () => {
    for (let h = 1; h <= 12; h++) {
      for (let m = 0; m < 60; m++) {
        const q = buildClockReading(ctx(3, 1, h * 60 + m), h, m);
        const opts = q.opts ?? [];
        const tag = `${h}:${m}`;
        expect(opts.length, tag).toBeGreaterThanOrEqual(2);
        expect(new Set(opts).size, tag).toBe(opts.length);
        const minutes = opts.map((o) => minutesOfDay(`${o} AM`, false));
        expect(minutes.every((x) => x !== null), tag).toBe(true);
        expect(minutes.filter((x) => x === (h % 12) * 60 + m), tag).toHaveLength(1);
        expect(opts.filter((o) => o === formatClock(h, m)), tag).toHaveLength(1);
      }
    }
  });
});

describe('buildElapsedEnd', () => {
  it('adds the duration to the start time on a 12-hour clock', () => {
    const q = buildElapsedEnd(ctx(4, 0, 1), 9, 30, 45);
    expect(q.answer).toBe('10:15');
    expect(q.prompt).toBe('Class starts at 9:30 and lasts 45 minutes. When does it end?');
    expect(q.vis).toBe(clock(9, 30));
    expect(buildElapsedEnd(ctx(4, 0, 1), 10, 45, 90).answer).toBe('12:15');
    expect(buildElapsedEnd(ctx(4, 0, 1, 'es'), 9, 30, 45).prompt).toBe(
      'La clase empieza a las 9:30 y dura 45 minutos. ¿A qué hora termina?',
    );
  });
  it('matches independent arithmetic with exactly one correct option for every input', () => {
    for (let h = 1; h <= 10; h++) {
      for (const m of [0, 15, 30, 45]) {
        for (const dur of [15, 20, 25, 30, 35, 40, 45, 50, 60, 75, 90]) {
          const q = buildElapsedEnd(ctx(4, 1, h + m + dur), h, m, dur);
          const expected = twelveHourLabel(h * 60 + m + dur);
          const tag = `${h}:${m}+${dur}`;
          expect(q.answer, tag).toBe(expected);
          const opts = q.opts ?? [];
          expect(opts.length, tag).toBeGreaterThanOrEqual(3);
          expect(new Set(opts).size, tag).toBe(opts.length);
          expect(opts.filter((o) => o === expected), tag).toHaveLength(1);
        }
      }
    }
  });
});

describe('12-hour and 24-hour conversion', () => {
  it('buildToTwelveHour writes afternoon hours with PM', () => {
    const q = buildToTwelveHour(ctx(5, 0, 1), 15, 30);
    expect(q.prompt).toBe('Which is 15:30 in 12-hour time?');
    expect(q.answer).toBe('3:30 PM');
    expect(q.why).toBe('15 − 12 = 3');
    expect(buildToTwelveHour(ctx(5, 0, 1, 'es'), 15, 30).prompt).toBe('¿Cómo se escribe 15:30 en formato de 12 horas?');
  });
  it('buildToTwelveHour has exactly one option for the same moment of the day', () => {
    for (let hour = 13; hour <= 23; hour++) {
      for (const m of [0, 15, 30, 45]) {
        const q = buildToTwelveHour(ctx(5, 0, hour + m), hour, m);
        const opts = q.opts ?? [];
        expect(new Set(opts).size).toBe(opts.length);
        expect(opts.filter((o) => minutesOfDay(o, false) === hour * 60 + m), `${hour}:${m}`).toEqual([q.answer]);
      }
    }
  });
  it('buildToTwentyFourHour adds 12 to PM hours', () => {
    const q = buildToTwentyFourHour(ctx(5, 1, 1), 3, 30);
    expect(q.prompt).toBe('Which is 3:30 PM in 24-hour time?');
    expect(q.answer).toBe('15:30');
    expect(q.why).toBe('3 + 12 = 15');
  });
  it('buildToTwentyFourHour has exactly one option for the same moment of the day', () => {
    for (let pm = 1; pm <= 11; pm++) {
      for (const m of [0, 15, 30, 45]) {
        const q = buildToTwentyFourHour(ctx(5, 1, pm + m), pm, m);
        const opts = q.opts ?? [];
        expect(new Set(opts).size).toBe(opts.length);
        expect(opts.filter((o) => minutesOfDay(o, true) === (pm + 12) * 60 + m), `${pm}:${m}`).toEqual([q.answer]);
      }
    }
  });
});

describe('buildElapsedMinutes', () => {
  it('asks for the minutes between two times', () => {
    const q = buildElapsedMinutes(ctx(6, 0, 1), 9, 15, 135);
    expect(q.kind).toBe('num');
    expect(q.prompt).toBe('How many minutes pass from 9:15 to 11:30?');
    expect(q.answer).toBe(135);
    expect(q.why).toBe('2 h × 60 + 15 = 135');
    expect(buildElapsedMinutes(ctx(6, 0, 1, 'es'), 14, 55, 360).prompt).toBe(
      '¿Cuántos minutos pasan de las 14:55 a las 20:55?',
    );
  });
});

describe('timeTopic correctness (English prompts)', () => {
  const seen = new Set<string>();
  for (const grade of GRADES) {
    for (const tier of TIERS) {
      for (let seed = 1; seed <= 120; seed++) {
        const q = timeTopic.generate(ctx(grade, tier, seed));
        const p = q.prompt;
        const tag = `g${grade}/t${tier}/seed${seed}: ${p}`;
        const opts = q.opts ?? [];
        let m: RegExpExecArray | null;
        if (p === 'What time does the clock show?') {
          seen.add('clock');
          const [h, min] = String(q.answer).split(':').map(Number);
          expect(q.vis, tag).toBe(clock(h!, min!));
          expect(opts.filter((o) => o === formatClock(h!, min!)), tag).toHaveLength(1);
        } else if ((m = /^Class starts at (\d+):(\d\d) and lasts (\d+) minutes\. When does it end\?$/.exec(p))) {
          seen.add('elapsedEnd');
          const [h, min, dur] = [Number(m[1]), Number(m[2]), Number(m[3])];
          expect(q.vis, tag).toBe(clock(h, min));
          const expected = twelveHourLabel(h * 60 + min + dur);
          expect(q.answer, tag).toBe(expected);
          expect(opts.filter((o) => o === expected), tag).toHaveLength(1);
        } else if ((m = /^Which is (\d+):(\d\d) in 12-hour time\?$/.exec(p))) {
          seen.add('to12');
          const target = Number(m[1]) * 60 + Number(m[2]);
          expect(Number(m[1]), tag).toBeGreaterThanOrEqual(13);
          expect(opts.filter((o) => minutesOfDay(o, false) === target), tag).toEqual([q.answer]);
        } else if ((m = /^Which is (\d+):(\d\d) PM in 24-hour time\?$/.exec(p))) {
          seen.add('to24');
          const target = (Number(m[1]) + 12) * 60 + Number(m[2]);
          expect(opts.filter((o) => minutesOfDay(o, true) === target), tag).toEqual([q.answer]);
        } else if ((m = /^How many minutes pass from (\d+):(\d\d) to (\d+):(\d\d)\?$/.exec(p))) {
          seen.add('minutes');
          const diff = Number(m[3]) * 60 + Number(m[4]) - (Number(m[1]) * 60 + Number(m[2]));
          expect(q.answer, tag).toBe(diff);
          expect(diff, tag).toBeGreaterThanOrEqual(40);
        } else {
          throw new Error(`unrecognised time prompt: ${p}`);
        }
      }
    }
  }
  it('covers every question type', () => {
    expect([...seen].sort()).toEqual(['clock', 'elapsedEnd', 'minutes', 'to12', 'to24']);
  });
});

describe('timeTopic by grade and tier', () => {
  it('reads only whole and half hours in grade 1 and quarter hours in grade 2 tier 0', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const g1 = timeTopic.generate(ctx(1, 1, seed));
      expect(['00', '30']).toContain(String(g1.answer).split(':')[1]);
      const g2 = timeTopic.generate(ctx(2, 0, seed));
      expect(['00', '15', '30', '45']).toContain(String(g2.answer).split(':')[1]);
    }
    for (let seed = 1; seed <= 40; seed++) {
      expect(String(timeTopic.generate(ctx(1, 0, seed)).answer)).toMatch(/:00$/);
    }
  });
});

describe('timeTopic metadata', () => {
  it('matches the prototype table', () => {
    expect(timeTopic).toMatchObject({
      id: 'time',
      accent: '#c452d8',
      title: { en: 'Telling Time', es: 'La hora' },
    });
    expect(timeTopic.generate(ctx(1, 0, 1)).topic).toBe('time');
  });
});

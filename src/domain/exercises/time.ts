import { t } from '../shared/locale';
import { atTier } from '../shared/math';
import { pick, randInt, shuffle } from '../shared/rng';
import type { GenContext } from '../shared/types';
import { choiceQuestion, numericQuestion, type QuestionDraft } from './options';
import { defineTopic } from './topic';
import { clock } from './visuals';

/** "h:mm" with a padded minute and an unpadded hour. */
export function formatClock(h: number, m: number): string {
  return `${h}:${String(m).padStart(2, '0')}`;
}

type Time = readonly [hour: number, minute: number];
const label = (time: Time) => formatClock(time[0], time[1]);

/** Distractor labels: every candidate that is a different time than `answer`. */
function otherTimes(answer: string, candidates: readonly Time[]): string[] {
  return candidates.map(label).filter((x) => x !== answer);
}

/** "What time does the clock show?" for a 12-hour reading `h:m`. */
export function buildClockReading(ctx: GenContext, h: number, m: number): QuestionDraft {
  const { locale, rng } = ctx;
  const answer = formatClock(h, m);
  const swapped: Time = [Math.floor(m / 5) || 12, (h * 5) % 60]; // hands mixed up
  return choiceQuestion(rng, {
    prompt: t(locale, 'What time does the clock show?', '¿Qué hora marca el reloj?'),
    vis: clock(h, m),
    answer,
    wrong: shuffle(
      rng,
      otherTimes(answer, [
        [(h % 12) + 1, m],
        [h, (m + 30) % 60],
        swapped,
        [((h + 10) % 12) + 1, m],
        [h, (m + 15) % 60],
      ]),
    ),
    hint: t(
      locale,
      'The short thick hand shows the hour. The long orange hand shows the minutes.',
      'La aguja corta y gruesa marca la hora. La larga y naranja marca los minutos.',
    ),
    why: t(
      locale,
      `Hour hand near ${h}, minute hand at ${m}: ${answer}.`,
      `La aguja de la hora cerca del ${h}, los minutos en ${m}: ${answer}.`,
    ),
  });
}

/** A class starts at `h:m` (12-hour) and lasts `dur` minutes: when does it end? */
export function buildElapsedEnd(ctx: GenContext, h: number, m: number, dur: number): QuestionDraft {
  const { locale, rng } = ctx;
  const total = h * 60 + m + dur;
  const endHour = Math.floor(total / 60) % 12 || 12;
  const endMinute = total % 60;
  const answer = formatClock(endHour, endMinute);
  const start = formatClock(h, m);
  return choiceQuestion(rng, {
    prompt: t(
      locale,
      `Class starts at ${start} and lasts ${dur} minutes. When does it end?`,
      `La clase empieza a las ${start} y dura ${dur} minutos. ¿A qué hora termina?`,
    ),
    vis: clock(h, m),
    answer,
    wrong: otherTimes(answer, [
      [endHour, (endMinute + 10) % 60],
      [(endHour % 12) + 1, endMinute],
      [endHour, (endMinute + 50) % 60],
      [((endHour + 10) % 12) + 1, endMinute],
    ]),
    hint: t(
      locale,
      'Add the minutes in steps. Every 60 minutes makes one more hour.',
      'Suma los minutos por pasos. Cada 60 minutos son una hora más.',
    ),
    why: `${start} + ${dur} min = ${answer}`,
  });
}

/** Convert an afternoon 24-hour time (`hour24` 13..23) to 12-hour PM time. */
export function buildToTwelveHour(ctx: GenContext, hour24: number, m: number): QuestionDraft {
  const { locale, rng } = ctx;
  const pm = hour24 - 12;
  const given = formatClock(hour24, m);
  const answer = `${formatClock(pm, m)} PM`;
  return choiceQuestion(rng, {
    prompt: t(
      locale,
      `Which is ${given} in 12-hour time?`,
      `¿Cómo se escribe ${given} en formato de 12 horas?`,
    ),
    answer,
    wrong: [`${formatClock(pm, m)} AM`, `${formatClock(hour24, m)} PM`, `${formatClock(pm + 1, m)} PM`],
    hint: t(
      locale,
      'For afternoon hours in 24-hour time, subtract 12 and write PM.',
      'Para horas de la tarde en formato de 24 horas, resta 12 y escribe PM.',
    ),
    why: `${hour24} − 12 = ${pm}`,
  });
}

/** Convert a PM time (`hour12` 1..11) to 24-hour time. */
export function buildToTwentyFourHour(ctx: GenContext, hour12: number, m: number): QuestionDraft {
  const { locale, rng } = ctx;
  const hour24 = hour12 + 12;
  const answer = formatClock(hour24, m);
  return choiceQuestion(rng, {
    prompt: t(
      locale,
      `Which is ${formatClock(hour12, m)} PM in 24-hour time?`,
      `¿Cómo se escribe ${formatClock(hour12, m)} PM en formato de 24 horas?`,
    ),
    answer,
    wrong: [
      formatClock(hour12, m),
      formatClock(hour24 + 1 > 23 ? 12 : hour24 + 1, m),
      formatClock(hour12 + 10, m),
    ],
    hint: t(locale, 'For PM hours, add 12.', 'Para horas PM, suma 12.'),
    why: `${hour12} + 12 = ${hour24}`,
  });
}

/** "How many minutes pass from h1:m1 to the time `mins` minutes later?" (24-hour clock). */
export function buildElapsedMinutes(ctx: GenContext, h1: number, m1: number, mins: number): QuestionDraft {
  const { locale } = ctx;
  const end = h1 * 60 + m1 + mins;
  const from = formatClock(h1, m1);
  const to = formatClock(Math.floor(end / 60), end % 60);
  return numericQuestion({
    prompt: t(
      locale,
      `How many minutes pass from ${from} to ${to}?`,
      `¿Cuántos minutos pasan de las ${from} a las ${to}?`,
    ),
    answer: mins,
    hint: t(
      locale,
      'Count the hours first (each is 60 minutes), then the extra minutes.',
      'Cuenta primero las horas (cada una son 60 minutos) y luego los minutos extra.',
    ),
    why: `${Math.floor(mins / 60)} h × 60 + ${mins % 60} = ${mins}`,
  });
}

const QUARTERS = [0, 15, 30, 45];
const FIVES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

export const timeTopic = defineTopic({
  id: 'time',
  accent: '#c452d8',
  title: { en: 'Telling Time', es: 'La hora' },
  build(ctx): QuestionDraft {
    const { grade, tier, rng } = ctx;
    const r = (min: number, max: number) => randInt(rng, min, max);

    if (grade <= 3) {
      const hour = r(1, 12);
      const minute =
        grade === 1
          ? tier === 0
            ? 0
            : pick(rng, [0, 30])
          : grade === 2
            ? pick(rng, tier === 0 ? QUARTERS : FIVES)
            : tier === 0
              ? pick(rng, [5, 10, 20, 25, 35, 40, 50, 55])
              : r(1, 59);
      return buildClockReading(ctx, hour, minute);
    }

    if (grade === 4) {
      const dur = pick(rng, [15, 20, 25, 30, 35, 40, 45, 50, 60, 75, 90]);
      return buildElapsedEnd(ctx, r(1, 10), pick(rng, QUARTERS), dur);
    }

    if (grade === 5) {
      const hour24 = r(13, 23);
      const minute = pick(rng, QUARTERS);
      return tier === 0 || rng() < 0.5
        ? buildToTwelveHour(ctx, hour24, minute)
        : buildToTwentyFourHour(ctx, hour24 - 12, minute);
    }

    return buildElapsedMinutes(ctx, r(6, 14), pick(rng, FIVES), r(40, atTier([180, 260, 360], tier)));
  },
});

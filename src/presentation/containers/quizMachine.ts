import { checkAnswer } from '@/domain/exercises';
import { answerXp } from '@/domain/progression';
import type { AnswerDetail } from '@/domain/progression';
import type { Question, Tier } from '@/domain/shared/types';
import type { PipMood } from '../atoms';
import type { MessageKey, MessageParams } from '../i18n';
import type { ChoiceState, DotResult, KeypadKey } from '../molecules';

export interface Msg {
  key: MessageKey;
  params?: MessageParams;
}

export interface FeedbackState {
  kind: 'good' | 'bad' | 'tip';
  title: Msg[];
  /** Trusted domain markup, or markup built from static strings. */
  body?: string;
  showNext: boolean;
  /** Static message prefix put in front of `body` (already trusted). */
  answer?: string;
}

export interface QuizState {
  questions: Question[];
  tier: Tier;
  index: number;
  tries: number;
  input: string;
  details: AnswerDetail[];
  results: (DotResult | undefined)[];
  combo: number;
  optionStates: ChoiceState[];
  locked: boolean;
  inputStatus: 'idle' | 'correct' | 'wrong';
  mood: PipMood;
  bubble: Msg;
  feedback: FeedbackState | null;
  /** Set once the last question has been settled and "Finish" was pressed. */
  finished: boolean;
}

export type QuizAction =
  | { type: 'choose'; index: number }
  | { type: 'key'; key: KeypadKey }
  | { type: 'submit' }
  | { type: 'hint' }
  | { type: 'next' };

const cheer = (i: number): Msg => ({ key: `quiz.cheer.${(i % 3) + 1}` as MessageKey });

export function initialQuiz(questions: Question[], tier: Tier): QuizState {
  return {
    questions,
    tier,
    index: 0,
    tries: 0,
    input: '',
    details: [],
    results: [],
    combo: 0,
    optionStates: [],
    locked: false,
    inputStatus: 'idle',
    mood: 'happy',
    bubble: cheer(0),
    feedback: null,
    finished: false,
  };
}

function settle(s: QuizState, value: string, chosen?: number): QuizState {
  const q = s.questions[s.index] as Question;
  const tries = s.tries + 1;
  const optionStates = [...s.optionStates];
  if (checkAnswer(q, value)) {
    const first = tries === 1;
    const combo = first ? s.combo + 1 : 0;
    const gain = answerXp({ correct: true, tries: first ? 1 : 2 }, first ? s.combo : 0);
    const results = [...s.results];
    results[s.index] = first ? 'first' : 'second';
    if (chosen !== undefined) optionStates[chosen] = 'correct';
    return {
      ...s,
      tries,
      combo,
      results,
      optionStates,
      locked: true,
      inputStatus: q.kind === 'num' ? 'correct' : 'idle',
      details: [...s.details, { index: s.index, prompt: q.prompt, correct: true, tries: first ? 1 : 2 }],
      mood: 'cheer',
      bubble: first ? { key: `quiz.praise.${(s.index % 4) + 1}` as MessageKey } : { key: 'quiz.gotIt' },
      feedback: {
        kind: 'good',
        title: [{ key: first ? 'quiz.correct' : 'quiz.figuredOut' }, { key: 'quiz.xp', params: { xp: gain } }],
        body: first ? undefined : q.why,
        showNext: true,
      },
    };
  }
  if (chosen !== undefined) optionStates[chosen] = 'wrong';
  if (tries === 1) {
    return {
      ...s,
      tries,
      combo: 0,
      optionStates,
      input: '',
      inputStatus: q.kind === 'num' ? 'wrong' : 'idle',
      mood: 'think',
      bubble: { key: 'quiz.notYet' },
      feedback: { kind: 'tip', title: [{ key: 'quiz.almost' }], body: q.hint, showNext: false },
    };
  }
  const results = [...s.results];
  results[s.index] = 'missed';
  if (q.kind === 'choice') q.opts?.forEach((o, i) => (o === q.answer ? (optionStates[i] = 'correct') : undefined));
  const shown = q.kind === 'choice' ? String(q.answer) : String(q.answer);
  return {
    ...s,
    tries,
    combo: 0,
    results,
    optionStates,
    locked: true,
    input: q.kind === 'num' ? shown : '',
    inputStatus: q.kind === 'num' ? 'correct' : 'idle',
    details: [...s.details, { index: s.index, prompt: q.prompt, correct: false, tries: 2 }],
    mood: 'sad',
    bubble: { key: 'quiz.tricky' },
    feedback: { kind: 'bad', title: [{ key: 'quiz.tricky' }], body: q.why, answer: shown, showNext: true },
  };
}

export function quizReducer(s: QuizState, a: QuizAction): QuizState {
  const q = s.questions[s.index];
  if (!q || s.finished) return s;
  switch (a.type) {
    case 'choose': {
      const value = q.opts?.[a.index];
      if (s.locked || q.kind !== 'choice' || value === undefined || s.optionStates[a.index] === 'wrong') return s;
      return settle(s, value, a.index);
    }
    case 'key': {
      if (s.locked || q.kind !== 'num') return s;
      const base = s.inputStatus === 'wrong' ? { ...s, inputStatus: 'idle' as const } : s;
      let input = base.input;
      if (a.key === 'del') input = input.slice(0, -1);
      else if (a.key === '.') {
        if (q.decimal && !input.includes('.')) input = input ? `${input}.` : '0.';
      } else if (input.length < 9) input += a.key;
      return { ...base, input };
    }
    case 'submit':
      if (s.locked || q.kind !== 'num' || s.input.trim() === '') return s;
      return settle(s, s.input);
    case 'hint':
      if (s.locked) return s;
      return { ...s, mood: 'think', bubble: { key: 'quiz.hintHelp' }, feedback: { kind: 'tip', title: [{ key: 'quiz.hintTitle' }], body: q.hint, showNext: false } };
    case 'next': {
      if (!s.locked) return s;
      if (s.index >= s.questions.length - 1) return { ...s, finished: true };
      const index = s.index + 1;
      return { ...s, index, tries: 0, input: '', optionStates: [], locked: false, inputStatus: 'idle', mood: 'happy', bubble: cheer(index), feedback: null };
    }
  }
}

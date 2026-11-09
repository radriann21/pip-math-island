import type { Rng } from '@/domain/shared/types';

export interface GateChallenge {
  /** Plain text such as "7 × 8". */
  question: string;
  answer: number;
}

/** A multiplication that is easy for an adult and hard for a young child to guess: both factors 6..9. */
export function makeGateChallenge(rng: Rng): GateChallenge {
  const factor = () => 6 + Math.floor(rng() * 4);
  const a = factor();
  const b = factor();
  return { question: `${a} × ${b}`, answer: a * b };
}

/** Strict check: the trimmed input must be exactly the integer answer. */
export function checkGateAnswer(challenge: GateChallenge, input: string): boolean {
  const trimmed = input.trim();
  return /^\d+$/.test(trimmed) && Number(trimmed) === challenge.answer;
}

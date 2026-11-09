import type { AnswerDetail } from '@/domain/progression';
import type { Grade, Locale } from '@/domain/shared/types';
import { createTestDeps } from '../testing';
import { createChild } from './createChild';
import { loadPlayer } from './loadPlayer';

/** Test setup: fakes plus one child and its loaded player state. */
export async function setupPlayer(opts: { grade?: Grade; locale?: Locale; today?: string } = {}) {
  const t = createTestDeps({ today: opts.today ?? '2026-05-10' });
  const child = await createChild(t.deps, { name: 'Ana', grade: opts.grade ?? 2, locale: opts.locale ?? 'en' });
  const state = await loadPlayer(t.deps, child.id);
  return { ...t, child, state };
}

/** Answer details: `first` first-try answers, then `second` second-try ones, then `missed` misses. */
export function details(first: number, second = 0, missed = 0): AnswerDetail[] {
  const out: AnswerDetail[] = [];
  let i = 0;
  const add = (correct: boolean, tries: 1 | 2) => out.push({ index: i, prompt: `q${i++}`, correct, tries });
  for (let k = 0; k < first; k++) add(true, 1);
  for (let k = 0; k < second; k++) add(true, 2);
  for (let k = 0; k < missed; k++) add(false, 2);
  return out;
}

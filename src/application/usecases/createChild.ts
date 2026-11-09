import type { Grade, Locale } from '@/domain/shared/types';
import type { Child } from '../model';
import type { Deps } from '../ports';
import { validGrade, validLocale, validName } from './validation';

export interface CreateChildInput {
  name: string;
  grade: Grade;
  locale: Locale;
  soundEnabled?: boolean;
}

export async function createChild(deps: Pick<Deps, 'children'>, input: CreateChildInput): Promise<Child> {
  return deps.children.create({
    name: validName(input.name),
    grade: validGrade(input.grade),
    locale: validLocale(input.locale),
    soundEnabled: input.soundEnabled ?? true,
  });
}

import { ValidationError } from '../errors';
import type { Child } from '../model';
import type { Deps } from '../ports';
import { validGrade, validLocale, validName } from './validation';

export async function updateChild(
  deps: Pick<Deps, 'children'>,
  id: string,
  patch: Partial<Omit<Child, 'id'>>,
): Promise<Child> {
  const clean: Partial<Omit<Child, 'id'>> = {};
  if (patch.name !== undefined) clean.name = validName(patch.name);
  if (patch.grade !== undefined) clean.grade = validGrade(patch.grade);
  if (patch.locale !== undefined) clean.locale = validLocale(patch.locale);
  if (patch.soundEnabled !== undefined) clean.soundEnabled = patch.soundEnabled;
  if (Object.keys(clean).length === 0) throw new ValidationError('Nothing to update');
  return deps.children.update(id, clean);
}

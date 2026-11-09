import type { Grade, Locale } from '@/domain/shared/types';
import { ValidationError } from '../errors';

export const MAX_CHILD_NAME = 24;
export const MIN_PASSWORD_LENGTH = 6;

export function validEmail(raw: string): string {
  const email = raw.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError('Enter a valid email address');
  return email;
}

export function validName(raw: string): string {
  const name = raw.trim();
  if (name.length < 1 || name.length > MAX_CHILD_NAME) {
    throw new ValidationError(`Name must be 1 to ${MAX_CHILD_NAME} characters`);
  }
  return name;
}

export function validGrade(grade: number): Grade {
  if (!Number.isInteger(grade) || grade < 1 || grade > 6) throw new ValidationError('Grade must be 1 to 6');
  return grade as Grade;
}

export function validLocale(locale: string): Locale {
  if (locale !== 'en' && locale !== 'es') throw new ValidationError('Locale must be en or es');
  return locale;
}

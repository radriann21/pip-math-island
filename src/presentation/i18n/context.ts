import { createContext } from 'react';
import type { Locale } from '@/domain/shared/types';
import { interpolate } from './interpolate';
import type { MessageParams } from './interpolate';
import { messagesEn } from './messages.en';
import type { MessageKey } from './messages.en';

export interface I18nValue {
  locale: Locale;
  setLocale(locale: Locale): void;
  /** Translates a key; a key with no entry is returned unchanged so gaps are visible, never blank. */
  t(key: MessageKey, params?: MessageParams): string;
}

/** English fallback so presentational components render (and test) without a provider. */
export const defaultI18n: I18nValue = {
  locale: 'en',
  setLocale: () => undefined,
  t: (key, params) => interpolate((messagesEn as Record<string, string>)[key] ?? key, params),
};

export const I18nContext = createContext<I18nValue>(defaultI18n);

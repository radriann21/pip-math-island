import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Locale } from '@/domain/shared/types';
import { I18nContext } from './context';
import type { I18nValue } from './context';
import { interpolate } from './interpolate';
import { messagesEn } from './messages.en';
import { messagesEs } from './messages.es';

const DICTIONARIES: Record<Locale, Record<string, string>> = { en: messagesEn, es: messagesEs };

interface I18nProviderProps {
  children: ReactNode;
  /** Controlled mode: the owner decides the locale (e.g. the active child's preference). */
  locale?: Locale;
  /** Uncontrolled mode: starting locale. */
  initialLocale?: Locale;
  onLocaleChange?: (locale: Locale) => void;
}

export function I18nProvider({ children, locale: controlled, initialLocale = 'en', onLocaleChange }: I18nProviderProps) {
  const [internal, setInternal] = useState<Locale>(initialLocale);
  const locale = controlled ?? internal;

  const setLocale = useCallback(
    (next: Locale) => {
      setInternal(next);
      onLocaleChange?.(next);
    },
    [onLocaleChange],
  );

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale,
      t: (key, params) => interpolate(DICTIONARIES[locale][key] ?? key, params),
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

import type { Locale } from './types';

/** Picks the English or Spanish text for the active locale. */
export function t(locale: Locale, en: string, es: string): string {
  return locale === 'es' ? es : en;
}

const INTL_LOCALE: Record<Locale, string> = { en: 'en-US', es: 'es-ES' };

/** Locale-aware number with at most two fraction digits (prototype `fmt`). */
export function formatNumber(locale: Locale, n: number): string {
  return Number(n).toLocaleString(INTL_LOCALE[locale], { maximumFractionDigits: 2 });
}

/** Locale-aware number with exactly `decimals` fraction digits (prototype `fmtF`). */
export function formatFixed(locale: Locale, n: number, decimals: number): string {
  return Number(n).toLocaleString(INTL_LOCALE[locale], {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

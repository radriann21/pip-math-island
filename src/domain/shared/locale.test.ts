import { describe, expect, it } from 'vitest';
import { formatFixed, formatNumber, t } from './locale';
import { roundTo } from './math';

describe('t', () => {
  it('picks the text for the locale', () => {
    expect(t('en', 'Hello', 'Hola')).toBe('Hello');
    expect(t('es', 'Hello', 'Hola')).toBe('Hola');
  });
});

describe('formatNumber', () => {
  it('uses locale separators and at most two fraction digits', () => {
    expect(formatNumber('en', 1234.5)).toBe('1,234.5');
    expect(formatNumber('es', 12345.5)).toBe('12.345,5');
    expect(formatNumber('en', 3.14159)).toBe('3.14');
    expect(formatNumber('es', 3.14159)).toBe('3,14');
    expect(formatNumber('en', 7)).toBe('7');
  });
  it('formats negatives', () => {
    expect(formatNumber('en', -5)).toBe('-5');
  });
});

describe('formatFixed', () => {
  it('always shows the requested decimals', () => {
    expect(formatFixed('en', 3, 2)).toBe('3.00');
    expect(formatFixed('es', 3.5, 2)).toBe('3,50');
    expect(formatFixed('en', 2.5, 1)).toBe('2.5');
  });
});

describe('roundTo', () => {
  it('rounds to the given decimals', () => {
    expect(roundTo(1.005 + 0.0001, 2)).toBe(1.01);
    expect(roundTo(2.5, 0)).toBe(3);
    expect(roundTo(0.1 + 0.2, 2)).toBe(0.3);
  });
});

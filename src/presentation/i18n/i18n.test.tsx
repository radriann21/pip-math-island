import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { messagesEn } from './messages.en';
import { messagesEs } from './messages.es';
import { I18nProvider } from './I18nProvider';
import { interpolate } from './interpolate';
import { useI18n } from './useI18n';

function Probe({ id, params }: { id: string; params?: Record<string, string | number> }) {
  const { t, locale, setLocale } = useI18n();
  return (
    <div>
      <p data-testid="text">{t(id as never, params)}</p>
      <p data-testid="locale">{locale}</p>
      <button onClick={() => setLocale(locale === 'en' ? 'es' : 'en')}>switch</button>
    </div>
  );
}

describe('dictionaries', () => {
  it('es and en expose exactly the same keys', () => {
    expect(Object.keys(messagesEs).sort()).toEqual(Object.keys(messagesEn).sort());
  });

  it('keeps the same {placeholders} in both languages for every key', () => {
    const slots = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    for (const key of Object.keys(messagesEn) as (keyof typeof messagesEn)[]) {
      expect(slots(messagesEs[key]), key).toEqual(slots(messagesEn[key]));
    }
  });

  it('has no empty translations', () => {
    for (const dict of [messagesEn, messagesEs]) {
      for (const value of Object.values(dict)) expect(value.trim()).not.toBe('');
    }
  });
});

describe('interpolate', () => {
  it('replaces {name} placeholders', () => {
    expect(interpolate('Hi, {name}! You are {n}.', { name: 'Ana', n: 7 })).toBe('Hi, Ana! You are 7.');
  });

  it('leaves unknown placeholders untouched', () => {
    expect(interpolate('Hi {who}', {})).toBe('Hi {who}');
  });

  it('does not treat replacement values as patterns', () => {
    expect(interpolate('Hi {name}', { name: '$&{name}' })).toBe('Hi $&{name}');
  });
});

describe('I18nProvider', () => {
  it('defaults to English and translates keys', () => {
    render(
      <I18nProvider>
        <Probe id="common.back" />
      </I18nProvider>,
    );
    expect(screen.getByTestId('text')).toHaveTextContent(messagesEn['common.back']);
    expect(screen.getByTestId('locale')).toHaveTextContent('en');
  });

  it('starts in the requested locale', () => {
    render(
      <I18nProvider initialLocale="es">
        <Probe id="common.back" />
      </I18nProvider>,
    );
    expect(screen.getByTestId('text')).toHaveTextContent(messagesEs['common.back']);
  });

  it('switches language at runtime and notifies the owner', async () => {
    const onLocaleChange = vi.fn();
    render(
      <I18nProvider onLocaleChange={onLocaleChange}>
        <Probe id="common.back" />
      </I18nProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'switch' }));
    expect(screen.getByTestId('text')).toHaveTextContent(messagesEs['common.back']);
    expect(onLocaleChange).toHaveBeenCalledWith('es');
  });

  it('follows the locale prop when it is controlled', () => {
    const { rerender } = render(
      <I18nProvider locale="en">
        <Probe id="common.back" />
      </I18nProvider>,
    );
    rerender(
      <I18nProvider locale="es">
        <Probe id="common.back" />
      </I18nProvider>,
    );
    expect(screen.getByTestId('locale')).toHaveTextContent('es');
  });

  it('interpolates params', () => {
    render(
      <I18nProvider>
        <Probe id="home.greeting" params={{ name: 'Lia' }} />
      </I18nProvider>,
    );
    expect(screen.getByTestId('text')).toHaveTextContent('Hi, Lia!');
  });

  it('falls back to the key itself when the key is missing', () => {
    render(
      <I18nProvider>
        <Probe id="no.such.key" />
      </I18nProvider>,
    );
    expect(screen.getByTestId('text')).toHaveTextContent('no.such.key');
  });

  it('works without a provider (English defaults)', () => {
    render(<Probe id="common.back" />);
    expect(screen.getByTestId('text')).toHaveTextContent(messagesEn['common.back']);
  });
});

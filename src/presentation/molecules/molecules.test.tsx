import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import {
  ChoiceGrid,
  FeedbackPanel,
  Keypad,
  LocaleSoundToggles,
  NumberDisplay,
  ProgressDots,
  SpeechBubble,
  StatCard,
  StatePanel,
  StickerBadge,
  ToastStack,
  TopicCard,
} from '.';

describe('ChoiceGrid', () => {
  const options = ['12', '14', '16', '18'];

  it('renders one button per option with its number-key hint', () => {
    render(<ChoiceGrid options={options} onSelect={() => undefined} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(4);
    expect(screen.getByRole('button', { name: '14' })).toHaveAttribute('aria-keyshortcuts', '2');
    expect(within(buttons[2]!).getByText('3')).toBeInTheDocument();
  });

  it('reports the index of the chosen option', async () => {
    const onSelect = vi.fn();
    render(<ChoiceGrid options={options} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: '16' }));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('marks correct and wrong options and locks the wrong one', () => {
    render(<ChoiceGrid options={options} states={['idle', 'wrong', 'correct', 'idle']} onSelect={() => undefined} />);
    expect(screen.getByRole('button', { name: '14' })).toHaveClass('pip-opt--wrong');
    expect(screen.getByRole('button', { name: '14' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '16' })).toHaveClass('pip-opt--correct');
    expect(screen.getByRole('button', { name: '12' })).toBeEnabled();
  });

  it('does not select disabled options', async () => {
    const onSelect = vi.fn();
    render(<ChoiceGrid options={options} states={['disabled', 'idle', 'idle', 'idle']} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: '12' }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('disables everything when the whole grid is disabled', () => {
    render(<ChoiceGrid options={options} disabled onSelect={() => undefined} />);
    for (const b of screen.getAllByRole('button')) expect(b).toBeDisabled();
  });

  it('renders option markup such as fractions', () => {
    const { container } = render(
      <ChoiceGrid options={['<span class="fr"><i>1</i><i>2</i></span>', '3']} onSelect={() => undefined} />,
    );
    expect(container.querySelector('.fr')).not.toBeNull();
  });

  it('can hide the key hints', () => {
    render(<ChoiceGrid options={options} showKeys={false} onSelect={() => undefined} />);
    expect(screen.queryByText('1')).toBeNull();
  });
});

describe('Keypad', () => {
  it('emits digit keys', async () => {
    const onKey = vi.fn();
    render(<Keypad decimal={false} onKey={onKey} />);
    await userEvent.click(screen.getByRole('button', { name: '7' }));
    await userEvent.click(screen.getByRole('button', { name: '0' }));
    expect(onKey.mock.calls).toEqual([['7'], ['0']]);
  });

  it('emits the delete key', async () => {
    const onKey = vi.fn();
    render(<Keypad decimal={false} onKey={onKey} />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onKey).toHaveBeenCalledWith('del');
  });

  it('disables the decimal key when the answer is an integer', async () => {
    const onKey = vi.fn();
    render(<Keypad decimal={false} onKey={onKey} />);
    const dot = screen.getByRole('button', { name: '.' });
    expect(dot).toBeDisabled();
    await userEvent.click(dot);
    expect(onKey).not.toHaveBeenCalled();
  });

  it('enables the decimal key and always emits "."', async () => {
    const onKey = vi.fn();
    render(<Keypad decimal onKey={onKey} />);
    await userEvent.click(screen.getByRole('button', { name: '.' }));
    expect(onKey).toHaveBeenCalledWith('.');
  });

  it('shows a comma as the decimal symbol in Spanish but still emits "."', async () => {
    const onKey = vi.fn();
    render(
      <I18nProvider initialLocale="es">
        <Keypad decimal onKey={onKey} />
      </I18nProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: ',' }));
    expect(onKey).toHaveBeenCalledWith('.');
    expect(screen.getByRole('button', { name: 'Borrar' })).toBeInTheDocument();
  });

  it('disables every key when disabled', () => {
    render(<Keypad decimal disabled onKey={() => undefined} />);
    for (const b of screen.getAllByRole('button')) expect(b).toBeDisabled();
  });
});

describe('NumberDisplay', () => {
  it('shows a placeholder while empty', () => {
    render(<NumberDisplay value="" />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('shows the typed value with the locale decimal symbol', () => {
    render(
      <I18nProvider initialLocale="es">
        <NumberDisplay value="3.5" />
      </I18nProvider>,
    );
    expect(screen.getByText('3,5')).toBeInTheDocument();
  });

  it('reflects the check status', () => {
    const { rerender } = render(<NumberDisplay value="4" status="wrong" />);
    expect(screen.getByText('4').closest('output')).toHaveClass('pip-disp--wrong');
    rerender(<NumberDisplay value="4" status="correct" />);
    expect(screen.getByText('4').closest('output')).toHaveClass('pip-disp--correct');
  });

  it('is a polite live region', () => {
    render(<NumberDisplay value="4" />);
    expect(screen.getByText('4').closest('output')).toHaveAttribute('aria-live', 'polite');
  });
});

describe('ProgressDots', () => {
  it('draws one dot per question with the right state', () => {
    const { container } = render(
      <ProgressDots total={5} current={3} results={['first', 'second', 'missed']} />,
    );
    const dots = container.querySelectorAll('[data-state]');
    expect(dots).toHaveLength(5);
    expect(Array.from(dots).map((d) => d.getAttribute('data-state'))).toEqual([
      'first',
      'second',
      'missed',
      'current',
      'todo',
    ]);
  });

  it('is announced as a single image with the position', () => {
    render(<ProgressDots total={10} current={2} results={[]} />);
    expect(screen.getByRole('img', { name: 'Question 3 of 10' })).toBeInTheDocument();
  });
});

describe('FeedbackPanel', () => {
  it.each(['good', 'bad', 'tip'] as const)('renders the %s variant', (kind) => {
    render(<FeedbackPanel kind={kind} title="Title">body</FeedbackPanel>);
    const panel = screen.getByText('Title').closest('.pip-fb');
    expect(panel).toHaveClass(`pip-fb--${kind}`);
    expect(screen.getByText('body')).toBeInTheDocument();
  });

  it('offers no next button for a tip', () => {
    render(<FeedbackPanel kind="tip" title="Hint" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows a focused Next button that fires onNext', async () => {
    const onNext = vi.fn();
    render(<FeedbackPanel kind="good" title="Correct!" onNext={onNext} nextLabel="Next" />);
    const next = screen.getByRole('button', { name: 'Next' });
    expect(next).toHaveFocus();
    await userEvent.click(next);
    expect(onNext).toHaveBeenCalledOnce();
  });
});

describe('StickerBadge', () => {
  it('draws the badge with its title as accessible name', () => {
    render(<StickerBadge glyph="crown" color="#e8588a" title="Perfect Round" description="All 10 right" />);
    expect(screen.getByRole('img', { name: 'Perfect Round' })).toBeInTheDocument();
    expect(screen.getByText('All 10 right')).toBeInTheDocument();
  });

  it('uses the glyph symbol and the badge colour when earned', () => {
    const { container } = render(<StickerBadge glyph="flame" color="#e8504f" title="On Fire" />);
    expect(container.querySelector('use')).toHaveAttribute('href', '#i-flame');
    expect(container.querySelector('circle')).toHaveAttribute('fill', '#e8504f');
  });

  it('greys out and labels a locked badge', () => {
    const { container } = render(<StickerBadge glyph="flame" color="#e8504f" title="On Fire" locked />);
    expect(container.firstElementChild).toHaveClass('pip-sticker--locked');
    expect(container.querySelector('circle')).toHaveAttribute('fill', 'var(--line)');
    expect(screen.getByRole('img', { name: 'On Fire (Locked)' })).toBeInTheDocument();
  });
});

describe('LocaleSoundToggles', () => {
  it('toggles language and sound', async () => {
    const onToggleLocale = vi.fn();
    const onToggleSound = vi.fn();
    render(
      <LocaleSoundToggles soundEnabled onToggleLocale={onToggleLocale} onToggleSound={onToggleSound} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Language' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sound on' }));
    expect(onToggleLocale).toHaveBeenCalledOnce();
    expect(onToggleSound).toHaveBeenCalledOnce();
  });

  it('exposes the sound state and shows the current language first', () => {
    render(<LocaleSoundToggles soundEnabled={false} onToggleLocale={() => undefined} onToggleSound={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Sound off' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Language' })).toHaveTextContent('EN · ES');
  });
});

describe('ToastStack', () => {
  it('is a polite live region listing every message', () => {
    render(
      <ToastStack
        messages={[
          { id: 'a', text: 'New sticker: Explorer' },
          { id: 'b', text: 'Level up!' },
        ]}
      />,
    );
    const region = screen.getByRole('status');
    expect(within(region).getByText('New sticker: Explorer')).toBeInTheDocument();
    expect(within(region).getByText('Level up!')).toBeInTheDocument();
  });

  it('keeps an empty live region mounted so announcements work', () => {
    render(<ToastStack messages={[]} />);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});

describe('TopicCard', () => {
  it('shows title, stars and level and selects the topic', async () => {
    const onSelect = vi.fn();
    render(<TopicCard id="frac" title="Fractions" accent="#e8588a" stars={2} tier={1} onSelect={onSelect} />);
    const card = screen.getByRole('button', { name: /Fractions/ });
    expect(card).toHaveTextContent('Level 2/3');
    expect(within(card).getByRole('img', { name: '2 of 3 stars' })).toBeInTheDocument();
    expect(card.style.getPropertyValue('--c')).toBe('#e8588a');
    await userEvent.click(card);
    expect(onSelect).toHaveBeenCalledWith('frac');
  });
});

describe('StatCard, SpeechBubble, StatePanel', () => {
  it('StatCard shows label, value and footer', () => {
    render(
      <StatCard label="Stars" footer={<span>footer</span>}>
        12
      </StatCard>,
    );
    expect(screen.getByText('Stars')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('footer')).toBeInTheDocument();
  });

  it('SpeechBubble shows its message', () => {
    render(<SpeechBubble>Hello there</SpeechBubble>);
    expect(screen.getByText('Hello there')).toBeInTheDocument();
  });

  it('StatePanel announces loading politely', () => {
    render(<StatePanel kind="loading" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
  });

  it('StatePanel announces errors and offers retry', async () => {
    const onRetry = vi.fn();
    render(<StatePanel kind="error" message="No connection" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('No connection');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('StatePanel shows the empty message', () => {
    render(<StatePanel kind="empty" />);
    expect(screen.getByText('Nothing here yet.')).toBeInTheDocument();
  });
});

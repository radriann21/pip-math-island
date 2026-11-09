import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { TopicId } from '@/domain/shared/types';
import { I18nProvider } from '../i18n';
import { Button, Card, Chip, Icon, Meter, Pip, RichText, SPRITE_IDS, Sprite, Stars, TextField } from '.';

describe('Sprite', () => {
  it('defines every symbol and pattern the domain markup and the UI reference', () => {
    const { container } = render(<Sprite />);
    for (const id of ['i-star', 'i-starc', 'i-flame', 'i-bolt', 'i-crown', 'i-heart', 'i-medal', 'i-apple', 'i-balloon', 'i-cookie', 'pgH', 'pgT', 'pgO']) {
      expect(container.querySelector(`#${id}`), id).not.toBeNull();
    }
    expect(SPRITE_IDS).toHaveLength(13);
  });

  it('is hidden from assistive technology', () => {
    const { container } = render(<Sprite />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
  });
});

describe('Pip', () => {
  it('is announced as Pip by default and sized by prop', () => {
    render(<Pip size={84} />);
    const pip = screen.getByRole('img', { name: 'Pip' });
    expect(pip).toHaveAttribute('width', '84');
    expect(pip).toHaveAttribute('height', '84');
  });

  it('accepts a custom accessible label', () => {
    render(<Pip label="Fox mascot" />);
    expect(screen.getByRole('img', { name: 'Fox mascot' })).toBeInTheDocument();
  });

  it('can be decorative, hidden from assistive technology', () => {
    render(<Pip decorative />);
    expect(screen.queryByRole('img', { name: 'Pip' })).toBeNull();
  });

  it('draws a different face for each mood', () => {
    const faces = (['happy', 'cheer', 'think', 'sad'] as const).map((mood) => {
      const { container, unmount } = render(<Pip mood={mood} />);
      const html = container.innerHTML;
      unmount();
      return html;
    });
    expect(new Set(faces).size).toBe(4);
  });
});

describe('Icon', () => {
  const topics: TopicId[] = ['count', 'add', 'sub', 'mul', 'div', 'frac', 'place', 'time', 'money', 'geo', 'pattern', 'word'];

  it.each(topics)('renders the %s topic icon as decorative svg', (id) => {
    const { container } = render(<Icon name={id} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg?.innerHTML.length).toBeGreaterThan(0);
  });

  it('renders the race icon', () => {
    const { container } = render(<Icon name="race" />);
    expect(container.querySelector('svg path')).not.toBeNull();
  });
});

describe('Stars', () => {
  it('announces earned stars out of the maximum', () => {
    render(<Stars value={2} max={3} />);
    expect(screen.getByRole('img', { name: '2 of 3 stars' })).toBeInTheDocument();
  });

  it('draws one star per slot and dims the unearned ones', () => {
    const { container } = render(<Stars value={1} max={3} />);
    expect(container.querySelectorAll('svg')).toHaveLength(3);
    expect(container.querySelectorAll('.pip-stars__star--off')).toHaveLength(2);
  });

  it('clamps out-of-range values', () => {
    render(<Stars value={9} max={3} />);
    expect(screen.getByRole('img', { name: '3 of 3 stars' })).toBeInTheDocument();
  });

  it('translates its label', () => {
    render(
      <I18nProvider initialLocale="es">
        <Stars value={3} max={3} />
      </I18nProvider>,
    );
    expect(screen.getByRole('img', { name: '3 de 3 estrellas' })).toBeInTheDocument();
  });
});

describe('Button', () => {
  it('is a real button that defaults to type=button and fires onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    const button = screen.getByRole('button', { name: 'Go' });
    expect(button).toHaveAttribute('type', 'button');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('applies the variant and size modifiers', () => {
    render(
      <Button variant="alt" size="sm">
        Small
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Small' });
    expect(button).toHaveClass('pip-btn', 'pip-btn--alt', 'pip-btn--sm');
  });

  it('does not fire when disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Nope
      </Button>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Nope' }));
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Nope' })).toBeDisabled();
  });
});

describe('Chip', () => {
  it('renders static information as a non-interactive element', () => {
    render(<Chip>Grade</Chip>);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Grade')).toBeInTheDocument();
  });

  it('is a toggle button exposing aria-pressed', async () => {
    const onClick = vi.fn();
    render(
      <Chip pressed onClick={onClick}>
        3
      </Chip>,
    );
    const chip = screen.getByRole('button', { name: '3' });
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(chip);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('reports the unpressed state explicitly', () => {
    render(
      <Chip pressed={false} onClick={() => undefined}>
        4
      </Chip>,
    );
    expect(screen.getByRole('button', { name: '4' })).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('Meter', () => {
  it('is a progressbar with accessible value and name', () => {
    render(<Meter value={42.4} label="Level progress" />);
    const bar = screen.getByRole('progressbar', { name: 'Level progress' });
    expect(bar).toHaveAttribute('aria-valuenow', '42');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('clamps to 0..100', () => {
    render(<Meter value={250} label="Over" />);
    expect(screen.getByRole('progressbar', { name: 'Over' })).toHaveAttribute('aria-valuenow', '100');
  });
});

describe('TextField', () => {
  it('links the label to the input', async () => {
    render(<TextField id="email" label="Email" />);
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.co');
    expect(screen.getByLabelText('Email')).toHaveValue('a@b.co');
  });

  it('shows an error as an alert and marks the input invalid', () => {
    render(<TextField id="email" label="Email" error="Enter your email." />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter your email.');
    expect(input).toHaveAccessibleDescription('Enter your email.');
  });

  it('describes the input with its hint when there is no error', () => {
    render(<TextField id="pw" label="Password" hint="At least 6 characters." />);
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('At least 6 characters.');
    expect(screen.getByLabelText('Password')).not.toHaveAttribute('aria-invalid', 'true');
  });
});

describe('RichText', () => {
  it('renders trusted domain markup as real elements', () => {
    const { container } = render(<RichText html={'<span class="fr"><i>1</i><i>2</i></span>'} />);
    expect(container.querySelector('.fr')).not.toBeNull();
    expect(container.querySelectorAll('.fr i')).toHaveLength(2);
  });

  it('can render as another element', () => {
    render(<RichText as="h2" html="Pick one" />);
    expect(screen.getByRole('heading', { level: 2, name: 'Pick one' })).toBeInTheDocument();
  });
});

describe('Card', () => {
  it('wraps content with the card style', () => {
    render(<Card>Inside</Card>);
    expect(screen.getByText('Inside')).toHaveClass('pip-card');
  });
});

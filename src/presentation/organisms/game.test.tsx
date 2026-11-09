import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import type { BadgeView, StickerView, TopicView } from './types';
import { HomeView, QuizView, RaceResultView, RaceView, ResultView, StickerWall, TopBar, TopicGrid } from '.';
import type { QuizViewProps } from '.';

const topics: TopicView[] = [
  { id: 'count', title: 'Counting', accent: '#ff7a1a', stars: 3, tier: 2 },
  { id: 'add', title: 'Addition', accent: '#5b3df5', stars: 0, tier: 0 },
];

const badge: BadgeView = { id: 'first', glyph: 'star', color: '#f5a300', title: 'First Steps', description: 'Finish your first round' };

describe('TopBar', () => {
  it('shows the logo and the toggles', async () => {
    const onToggleSound = vi.fn();
    render(<TopBar soundEnabled onToggleLocale={() => undefined} onToggleSound={onToggleSound} />);
    expect(screen.getByText("Pip's Math Island")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Sound on' }));
    expect(onToggleSound).toHaveBeenCalledOnce();
  });

  it('replaces the mascot with a back button when onBack is given', async () => {
    const onBack = vi.fn();
    render(<TopBar onBack={onBack} soundEnabled onToggleLocale={() => undefined} onToggleSound={() => undefined} />);
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledOnce();
    expect(screen.queryByRole('img', { name: 'Pip' })).toBeNull();
  });

  it('renders extra actions', () => {
    render(
      <TopBar soundEnabled onToggleLocale={() => undefined} onToggleSound={() => undefined} actions={<button>Sign out</button>} />,
    );
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });
});

describe('TopicGrid', () => {
  it('lists one card per topic and reports the selection', async () => {
    const onSelect = vi.fn();
    render(<TopicGrid topics={topics} onSelect={onSelect} />);
    expect(screen.getAllByRole('button')).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: /Addition/ }));
    expect(onSelect).toHaveBeenCalledWith('add');
  });
});

describe('HomeView', () => {
  const baseProps = {
    name: 'Lia',
    message: 'Pick an island!',
    grade: 2 as const,
    level: 3,
    xp: 1250,
    levelPct: 40,
    totalStars: 7,
    streak: 7,
    roundsToday: 2,
    dailyGoal: 3,
    dailyBonusXp: 30,
    topics,
    raceBest: 12,
    stickersOwned: 5,
    stickersTotal: 12,
  };

  function setup(overrides: Partial<React.ComponentProps<typeof HomeView>> = {}) {
    const handlers = {
      onGradeChange: vi.fn(),
      onSelectTopic: vi.fn(),
      onRace: vi.fn(),
      onStickers: vi.fn(),
      onGrownups: vi.fn(),
    };
    render(<HomeView {...baseProps} {...handlers} {...overrides} />);
    return handlers;
  }

  it('greets the child and shows Pip\'s message', () => {
    setup();
    expect(screen.getByText('Hi, Lia!')).toBeInTheDocument();
    expect(screen.getByText('Pick an island!')).toBeInTheDocument();
  });

  it('shows level, xp, stars, streak and daily goal', () => {
    setup();
    expect(screen.getByText('Level 3')).toBeInTheDocument();
    expect(screen.getByText('1,250 XP')).toBeInTheDocument();
    expect(screen.getByText('7', { selector: 'b' })).toBeInTheDocument();
    expect(screen.getByText('2/3')).toBeInTheDocument();
    expect(screen.getByText('Today: 3 rounds = +30 XP')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Level 3' })).toHaveAttribute('aria-valuenow', '40');
  });

  it('caps the daily counter at the goal', () => {
    setup({ roundsToday: 9 });
    expect(screen.getByText('3/3')).toBeInTheDocument();
  });

  it('marks the active grade and changes it', async () => {
    const h = setup();
    expect(screen.getByRole('button', { name: 'Grade 2' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Grade 5' })).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(screen.getByRole('button', { name: 'Grade 5' }));
    expect(h.onGradeChange).toHaveBeenCalledWith(5);
  });

  it('starts a topic round, the race, stickers and the grown-ups area', async () => {
    const h = setup();
    await userEvent.click(screen.getByRole('button', { name: /Counting/ }));
    await userEvent.click(screen.getByRole('button', { name: /Quick Race/ }));
    await userEvent.click(screen.getByRole('button', { name: 'My stickers (5/12)' }));
    await userEvent.click(screen.getByRole('button', { name: 'Grown-ups corner' }));
    expect(h.onSelectTopic).toHaveBeenCalledWith('count');
    expect(h.onRace).toHaveBeenCalledOnce();
    expect(h.onStickers).toHaveBeenCalledOnce();
    expect(h.onGrownups).toHaveBeenCalledOnce();
  });

  it('shows the race record', () => {
    setup();
    expect(screen.getByRole('button', { name: /Best: 12/ })).toBeInTheDocument();
  });

  it('falls back to a friendly name', () => {
    setup({ name: '' });
    expect(screen.getByText('Hi, friend!')).toBeInTheDocument();
  });

  it('renders in Spanish', () => {
    render(
      <I18nProvider initialLocale="es">
        <HomeView
          {...baseProps}
          onGradeChange={() => undefined}
          onSelectTopic={() => undefined}
          onRace={() => undefined}
          onStickers={() => undefined}
          onGrownups={() => undefined}
        />
      </I18nProvider>,
    );
    expect(screen.getByText('¡Hola, Lia!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rincón de adultos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Grado 2' })).toBeInTheDocument();
  });
});

describe('QuizView', () => {
  const choiceQuestion: QuizViewProps['question'] = {
    kind: 'choice',
    prompt: 'Add <span class="fr"><i>1</i><i>2</i></span> and 3',
    vis: '<svg role="img" aria-label="3 apples"><use href="#i-apple"></use></svg>',
    options: ['5', '6', '7', '8'],
    decimal: false,
  };
  const numQuestion: QuizViewProps['question'] = { kind: 'num', prompt: '12 + 30', vis: '', decimal: true };

  function setup(overrides: Partial<QuizViewProps> = {}) {
    const handlers = {
      onBack: vi.fn(),
      onChoose: vi.fn(),
      onKey: vi.fn(),
      onSubmit: vi.fn(),
      onHint: vi.fn(),
      onNext: vi.fn(),
    };
    const props: QuizViewProps = {
      question: choiceQuestion,
      index: 0,
      total: 10,
      results: [],
      topicId: 'add',
      topicAccent: '#5b3df5',
      mood: 'happy',
      bubble: "You've got this!",
      input: '',
      locked: false,
      ...handlers,
      ...overrides,
    };
    render(<QuizView {...props} />);
    return handlers;
  }

  it('renders the domain markup for prompt and visual', () => {
    const { container } = render(
      <QuizView
        question={choiceQuestion}
        index={0}
        total={10}
        results={[]}
        topicId="add"
        topicAccent="#5b3df5"
        mood="happy"
        bubble="x"
        input=""
        locked={false}
        onBack={() => undefined}
        onChoose={() => undefined}
        onKey={() => undefined}
        onSubmit={() => undefined}
        onHint={() => undefined}
        onNext={() => undefined}
      />,
    );
    expect(container.querySelector('h2 .fr')).not.toBeNull();
    expect(container.querySelector('.pip-vis svg use')).toHaveAttribute('href', '#i-apple');
  });

  it('omits the visual area when the question has none', () => {
    const { container } = render(
      <QuizView
        question={numQuestion}
        index={0}
        total={10}
        results={[]}
        topicId="add"
        topicAccent="#5b3df5"
        mood="happy"
        bubble="x"
        input=""
        locked={false}
        onBack={() => undefined}
        onChoose={() => undefined}
        onKey={() => undefined}
        onSubmit={() => undefined}
        onHint={() => undefined}
        onNext={() => undefined}
      />,
    );
    expect(container.querySelector('.pip-vis')).toBeNull();
  });

  it('shows progress, Pip and the bubble', () => {
    setup({ index: 2, results: ['first', 'missed'] });
    expect(screen.getByRole('img', { name: 'Question 3 of 10' })).toBeInTheDocument();
    expect(screen.getByText('3/10')).toBeInTheDocument();
    expect(screen.getByText("You've got this!")).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Pip' })).toBeInTheDocument();
  });

  it('reports a chosen option', async () => {
    const h = setup();
    await userEvent.click(screen.getByRole('button', { name: '7' }));
    expect(h.onChoose).toHaveBeenCalledWith(2);
  });

  it('shows the keypad for numeric questions and forwards keys, check and delete', async () => {
    const h = setup({ question: numQuestion, input: '4' });
    expect(screen.queryByRole('button', { name: '6' })).not.toBeNull();
    await userEvent.click(screen.getByRole('button', { name: '6' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await userEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(h.onKey.mock.calls).toEqual([['6'], ['del']]);
    expect(h.onSubmit).toHaveBeenCalledOnce();
    expect(screen.getByText('4', { selector: 'output' })).toBeInTheDocument();
  });

  it('disables the decimal key for integer answers', () => {
    setup({ question: { ...numQuestion, decimal: false } });
    expect(screen.getByRole('button', { name: '.' })).toBeDisabled();
  });

  it('requests a hint', async () => {
    const h = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Hint' }));
    expect(h.onHint).toHaveBeenCalledOnce();
  });

  it('goes back', async () => {
    const h = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(h.onBack).toHaveBeenCalledOnce();
  });

  it('locks answering and the hint while feedback is final', () => {
    setup({
      locked: true,
      optionStates: ['idle', 'idle', 'correct', 'idle'],
      feedback: { kind: 'good', title: 'Correct! +11 XP', showNext: true },
    });
    expect(screen.getByRole('button', { name: '5' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Hint' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '7' })).toHaveClass('pip-opt--correct');
  });

  it('shows feedback with a focused Next button, or Finish on the last question', async () => {
    const h = setup({ feedback: { kind: 'bad', title: 'The answer is 7', body: '<span class="fr"><i>1</i><i>2</i></span>', showNext: true } });
    expect(screen.getByText('The answer is 7')).toBeInTheDocument();
    const next = screen.getByRole('button', { name: 'Next' });
    expect(next).toHaveFocus();
    await userEvent.click(next);
    expect(h.onNext).toHaveBeenCalledOnce();
  });

  it('labels the last Next button Finish', () => {
    setup({ isLast: true, feedback: { kind: 'good', title: 'Correct!', showNext: true } });
    expect(screen.getByRole('button', { name: 'Finish' })).toBeInTheDocument();
  });

  it('shows a tip without a Next button', () => {
    setup({ feedback: { kind: 'tip', title: 'Almost! Try once more.', body: 'Count again', showNext: false } });
    expect(screen.getByText('Almost! Try once more.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
  });

  describe('keyboard', () => {
    it('chooses options with the number keys', async () => {
      const h = setup();
      await userEvent.keyboard('2');
      expect(h.onChoose).toHaveBeenCalledWith(1);
    });

    it('ignores number keys beyond the available options and while locked', async () => {
      const h = setup({ question: { ...choiceQuestion, options: ['5', '6'] } });
      await userEvent.keyboard('4');
      expect(h.onChoose).not.toHaveBeenCalled();
    });

    it('does not answer from the keyboard when locked', async () => {
      const h = setup({ locked: true });
      await userEvent.keyboard('1');
      expect(h.onChoose).not.toHaveBeenCalled();
    });

    it('types digits, decimal separators and backspace on numeric questions', async () => {
      const h = setup({ question: numQuestion });
      await userEvent.keyboard('7.,{Backspace}');
      expect(h.onKey.mock.calls).toEqual([['7'], ['.'], ['.'], ['del']]);
    });

    it('submits with Enter on numeric questions', async () => {
      const h = setup({ question: numQuestion, input: '42' });
      await userEvent.keyboard('{Enter}');
      expect(h.onSubmit).toHaveBeenCalledOnce();
    });

    it('continues with Enter once feedback offers Next, without double firing', async () => {
      const h = setup({ locked: true, feedback: { kind: 'good', title: 'Correct!', showNext: true } });
      await userEvent.keyboard('{Enter}');
      expect(h.onNext).toHaveBeenCalledOnce();
    });

    it('ignores shortcuts combined with modifiers', async () => {
      const h = setup();
      await userEvent.keyboard('{Control>}1{/Control}');
      expect(h.onChoose).not.toHaveBeenCalled();
    });
  });
});

describe('ResultView', () => {
  const props = {
    stars: 3,
    firstTry: 9,
    secondTry: 1,
    xp: 117,
    tierBefore: 0,
    tierAfter: 1,
    newBadges: [] as BadgeView[],
    missed: [] as { prompt: string; answer: string; why: string }[],
    onPlayAgain: () => undefined,
    onHome: () => undefined,
  };

  it('shows the stars earned, the message and the counts', () => {
    render(<ResultView {...props} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Amazing work!' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '3 of 3 stars' })).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('+117 XP', { exact: false })).toBeInTheDocument();
  });

  it.each([
    [2, 'Great job!'],
    [1, 'Nice try! Practice makes progress.'],
    [0, "Let's try again. You'll get better each time!"],
  ])('says the right thing for %i stars', (stars, message) => {
    render(<ResultView {...props} stars={stars} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(message);
    expect(screen.getByRole('img', { name: `${stars} of 3 stars` })).toBeInTheDocument();
  });

  it('announces a tier increase, player level-up and the daily bonus', () => {
    render(<ResultView {...props} playerLevel={4} dailyBonusXp={30} />);
    expect(screen.getByText('Level up! This island is now level 2')).toBeInTheDocument();
    expect(screen.getByText('Player level 4!')).toBeInTheDocument();
    expect(screen.getByText('Daily goal done! +30 XP')).toBeInTheDocument();
  });

  it('announces an easier next round when the tier drops', () => {
    render(<ResultView {...props} tierBefore={2} tierAfter={1} />);
    expect(screen.getByText('Next round will be a little easier.')).toBeInTheDocument();
  });

  it('says nothing about tiers when they do not change', () => {
    render(<ResultView {...props} tierBefore={1} tierAfter={1} />);
    expect(screen.queryByText(/Level up!/)).toBeNull();
    expect(screen.queryByText(/easier/)).toBeNull();
  });

  it('lists the missed questions with answer and explanation', () => {
    render(
      <ResultView
        {...props}
        missed={[{ prompt: '7 × 8', answer: '56', why: '7 groups of 8 make 56.' }]}
      />,
    );
    const review = screen.getByRole('heading', { name: "Let's review" }).parentElement as HTMLElement;
    expect(within(review).getByText('7 × 8')).toBeInTheDocument();
    expect(within(review).getByText('56')).toBeInTheDocument();
    expect(within(review).getByText('7 groups of 8 make 56.')).toBeInTheDocument();
  });

  it('hides the review section when nothing was missed', () => {
    render(<ResultView {...props} />);
    expect(screen.queryByRole('heading', { name: "Let's review" })).toBeNull();
  });

  it('shows new stickers', () => {
    render(<ResultView {...props} newBadges={[badge]} />);
    expect(screen.getByRole('heading', { name: 'New stickers!' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'First Steps' })).toBeInTheDocument();
  });

  it('offers play again (focused) and home', async () => {
    const onPlayAgain = vi.fn();
    const onHome = vi.fn();
    render(<ResultView {...props} onPlayAgain={onPlayAgain} onHome={onHome} />);
    expect(screen.getByRole('button', { name: 'Play again' })).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Play again' }));
    await userEvent.click(screen.getByRole('button', { name: 'Home' }));
    expect(onPlayAgain).toHaveBeenCalledOnce();
    expect(onHome).toHaveBeenCalledOnce();
  });
});

describe('RaceView', () => {
  const question = { prompt: '7 × 8', options: ['54', '56', '58', '64'] };

  it('shows the timer, score, combo and question', () => {
    render(
      <RaceView
        score={4}
        combo={2}
        secondsLeft={42}
        question={question}
        onPick={() => undefined}
        onBack={() => undefined}
      />,
    );
    expect(screen.getByRole('progressbar', { name: '42 seconds left' })).toHaveAttribute('aria-valuenow', '42');
    expect(screen.getByText('42s')).toBeInTheDocument();
    expect(screen.getByText('7 × 8 = ?')).toBeInTheDocument();
    expect(screen.getByText('Score:')).toBeInTheDocument();
  });

  it('picks by click and by number key', async () => {
    const onPick = vi.fn();
    render(
      <RaceView score={0} combo={0} secondsLeft={60} question={question} onPick={onPick} onBack={() => undefined} />,
    );
    await userEvent.click(screen.getByRole('button', { name: '58' }));
    await userEvent.keyboard('2');
    expect(onPick.mock.calls).toEqual([[2], [1]]);
  });

  it('shows the right and wrong options and ignores keys while locked', async () => {
    const onPick = vi.fn();
    render(
      <RaceView
        score={0}
        combo={0}
        secondsLeft={30}
        question={question}
        optionStates={['wrong', 'correct', 'idle', 'idle']}
        locked
        onPick={onPick}
        onBack={() => undefined}
      />,
    );
    expect(screen.getByRole('button', { name: '56' })).toHaveClass('pip-opt--correct');
    await userEvent.keyboard('3');
    expect(onPick).not.toHaveBeenCalled();
  });
});

describe('RaceResultView', () => {
  const props = { score: 14, isRecord: true, bestCombo: 6, record: 14, xp: 28, newBadges: [badge], onAgain: () => undefined, onHome: () => undefined };

  it('celebrates a new record with the figures', () => {
    render(<RaceResultView {...props} />);
    expect(screen.getByRole('heading', { level: 1, name: 'New record!' })).toBeInTheDocument();
    expect(screen.getByText('14', { selector: '.pip-race-score' })).toBeInTheDocument();
    expect(screen.getByText(/Best combo: 6/)).toBeInTheDocument();
    expect(screen.getByText(/\+28 XP/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'First Steps' })).toBeInTheDocument();
  });

  it('says time is up when there is no record', () => {
    render(<RaceResultView {...props} isRecord={false} newBadges={[]} />);
    expect(screen.getByRole('heading', { level: 1, name: "Time's up!" })).toBeInTheDocument();
  });

  it('does not call a zero score a record', () => {
    render(<RaceResultView {...props} score={0} isRecord />);
    expect(screen.getByRole('heading', { level: 1, name: "Time's up!" })).toBeInTheDocument();
  });

  it('offers race again and home', async () => {
    const onAgain = vi.fn();
    const onHome = vi.fn();
    render(<RaceResultView {...props} onAgain={onAgain} onHome={onHome} />);
    await userEvent.click(screen.getByRole('button', { name: 'Race again' }));
    await userEvent.click(screen.getByRole('button', { name: 'Home' }));
    expect(onAgain).toHaveBeenCalledOnce();
    expect(onHome).toHaveBeenCalledOnce();
  });
});

describe('StickerWall', () => {
  const stickers: StickerView[] = [
    { ...badge, owned: true },
    { id: 'perfect', glyph: 'crown', color: '#e8588a', title: 'Perfect Round', description: 'All 10 right', owned: false },
  ];

  it('shows how many stickers are owned', () => {
    render(<StickerWall stickers={stickers} />);
    expect(screen.getByRole('heading', { name: 'My stickers (1/2)' })).toBeInTheDocument();
  });

  it('shows earned stickers normally and locked ones as locked', () => {
    render(<StickerWall stickers={stickers} />);
    expect(screen.getByRole('img', { name: 'First Steps' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Perfect Round (Locked)' })).toBeInTheDocument();
    expect(screen.getByText('All 10 right')).toBeInTheDocument();
  });
});

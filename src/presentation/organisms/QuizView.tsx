import type { TopicId } from '@/domain/shared/types';
import { Button, Chip, Icon, Pip, RichText } from '../atoms';
import type { PipMood } from '../atoms';
import { hasModifier, isTypingTarget, useDocumentKeydown } from '../hooks/useDocumentKeydown';
import { useI18n } from '../i18n';
import { ChoiceGrid, FeedbackPanel, Keypad, NumberDisplay, ProgressDots, SpeechBubble } from '../molecules';
import type { ChoiceState, DotResult, KeypadKey } from '../molecules';

export interface QuizQuestionView {
  kind: 'choice' | 'num';
  /** Trusted domain markup. */
  prompt: string;
  /** Trusted domain markup; '' when the question has no visual. */
  vis: string;
  /** Choice questions only; trusted domain markup per option. */
  options?: readonly string[];
  /** Numeric questions only: whether the keypad accepts decimals. */
  decimal: boolean;
}

export interface QuizFeedbackView {
  kind: 'good' | 'bad' | 'tip';
  title: string;
  /** Trusted domain markup (hint or explanation). */
  body?: string;
  /** Show the Next/Finish button. */
  showNext: boolean;
}

export interface QuizViewProps {
  question: QuizQuestionView;
  /** Zero-based index of the current question. */
  index: number;
  total: number;
  results: readonly (DotResult | undefined)[];
  topicId: TopicId;
  topicAccent: string;
  mood: PipMood;
  bubble: string;
  /** Numeric questions: the raw typed value ('.' as decimal separator). */
  input: string;
  inputStatus?: 'idle' | 'correct' | 'wrong';
  optionStates?: readonly ChoiceState[];
  /** The question is settled (or being judged): no answering, no hint. */
  locked: boolean;
  feedback?: QuizFeedbackView;
  /** Last question: the Next button says Finish. */
  isLast?: boolean;
  onBack(): void;
  onChoose(index: number): void;
  onKey(key: KeypadKey): void;
  onSubmit(): void;
  onHint(): void;
  onNext(): void;
}

const isAnswerControl = (target: EventTarget | null) =>
  target instanceof Element && target.closest('.pip-key, .pip-opt') !== null;

export function QuizView(props: QuizViewProps) {
  const { t } = useI18n();
  const { question, locked, feedback } = props;
  const isChoice = question.kind === 'choice';

  useDocumentKeydown((e) => {
    if (hasModifier(e) || isTypingTarget(e.target)) return;
    const onOtherButton = e.target instanceof HTMLButtonElement && !isAnswerControl(e.target);

    if (e.key === 'Enter') {
      // A focused button (Next, Check, Back, Hint...) already reacts to Enter by itself.
      if (onOtherButton) return;
      if (feedback?.showNext) {
        e.preventDefault();
        props.onNext();
      } else if (!isChoice && !locked) {
        e.preventDefault();
        props.onSubmit();
      }
      return;
    }
    if (locked) return;

    if (isChoice) {
      if (!/^[1-9]$/.test(e.key)) return;
      const i = Number(e.key) - 1;
      const state = props.optionStates?.[i] ?? 'idle';
      if (question.options?.[i] !== undefined && state !== 'wrong' && state !== 'disabled') props.onChoose(i);
    } else if (/^[0-9]$/.test(e.key)) {
      props.onKey(e.key as KeypadKey);
    } else if ((e.key === '.' || e.key === ',') && question.decimal) {
      props.onKey('.');
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      props.onKey('del');
    }
  });

  return (
    <div className="pip-quiz">
      <div className="pip-qtop">
        <Button variant="alt" size="sm" aria-label={t('common.back')} onClick={props.onBack}>
          ←
        </Button>
        <ProgressDots total={props.total} current={props.index} results={props.results} />
        <Chip>
          <span style={{ color: props.topicAccent, display: 'inline-flex' }}>
            <Icon name={props.topicId} />
          </span>
          {props.index + 1}/{props.total}
        </Chip>
      </div>

      <div className="pip-stage">
        <div>
          <Pip mood={props.mood} size={84} />
        </div>
        <SpeechBubble compact>{props.bubble}</SpeechBubble>
      </div>

      <section className="pip-qcard">
        <RichText as="h2" className="prompt" html={question.prompt} />
        {question.vis && <RichText as="div" className="pip-vis" html={question.vis} />}

        {isChoice ? (
          <ChoiceGrid
            options={question.options ?? []}
            states={props.optionStates}
            disabled={locked}
            onSelect={props.onChoose}
          />
        ) : (
          <>
            <NumberDisplay value={props.input} status={props.inputStatus} />
            <Keypad decimal={question.decimal} disabled={locked} onKey={props.onKey} />
            <Button size="big" disabled={locked} onClick={props.onSubmit}>
              {t('common.check')}
            </Button>
          </>
        )}

        <div className="pip-tools">
          <Button variant="alt" size="sm" disabled={locked} onClick={props.onHint}>
            {t('common.hint')}
          </Button>
        </div>
      </section>

      <div className="pip-fb-slot" aria-live="polite">
        {feedback && (
          <FeedbackPanel
            kind={feedback.kind}
            title={feedback.title}
            onNext={feedback.showNext ? props.onNext : undefined}
            nextLabel={props.isLast ? t('common.finish') : t('common.next')}
          >
            {feedback.body && <RichText as="p" html={feedback.body} />}
          </FeedbackPanel>
        )}
      </div>
    </div>
  );
}

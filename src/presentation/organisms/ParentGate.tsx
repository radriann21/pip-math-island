import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button, TextField } from '../atoms';
import { useI18n } from '../i18n';

interface ParentGateProps {
  /** Plain text of the challenge, e.g. "7 × 8". */
  question: string;
  /** Receives the raw typed answer; the owner checks it (see `checkGateAnswer`). */
  onSubmit(answer: string): void;
  onCancel(): void;
  /** The last answer was wrong. */
  error?: boolean;
}

export function ParentGate({ question, onSubmit, onCancel, error = false }: ParentGateProps) {
  const { t } = useI18n();
  const [answer, setAnswer] = useState('');
  const empty = answer.trim() === '';

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!empty) onSubmit(answer.trim());
  };

  return (
    <form className="pip-gate" onSubmit={handleSubmit} noValidate>
      <h1>{t('gate.title')}</h1>
      <p>{t('gate.intro')}</p>
      <p className="pip-gate__question">{t('gate.question', { question })}</p>
      <TextField
        id="gate-answer"
        label={t('gate.answer')}
        inputMode="numeric"
        autoComplete="off"
        autoFocus
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        error={error ? t('gate.wrong') : undefined}
      />
      <div className="pip-row">
        <Button type="submit" disabled={empty}>
          {t('gate.submit')}
        </Button>
        <Button variant="alt" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}

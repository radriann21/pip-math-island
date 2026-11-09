import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Grade, Locale } from '@/domain/shared/types';
import { Button, Chip, TextField } from '../atoms';
import { useI18n } from '../i18n';
import type { MessageKey } from '../i18n';

/** Child privacy rule: only a first name or nickname, at most 24 characters. */
export const CHILD_NAME_MAX = 24;

const GRADES: readonly Grade[] = [1, 2, 3, 4, 5, 6];
const LOCALES: readonly Locale[] = ['en', 'es'];

/** Returns the message key of the problem with the name, or null when it is acceptable. */
export function validateChildName(name: string): MessageKey | null {
  const trimmed = name.trim();
  if (trimmed === '') return 'child.error.nameRequired';
  if (Array.from(trimmed).length > CHILD_NAME_MAX) return 'child.error.nameTooLong';
  return null;
}

export interface ChildFormValues {
  name: string;
  grade: Grade;
  locale: Locale;
}

interface ChildFormProps {
  mode: 'create' | 'edit';
  initial?: ChildFormValues;
  onSubmit(values: ChildFormValues): void;
  onCancel(): void;
  submitting?: boolean;
  /** Already-translated error from the owner. */
  error?: string;
}

export function ChildForm({ mode, initial, onSubmit, onCancel, submitting = false, error }: ChildFormProps) {
  const { t, locale: uiLocale } = useI18n();
  const [name, setName] = useState(initial?.name ?? '');
  const [grade, setGrade] = useState<Grade>(initial?.grade ?? 1);
  const [locale, setLocale] = useState<Locale>(initial?.locale ?? uiLocale);
  const [nameError, setNameError] = useState<MessageKey | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const problem = validateChildName(name);
    setNameError(problem);
    if (problem) return;
    onSubmit({ name: name.trim(), grade, locale });
  };

  return (
    <form className="pip-childform" onSubmit={handleSubmit} noValidate>
      <h1>{mode === 'create' ? t('child.form.createTitle') : t('child.form.editTitle')}</h1>

      <TextField
        id="child-name"
        label={t('child.form.name')}
        hint={t('child.form.nameHint', { max: CHILD_NAME_MAX })}
        autoComplete="off"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={nameError ? t(nameError, { max: CHILD_NAME_MAX }) : undefined}
      />

      <fieldset className="pip-childform__group">
        <legend>{t('child.form.grade')}</legend>
        <div className="pip-chips">
          {GRADES.map((g) => (
            <Chip key={g} pressed={g === grade} onClick={() => setGrade(g)}>
              {g}
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset className="pip-childform__group">
        <legend>{t('child.form.locale')}</legend>
        <div className="pip-chips">
          {LOCALES.map((l) => (
            <Chip key={l} pressed={l === locale} onClick={() => setLocale(l)}>
              {l === 'en' ? t('locale.english') : t('locale.spanish')}
            </Chip>
          ))}
        </div>
      </fieldset>

      {error && (
        <p className="pip-field__error" role="alert">
          {error}
        </p>
      )}

      <div className="pip-row">
        <Button type="submit" disabled={submitting}>
          {submitting ? t('child.form.submitting') : t('common.save')}
        </Button>
        <Button variant="alt" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}

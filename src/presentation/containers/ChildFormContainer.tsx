import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDeps } from '@/app/context';
import { createChild, listChildren, updateChild } from '@/application/usecases';
import { useI18n } from '../i18n';
import { StatePanel } from '../molecules';
import { ChildForm } from '../organisms';
import type { ChildFormValues } from '../organisms';
import { describeError } from './errors';
import { useAsyncData } from './useAsyncData';

interface ChildFormContainerProps {
  /** Edit this child; omit to create a new one. */
  childId?: string;
}

/** Where to go after saving or cancelling: the page that sent us here, or the child list. */
function useReturnPath(): string {
  const { state } = useLocation() as { state: { returnTo?: string } | null };
  return state?.returnTo ?? '/children';
}

export function ChildFormContainer({ childId }: ChildFormContainerProps) {
  const { t } = useI18n();
  const deps = useDeps();
  const navigate = useNavigate();
  const returnTo = useReturnPath();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const { state, reload } = useAsyncData(() => (childId ? listChildren(deps) : Promise.resolve([])), `form:${childId ?? 'new'}`);

  if (state.status === 'loading') return <StatePanel kind="loading" />;
  if (state.status === 'error') {
    const { key, params } = describeError(state.error);
    return <StatePanel kind="error" message={t(key, params)} onRetry={reload} />;
  }
  const existing = childId ? state.data.find((c) => c.id === childId) : undefined;
  if (childId && !existing) return <StatePanel kind="error" message={t('error.notFound')} />;

  const handleSubmit = async (values: ChildFormValues) => {
    setSubmitting(true);
    setError(undefined);
    try {
      if (existing) await updateChild(deps, existing.id, values);
      else await createChild(deps, values);
      navigate(returnTo, { replace: true });
    } catch (e) {
      const { key, params } = describeError(e);
      setError(t(key, params));
      setSubmitting(false);
    }
  };

  return (
    <ChildForm
      mode={existing ? 'edit' : 'create'}
      initial={existing ? { name: existing.name, grade: existing.grade, locale: existing.locale } : undefined}
      onSubmit={(v) => void handleSubmit(v)}
      onCancel={() => navigate(returnTo, { replace: true })}
      submitting={submitting}
      error={error}
    />
  );
}

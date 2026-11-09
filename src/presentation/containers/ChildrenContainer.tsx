import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, useDeps } from '@/app/context';
import { listChildren, removeChild } from '@/application/usecases';
import { StatePanel } from '../molecules';
import { useI18n } from '../i18n';
import { ChildPicker } from '../organisms';
import { describeError } from './errors';
import { useAsyncData } from './useAsyncData';

export function ChildrenContainer() {
  const { t } = useI18n();
  const deps = useDeps();
  const navigate = useNavigate();
  const { activeChildId, setActiveChildId } = useApp();
  const { state, reload } = useAsyncData(() => listChildren(deps), 'children');
  const [actionError, setActionError] = useState<string>();

  if (state.status === 'loading') return <StatePanel kind="loading" />;
  if (state.status === 'error') {
    const { key, params } = describeError(state.error);
    return <StatePanel kind="error" message={t(key, params)} onRetry={reload} />;
  }

  const handleDelete = async (id: string) => {
    setActionError(undefined);
    try {
      await removeChild(deps, id);
      if (id === activeChildId) setActiveChildId(null);
      reload();
    } catch (e) {
      const { key, params } = describeError(e);
      setActionError(t(key, params));
    }
  };

  return (
    <>
      <ChildPicker
        profiles={state.data.map((c) => ({ id: c.id, name: c.name, grade: c.grade }))}
        onSelect={(id) => {
          setActiveChildId(id);
          navigate('/');
        }}
        onAdd={() => navigate('/children/new')}
        onEdit={(id) => navigate(`/children/${id}/edit`)}
        onDelete={(id) => void handleDelete(id)}
      />
      {actionError && (
        <p className="pip-field__error" role="alert">
          {actionError}
        </p>
      )}
    </>
  );
}

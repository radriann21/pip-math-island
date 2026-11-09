import { useState } from 'react';
import type { Grade } from '@/domain/shared/types';
import { Button, Pip } from '../atoms';
import { useI18n } from '../i18n';

export interface ChildProfileView {
  id: string;
  name: string;
  grade: Grade;
}

interface ChildPickerProps {
  profiles: readonly ChildProfileView[];
  onSelect(id: string): void;
  onAdd(): void;
  onEdit(id: string): void;
  /** Called only after the parent confirmed the deletion. */
  onDelete(id: string): void;
}

export function ChildPicker({ profiles, onSelect, onAdd, onEdit, onDelete }: ChildPickerProps) {
  const { t } = useI18n();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  return (
    <section className="pip-picker">
      <h1>{t('child.picker.title')}</h1>

      {profiles.length === 0 ? (
        <p className="pip-picker__empty">{t('child.picker.empty')}</p>
      ) : (
        <ul className="pip-picker__list">
          {profiles.map((p) => (
            <li key={p.id} className="pip-picker__item">
              {pendingDelete === p.id ? (
                <div className="pip-picker__confirm" role="alertdialog" aria-label={t('child.delete', { name: p.name })}>
                  <p>{t('child.deleteConfirm', { name: p.name })}</p>
                  <div className="pip-row">
                    <Button
                      size="sm"
                      onClick={() => {
                        setPendingDelete(null);
                        onDelete(p.id);
                      }}
                    >
                      {t('child.deleteYes')}
                    </Button>
                    <Button variant="alt" size="sm" onClick={() => setPendingDelete(null)}>
                      {t('child.deleteNo')}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className="pip-picker__play"
                    aria-label={t('child.play', { name: p.name })}
                    onClick={() => onSelect(p.id)}
                  >
                    <Pip size={56} decorative />
                    <span className="pip-picker__name">{p.name}</span>
                    <span className="pip-picker__grade">{t('child.gradeN', { n: p.grade })}</span>
                  </button>
                  <div className="pip-row">
                    <Button variant="alt" size="sm" aria-label={t('child.edit', { name: p.name })} onClick={() => onEdit(p.id)}>
                      {t('common.edit')}
                    </Button>
                    <Button variant="alt" size="sm" aria-label={t('child.delete', { name: p.name })} onClick={() => setPendingDelete(p.id)}>
                      {t('common.delete')}
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <Button onClick={onAdd}>{t('child.add')}</Button>
    </section>
  );
}

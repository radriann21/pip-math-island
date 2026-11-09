import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useApp, useDeps } from '@/app/context';
import { updateChild } from '@/application/usecases';
import { useI18n } from '../i18n';
import type { MessageKey } from '../i18n';
import { useOptionalPlayer } from '../containers/PlayerContext';
import { TopBar } from '../organisms';

interface PageShellProps {
  /** Page name for the browser tab; omit on the home page. */
  titleKey?: MessageKey;
  children: ReactNode;
  onBack?: () => void;
  /** Extra top bar controls, e.g. sign out. */
  actions?: ReactNode;
  /** No top bar (full-screen games bring their own back button). */
  bare?: boolean;
}

/**
 * After a navigation, moves keyboard and screen reader focus to the page heading, unless something inside
 * the page already took focus (an autofocused field, the "Next" button...) or the user started interacting.
 * Content that loads later is picked up through a mutation observer.
 */
function useHeadingFocus(ref: React.RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const main = ref.current;
    if (!main) return;
    let settled = false;
    const settle = () => {
      settled = true;
      observer.disconnect();
      document.removeEventListener('keydown', settle, true);
      document.removeEventListener('pointerdown', settle, true);
    };
    const tryFocus = () => {
      if (settled) return;
      const active = document.activeElement;
      if (active && active !== document.body && main.contains(active)) return settle();
      const heading = main.querySelector<HTMLElement>('h1, h2');
      if (!heading) return;
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      settle();
    };
    const observer = new MutationObserver(tryFocus);
    observer.observe(main, { childList: true, subtree: true });
    document.addEventListener('keydown', settle, true);
    document.addEventListener('pointerdown', settle, true);
    tryFocus();
    return settle;
  }, [ref]);
}

export function PageShell({ titleKey, children, onBack, actions, bare = false }: PageShellProps) {
  const { t, locale } = useI18n();
  const { soundEnabled, setSoundEnabled, setLocale } = useApp();
  const deps = useDeps();
  const player = useOptionalPlayer();
  const mainRef = useRef<HTMLElement>(null);
  useHeadingFocus(mainRef);

  useEffect(() => {
    document.title = titleKey ? `${t(titleKey)} · ${t('app.name')}` : t('app.name');
  }, [t, titleKey]);

  /** The language and sound switches also belong to the active child's profile. */
  const saveToChild = (patch: { locale?: 'en' | 'es'; soundEnabled?: boolean }) => {
    if (!player) return;
    updateChild(deps, player.player.child.id, patch).then(
      (child) => player.setPlayer({ ...player.player, child }),
      () => undefined,
    );
  };

  return (
    <div className="pip-app">
      {!bare && (
        <TopBar
          onBack={onBack}
          soundEnabled={soundEnabled}
          onToggleLocale={() => {
            const next = locale === 'en' ? 'es' : 'en';
            setLocale(next);
            saveToChild({ locale: next });
          }}
          onToggleSound={() => {
            setSoundEnabled(!soundEnabled);
            saveToChild({ soundEnabled: !soundEnabled });
          }}
          actions={actions}
        />
      )}
      <main ref={mainRef}>{children}</main>
    </div>
  );
}

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Button, Pip } from '@/presentation/atoms';
import { useI18n } from '@/presentation/i18n';

function Fallback({ onReload }: { onReload(): void }) {
  const { t } = useI18n();
  return (
    <div className="pip-state pip-state--error pip-center" role="alert">
      <Pip mood="sad" size={110} decorative />
      <h1>{t('error.boundary.title')}</h1>
      <p>{t('error.boundary.body')}</p>
      <Button onClick={onReload}>{t('error.reload')}</Button>
    </div>
  );
}

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Defaults to a full page reload. */
  onReload?: () => void;
}

/** Last line of defence: a render crash shows a friendly message instead of a blank page. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <Fallback onReload={this.props.onReload ?? (() => window.location.reload())} />;
  }
}

import { Navigate } from 'react-router-dom';
import { AuthContainer } from '../containers/AuthContainer';
import { useAuth } from '../containers/useAuth';
import { PageShell } from './PageShell';

export function LoginPage() {
  const { session } = useAuth();
  if (session) return <Navigate to="/" replace />;
  return (
    <PageShell titleKey="page.login">
      <AuthContainer />
    </PageShell>
  );
}

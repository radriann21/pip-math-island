import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { StatePanel } from '@/presentation/molecules';
import { useApp } from './context';

const lazyPage = <K extends string>(load: () => Promise<Record<K, React.ComponentType>>, name: K) =>
  lazy(() => load().then((m) => ({ default: m[name] })));

const LoginPage = lazyPage(() => import('@/presentation/pages/LoginPage'), 'LoginPage');
const ChildrenPage = lazyPage(() => import('@/presentation/pages/ChildrenPage'), 'ChildrenPage');
const ChildFormPage = lazyPage(() => import('@/presentation/pages/ChildFormPage'), 'ChildFormPage');

/** Parents and guests alike need a session; everyone else goes to the login page. */
function RequireSession() {
  const { session, sessionReady } = useApp();
  if (!sessionReady) return <StatePanel kind="loading" />;
  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<StatePanel kind="loading" />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireSession />}>
          <Route path="/children" element={<ChildrenPage />} />
          <Route path="/children/new" element={<ChildFormPage />} />
          <Route path="/children/:childId/edit" element={<ChildFormPage />} />
          <Route path="/" element={<Navigate to="/children" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

/** The browser router. Hash routing is avoided on purpose: Supabase auth returns tokens in the URL hash. */
export function AppRouter() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

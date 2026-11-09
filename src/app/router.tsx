import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { StatePanel } from '@/presentation/molecules';
import { RequireChild, RequireSession } from './guards';

const lazyPage = <K extends string>(load: () => Promise<Record<K, React.ComponentType>>, name: K) =>
  lazy(() => load().then((m) => ({ default: m[name] })));

const LoginPage = lazyPage(() => import('@/presentation/pages/LoginPage'), 'LoginPage');
const ChildrenPage = lazyPage(() => import('@/presentation/pages/ChildrenPage'), 'ChildrenPage');
const ChildFormPage = lazyPage(() => import('@/presentation/pages/ChildFormPage'), 'ChildFormPage');
const HomePage = lazyPage(() => import('@/presentation/pages/HomePage'), 'HomePage');
const PlayPage = lazyPage(() => import('@/presentation/pages/PlayPage'), 'PlayPage');
const RacePage = lazy(() => import('@/presentation/pages/RacePage'));
const StickersPage = lazyPage(() => import('@/presentation/pages/StickersPage'), 'StickersPage');
const ParentPage = lazy(() => import('@/presentation/pages/ParentPage'));

export function AppRoutes() {
  return (
    <Suspense fallback={<StatePanel kind="loading" />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireSession />}>
          <Route path="/children" element={<ChildrenPage />} />
          <Route path="/children/new" element={<ChildFormPage />} />
          <Route path="/children/:childId/edit" element={<ChildFormPage />} />
          <Route element={<RequireChild />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/play/:topic" element={<PlayPage />} />
            <Route path="/race" element={<RacePage />} />
            <Route path="/stickers" element={<StickersPage />} />
            <Route path="/parent" element={<ParentPage />} />
          </Route>
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

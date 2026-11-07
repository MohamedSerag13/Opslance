import { Suspense, lazy, LazyExoticComponent, ReactElement } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { ToastProvider } from './components/ui';
import ResetPassword from './pages/ResetPassword';

/** Route-level code splitting: each page ships as its own chunk. */
const lazyPage = (factory: () => Promise<{ default: React.ComponentType }>): LazyExoticComponent<React.ComponentType> =>
  lazy(factory);

const Landing = lazyPage(() => import('./pages/landing/Landing'));
const Login = lazyPage(() => import('./pages/Login'));
const StudentDashboard = lazyPage(() => import('./pages/StudentDashboard'));
const LabView = lazyPage(() => import('./pages/LabView'));
const LabRunner = lazyPage(() => import('./pages/LabRunner'));
const Progress = lazyPage(() => import('./pages/Progress'));
const Achievements = lazyPage(() => import('./pages/Achievements'));
const Leaderboard = lazyPage(() => import('./pages/Leaderboard'));
const Billing = lazyPage(() => import('./pages/Billing'));
const DesignSystem = lazyPage(() => import('./pages/DesignSystem'));
const NotFound = lazyPage(() => import('./pages/NotFound'));
const AdminDashboard = lazyPage(() => import('./pages/admin/AdminDashboard'));
const AdminAnalytics = lazyPage(() => import('./pages/admin/AdminAnalytics'));
const GroupsList = lazyPage(() => import('./pages/admin/GroupsList'));
const GroupDetail = lazyPage(() => import('./pages/admin/GroupDetail'));
const StudentsList = lazyPage(() => import('./pages/admin/StudentsList'));
const StudentDetail = lazyPage(() => import('./pages/admin/StudentDetail'));
const LabCatalog = lazyPage(() => import('./pages/admin/LabCatalog'));
const Environments = lazyPage(() => import('./pages/admin/Environments'));
const AdminLeaderboard = lazyPage(() => import('./pages/admin/AdminLeaderboard'));

const PageFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-bg">
    <div className="flex flex-col items-center gap-3">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-border border-t-primary" aria-label="Loading page" />
      <p className="text-sm font-medium text-muted">Loading…</p>
    </div>
  </div>
);

/**
 * Standard protected route.
 * If the student still has mustResetPassword set, force them to /reset-password
 * so they cannot access any other page until the reset is complete.
 */
const ProtectedRoute = ({ children, requireAdmin }: { children: ReactElement, requireAdmin?: boolean }) => {
  const { user, token, mustResetPassword } = useAuthStore();

  if (!token) return <Navigate to="/login" replace />;
  if (requireAdmin && user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  if (!requireAdmin && user?.role === 'admin') return <Navigate to="/admin" replace />;

  // Block student from reaching any route until they reset their password
  if (!requireAdmin && mustResetPassword) return <Navigate to="/reset-password" replace />;

  return children;
};

/**
 * Semi-protected route for /reset-password:
 * - Requires a valid token (user must have just logged in)
 * - Redirects away once the flag is cleared so the page can't be revisited
 */
const ResetPasswordRoute = () => {
  const { token, mustResetPassword } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (!mustResetPassword) return <Navigate to="/dashboard" replace />;
  return <ResetPassword />;
};

function App() {
  return (
    <ToastProvider>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPasswordRoute />} />
          {/* design system showcase — internal reference, requires sign-in */}
          <Route path="/design" element={<ProtectedRoute><DesignSystem /></ProtectedRoute>} />

          {/* Student Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
          <Route path="/labs/:id" element={<ProtectedRoute><LabView /></ProtectedRoute>} />
          <Route path="/labs/:id/run" element={<ProtectedRoute><LabRunner /></ProtectedRoute>} />
          <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
          <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
          <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />

          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/analytics" element={<ProtectedRoute requireAdmin><AdminAnalytics /></ProtectedRoute>} />
          <Route path="/admin/groups" element={<ProtectedRoute requireAdmin><GroupsList /></ProtectedRoute>} />
          <Route path="/admin/groups/:id" element={<ProtectedRoute requireAdmin><GroupDetail /></ProtectedRoute>} />
          <Route path="/admin/students" element={<ProtectedRoute requireAdmin><StudentsList /></ProtectedRoute>} />
          <Route path="/admin/students/:id" element={<ProtectedRoute requireAdmin><StudentDetail /></ProtectedRoute>} />
          <Route path="/admin/labs" element={<ProtectedRoute requireAdmin><LabCatalog /></ProtectedRoute>} />
          <Route path="/admin/environments" element={<ProtectedRoute requireAdmin><Environments /></ProtectedRoute>} />
          <Route path="/admin/leaderboard" element={<ProtectedRoute requireAdmin><AdminLeaderboard /></ProtectedRoute>} />

          {/* 404 — unknown routes get a real not-found page, not a silent redirect */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ToastProvider>
  );
}

export default App;

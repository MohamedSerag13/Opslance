import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import StudentDashboard from './pages/StudentDashboard';
import LabView from './pages/LabView';
import Progress from './pages/Progress';
import Leaderboard from './pages/Leaderboard';
import Billing from './pages/Billing';
import AdminDashboard from './pages/admin/AdminDashboard';
import GroupsList from './pages/admin/GroupsList';
import GroupDetail from './pages/admin/GroupDetail';
import StudentsList from './pages/admin/StudentsList';
import StudentDetail from './pages/admin/StudentDetail';
import LabCatalog from './pages/admin/LabCatalog';
import Environments from './pages/admin/Environments';
import AdminLeaderboard from './pages/admin/AdminLeaderboard';

/**
 * Standard protected route.
 * If the student still has mustResetPassword set, force them to /reset-password
 * so they cannot access any other page until the reset is complete.
 */
const ProtectedRoute = ({ children, requireAdmin }: { children: JSX.Element, requireAdmin?: boolean }) => {
  const { user, token, mustResetPassword } = useAuthStore();

  if (!token) return <Navigate to="/login" replace />;
  if (requireAdmin && user?.role !== 'admin') return <Navigate to="/" replace />;
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
  if (!mustResetPassword) return <Navigate to="/" replace />;
  return <ResetPassword />;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPasswordRoute />} />

      {/* Student Routes */}
      <Route path="/" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
      <Route path="/labs/:id" element={<ProtectedRoute><LabView /></ProtectedRoute>} />
      <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
      <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
      <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/groups" element={<ProtectedRoute requireAdmin><GroupsList /></ProtectedRoute>} />
      <Route path="/admin/groups/:id" element={<ProtectedRoute requireAdmin><GroupDetail /></ProtectedRoute>} />
      <Route path="/admin/students" element={<ProtectedRoute requireAdmin><StudentsList /></ProtectedRoute>} />
      <Route path="/admin/students/:id" element={<ProtectedRoute requireAdmin><StudentDetail /></ProtectedRoute>} />
      <Route path="/admin/labs" element={<ProtectedRoute requireAdmin><LabCatalog /></ProtectedRoute>} />
      <Route path="/admin/environments" element={<ProtectedRoute requireAdmin><Environments /></ProtectedRoute>} />
      <Route path="/admin/leaderboard" element={<ProtectedRoute requireAdmin><AdminLeaderboard /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

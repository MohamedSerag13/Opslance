import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import LabView from './pages/LabView';
import Progress from './pages/Progress';
import Leaderboard from './pages/Leaderboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import GroupsList from './pages/admin/GroupsList';
import GroupDetail from './pages/admin/GroupDetail';
import StudentsList from './pages/admin/StudentsList';
import StudentDetail from './pages/admin/StudentDetail';
import LabCatalog from './pages/admin/LabCatalog';
import Environments from './pages/admin/Environments';

const ProtectedRoute = ({ children, requireAdmin }: { children: JSX.Element, requireAdmin?: boolean }) => {
  const { user, token } = useAuthStore();
  
  if (!token) return <Navigate to="/login" replace />;
  if (requireAdmin && user?.role !== 'admin') return <Navigate to="/" replace />;
  if (!requireAdmin && user?.role === 'admin') return <Navigate to="/admin" replace />;
  
  return children;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Student Routes */}
      <Route path="/" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
      <Route path="/labs/:id" element={<ProtectedRoute><LabView /></ProtectedRoute>} />
      <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
      <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/groups" element={<ProtectedRoute requireAdmin><GroupsList /></ProtectedRoute>} />
      <Route path="/admin/groups/:id" element={<ProtectedRoute requireAdmin><GroupDetail /></ProtectedRoute>} />
      <Route path="/admin/students" element={<ProtectedRoute requireAdmin><StudentsList /></ProtectedRoute>} />
      <Route path="/admin/students/:id" element={<ProtectedRoute requireAdmin><StudentDetail /></ProtectedRoute>} />
      <Route path="/admin/labs" element={<ProtectedRoute requireAdmin><LabCatalog /></ProtectedRoute>} />
      <Route path="/admin/environments" element={<ProtectedRoute requireAdmin><Environments /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

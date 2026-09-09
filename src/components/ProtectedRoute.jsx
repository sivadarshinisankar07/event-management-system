import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// role: 'participant' | 'admin' | undefined (any authenticated user)
export default function ProtectedRoute({ children, role }) {
  const { isAuthenticated, currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role && currentUser.role !== role) {
    const fallback = currentUser.role === 'admin' ? '/admin/dashboard' : '/participant/dashboard';
    return <Navigate to={fallback} replace />;
  }

  return children;
}

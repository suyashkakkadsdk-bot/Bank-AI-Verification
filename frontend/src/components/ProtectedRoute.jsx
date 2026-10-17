import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ requireFullAccess = false, requiredRole = null }) => {
  const { isAuthenticated, loading, passwordChangeRequired, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
      }}>
        <div className="spinner" style={{ width: '32px', height: '32px' }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (requireFullAccess && passwordChangeRequired) {
    return <Navigate to="/admin/change-password" state={{ from: location.pathname }} replace />;
  }

  // Role-based access control
  if (requiredRole) {
    const userRole = user?.role || 'employee';
    const roleHierarchy = { admin: 3, manager: 2, employee: 1 };
    const requiredLevel = roleHierarchy[requiredRole] || 1;
    const userLevel = roleHierarchy[userRole] || 1;
    
    if (userLevel < requiredLevel) {
      return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
};

export const PublicOnlyRoute = () => {
  const { isAuthenticated, passwordChangeRequired, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
      }}>
        <div className="spinner" style={{ width: '32px', height: '32px' }} />
      </div>
    );
  }

  if (isAuthenticated) {
    if (passwordChangeRequired) {
      return <Navigate to="/admin/change-password" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
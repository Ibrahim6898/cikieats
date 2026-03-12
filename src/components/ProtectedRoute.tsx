import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'customer' | 'vendor' | 'rider' | 'admin';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requiredRole && role !== requiredRole) {
    // If we are already on the potential redirect path, don't redirect again to avoid loops
    const getRedirectPath = () => {
      if (role === 'vendor') return '/vendor';
      if (role === 'rider') return '/rider';
      if (role === 'admin') return '/admin';
      if (role === 'customer') return '/';
      return null;
    };

    const targetPath = getRedirectPath();
    
    // If we don't have a role yet but are authenticated, we might be in a race condition
    // Let's show a loading state instead of redirecting to the homepage
    if (!role) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Verifying your account permissions...</p>
          </div>
        </div>
      );
    }

    if (targetPath && window.location.pathname !== targetPath) {
      return <Navigate to={targetPath} replace />;
    }
    
    // Fallback if role is not allowed for this route and not covered by logic above
    if (role !== requiredRole && targetPath !== window.location.pathname) {
       return <Navigate to={targetPath || '/'} replace />;
    }
  }

  return <>{children}</>;
}

import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { AppRole } from '@/types';
import { toast } from 'sonner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: AppRole;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { hasRole, isLoading: roleLoading } = useUserRole();

  // TEMPORARY: Auth bypass for development (remove before production)
  const AUTH_BYPASS = localStorage.getItem('biko_dev_access') === 'granted';

  if (AUTH_BYPASS) {
    return <>{children}</>;
  }

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    toast.error(`Access denied: ${requiredRole} role required`);
    return <Navigate to="/fleetops" replace />;
  }

  return <>{children}</>;
}

import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAdminAuth } from '@/contexts/admin-auth-context';
import { Loader2 } from 'lucide-react';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
  requireSuperAdmin?: boolean;
}

export function AdminProtectedRoute({ children, requireSuperAdmin = false }: AdminProtectedRouteProps) {
  const { admin, isAuthenticated, isLoading } = useAdminAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        // Redirect to admin login with return path
        const currentPath = window.location.pathname;
        navigate(`/admin/login?returnPath=${encodeURIComponent(currentPath)}`);
        return;
      }

      if (requireSuperAdmin && admin?.role !== 'super_admin') {
        // Redirect to admin dashboard if not super admin
        navigate('/admin');
        return;
      }
    }
  }, [isAuthenticated, isLoading, admin, navigate, requireSuperAdmin]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Redirecting...
  }

  if (requireSuperAdmin && admin?.role !== 'super_admin') {
    return null; // Redirecting...
  }

  return <>{children}</>;
}
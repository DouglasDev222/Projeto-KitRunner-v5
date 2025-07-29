import React, { type ReactNode } from 'react';
import { useAdminAuth } from '@/contexts/admin-auth-context';
import { AdminLogin } from './admin-login';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface AdminRouteGuardProps {
  children: ReactNode;
  requiredRole?: 'super_admin' | 'admin';
}

export function AdminRouteGuard({ children, requiredRole = 'admin' }: AdminRouteGuardProps) {
  const { admin, isAuthenticated, isLoading } = useAdminAuth();

  // Mostrar loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Se não estiver autenticado, mostrar tela de login
  if (!isAuthenticated || !admin) {
    return <AdminLogin />;
  }

  // Verificar se o usuário tem a role necessária
  if (requiredRole === 'super_admin' && admin.role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
          <div className="text-red-500 mb-4">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-600 mb-4">
            Você não tem permissão para acessar esta área. 
            É necessário ser Super Administrador.
          </p>
          <p className="text-sm text-gray-500">
            Usuário atual: <strong>{admin.fullName}</strong> ({admin.role})
          </p>
        </div>
      </div>
    );
  }

  // Se passou em todas as verificações, renderizar o conteúdo
  return <>{children}</>;
}
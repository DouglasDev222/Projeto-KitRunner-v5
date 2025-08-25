import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { apiRequest } from '@/lib/queryClient';

interface AdminUser {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

interface AdminAuthProviderProps {
  children: ReactNode;
}

export function AdminAuthProvider({ children }: AdminAuthProviderProps) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar se há token armazenado e validá-lo
    const token = localStorage.getItem('adminToken');
    if (token) {
      verifyCurrentToken(token);
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifyCurrentToken = async (token: string) => {
    try {
      const response = await fetch('/api/admin/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAdmin(data.user);
      } else {
        // Token inválido, remover do storage
        localStorage.removeItem('adminToken');
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      localStorage.removeItem('adminToken');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('adminToken', data.token);
        setAdmin(data.user);
        return { success: true };
      } else {
        // Retorna o erro específico do servidor ou uma mensagem padrão
        return { 
          success: false, 
          error: data.error || 'Credenciais inválidas'
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Erro de conexão' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (token) {
        await fetch('/api/admin/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('adminToken');
      setAdmin(null);
    }
  };

  const refreshToken = async () => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      await verifyCurrentToken(token);
    }
  };

  const value: AdminAuthContextType = {
    admin,
    isAuthenticated: !!admin,
    isLoading,
    login,
    logout,
    refreshToken,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
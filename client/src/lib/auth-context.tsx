import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Customer } from '@shared/schema';

interface AuthContextType {
  user: Customer | null;
  login: (customer: Customer) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // Load user from localStorage on mount
    const loadUserFromStorage = () => {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const savedUser = localStorage.getItem('kitrunner_user');
          if (savedUser) {
            const parsedUser = JSON.parse(savedUser);
            // Validate that the parsed user has required fields
            if (parsedUser && parsedUser.id && parsedUser.name && parsedUser.cpf) {
              setUser(parsedUser);
            } else {
              localStorage.removeItem('kitrunner_user');
            }
          }
        }
      } catch (error) {
        console.warn('Failed to load user from localStorage:', error);
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.removeItem('kitrunner_user');
        }
      } finally {
        setIsLoading(false);
      }
    };

    // Small delay to ensure localStorage is available
    const timeout = setTimeout(loadUserFromStorage, 100);
    return () => clearTimeout(timeout);
  }, []);

  const login = (customer: Customer) => {
    setUser(customer);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('kitrunner_user', JSON.stringify(customer));
      // Clear old session storage
      sessionStorage.removeItem('customerData');
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('kitrunner_user');
      sessionStorage.clear();
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Customer } from '@shared/schema';

interface AuthContextType {
  user: Customer | null;
  login: (customer: Customer) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Customer | null>(null);

  useEffect(() => {
    // Load user from localStorage on mount
    const savedUser = localStorage.getItem('kitrunner_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      } catch (error) {
        localStorage.removeItem('kitrunner_user');
      }
    }
  }, []);

  const login = (customer: Customer) => {
    setUser(customer);
    localStorage.setItem('kitrunner_user', JSON.stringify(customer));
    // Clear old session storage
    sessionStorage.removeItem('customerData');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('kitrunner_user');
    sessionStorage.clear();
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
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
'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { apiPost } from './api';

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  lifetimeEarned: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (googleToken: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('ad-me-auth');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed.user);
      } catch {
        localStorage.removeItem('ad-me-auth');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (googleToken: string): Promise<User> => {
    const response = await apiPost<{
      user: User;
      accessToken: string;
      refreshToken: string;
    }>('/auth/google', { token: googleToken });

    setUser(response.user);
    localStorage.setItem('ad-me-auth', JSON.stringify({
      user: response.user,
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    }));
    return response.user;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('ad-me-auth');
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

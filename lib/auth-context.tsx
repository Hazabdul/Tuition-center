'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { User, AuthState } from '@/lib/types';

interface AuthContextValue extends AuthState {
  login: (accessToken: string, refreshToken: string, user: User, instituteCode?: string) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [instituteCode, setInstituteCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch current user from HttpOnly session cookie on mount
  useEffect(() => {
    async function initSession() {
      try {
        const res = await fetch('/api/v1/auth/me');
        const data = await res.json();
        if (data.success && data.data?.user) {
          setUser(data.data.user);
          if (data.data.user.instituteId) {
            setInstituteCode(data.data.user.instituteId);
          }
        }
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    initSession();
  }, []);

  const login = useCallback((access: string, _refresh: string, userData: User, code?: string) => {
    setAccessToken(access);
    setUser(userData);
    if (code) setInstituteCode(code);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setAccessToken(null);
    setUser(null);
    setInstituteCode(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/auth/me');
      const data = await res.json();
      if (data.success && data.data?.user) {
        setUser(data.data.user);
      }
    } catch {
      // ignore
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, instituteCode, login, logout, refreshUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

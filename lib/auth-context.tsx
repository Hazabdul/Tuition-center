'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { User, AuthState } from '@/lib/types';

const TOKEN_KEY = 'access_token';
const USER_KEY = 'user_data';
const INSTITUTE_CODE_KEY = 'institute_code';

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

  useEffect(() => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const userData = localStorage.getItem(USER_KEY);
      const code = localStorage.getItem(INSTITUTE_CODE_KEY);
      if (token && userData && userData !== 'undefined') {
        setAccessToken(token);
        setUser(JSON.parse(userData));
      }
      if (code) setInstituteCode(code);
    } catch {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback((access: string, _refresh: string, userData: User, code?: string) => {
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    if (code) localStorage.setItem(INSTITUTE_CODE_KEY, code);
    document.cookie = `access_token=${access}; Path=/; Max-Age=900; SameSite=Lax`;
    setAccessToken(access);
    setUser(userData);
    if (code) setInstituteCode(code);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      });
    } catch {
      // ignore
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(INSTITUTE_CODE_KEY);
    document.cookie = 'access_token=; Path=/; Max-Age=0; SameSite=Lax';
    setAccessToken(null);
    setUser(null);
    setInstituteCode(null);
  }, [accessToken]);

  const refreshUser = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (data.success && data.data?.user) {
        setUser(data.data.user);
        localStorage.setItem(USER_KEY, JSON.stringify(data.data.user));
      }
    } catch {
      // ignore
    }
  }, [accessToken]);

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

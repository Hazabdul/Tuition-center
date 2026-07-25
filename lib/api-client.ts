'use client';

import { useAuth } from './auth-context';
import type { ApiResponse } from './types';

export function useApi() {
  const { accessToken, logout } = useAuth();

  async function request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const res = await fetch(path, { ...options, headers });

    if (res.status === 401) {
      // Try refresh
      const refreshRes = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        if (refreshData.success && refreshData.data?.accessToken) {
          localStorage.setItem('access_token', refreshData.data.accessToken);
          localStorage.setItem('user_data', JSON.stringify(refreshData.data.user));
          headers['Authorization'] = `Bearer ${refreshData.data.accessToken}`;
          const retryRes = await fetch(path, { ...options, headers });
          return retryRes.json();
        }
      }
      await logout();
      const isSuperAdmin = typeof window !== 'undefined' && window.location.pathname.startsWith('/super-admin');
      window.location.href = isSuperAdmin ? '/auth/super-admin/login' : '/auth/login';
      throw new Error('Session expired');
    }

    return res.json();
  }

  return {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
    put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
    patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  };
}

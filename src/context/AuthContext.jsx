import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(sessionStorage.getItem('auth_token'));
  });
  const [isInitializing, setIsInitializing] = useState(true);
  const [user, setUser] = useState(() => {
    if (typeof window === 'undefined') return null;
    const raw = sessionStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('auth_token') : null;
      if (!token) {
        if (active) setIsInitializing(false);
        return;
      }

      try {
        const result = await authApi.me();
        const profile = result?.data || null;
        if (!active) return;
        if (!profile) throw new Error('Invalid session');
        setIsAuthenticated(true);
        setUser(profile);
        sessionStorage.setItem('auth_user', JSON.stringify(profile));
      } catch (_error) {
        if (!active) return;
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('auth_user');
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        if (active) setIsInitializing(false);
      }
    };

    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (username, password) => {
    const result = await authApi.login({ username, password });
    const token = result?.data?.token;
    const profile = result?.data?.user;

    if (!token || !profile) {
      throw new Error('Authentication response is invalid');
    }

    sessionStorage.setItem('auth_token', token);
    sessionStorage.setItem('auth_user', JSON.stringify(profile));
    setIsAuthenticated(true);
    setUser(profile);
    return true;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_user');
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    isAuthenticated,
    isInitializing,
    user,
    login,
    logout,
  }), [isAuthenticated, isInitializing, user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

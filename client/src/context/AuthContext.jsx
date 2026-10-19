import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost, setCsrfToken } from '../api/client.js';
import { AuthContext } from './authContextObject.js';

// Shares the signed-in user with every component. The user object comes from
// the server session (GET /api/auth/session); nothing about the login is
// stored in localStorage, so there is no token for a script to steal.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | offline
  const [sessionError, setSessionError] = useState(null);

  const refreshSession = useCallback(
    () =>
      apiGet('/auth/session').then(
        ({ data }) => {
          setCsrfToken(data.csrfToken);
          setUser(data.user);
          setSessionError(null);
          setStatus('ready');
        },
        (error) => {
          setSessionError(error);
          setStatus('offline');
        },
      ),
    [],
  );

  // Ask the server who is signed in when the app first loads.
  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  // The API client announces session changes it discovers (an expired
  // session returning 401, or a refreshed CSRF token).
  useEffect(() => {
    const onSession = (event) => setUser(event.detail);
    window.addEventListener('carepoint:session', onSession);
    return () => window.removeEventListener('carepoint:session', onSession);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await apiPost('/auth/login', { email, password });
    setCsrfToken(data.csrfToken);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (form) => {
    const { data } = await apiPost('/auth/register', form);
    setCsrfToken(data.csrfToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiPost('/auth/logout');
    } finally {
      setUser(null);
      // The old session (and its CSRF token) is gone; get a fresh anonymous one.
      await refreshSession();
    }
  }, [refreshSession]);

  const value = useMemo(
    () => ({ user, status, sessionError, login, register, logout, setUser, refreshSession }),
    [user, status, sessionError, login, register, logout, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

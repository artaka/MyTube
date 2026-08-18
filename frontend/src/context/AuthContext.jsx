import { createContext, useState, useEffect } from 'react';
import * as authApi from '../api/auth';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('access_token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user profile on token change
  useEffect(() => {
    const loadProfile = async () => {
      if (token) {
        localStorage.setItem('access_token', token);
        try {
          const profile = await authApi.getCurrentUser(token);
          setUser(profile);
        } catch (err) {
          console.error('Failed to load profile, resetting session:', err);
          setUser(null);
          setToken(null);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      } else {
        setUser(null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
      setLoading(false);
    };

    loadProfile();
  }, [token]);

  // Frequent authorization check (every 15s + window focus)
  useEffect(() => {
    if (!token) return;

    const checkAuth = async () => {
      try {
        const profile = await authApi.getCurrentUser(token);
        setUser(profile);
      } catch (err) {
        console.error('Periodic authentication check failed:', err);
      }
    };

    const interval = setInterval(checkAuth, 15000);
    window.addEventListener('focus', checkAuth);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkAuth);
    };
  }, [token]);

  // Handle logout event from the API client (unauthorized or failed refresh)
  useEffect(() => {
    const handleLogoutEvent = () => {
      setToken(null);
      setUser(null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    };
    window.addEventListener('auth-logout', handleLogoutEvent);
    return () => window.removeEventListener('auth-logout', handleLogoutEvent);
  }, []);

  // Handle Google OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (code && state) {
      authApi.handleGoogleCallback(code, state).then(async (data) => {
        if (data.access_token) {
          setToken(data.access_token);
          try {
            const refreshData = await authApi.getRefreshToken(data.access_token);
            if (refreshData.refresh_token) {
              localStorage.setItem('refresh_token', refreshData.refresh_token);
            }
          } catch (err) {
            console.error('Failed to acquire refresh token on Google OAuth:', err);
          }
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }).catch(() => {
        window.history.replaceState({}, document.title, window.location.pathname);
      });
    }
  }, []);

  const login = async (username, password) => {
    const data = await authApi.login(username, password);
    setToken(data.access_token);
    try {
      const refreshData = await authApi.getRefreshToken(data.access_token);
      if (refreshData.refresh_token) {
        localStorage.setItem('refresh_token', refreshData.refresh_token);
      }
    } catch (err) {
      console.error('Failed to acquire refresh token on Login:', err);
    }
    return data;
  };

  const register = async (email, username, password) => {
    await authApi.register(email, username, password);
  };

  const logout = async () => {
    try {
      if (token) await authApi.logout(token);
    } catch (err) {
      console.error('Logout request failed:', err);
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  };

  const loginWithGoogle = async () => {
    const data = await authApi.getGoogleAuthUrl();
    if (data.authorization_url) {
      let url = data.authorization_url;
      if (url.includes('prompt=none')) {
        url = url.replace('prompt=none', 'prompt=select_account');
      } else if (!url.includes('prompt=')) {
        url += '&prompt=select_account';
      }
      window.location.href = url;
    }
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, login, register, logout, loginWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
}

import { createContext, useState, useEffect } from 'react';
import * as authApi from '../api/auth';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('access_token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      localStorage.setItem('access_token', token);
      setUser(authApi.decodeToken(token));
    } else {
      setUser(null);
      localStorage.removeItem('access_token');
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (code && state) {
      authApi.handleGoogleCallback(code, state).then((data) => {
        if (data.access_token) {
          setToken(data.access_token);
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
    return data;
  };

  const register = async (email, username, password) => {
    await authApi.register(email, username, password);
  };

  const logout = async () => {
    try {
      if (token) await authApi.logout(token);
    } catch {
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('access_token');
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

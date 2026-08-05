import { createContext, useContext, useState, useCallback } from 'react';

const AuthModalContext = createContext(null);

export function AuthModalProvider({ children }) {
  const [showAuth, setShowAuth] = useState(false);
  const openAuth = useCallback(() => setShowAuth(true), []);
  const closeAuth = useCallback(() => setShowAuth(false), []);
  return (
    <AuthModalContext.Provider value={{ showAuth, openAuth, closeAuth }}>
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  return useContext(AuthModalContext);
}

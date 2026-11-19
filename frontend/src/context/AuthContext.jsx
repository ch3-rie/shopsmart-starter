import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    api.me()
      .then((data) => { if (active) setCustomer(data?.customer ?? null); })
      .catch(() => { if (active) setCustomer(null); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.login(email, password);
    setCustomer(data.customer);
    return data.customer;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setCustomer(null);
    }
  }, []);

  const value = useMemo(() => ({ customer, checking, login, logout }), [customer, checking, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// The hook lives beside its provider on purpose, like useCart in CartContext.jsx.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}

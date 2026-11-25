import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../services/api';
import { hasPermission } from '../config/permissions';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

const save = (user) => {
  try {
    localStorage.setItem('user', JSON.stringify(user));
  } catch {
    /* sem armazenamento: a sessão vale até fechar a aba */
  }
};

// Tema do usuário: 'light', 'dark' ou 'system' (segue o sistema operacional)
export function applyTheme(theme = 'system') {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', !!dark);
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  });

  // Ao abrir o sistema, atualiza o usuário (permissões e assinante podem ter mudado)
  useEffect(() => {
    if (!token) return;
    api
      .get('/auth/me')
      .then(({ data }) => {
        setUser(data);
        save(data);
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => applyTheme(user?.preferences?.theme), [user?.preferences?.theme]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    save(data.user);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const updatePreferences = async (patch) => {
    setUser((prev) => {
      const next = { ...prev, preferences: { ...prev?.preferences, ...patch } };
      save(next);
      return next;
    });
    try {
      await api.patch('/auth/me/preferences', patch);
    } catch {
      /* a preferência continua valendo nesta sessão */
    }
  };

  // Depois que o admin salva os dados da loja
  const setTenant = (tenant) =>
    setUser((prev) => {
      const next = { ...prev, tenant };
      save(next);
      return next;
    });

  const can = useCallback((permission) => hasPermission(user, permission), [user]);
  const isAdmin = user?.role === 'admin';
  const isSuper = user?.role === 'superadmin';

  return (
    <AuthCtx.Provider value={{ token, user, tenant: user?.tenant, login, logout, updatePreferences, setTenant, can, isAdmin, isSuper }}>
      {children}
    </AuthCtx.Provider>
  );
}

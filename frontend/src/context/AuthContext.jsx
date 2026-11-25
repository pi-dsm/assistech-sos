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

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  });

  // Ao abrir o sistema, atualiza o usuário (perfil e permissões podem ter mudado)
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

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    save(data.user);
    setToken(data.token);
    setUser(data.user);
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

  const can = useCallback((permission) => hasPermission(user, permission), [user]);
  const isOwner = user?.role === 'owner';
  const isAdmin = user?.role === 'admin' || isOwner;

  return (
    <AuthCtx.Provider value={{ token, user, login, logout, updatePreferences, can, isAdmin, isOwner }}>
      {children}
    </AuthCtx.Provider>
  );
}

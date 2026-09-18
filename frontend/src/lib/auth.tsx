import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from './api';
import { getToken, setToken, clearToken } from './api';

interface Usuario {
  id: string;
  nome: string;
  email: string;
}

interface AuthContextValue {
  usuario: Usuario | null;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setCarregando(false);
      return;
    }
    api.get<Usuario>('/auth/me')
      .then(setUsuario)
      .catch(() => clearToken())
      .finally(() => setCarregando(false));
  }, []);

  async function login(email: string, senha: string) {
    const data = await api.post<{ token: string; usuario: Usuario }>('/auth/login', { email, senha });
    setToken(data.token);
    setUsuario(data.usuario);
  }

  function logout() {
    clearToken();
    setUsuario(null);
    window.location.href = '/login';
  }

  return (
    <AuthContext.Provider value={{ usuario, carregando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}

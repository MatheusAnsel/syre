import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from './api';
import { getToken, setToken, clearToken, getRefreshToken, setRefreshToken, encerrarSessaoNoServidor } from './api';

interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: 'admin' | 'operador';
}

interface AuthContextValue {
  usuario: Usuario | null;
  isAdmin: boolean;
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
    const data = await api.post<{ token: string; refreshToken: string; usuario: Usuario }>('/auth/login', { email, senha });
    setToken(data.token);
    setRefreshToken(data.refreshToken);
    setUsuario(data.usuario);
  }

  function logout() {
    const refreshToken = getRefreshToken();
    if (refreshToken) encerrarSessaoNoServidor(refreshToken);
    clearToken();
    setUsuario(null);
    window.location.href = '/login';
  }

  return (
    <AuthContext.Provider value={{ usuario, isAdmin: usuario?.perfil === 'admin', carregando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}

import { notify } from './toast';

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const TOKEN_KEY = 'syre_token';
const REFRESH_KEY = 'syre_refresh';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function setRefreshToken(token: string) {
  localStorage.setItem(REFRESH_KEY, token);
}

/** Remove a sessão inteira (access e refresh token) do navegador. */
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// Várias requisições podem receber 401 ao mesmo tempo (ex.: o dashboard carrega vários painéis).
// Todas esperam a mesma renovação: o refresh token é de uso único, então renovar em paralelo
// faria o servidor tratar a segunda chamada como reuso e derrubar a sessão.
let renovacaoEmAndamento: Promise<boolean> | null = null;

function renovarSessao(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return Promise.resolve(false);

  if (!renovacaoEmAndamento) {
    renovacaoEmAndamento = (async () => {
      try {
        const res = await fetch(`${BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        setToken(data.token);
        setRefreshToken(data.refreshToken);
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      renovacaoEmAndamento = null;
    });
  }
  return renovacaoEmAndamento;
}

/** Avisa o servidor para revogar a sessão. keepalive permite que a chamada termine mesmo com o redirecionamento logo em seguida. */
export function encerrarSessaoNoServidor(refreshToken: string) {
  void fetch(`${BASE}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
    keepalive: true,
  }).catch(() => undefined);
}

async function request<T>(path: string, options?: RequestInit, jaTentouRenovar = false): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });
  if (res.status === 401 && !path.startsWith('/auth/')) {
    // Access token vencido: tenta renovar a sessão uma vez e repete a chamada original.
    if (!jaTentouRenovar && (await renovarSessao())) {
      return request<T>(path, options, true);
    }
    clearToken();
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Sessão expirada');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const mensagem = err.error || 'Erro na requisição';
    // Ações de gravação avisam o usuário (ex.: estoque insuficiente). A tela de login exibe o erro por conta própria.
    const gravacao = options?.method && options.method !== 'GET';
    if (gravacao && !path.startsWith('/auth/')) notify(mensagem, 'error');
    throw new Error(mensagem);
  }
  if (res.status === 204) return {} as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

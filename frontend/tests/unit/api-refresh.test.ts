import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, getToken, getRefreshToken, setToken, setRefreshToken, clearToken, encerrarSessaoNoServidor } from '../../src/lib/api';

function resposta(status: number, corpo: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => corpo };
}

describe('renovação automática da sessão', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    setToken('access-vencido');
    setRefreshToken('refresh-1');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('em 401, renova a sessão, guarda o par novo e repete a requisição original', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(resposta(401, { error: 'Sessão inválida ou expirada' })) // GET /clientes
      .mockResolvedValueOnce(resposta(200, { token: 'access-novo', refreshToken: 'refresh-2' })) // POST /auth/refresh
      .mockResolvedValueOnce(resposta(200, [{ id: '1' }])); // GET /clientes repetido
    global.fetch = fetchMock as unknown as typeof fetch;

    const dados = await api.get('/clientes');

    expect(dados).toEqual([{ id: '1' }]);
    expect(getToken()).toBe('access-novo');
    expect(getRefreshToken()).toBe('refresh-2');

    const [urlRefresh, optsRefresh] = fetchMock.mock.calls[1];
    expect(urlRefresh).toContain('/auth/refresh');
    expect(JSON.parse(optsRefresh.body)).toEqual({ refreshToken: 'refresh-1' });
    // a repetição usa o access token novo
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe('Bearer access-novo');
  });

  it('se a renovação falha, limpa a sessão inteira e rejeita', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(resposta(401, { error: 'x' }))
      .mockResolvedValueOnce(resposta(401, { error: 'Sessão inválida ou expirada' })) as unknown as typeof fetch;

    await expect(api.get('/clientes')).rejects.toThrow('Sessão expirada');

    expect(getToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it('só tenta renovar uma vez: se a repetição também der 401, desloga', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(resposta(401, {}))
      .mockResolvedValueOnce(resposta(200, { token: 'a2', refreshToken: 'r2' }))
      .mockResolvedValueOnce(resposta(401, {}));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(api.get('/clientes')).rejects.toThrow('Sessão expirada');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(getRefreshToken()).toBeNull();
  });

  it('requisições simultâneas com 401 compartilham uma única renovação', async () => {
    let renovacoes = 0;
    global.fetch = vi.fn(async (url: string, opts?: RequestInit) => {
      if (url.includes('/auth/refresh')) {
        renovacoes += 1;
        return resposta(200, { token: 'access-novo', refreshToken: 'refresh-2' });
      }
      const auth = (opts?.headers as Record<string, string>).Authorization;
      return auth === 'Bearer access-novo' ? resposta(200, { ok: true }) : resposta(401, {});
    }) as unknown as typeof fetch;

    const resultados = await Promise.all([api.get('/a'), api.get('/b'), api.get('/c')]);

    expect(resultados).toHaveLength(3);
    expect(renovacoes).toBe(1);
  });

  it('sem refresh token guardado, não tenta renovar', async () => {
    localStorage.removeItem('syre_refresh');
    const fetchMock = vi.fn().mockResolvedValue(resposta(401, {}));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(api.get('/clientes')).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('não tenta renovar em falhas de rotas /auth (ex.: login com senha errada)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(resposta(401, { error: 'Credenciais inválidas' }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(api.post('/auth/login', { email: 'x', senha: 'y' })).rejects.toThrow('Credenciais inválidas');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('encerrarSessaoNoServidor', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('envia o refresh token ao logout com keepalive, para sobreviver ao redirecionamento', () => {
    const fetchMock = vi.fn().mockResolvedValue(resposta(204, {}));
    global.fetch = fetchMock as unknown as typeof fetch;

    encerrarSessaoNoServidor('refresh-1');

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain('/auth/logout');
    expect(opts.keepalive).toBe(true);
    expect(JSON.parse(opts.body)).toEqual({ refreshToken: 'refresh-1' });
  });

  it('clearToken remove access e refresh token', () => {
    setToken('a');
    setRefreshToken('r');
    clearToken();
    expect(getToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });
});

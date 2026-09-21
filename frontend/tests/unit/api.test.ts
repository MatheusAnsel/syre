import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getToken, setToken, clearToken, api } from '../../src/lib/api';
import { subscribeToast } from '../../src/lib/toast';

describe('getToken/setToken/clearToken', () => {
  beforeEach(() => localStorage.clear());

  it('começa sem token', () => {
    expect(getToken()).toBeNull();
  });

  it('guarda e devolve o token', () => {
    setToken('abc.def.ghi');
    expect(getToken()).toBe('abc.def.ghi');
  });

  it('remove o token', () => {
    setToken('abc.def.ghi');
    clearToken();
    expect(getToken()).toBeNull();
  });
});

describe('api (request) — tratamento de erro', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('dispara um toast de erro quando uma escrita falha (rota que não é /auth)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Informe o CPF/CNPJ em formato válido' }),
    }) as unknown as typeof fetch;

    const avisos: string[] = [];
    const unsubscribe = subscribeToast((t) => avisos.push(t.message));

    await expect(api.post('/clientes', { nome: 'Teste' })).rejects.toThrow(
      'Informe o CPF/CNPJ em formato válido'
    );
    expect(avisos).toEqual(['Informe o CPF/CNPJ em formato válido']);
    unsubscribe();
  });

  it('NÃO dispara toast para falha em rota de autenticação (login mostra o erro por conta própria)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Credenciais inválidas' }),
    }) as unknown as typeof fetch;

    const listener = vi.fn();
    const unsubscribe = subscribeToast(listener);

    await expect(api.post('/auth/login', { email: 'x', senha: 'y' })).rejects.toThrow();
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('não dispara toast para GET (só ações de gravação avisam)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Erro interno do servidor' }),
    }) as unknown as typeof fetch;

    const listener = vi.fn();
    const unsubscribe = subscribeToast(listener);

    await expect(api.get('/clientes')).rejects.toThrow();
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('em resposta 401, limpa o token guardado', async () => {
    setToken('token-antigo');
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Sessão expirada' }),
    }) as unknown as typeof fetch;

    await expect(api.get('/clientes')).rejects.toThrow();
    expect(getToken()).toBeNull();
  });
});

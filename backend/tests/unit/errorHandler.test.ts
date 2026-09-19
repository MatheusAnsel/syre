import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { errorHandler } from '../../src/middleware/errorHandler';

function executar(erro: Error) {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  errorHandler(erro, {} as Request, res as unknown as Response, vi.fn());
  return res;
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('errorHandler', () => {
  it('em produção não expõe detalhes internos do erro', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const res = executar(new Error('relation "usuarios" does not exist'));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Erro interno do servidor' });
  });

  it('em desenvolvimento devolve a mensagem do erro para facilitar o diagnóstico', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const res = executar(new Error('falha de teste'));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'falha de teste' });
  });

  it('usa mensagem genérica quando o erro não tem mensagem', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const res = executar(new Error(''));
    expect(res.json).toHaveBeenCalledWith({ error: 'Erro interno do servidor' });
  });

  it('registra o erro no log do servidor', () => {
    const erro = new Error('algo deu errado');
    executar(erro);
    expect(console.error).toHaveBeenCalledWith(erro);
  });
});

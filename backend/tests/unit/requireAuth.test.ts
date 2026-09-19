import { describe, it, expect, vi, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';
import { requireAuth } from '../../src/middleware/requireAuth';

const SEGREDO = process.env.JWT_SECRET as string;

function montarResposta() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}

function executar(authorization?: string) {
  const req = { headers: { authorization } } as unknown as Request;
  const res = montarResposta();
  const next = vi.fn();
  requireAuth(req, res as unknown as Response, next);
  return { req, res, next };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('requireAuth', () => {
  it('responde 401 quando não há header Authorization', () => {
    const { res, next } = executar(undefined);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Não autenticado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('responde 401 quando o header não usa o esquema Bearer', () => {
    const { res, next } = executar('Basic dXNlcjpzZW5oYQ==');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('libera a requisição e expõe userId e userEmail com token válido', () => {
    const token = jwt.sign({ sub: 'user-123', email: 'a@b.com' }, SEGREDO, { expiresIn: '1h' });
    const { req, res, next } = executar(`Bearer ${token}`);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
    expect((req as any).userId).toBe('user-123');
    expect((req as any).userEmail).toBe('a@b.com');
  });

  it('responde 401 para token malformado', () => {
    const { res, next } = executar('Bearer isto-nao-e-um-jwt');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Sessão inválida ou expirada' });
    expect(next).not.toHaveBeenCalled();
  });

  it('responde 401 para token assinado com outro segredo', () => {
    const token = jwt.sign({ sub: 'user-123', email: 'a@b.com' }, 'outro-segredo');
    const { res, next } = executar(`Bearer ${token}`);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('responde 401 para token expirado', () => {
    const token = jwt.sign({ sub: 'user-123', email: 'a@b.com' }, SEGREDO, { expiresIn: -10 });
    const { res, next } = executar(`Bearer ${token}`);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejeita token com algoritmo "none"', () => {
    const cabecalho = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const corpo = Buffer.from(JSON.stringify({ sub: 'user-123', email: 'a@b.com' })).toString('base64url');
    const { res, next } = executar(`Bearer ${cabecalho}.${corpo}.`);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('responde 500 quando JWT_SECRET não está configurado no servidor', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const token = jwt.sign({ sub: 'user-123', email: 'a@b.com' }, SEGREDO);
    vi.stubEnv('JWT_SECRET', '');
    try {
      const { res, next } = executar(`Bearer ${token}`);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Erro de configuração do servidor' });
      expect(next).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

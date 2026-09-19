import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { errorHandler } from '../../src/middleware/errorHandler';
import { ErroHttp } from '../../src/utils/validacao';

function executar(erro: Error) {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  errorHandler(erro, {} as Request, res as unknown as Response, vi.fn());
  return res;
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
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

  it('devolve o status e a mensagem de um ErroHttp sem tratá-lo como falha do servidor', () => {
    const res = executar(new ErroHttp(409, 'Estoque insuficiente'));
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Estoque insuficiente' });
    expect(console.error).not.toHaveBeenCalled();
  });

  it.each([
    ['23505', 409],
    ['23503', 409],
    ['23502', 400],
    ['23514', 400],
    ['22P02', 400],
    ['22003', 400],
    ['22001', 400],
    ['22007', 400],
  ])('traduz o erro do Postgres %s para HTTP %i sem repassar o texto do banco', (code, status) => {
    const erro = Object.assign(new Error('detalhe interno: tabela clientes coluna cpf_cnpj'), { code });
    const res = executar(erro);
    expect(res.status).toHaveBeenCalledWith(status);
    const corpo = res.json.mock.calls[0][0];
    expect(corpo.error).not.toMatch(/tabela|coluna|clientes|cpf_cnpj/);
  });

  it('usa mensagem específica para CPF/CNPJ duplicado', () => {
    const erro = Object.assign(new Error('duplicate key'), { code: '23505', constraint: 'clientes_cpf_cnpj_key' });
    const res = executar(erro);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'CPF/CNPJ já cadastrado' });
  });

  it('usa mensagem genérica para duplicidade de constraint desconhecida', () => {
    const erro = Object.assign(new Error('duplicate key'), { code: '23505', constraint: 'qualquer_coisa_key' });
    const res = executar(erro);
    expect(res.json).toHaveBeenCalledWith({ error: 'Já existe um registro com esses dados' });
  });

  it('responde 400 para JSON malformado e 413 para corpo grande demais', () => {
    const malformado = executar(Object.assign(new SyntaxError('Unexpected token'), { type: 'entity.parse.failed' }));
    const grande = executar(Object.assign(new Error('too large'), { type: 'entity.too.large' }));
    expect(malformado.status).toHaveBeenCalledWith(400);
    expect(grande.status).toHaveBeenCalledWith(413);
  });
});

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { api, resetDb, closeDb, criarUsuario, query } from '../helpers';
import { hashToken } from '../../src/services/tokenService';

// Cada arquivo de teste tem o seu próprio rate limit em memória: aqui são poucos logins e menos de 30 renovações.

beforeEach(resetDb);
afterAll(closeDb);

async function logar() {
  const usuario = await criarUsuario();
  const res = await api().post('/api/auth/login').send({ email: usuario.email, senha: usuario.senha });
  return { usuario, accessToken: res.body.token as string, refreshToken: res.body.refreshToken as string };
}

describe('POST /api/auth/refresh', () => {
  it('troca o refresh token por um par novo e o token antigo deixa de valer', async () => {
    const { refreshToken } = await logar();

    const res = await api().post('/api/auth/refresh').send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.refreshToken).toEqual(expect.any(String));
    expect(res.body.refreshToken).not.toBe(refreshToken);
    expect(res.body.usuario.perfil).toBe('admin');

    // o access token novo funciona
    const me = await api().get('/api/auth/me').set('Authorization', `Bearer ${res.body.token}`);
    expect(me.status).toBe(200);
  });

  it('guarda apenas o hash do refresh token, nunca o valor em texto', async () => {
    const { refreshToken } = await logar();

    const linhas = await query('SELECT token_hash FROM refresh_tokens');

    expect(linhas).toHaveLength(1);
    expect(linhas[0].token_hash).toBe(hashToken(refreshToken));
    expect(JSON.stringify(linhas)).not.toContain(refreshToken);
  });

  it('detecta reuso: reapresentar um token já trocado derruba a sessão inteira', async () => {
    const { refreshToken: primeiro } = await logar();
    const segundo = (await api().post('/api/auth/refresh').send({ refreshToken: primeiro })).body.refreshToken;

    // um atacante (ou aba antiga) reapresenta o primeiro token
    const reuso = await api().post('/api/auth/refresh').send({ refreshToken: primeiro });
    expect(reuso.status).toBe(401);

    // o token legítimo mais recente também foi revogado
    const aposReuso = await api().post('/api/auth/refresh').send({ refreshToken: segundo });
    expect(aposReuso.status).toBe(401);
    const ativos = await query('SELECT 1 FROM refresh_tokens WHERE revogado_em IS NULL');
    expect(ativos).toHaveLength(0);
  });

  it('recusa refresh token desconhecido com a mesma resposta de qualquer outra falha', async () => {
    const res = await api().post('/api/auth/refresh').send({ refreshToken: 'token-que-nunca-existiu' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Sessão inválida ou expirada' });
  });

  it('recusa refresh token expirado', async () => {
    const { refreshToken } = await logar();
    await query("UPDATE refresh_tokens SET expira_em = NOW() - INTERVAL '1 minute'");

    const res = await api().post('/api/auth/refresh').send({ refreshToken });

    expect(res.status).toBe(401);
  });

  it('recusa renovação de usuário que foi desativado depois do login', async () => {
    const { usuario, refreshToken } = await logar();
    await query('UPDATE usuarios SET ativo = false WHERE id = $1', [usuario.id]);

    const res = await api().post('/api/auth/refresh').send({ refreshToken });

    expect(res.status).toBe(401);
  });

  it('reflete a mudança de perfil do usuário no access token renovado', async () => {
    const { usuario, refreshToken } = await logar();
    await query("UPDATE usuarios SET perfil = 'operador' WHERE id = $1", [usuario.id]);

    const res = await api().post('/api/auth/refresh').send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.usuario.perfil).toBe('operador');
  });

  it('responde 400 quando o refreshToken não é informado', async () => {
    const res = await api().post('/api/auth/refresh').send({});

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Informe o refreshToken' });
  });

  it('só uma de duas renovações simultâneas com o mesmo token vence', async () => {
    const { refreshToken } = await logar();

    const [a, b] = await Promise.all([
      api().post('/api/auth/refresh').send({ refreshToken }),
      api().post('/api/auth/refresh').send({ refreshToken }),
    ]);

    expect([a.status, b.status].sort()).toEqual([200, 401]);
  });
});

describe('POST /api/auth/logout', () => {
  it('revoga a sessão: o refresh token não renova mais', async () => {
    const { refreshToken } = await logar();

    const saida = await api().post('/api/auth/logout').send({ refreshToken });
    expect(saida.status).toBe(204);

    const res = await api().post('/api/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(401);
  });

  it('é idempotente e não acusa erro para token desconhecido ou ausente', async () => {
    const desconhecido = await api().post('/api/auth/logout').send({ refreshToken: 'nada' });
    const semCorpo = await api().post('/api/auth/logout').send({});

    expect(desconhecido.status).toBe(204);
    expect(semCorpo.status).toBe(204);
  });
});

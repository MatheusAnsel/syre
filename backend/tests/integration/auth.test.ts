import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import jwt from 'jsonwebtoken';
import { api, resetDb, closeDb, criarUsuario, gerarToken, autenticar } from '../helpers';

// Atenção: o login tem rate limit de 10 tentativas por janela. Este arquivo faz no máximo 8 chamadas de login.
// O comportamento do limite em si é testado em rate-limit.test.ts.

beforeEach(resetDb);
afterAll(closeDb);

describe('POST /api/auth/login', () => {
  it('autentica com credenciais válidas e devolve access token de 15 minutos e refresh token, sem expor a senha', async () => {
    const usuario = await criarUsuario();

    const res = await api().post('/api/auth/login').send({ email: usuario.email, senha: usuario.senha });

    expect(res.status).toBe(200);
    expect(res.body.usuario).toEqual({ id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: 'admin' });
    expect(typeof res.body.refreshToken).toBe('string');
    expect(res.body.expiresIn).toBe(15 * 60);
    expect(JSON.stringify(res.body)).not.toMatch(/senha_hash|\$2[aby]\$/);

    const payload = jwt.verify(res.body.token, process.env.JWT_SECRET as string) as jwt.JwtPayload;
    expect(payload.sub).toBe(usuario.id);
    expect(payload.perfil).toBe('admin');
    expect((payload.exp as number) - (payload.iat as number)).toBe(15 * 60);
  });

  it('normaliza o e-mail (espaços e maiúsculas)', async () => {
    const usuario = await criarUsuario({ email: 'ana@syre.dev' });

    const res = await api().post('/api/auth/login').send({ email: '  ANA@Syre.dev ', senha: usuario.senha });

    expect(res.status).toBe(200);
  });

  it('responde igual para senha errada e para e-mail inexistente (evita enumeração de usuários)', async () => {
    const usuario = await criarUsuario();

    const senhaErrada = await api().post('/api/auth/login').send({ email: usuario.email, senha: 'errada' });
    const emailInexistente = await api().post('/api/auth/login').send({ email: 'naoexiste@syre.dev', senha: 'qualquer' });

    expect(senhaErrada.status).toBe(401);
    expect(emailInexistente.status).toBe(401);
    expect(senhaErrada.body).toEqual({ error: 'Credenciais inválidas' });
    expect(emailInexistente.body).toEqual(senhaErrada.body);
  });

  it('não autentica usuário inativo', async () => {
    const usuario = await criarUsuario({ ativo: false });

    const res = await api().post('/api/auth/login').send({ email: usuario.email, senha: usuario.senha });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Credenciais inválidas' });
  });

  it('responde 400 quando faltam campos obrigatórios', async () => {
    const semSenha = await api().post('/api/auth/login').send({ email: 'a@b.com' });
    const semEmail = await api().post('/api/auth/login').send({ senha: '123' });

    expect(semSenha.status).toBe(400);
    expect(semEmail.status).toBe(400);
    expect(semSenha.body).toEqual({ error: 'Informe email e senha' });
  });
});

describe('GET /api/auth/me', () => {
  it('devolve o usuário autenticado', async () => {
    const { usuario, auth } = await autenticar();

    const res = await api().get('/api/auth/me').set('Authorization', auth);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: 'admin' });
  });

  it('responde 401 sem token', async () => {
    const res = await api().get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Não autenticado' });
  });

  it('responde 401 com token expirado', async () => {
    const usuario = await criarUsuario();
    const expirado = gerarToken(usuario, { expiresIn: -60 });

    const res = await api().get('/api/auth/me').set('Authorization', `Bearer ${expirado}`);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Sessão inválida ou expirada' });
  });

  it('responde 401 com token assinado por outro segredo', async () => {
    const usuario = await criarUsuario();
    const falso = gerarToken(usuario, { expiresIn: '1h' }, 'segredo-do-atacante');

    const res = await api().get('/api/auth/me').set('Authorization', `Bearer ${falso}`);

    expect(res.status).toBe(401);
  });

  it('recusa token assinado com outro algoritmo (alg: none)', async () => {
    const usuario = await criarUsuario();
    const cabecalho = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const corpo = Buffer.from(JSON.stringify({ sub: usuario.id, email: usuario.email, perfil: 'admin' })).toString('base64url');

    const res = await api().get('/api/auth/me').set('Authorization', `Bearer ${cabecalho}.${corpo}.`);

    expect(res.status).toBe(401);
  });

  it('responde 404 quando o usuário do token já não existe', async () => {
    const usuario = await criarUsuario();
    const token = gerarToken(usuario);
    await resetDb();

    const res = await api().get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

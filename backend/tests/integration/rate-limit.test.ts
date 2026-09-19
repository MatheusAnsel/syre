import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { api, resetDb, closeDb, criarUsuario } from '../helpers';

beforeEach(resetDb);
afterAll(closeDb);

describe('rate limit do login', () => {
  it('bloqueia com 429 a partir da 11ª tentativa na mesma janela (proteção contra força bruta)', async () => {
    const usuario = await criarUsuario();

    for (let i = 1; i <= 10; i++) {
      const res = await api().post('/api/auth/login').send({ email: usuario.email, senha: `tentativa-${i}` });
      expect(res.status, `tentativa ${i}`).toBe(401);
    }

    // Mesmo com a senha correta, a 11ª tentativa é barrada antes de chegar ao controller.
    const bloqueada = await api().post('/api/auth/login').send({ email: usuario.email, senha: usuario.senha });

    expect(bloqueada.status).toBe(429);
    expect(bloqueada.body).toEqual({ error: 'Muitas tentativas de login. Tente novamente mais tarde.' });
  });
});

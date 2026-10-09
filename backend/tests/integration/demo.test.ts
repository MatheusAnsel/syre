import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { api, resetDb, closeDb, autenticar, criarCliente, criarProduto, UUID_INEXISTENTE } from '../helpers';

beforeEach(resetDb);
afterAll(closeDb);

describe('conta de demonstração (perfil demo, somente leitura)', () => {
  it('consegue consultar todas as áreas', async () => {
    const { auth } = await autenticar({ perfil: 'demo', email: 'recrutador@syre.dev' });

    const rotas = ['/api/dashboard', '/api/clientes', '/api/fornecedores', '/api/produtos', '/api/vendas', '/api/contas-receber'];
    for (const rota of rotas) {
      const res = await api().get(rota).set('Authorization', auth);
      expect(res.status, rota).toBe(200);
    }
  });

  it('não consegue criar (403) e nada é gravado', async () => {
    const { auth } = await autenticar({ perfil: 'demo' });

    const res = await api().post('/api/clientes').set('Authorization', auth).send({ nome: 'Cliente Novo' });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Conta de demonstração: somente leitura' });
    const lista = await api().get('/api/clientes').set('Authorization', auth);
    expect(JSON.stringify(lista.body)).not.toContain('Cliente Novo');
  });

  it('não consegue alterar, ajustar estoque, mudar status nem excluir (403)', async () => {
    const { auth } = await autenticar({ perfil: 'demo' });
    const cliente = await criarCliente();
    const produto = await criarProduto();

    const respostas = await Promise.all([
      api().put(`/api/clientes/${cliente.id}`).set('Authorization', auth).send({ nome: 'Alterado' }),
      api().post(`/api/produtos/${produto.id}/estoque`).set('Authorization', auth).send({ quantidade: 5, tipo: 'entrada' }),
      api().patch(`/api/vendas/${UUID_INEXISTENTE}/status`).set('Authorization', auth).send({ status: 'concluida' }),
      api().patch(`/api/contas-receber/${UUID_INEXISTENTE}/receber`).set('Authorization', auth).send({ valor: 10 }),
      api().post('/api/contas-receber/marcar-vencidas').set('Authorization', auth),
      api().delete(`/api/clientes/${cliente.id}`).set('Authorization', auth),
    ]);

    expect(respostas.map((r) => r.status)).toEqual([403, 403, 403, 403, 403, 403]);

    const consulta = await api().get(`/api/clientes/${cliente.id}`).set('Authorization', auth);
    expect(consulta.status).toBe(200);
    expect(consulta.body.nome).toBe('Maria Silva');
  });

  it('login e renovação de sessão funcionam normalmente para a conta demo', async () => {
    const { usuario } = await autenticar({ perfil: 'demo', email: 'recrutador@syre.dev', senha: 'demo-syre-2026' });

    const login = await api().post('/api/auth/login').send({ email: usuario.email, senha: usuario.senha });
    expect(login.status).toBe(200);
    expect(login.body.usuario.perfil).toBe('demo');

    const refresh = await api().post('/api/auth/refresh').send({ refreshToken: login.body.refreshToken });
    expect(refresh.status).toBe(200);
    expect(refresh.body.usuario.perfil).toBe('demo');
  });
});

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import {
  api,
  resetDb,
  closeDb,
  autenticar,
  criarCliente,
  criarFornecedor,
  criarProduto,
  gerarToken,
  criarUsuario,
  UUID_INEXISTENTE,
} from '../helpers';

beforeEach(resetDb);
afterAll(closeDb);

describe('controle de acesso por perfil', () => {
  it('operador não pode excluir cliente, fornecedor nem produto (403) e o registro permanece', async () => {
    const { auth } = await autenticar({ perfil: 'operador' });
    const cliente = await criarCliente();
    const fornecedor = await criarFornecedor();
    const produto = await criarProduto();

    const r1 = await api().delete(`/api/clientes/${cliente.id}`).set('Authorization', auth);
    const r2 = await api().delete(`/api/fornecedores/${fornecedor.id}`).set('Authorization', auth);
    const r3 = await api().delete(`/api/produtos/${produto.id}`).set('Authorization', auth);

    expect([r1.status, r2.status, r3.status]).toEqual([403, 403, 403]);
    expect(r1.body).toEqual({ error: 'Sem permissão para esta ação' });

    const consulta = await api().get(`/api/clientes/${cliente.id}`).set('Authorization', auth);
    expect(consulta.status).toBe(200);
  });

  it('admin continua podendo excluir', async () => {
    const { auth } = await autenticar({ perfil: 'admin' });
    const cliente = await criarCliente();

    const res = await api().delete(`/api/clientes/${cliente.id}`).set('Authorization', auth);

    expect(res.status).not.toBe(403);
    expect(res.status).toBeLessThan(300);
  });

  it('operador pode consultar e criar normalmente', async () => {
    const { auth } = await autenticar({ perfil: 'operador' });

    const lista = await api().get('/api/clientes').set('Authorization', auth);
    const cria = await api().post('/api/clientes').set('Authorization', auth).send({ nome: 'Cliente Novo' });

    expect(lista.status).toBe(200);
    expect(cria.status).toBe(201);
  });

  it('operador não pode cancelar venda, mas pode mudar para outros status (a checagem de perfil vem antes da busca)', async () => {
    const { auth } = await autenticar({ perfil: 'operador' });

    const cancelar = await api()
      .patch(`/api/vendas/${UUID_INEXISTENTE}/status`)
      .set('Authorization', auth)
      .send({ status: 'cancelada' });
    const concluir = await api()
      .patch(`/api/vendas/${UUID_INEXISTENTE}/status`)
      .set('Authorization', auth)
      .send({ status: 'concluida' });

    expect(cancelar.status).toBe(403);
    expect(concluir.status).toBe(404); // passou pela checagem de perfil e chegou à regra de negócio
  });

  it('admin pode cancelar venda (chega à regra de negócio)', async () => {
    const { auth } = await autenticar({ perfil: 'admin' });

    const res = await api()
      .patch(`/api/vendas/${UUID_INEXISTENTE}/status`)
      .set('Authorization', auth)
      .send({ status: 'cancelada' });

    expect(res.status).toBe(404);
  });

  it('token sem perfil (emitido antes dos perfis existirem) é tratado como operador', async () => {
    const usuario = await criarUsuario();
    const jwtLegado = (await import('jsonwebtoken')).default.sign(
      { sub: usuario.id, email: usuario.email },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );
    const cliente = await criarCliente();

    const res = await api().delete(`/api/clientes/${cliente.id}`).set('Authorization', `Bearer ${jwtLegado}`);

    expect(res.status).toBe(403);
  });

  it('o perfil vem do token assinado: não dá para se promover a admin pelo corpo da requisição', async () => {
    const usuario = await criarUsuario({ perfil: 'operador' });
    const token = gerarToken(usuario);
    const cliente = await criarCliente();

    const res = await api()
      .delete(`/api/clientes/${cliente.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ perfil: 'admin' });

    expect(res.status).toBe(403);
  });
});

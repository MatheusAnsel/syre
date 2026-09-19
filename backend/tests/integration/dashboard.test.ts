import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { api, resetDb, closeDb, autenticar, criarCliente, criarProduto, criarConta } from '../helpers';

let auth: string;

beforeEach(async () => {
  await resetDb();
  ({ auth } = await autenticar());
});
afterAll(closeDb);

describe('GET /api/dashboard', () => {
  it('responde com indicadores zerados e listas vazias em um banco sem movimento', async () => {
    const res = await api().get('/api/dashboard').set('Authorization', auth);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      vendas_mes: 0,
      receita_mes: 0,
      contas_abertas: 0,
      valor_a_receber: 0,
      produtos_baixo_estoque: 0,
      clientes_ativos: 0,
      vendas_por_mes: [],
      top_produtos: [],
    });
  });

  it('consolida vendas, contas a receber, estoque baixo e clientes ativos', async () => {
    await criarCliente({ nome: 'Ativo' });
    await criarCliente({ nome: 'Inativo', ativo: false });
    const caneta = await criarProduto({ nome: 'Caneta', estoque_atual: 20, estoque_minimo: 2 });
    await criarProduto({ nome: 'Quase acabando', estoque_atual: 1, estoque_minimo: 5 });

    await api()
      .post('/api/vendas')
      .set('Authorization', auth)
      .send({ itens: [{ produto_id: caneta.id, quantidade: 4, preco_unit: 25, subtotal: 100 }] });
    await criarConta({ valor: 300, valor_pago: 100 });

    const res = await api().get('/api/dashboard').set('Authorization', auth);

    expect(res.body).toMatchObject({
      vendas_mes: 1,
      receita_mes: 100,
      contas_abertas: 2, // a conta gerada pela venda + a conta criada manualmente
      valor_a_receber: 300, // 100 (venda) + (300 - 100 já pago)
      produtos_baixo_estoque: 1,
      clientes_ativos: 1,
    });
    expect(res.body.top_produtos).toEqual([{ nome: 'Caneta', quantidade: '4.000' }]);
    expect(res.body.vendas_por_mes).toHaveLength(1);
    expect(Number(res.body.vendas_por_mes[0].total)).toBe(100);
  });
});

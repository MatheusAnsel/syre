import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { api, resetDb, closeDb, autenticar, criarCliente, criarProduto, query, UUID_INEXISTENTE } from '../helpers';

let auth: string;

beforeEach(async () => {
  await resetDb();
  ({ auth } = await autenticar());
});
afterAll(closeDb);

describe('POST /api/vendas', () => {
  it('registra a venda, calcula o total com desconto e devolve 201', async () => {
    const cliente = await criarCliente();
    const caneta = await criarProduto({ nome: 'Caneta', preco_venda: 5 });
    const caderno = await criarProduto({ nome: 'Caderno', preco_venda: 20 });

    const res = await api()
      .post('/api/vendas')
      .set('Authorization', auth)
      .send({
        cliente_id: cliente.id,
        desconto: 10,
        itens: [
          { produto_id: caneta.id, quantidade: 2, preco_unit: 5, subtotal: 10 },
          { produto_id: caderno.id, quantidade: 3, preco_unit: 20, subtotal: 60 },
        ],
      });

    expect(res.status).toBe(201);
    expect(Number(res.body.total)).toBe(60); // 10 + 60 - 10 de desconto
    expect(res.body.status).toBe('pendente');
    expect(res.body.numero).toBe(1);
  });

  it('o trigger baixa o estoque de cada item e registra a saída com a referência da venda', async () => {
    const caneta = await criarProduto({ nome: 'Caneta', estoque_atual: 10 });
    const caderno = await criarProduto({ nome: 'Caderno', estoque_atual: 8 });

    const res = await api()
      .post('/api/vendas')
      .set('Authorization', auth)
      .send({
        itens: [
          { produto_id: caneta.id, quantidade: 2, preco_unit: 5, subtotal: 10 },
          { produto_id: caderno.id, quantidade: 3, preco_unit: 20, subtotal: 60 },
        ],
      });

    const estoques = await query('SELECT nome, estoque_atual FROM produtos ORDER BY nome');
    expect(estoques.map((p) => [p.nome, Number(p.estoque_atual)])).toEqual([
      ['Caderno', 5],
      ['Caneta', 8],
    ]);

    const movs = await query('SELECT tipo, motivo, referencia_id FROM movimentacoes_estoque');
    expect(movs).toHaveLength(2);
    for (const m of movs) {
      expect(m).toMatchObject({ tipo: 'saida', motivo: 'Venda', referencia_id: res.body.id });
    }
  });

  it('gera automaticamente a conta a receber com o valor da venda e vencimento em 30 dias', async () => {
    const cliente = await criarCliente();
    const produto = await criarProduto();

    const res = await api()
      .post('/api/vendas')
      .set('Authorization', auth)
      .send({ cliente_id: cliente.id, itens: [{ produto_id: produto.id, quantidade: 1, preco_unit: 50, subtotal: 50 }] });

    const [conta] = await query('SELECT *, (vencimento - CURRENT_DATE) AS dias FROM contas_receber');
    expect(conta.venda_id).toBe(res.body.id);
    expect(conta.cliente_id).toBe(cliente.id);
    expect(conta.descricao).toBe('Venda #1');
    expect(Number(conta.valor)).toBe(50);
    expect(Number(conta.valor_pago)).toBe(0);
    expect(conta.status).toBe('aberta');
    expect(Number(conta.dias)).toBe(30);
  });

  it('numera as vendas em sequência', async () => {
    const produto = await criarProduto({ estoque_atual: 100 });
    const corpo = { itens: [{ produto_id: produto.id, quantidade: 1, preco_unit: 50, subtotal: 50 }] };

    const primeira = await api().post('/api/vendas').set('Authorization', auth).send(corpo);
    const segunda = await api().post('/api/vendas').set('Authorization', auth).send(corpo);

    expect([primeira.body.numero, segunda.body.numero]).toEqual([1, 2]);
  });

  it('rejeita venda sem itens com 400 e não grava nada', async () => {
    const semLista = await api().post('/api/vendas').set('Authorization', auth).send({});
    const listaVazia = await api().post('/api/vendas').set('Authorization', auth).send({ itens: [] });

    expect(semLista.status).toBe(400);
    expect(listaVazia.status).toBe(400);
    expect(listaVazia.body).toEqual({ error: 'A venda deve ter ao menos um item' });
    expect(await query('SELECT id FROM vendas')).toHaveLength(0);
  });

  it('é atômica: se um item falha, nada é gravado (venda, conta, estoque e movimentações)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const produto = await criarProduto({ estoque_atual: 10 });

    const res = await api()
      .post('/api/vendas')
      .set('Authorization', auth)
      .send({
        itens: [
          { produto_id: produto.id, quantidade: 2, preco_unit: 50, subtotal: 100 },
          { produto_id: UUID_INEXISTENTE, quantidade: 1, preco_unit: 10, subtotal: 10 }, // viola a FK
        ],
      });

    expect(res.status).toBe(500);
    expect(await query('SELECT id FROM vendas')).toHaveLength(0);
    expect(await query('SELECT id FROM itens_venda')).toHaveLength(0);
    expect(await query('SELECT id FROM contas_receber')).toHaveLength(0);
    expect(await query('SELECT id FROM movimentacoes_estoque')).toHaveLength(0);
    const [atual] = await query('SELECT estoque_atual FROM produtos WHERE id=$1', [produto.id]);
    expect(Number(atual.estoque_atual)).toBe(10); // o trigger do primeiro item também foi revertido
    vi.restoreAllMocks();
  });
});

describe('consulta e status de vendas', () => {
  async function criarVenda(clienteId?: string) {
    const produto = await criarProduto({ nome: 'Caneta', estoque_atual: 50 });
    const res = await api()
      .post('/api/vendas')
      .set('Authorization', auth)
      .send({ cliente_id: clienteId, itens: [{ produto_id: produto.id, quantidade: 2, preco_unit: 5, subtotal: 10 }] });
    return { venda: res.body, produto };
  }

  it('detalha a venda com o nome do cliente e os itens com o nome do produto', async () => {
    const cliente = await criarCliente({ nome: 'Maria Silva' });
    const { venda } = await criarVenda(cliente.id);

    const res = await api().get(`/api/vendas/${venda.id}`).set('Authorization', auth);

    expect(res.status).toBe(200);
    expect(res.body.cliente_nome).toBe('Maria Silva');
    expect(res.body.itens).toHaveLength(1);
    expect(res.body.itens[0]).toMatchObject({ produto_nome: 'Caneta', unidade: 'UN' });
  });

  it('lista vendas filtrando por status e por cliente', async () => {
    const maria = await criarCliente({ nome: 'Maria' });
    const joao = await criarCliente({ nome: 'João' });
    const { venda: vendaMaria } = await criarVenda(maria.id);
    await criarVenda(joao.id);
    await api().patch(`/api/vendas/${vendaMaria.id}/status`).set('Authorization', auth).send({ status: 'concluida' });

    const concluidas = await api().get('/api/vendas').query({ status: 'concluida' }).set('Authorization', auth);
    const doJoao = await api().get('/api/vendas').query({ cliente_id: joao.id }).set('Authorization', auth);

    expect(concluidas.body.map((v: any) => v.id)).toEqual([vendaMaria.id]);
    expect(doJoao.body).toHaveLength(1);
    expect(doJoao.body[0].cliente_nome).toBe('João');
  });

  it('atualiza o status da venda', async () => {
    const { venda } = await criarVenda();

    const res = await api().patch(`/api/vendas/${venda.id}/status`).set('Authorization', auth).send({ status: 'concluida' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('concluida');
  });

  it('rejeita status fora da lista permitida (restrição do banco)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { venda } = await criarVenda();

    const res = await api().patch(`/api/vendas/${venda.id}/status`).set('Authorization', auth).send({ status: 'inexistente' });

    expect(res.status).toBe(500);
    const [atual] = await query('SELECT status FROM vendas WHERE id=$1', [venda.id]);
    expect(atual.status).toBe('pendente');
    vi.restoreAllMocks();
  });

  it('responde 404 para venda inexistente', async () => {
    const detalhe = await api().get(`/api/vendas/${UUID_INEXISTENTE}`).set('Authorization', auth);
    const status = await api().patch(`/api/vendas/${UUID_INEXISTENTE}/status`).set('Authorization', auth).send({ status: 'concluida' });

    expect(detalhe.status).toBe(404);
    expect(detalhe.body).toEqual({ error: 'Venda não encontrada' });
    expect(status.status).toBe(404);
  });
});

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import pool from '../../src/db/pool';
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

  it('é atômica: se o último passo falha, nada é gravado (venda, itens, estoque, movimentações e conta)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const produto = await criarProduto({ estoque_atual: 10 });

    // Simula uma falha do banco justamente ao criar a conta a receber, depois de venda, itens e trigger de estoque.
    const conectar = pool.connect.bind(pool) as () => Promise<any>;
    vi.spyOn(pool, 'connect').mockImplementation((async () => {
      const client = await conectar();
      const queryOriginal = client.query;
      const releaseOriginal = client.release;
      client.query = async (sql: any, ...resto: any[]) => {
        if (typeof sql === 'string' && sql.includes('INSERT INTO contas_receber')) throw new Error('falha simulada');
        return queryOriginal.call(client, sql, ...resto);
      };
      // O client volta para o pool ao ser liberado: devolve-o sem o patch para não contaminar outros testes.
      client.release = (...args: any[]) => {
        client.query = queryOriginal;
        client.release = releaseOriginal;
        return releaseOriginal.apply(client, args);
      };
      return client;
    }) as any);

    const res = await api()
      .post('/api/vendas')
      .set('Authorization', auth)
      .send({ itens: [{ produto_id: produto.id, quantidade: 2, preco_unit: 50 }] });
    vi.restoreAllMocks();

    expect(res.status).toBe(500);
    expect(await query('SELECT id FROM vendas')).toHaveLength(0);
    expect(await query('SELECT id FROM itens_venda')).toHaveLength(0);
    expect(await query('SELECT id FROM contas_receber')).toHaveLength(0);
    expect(await query('SELECT id FROM movimentacoes_estoque')).toHaveLength(0);
    const [atual] = await query('SELECT estoque_atual FROM produtos WHERE id=$1', [produto.id]);
    expect(Number(atual.estoque_atual)).toBe(10);
  });

  it('calcula subtotal e total no servidor e ignora o subtotal enviado pelo cliente', async () => {
    const produto = await criarProduto({ estoque_atual: 20 });

    const res = await api()
      .post('/api/vendas')
      .set('Authorization', auth)
      .send({ itens: [{ produto_id: produto.id, quantidade: 5, preco_unit: 50, subtotal: 1 }] });

    expect(res.status).toBe(201);
    expect(Number(res.body.total)).toBe(250);
    const [item] = await query('SELECT subtotal FROM itens_venda');
    expect(Number(item.subtotal)).toBe(250);
    const [conta] = await query('SELECT valor FROM contas_receber');
    expect(Number(conta.valor)).toBe(250);
  });

  it('usa o preço cadastrado do produto quando o preço unitário não é enviado', async () => {
    const produto = await criarProduto({ preco_venda: 12.5, estoque_atual: 20 });

    const res = await api().post('/api/vendas').set('Authorization', auth).send({ itens: [{ produto_id: produto.id, quantidade: 4 }] });

    expect(Number(res.body.total)).toBe(50);
  });

  it('aplica desconto por item e desconto geral sem erro de arredondamento', async () => {
    const produto = await criarProduto({ estoque_atual: 20 });

    const res = await api()
      .post('/api/vendas')
      .set('Authorization', auth)
      .send({ desconto: 0.1, itens: [{ produto_id: produto.id, quantidade: 3, preco_unit: 0.1, desconto: 0.05 }] });

    // 3 x 0,10 = 0,30; menos 0,05 no item = 0,25; menos 0,10 na venda = 0,15
    expect(Number(res.body.total)).toBe(0.15);
  });

  it('recusa venda com quantidade maior que o estoque (409) e não altera nada', async () => {
    const produto = await criarProduto({ nome: 'Caneta', estoque_atual: 1 });

    const res = await api()
      .post('/api/vendas')
      .set('Authorization', auth)
      .send({ itens: [{ produto_id: produto.id, quantidade: 5, preco_unit: 50 }] });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/Estoque insuficiente para "Caneta"/);
    expect(await query('SELECT id FROM vendas')).toHaveLength(0);
    const [atual] = await query('SELECT estoque_atual FROM produtos WHERE id=$1', [produto.id]);
    expect(Number(atual.estoque_atual)).toBe(1);
  });

  it('soma as quantidades quando o mesmo produto aparece em mais de um item', async () => {
    const produto = await criarProduto({ estoque_atual: 5 });

    const res = await api()
      .post('/api/vendas')
      .set('Authorization', auth)
      .send({
        itens: [
          { produto_id: produto.id, quantidade: 3, preco_unit: 10 },
          { produto_id: produto.id, quantidade: 3, preco_unit: 10 },
        ],
      });

    expect(res.status).toBe(409);
    const [atual] = await query('SELECT estoque_atual FROM produtos WHERE id=$1', [produto.id]);
    expect(Number(atual.estoque_atual)).toBe(5);
  });

  it('permite vender exatamente todo o estoque', async () => {
    const produto = await criarProduto({ estoque_atual: 3 });

    const res = await api().post('/api/vendas').set('Authorization', auth).send({ itens: [{ produto_id: produto.id, quantidade: 3, preco_unit: 10 }] });

    expect(res.status).toBe(201);
    const [atual] = await query('SELECT estoque_atual FROM produtos WHERE id=$1', [produto.id]);
    expect(Number(atual.estoque_atual)).toBe(0);
  });

  it('rejeita itens inválidos: produto inexistente, inativo, quantidade e preço inválidos', async () => {
    const ativo = await criarProduto();
    const inativo = await criarProduto({ ativo: false });

    const casos = [
      { produto_id: UUID_INEXISTENTE, quantidade: 1 },
      { produto_id: inativo.id, quantidade: 1 },
      { produto_id: ativo.id, quantidade: 0 },
      { produto_id: ativo.id, quantidade: -2 },
      { produto_id: ativo.id, quantidade: 'abc' },
      { produto_id: ativo.id, quantidade: 1, preco_unit: -10 },
      { quantidade: 1 },
    ];
    for (const item of casos) {
      const res = await api().post('/api/vendas').set('Authorization', auth).send({ itens: [item] });
      expect(res.status, JSON.stringify(item)).toBe(400);
    }
    expect(await query('SELECT id FROM vendas')).toHaveLength(0);
  });

  it('rejeita desconto maior que o total dos itens', async () => {
    const produto = await criarProduto();

    const geral = await api().post('/api/vendas').set('Authorization', auth).send({ desconto: 500, itens: [{ produto_id: produto.id, quantidade: 1, preco_unit: 50 }] });
    const doItem = await api().post('/api/vendas').set('Authorization', auth).send({ itens: [{ produto_id: produto.id, quantidade: 1, preco_unit: 50, desconto: 60 }] });

    expect(geral.status).toBe(400);
    expect(geral.body).toEqual({ error: 'O desconto é maior que o total dos itens' });
    expect(doItem.status).toBe(400);
  });

  it('responde 409 quando o cliente informado não existe', async () => {
    const produto = await criarProduto();

    const res = await api().post('/api/vendas').set('Authorization', auth).send({ cliente_id: UUID_INEXISTENTE, itens: [{ produto_id: produto.id, quantidade: 1, preco_unit: 10 }] });

    expect(res.status).toBe(409);
    expect(await query('SELECT id FROM vendas')).toHaveLength(0);
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

  it('rejeita status fora da lista permitida com 400', async () => {
    const { venda } = await criarVenda();

    const res = await api().patch(`/api/vendas/${venda.id}/status`).set('Authorization', auth).send({ status: 'inexistente' });

    expect(res.status).toBe(400);
    const [atual] = await query('SELECT status FROM vendas WHERE id=$1', [venda.id]);
    expect(atual.status).toBe('pendente');
  });

  it('responde 404 para venda inexistente', async () => {
    const detalhe = await api().get(`/api/vendas/${UUID_INEXISTENTE}`).set('Authorization', auth);
    const status = await api().patch(`/api/vendas/${UUID_INEXISTENTE}/status`).set('Authorization', auth).send({ status: 'concluida' });

    expect(detalhe.status).toBe(404);
    expect(detalhe.body).toEqual({ error: 'Venda não encontrada' });
    expect(status.status).toBe(404);
  });
});

describe('cancelamento de venda', () => {
  async function venderDois() {
    const produto = await criarProduto({ nome: 'Caneta', estoque_atual: 10 });
    const res = await api()
      .post('/api/vendas')
      .set('Authorization', auth)
      .send({ itens: [{ produto_id: produto.id, quantidade: 4, preco_unit: 5 }] });
    return { venda: res.body, produto };
  }

  const estoqueDe = async (id: string) => Number((await query('SELECT estoque_atual FROM produtos WHERE id=$1', [id]))[0].estoque_atual);

  it('devolve o estoque, registra a entrada e cancela a conta a receber', async () => {
    const { venda, produto } = await venderDois();
    expect(await estoqueDe(produto.id)).toBe(6);

    const res = await api().patch(`/api/vendas/${venda.id}/status`).set('Authorization', auth).send({ status: 'cancelada' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelada');
    expect(await estoqueDe(produto.id)).toBe(10);
    const movs = await query("SELECT tipo, motivo, quantidade, referencia_id FROM movimentacoes_estoque WHERE tipo='entrada'");
    expect(movs).toHaveLength(1);
    expect(movs[0]).toMatchObject({ motivo: 'Cancelamento de venda', referencia_id: venda.id });
    expect(Number(movs[0].quantidade)).toBe(4);
    const [conta] = await query('SELECT status FROM contas_receber WHERE venda_id=$1', [venda.id]);
    expect(conta.status).toBe('cancelada');
  });

  it('a conta cancelada deixa de contar no dashboard', async () => {
    const { venda } = await venderDois();
    await api().patch(`/api/vendas/${venda.id}/status`).set('Authorization', auth).send({ status: 'cancelada' });

    const res = await api().get('/api/dashboard').set('Authorization', auth);

    expect(res.body.contas_abertas).toBe(0);
    expect(res.body.valor_a_receber).toBe(0);
  });

  it('não devolve o estoque duas vezes se o cancelamento for repetido', async () => {
    const { venda, produto } = await venderDois();

    await api().patch(`/api/vendas/${venda.id}/status`).set('Authorization', auth).send({ status: 'cancelada' });
    const repetido = await api().patch(`/api/vendas/${venda.id}/status`).set('Authorization', auth).send({ status: 'cancelada' });

    expect(repetido.status).toBe(200);
    expect(await estoqueDe(produto.id)).toBe(10);
    expect(await query("SELECT id FROM movimentacoes_estoque WHERE tipo='entrada'")).toHaveLength(1);
  });

  it('não permite reativar uma venda cancelada (409)', async () => {
    const { venda, produto } = await venderDois();
    await api().patch(`/api/vendas/${venda.id}/status`).set('Authorization', auth).send({ status: 'cancelada' });

    const res = await api().patch(`/api/vendas/${venda.id}/status`).set('Authorization', auth).send({ status: 'concluida' });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'Venda cancelada não pode ser reativada' });
    expect(await estoqueDe(produto.id)).toBe(10);
  });

  it('não cancela venda que já teve pagamento registrado (409) e mantém estoque e conta', async () => {
    const { venda, produto } = await venderDois();
    const [conta] = await query('SELECT id FROM contas_receber WHERE venda_id=$1', [venda.id]);
    await api().patch(`/api/contas-receber/${conta.id}/receber`).set('Authorization', auth).send({ valor_pago: 5 });

    const res = await api().patch(`/api/vendas/${venda.id}/status`).set('Authorization', auth).send({ status: 'cancelada' });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'Venda com pagamento já registrado não pode ser cancelada' });
    expect(await estoqueDe(produto.id)).toBe(6);
    const [v] = await query('SELECT status FROM vendas WHERE id=$1', [venda.id]);
    expect(v.status).toBe('pendente');
  });

  it('concluir uma venda não mexe em estoque nem em contas', async () => {
    const { venda, produto } = await venderDois();

    await api().patch(`/api/vendas/${venda.id}/status`).set('Authorization', auth).send({ status: 'concluida' });

    expect(await estoqueDe(produto.id)).toBe(6);
    const [conta] = await query('SELECT status FROM contas_receber WHERE venda_id=$1', [venda.id]);
    expect(conta.status).toBe('aberta');
  });
});

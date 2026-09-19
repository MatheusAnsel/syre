import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { api, resetDb, closeDb, autenticar, criarProduto, criarFornecedor, query, UUID_INEXISTENTE } from '../helpers';

let auth: string;

beforeEach(async () => {
  await resetDb();
  ({ auth } = await autenticar());
});
afterAll(closeDb);

describe('produtos', () => {
  it('cadastra produto aplicando os valores padrão (unidade UN, preços e estoque zerados)', async () => {
    const res = await api().post('/api/produtos').set('Authorization', auth).send({ nome: 'Caneta' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ nome: 'Caneta', unidade: 'UN', ativo: true });
    expect(Number(res.body.preco_venda)).toBe(0);
    expect(Number(res.body.estoque_atual)).toBe(0);
  });

  it('não lista produtos inativos', async () => {
    await criarProduto({ nome: 'Ativo' });
    await criarProduto({ nome: 'Descontinuado', ativo: false });

    const res = await api().get('/api/produtos').set('Authorization', auth);

    expect(res.body.map((p: any) => p.nome)).toEqual(['Ativo']);
  });

  it('filtra produtos com estoque igual ou abaixo do mínimo', async () => {
    await criarProduto({ nome: 'Em falta', estoque_atual: 2, estoque_minimo: 5 });
    await criarProduto({ nome: 'No limite', estoque_atual: 5, estoque_minimo: 5 });
    await criarProduto({ nome: 'Abastecido', estoque_atual: 50, estoque_minimo: 5 });

    const res = await api().get('/api/produtos').query({ baixo_estoque: 'true' }).set('Authorization', auth);

    expect(res.body.map((p: any) => p.nome).sort()).toEqual(['Em falta', 'No limite']);
  });

  it('busca por nome ou código e filtra por categoria', async () => {
    await criarProduto({ nome: 'Caneta azul', codigo: 'CAN-01', categoria: 'Papelaria' });
    await criarProduto({ nome: 'Detergente', codigo: 'LIM-01', categoria: 'Limpeza' });

    const porNome = await api().get('/api/produtos').query({ search: 'caneta' }).set('Authorization', auth);
    const porCodigo = await api().get('/api/produtos').query({ search: 'lim-' }).set('Authorization', auth);
    const porCategoria = await api().get('/api/produtos').query({ categoria: 'Papelaria' }).set('Authorization', auth);

    expect(porNome.body.map((p: any) => p.nome)).toEqual(['Caneta azul']);
    expect(porCodigo.body.map((p: any) => p.nome)).toEqual(['Detergente']);
    expect(porCategoria.body.map((p: any) => p.nome)).toEqual(['Caneta azul']);
  });

  it('traz o nome do fornecedor vinculado ao produto', async () => {
    const fornecedor = await criarFornecedor({ nome: 'Distribuidora Alfa' });
    const produto = await criarProduto({ fornecedor_id: fornecedor.id });

    const lista = await api().get('/api/produtos').set('Authorization', auth);
    const detalhe = await api().get(`/api/produtos/${produto.id}`).set('Authorization', auth);

    expect(lista.body[0].fornecedor_nome).toBe('Distribuidora Alfa');
    expect(detalhe.body.fornecedor_nome).toBe('Distribuidora Alfa');
  });

  it('atualiza os dados cadastrais sem alterar o estoque atual', async () => {
    const produto = await criarProduto({ nome: 'Antigo', estoque_atual: 7, preco_venda: 10 });

    const res = await api()
      .put(`/api/produtos/${produto.id}`)
      .set('Authorization', auth)
      .send({ nome: 'Novo', unidade: 'CX', preco_custo: 6, preco_venda: 12, estoque_minimo: 3, ativo: true });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ nome: 'Novo', unidade: 'CX' });
    expect(Number(res.body.preco_venda)).toBe(12);
    expect(Number(res.body.estoque_atual)).toBe(7);
  });

  it('responde 404 ao atualizar produto inexistente', async () => {
    const res = await api().put(`/api/produtos/${UUID_INEXISTENTE}`).set('Authorization', auth).send({ nome: 'X', unidade: 'UN', ativo: true });
    expect(res.status).toBe(404);
  });

  it('responde 404 para produto inexistente', async () => {
    const res = await api().get(`/api/produtos/${UUID_INEXISTENTE}`).set('Authorization', auth);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Produto não encontrado' });
  });
});

describe('ajuste manual de estoque', () => {
  it('entrada aumenta o estoque e registra a movimentação', async () => {
    const produto = await criarProduto({ estoque_atual: 10 });

    const res = await api()
      .post(`/api/produtos/${produto.id}/estoque`)
      .set('Authorization', auth)
      .send({ tipo: 'entrada', quantidade: 5, motivo: 'Compra do fornecedor' });

    expect(res.status).toBe(200);
    expect(Number(res.body.estoque_atual)).toBe(15);

    const historico = await api().get(`/api/produtos/${produto.id}/movimentacoes`).set('Authorization', auth);
    expect(historico.body).toHaveLength(1);
    expect(historico.body[0]).toMatchObject({ tipo: 'entrada', motivo: 'Compra do fornecedor' });
    expect(Number(historico.body[0].quantidade)).toBe(5);
  });

  it('saída diminui o estoque e registra a movimentação', async () => {
    const produto = await criarProduto({ estoque_atual: 10 });

    const res = await api()
      .post(`/api/produtos/${produto.id}/estoque`)
      .set('Authorization', auth)
      .send({ tipo: 'saida', quantidade: 4, motivo: 'Perda' });

    expect(Number(res.body.estoque_atual)).toBe(6);
    const [mov] = await query('SELECT tipo FROM movimentacoes_estoque WHERE produto_id=$1', [produto.id]);
    expect(mov.tipo).toBe('saida');
  });

  it('desfaz o ajuste inteiro se a movimentação for inválida (transação atômica)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const produto = await criarProduto({ estoque_atual: 10 });

    // "ajuste" não é um tipo aceito pelo CHECK da tabela de movimentações.
    const res = await api()
      .post(`/api/produtos/${produto.id}/estoque`)
      .set('Authorization', auth)
      .send({ tipo: 'ajuste', quantidade: 3, motivo: 'inválido' });

    expect(res.status).toBe(500);
    const [atual] = await query('SELECT estoque_atual FROM produtos WHERE id=$1', [produto.id]);
    expect(Number(atual.estoque_atual)).toBe(10);
    const movs = await query('SELECT id FROM movimentacoes_estoque WHERE produto_id=$1', [produto.id]);
    expect(movs).toHaveLength(0);
    vi.restoreAllMocks();
  });

  it('lista as movimentações da mais recente para a mais antiga', async () => {
    const produto = await criarProduto();
    for (const motivo of ['primeira', 'segunda', 'terceira']) {
      await api().post(`/api/produtos/${produto.id}/estoque`).set('Authorization', auth).send({ tipo: 'entrada', quantidade: 1, motivo });
    }

    const res = await api().get(`/api/produtos/${produto.id}/movimentacoes`).set('Authorization', auth);

    expect(res.body.map((m: any) => m.motivo)).toEqual(['terceira', 'segunda', 'primeira']);
  });
});

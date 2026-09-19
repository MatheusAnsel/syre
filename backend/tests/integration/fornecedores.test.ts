import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { api, resetDb, closeDb, autenticar, criarFornecedor, query, UUID_INEXISTENTE } from '../helpers';

let auth: string;

beforeEach(async () => {
  await resetDb();
  ({ auth } = await autenticar());
});
afterAll(closeDb);

describe('fornecedores', () => {
  it('cadastra um fornecedor e devolve 201', async () => {
    const res = await api()
      .post('/api/fornecedores')
      .set('Authorization', auth)
      .send({ nome: 'Distribuidora Alfa', cnpj: '11.222.333/0001-44', cidade: 'Niterói', estado: 'RJ' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ nome: 'Distribuidora Alfa', cnpj: '11.222.333/0001-44', ativo: true });
  });

  it('lista apenas fornecedores ativos, ordenados por nome', async () => {
    await criarFornecedor({ nome: 'Zeta' });
    await criarFornecedor({ nome: 'Alfa' });
    await criarFornecedor({ nome: 'Desativado', ativo: false });

    const res = await api().get('/api/fornecedores').set('Authorization', auth);

    expect(res.body.map((f: any) => f.nome)).toEqual(['Alfa', 'Zeta']);
  });

  it('busca por nome ou CNPJ', async () => {
    await criarFornecedor({ nome: 'Alfa Ltda', cnpj: '11.111.111/0001-11' });
    await criarFornecedor({ nome: 'Beta SA', cnpj: '22.222.222/0001-22' });

    const porNome = await api().get('/api/fornecedores').query({ search: 'beta' }).set('Authorization', auth);
    const porCnpj = await api().get('/api/fornecedores').query({ search: '11.111' }).set('Authorization', auth);

    expect(porNome.body.map((f: any) => f.nome)).toEqual(['Beta SA']);
    expect(porCnpj.body.map((f: any) => f.nome)).toEqual(['Alfa Ltda']);
  });

  it('busca por id e responde 404 quando não existe', async () => {
    const fornecedor = await criarFornecedor({ nome: 'Alfa' });

    const encontrado = await api().get(`/api/fornecedores/${fornecedor.id}`).set('Authorization', auth);
    const inexistente = await api().get(`/api/fornecedores/${UUID_INEXISTENTE}`).set('Authorization', auth);

    expect(encontrado.body.nome).toBe('Alfa');
    expect(inexistente.status).toBe(404);
    expect(inexistente.body).toEqual({ error: 'Fornecedor não encontrado' });
  });

  it('atualiza os dados e responde 404 para fornecedor inexistente', async () => {
    const fornecedor = await criarFornecedor({ nome: 'Antigo' });

    const ok = await api().put(`/api/fornecedores/${fornecedor.id}`).set('Authorization', auth).send({ nome: 'Novo', ativo: true });
    const inexistente = await api().put(`/api/fornecedores/${UUID_INEXISTENTE}`).set('Authorization', auth).send({ nome: 'X', ativo: true });

    expect(ok.status).toBe(200);
    expect(ok.body.nome).toBe('Novo');
    expect(inexistente.status).toBe(404);
  });

  it('remove por inativação: responde 204, mantém o registro e some da listagem', async () => {
    const fornecedor = await criarFornecedor();

    const res = await api().delete(`/api/fornecedores/${fornecedor.id}`).set('Authorization', auth);

    expect(res.status).toBe(204);
    const [registro] = await query('SELECT ativo FROM fornecedores WHERE id=$1', [fornecedor.id]);
    expect(registro.ativo).toBe(false);
    const lista = await api().get('/api/fornecedores').set('Authorization', auth);
    expect(lista.body).toEqual([]);
  });

  it('exige nome e rejeita CNPJ duplicado', async () => {
    await criarFornecedor({ cnpj: '11.222.333/0001-44' });

    const semNome = await api().post('/api/fornecedores').set('Authorization', auth).send({ cnpj: '99.999.999/0001-99' });
    const duplicado = await api().post('/api/fornecedores').set('Authorization', auth).send({ nome: 'Outro', cnpj: '11.222.333/0001-44' });

    expect(semNome.status).toBe(400);
    expect(duplicado.status).toBe(409);
    expect(duplicado.body).toEqual({ error: 'CNPJ já cadastrado' });
  });
});

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { api, resetDb, closeDb, autenticar, criarCliente, query, UUID_INEXISTENTE } from '../helpers';

let auth: string;

beforeEach(async () => {
  await resetDb();
  ({ auth } = await autenticar());
});
afterAll(closeDb);

describe('clientes', () => {
  it('cadastra um cliente e devolve 201 com o registro criado', async () => {
    const res = await api()
      .post('/api/clientes')
      .set('Authorization', auth)
      .send({ nome: 'Padaria Central', cpf_cnpj: '12.345.678/0001-90', email: 'contato@padaria.com', cidade: 'Rio de Janeiro', estado: 'RJ' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ nome: 'Padaria Central', cpf_cnpj: '12.345.678/0001-90', ativo: true });
    expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('lista os clientes ordenados por nome', async () => {
    await criarCliente({ nome: 'Zeca' });
    await criarCliente({ nome: 'Ana' });

    const res = await api().get('/api/clientes').set('Authorization', auth);

    expect(res.status).toBe(200);
    expect(res.body.map((c: any) => c.nome)).toEqual(['Ana', 'Zeca']);
  });

  it('busca por nome ou CPF/CNPJ sem diferenciar maiúsculas de minúsculas', async () => {
    await criarCliente({ nome: 'Maria Silva', cpf_cnpj: '111.111.111-11' });
    await criarCliente({ nome: 'João Souza', cpf_cnpj: '222.222.222-22' });

    const porNome = await api().get('/api/clientes').query({ search: 'maria' }).set('Authorization', auth);
    const porDocumento = await api().get('/api/clientes').query({ search: '222.222' }).set('Authorization', auth);

    expect(porNome.body.map((c: any) => c.nome)).toEqual(['Maria Silva']);
    expect(porDocumento.body.map((c: any) => c.nome)).toEqual(['João Souza']);
  });

  it('filtra por ativo/inativo', async () => {
    await criarCliente({ nome: 'Ativo' });
    await criarCliente({ nome: 'Inativo', ativo: false });

    const ativos = await api().get('/api/clientes').query({ ativo: 'true' }).set('Authorization', auth);
    const inativos = await api().get('/api/clientes').query({ ativo: 'false' }).set('Authorization', auth);

    expect(ativos.body.map((c: any) => c.nome)).toEqual(['Ativo']);
    expect(inativos.body.map((c: any) => c.nome)).toEqual(['Inativo']);
  });

  it('busca um cliente por id e responde 404 quando não existe', async () => {
    const cliente = await criarCliente({ nome: 'Carlos' });

    const encontrado = await api().get(`/api/clientes/${cliente.id}`).set('Authorization', auth);
    const inexistente = await api().get(`/api/clientes/${UUID_INEXISTENTE}`).set('Authorization', auth);

    expect(encontrado.status).toBe(200);
    expect(encontrado.body.nome).toBe('Carlos');
    expect(inexistente.status).toBe(404);
    expect(inexistente.body).toEqual({ error: 'Cliente não encontrado' });
  });

  it('atualiza os dados e o trigger renova atualizado_em', async () => {
    const cliente = await criarCliente({ nome: 'Nome Antigo' });

    const res = await api()
      .put(`/api/clientes/${cliente.id}`)
      .set('Authorization', auth)
      .send({ nome: 'Nome Novo', ativo: true });

    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('Nome Novo');
    // No INSERT os dois campos são iguais; depois do UPDATE o trigger avança atualizado_em.
    expect(new Date(res.body.atualizado_em).getTime()).toBeGreaterThan(new Date(res.body.criado_em).getTime());
  });

  it('responde 404 ao atualizar cliente inexistente', async () => {
    const res = await api().put(`/api/clientes/${UUID_INEXISTENTE}`).set('Authorization', auth).send({ nome: 'X', ativo: true });
    expect(res.status).toBe(404);
  });

  it('remove por inativação (soft delete): responde 204 e mantém o registro', async () => {
    const cliente = await criarCliente();

    const res = await api().delete(`/api/clientes/${cliente.id}`).set('Authorization', auth);

    expect(res.status).toBe(204);
    const [registro] = await query('SELECT ativo FROM clientes WHERE id=$1', [cliente.id]);
    expect(registro.ativo).toBe(false);
  });
});

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
      .send({ nome: 'Padaria Central', cpf_cnpj: '12.345.678/0001-95', email: 'contato@padaria.com', cidade: 'Rio de Janeiro', estado: 'RJ' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ nome: 'Padaria Central', cpf_cnpj: '12.345.678/0001-95', ativo: true });
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
    await criarCliente({ nome: 'Maria Silva', cpf_cnpj: '111.222.333-96' });
    await criarCliente({ nome: 'João Souza', cpf_cnpj: '444.555.666-19' });

    const porNome = await api().get('/api/clientes').query({ search: 'maria' }).set('Authorization', auth);
    const porDocumento = await api().get('/api/clientes').query({ search: '444.555' }).set('Authorization', auth);

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

  it('listagem sem filtro mostra só ativos por padrão, e some depois de excluir', async () => {
    await criarCliente({ nome: 'Vai ficar' });
    const removido = await criarCliente({ nome: 'Vai sair' });

    const antes = await api().get('/api/clientes').set('Authorization', auth);
    expect(antes.body.map((c: any) => c.nome).sort()).toEqual(['Vai ficar', 'Vai sair']);

    const del = await api().delete(`/api/clientes/${removido.id}`).set('Authorization', auth);
    expect(del.status).toBe(204);

    const depois = await api().get('/api/clientes').set('Authorization', auth);
    expect(depois.body.map((c: any) => c.nome)).toEqual(['Vai ficar']);
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

  it.each([[undefined], [''], ['   '], [123], [null]])('exige um nome válido ao cadastrar (%s) e responde 400', async (nome) => {
    const res = await api().post('/api/clientes').set('Authorization', auth).send({ nome });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Informe o nome' });
    expect(await query('SELECT id FROM clientes')).toHaveLength(0);
  });

  it('remove espaços extras nas pontas do nome', async () => {
    const res = await api().post('/api/clientes').set('Authorization', auth).send({ nome: '  Maria  ' });
    expect(res.status).toBe(201);
    expect(res.body.nome).toBe('Maria');
  });

  it('exige nome também ao atualizar', async () => {
    const cliente = await criarCliente();
    const res = await api().put(`/api/clientes/${cliente.id}`).set('Authorization', auth).send({ nome: '', ativo: true });
    expect(res.status).toBe(400);
  });

  it('responde 409 ao cadastrar CPF/CNPJ que já existe', async () => {
    await criarCliente({ cpf_cnpj: '123.456.789-09' });

    const res = await api().post('/api/clientes').set('Authorization', auth).send({ nome: 'Outro', cpf_cnpj: '123.456.789-09' });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'CPF/CNPJ já cadastrado' });
  });

  it('responde 400 (e não 500) quando o id não é um UUID', async () => {
    const buscar = await api().get('/api/clientes/abc').set('Authorization', auth);
    const atualizar = await api().put('/api/clientes/123').set('Authorization', auth).send({ nome: 'X', ativo: true });

    expect(buscar.status).toBe(400);
    expect(buscar.body).toEqual({ error: 'Formato inválido em um dos campos' });
    expect(atualizar.status).toBe(400);
  });

  it('responde 400 para JSON malformado no corpo da requisição', async () => {
    const res = await api().post('/api/clientes').set('Authorization', auth).set('Content-Type', 'application/json').send('{"nome": ');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'JSON inválido no corpo da requisição' });
  });

  it.each([
    ['cpf_cnpj', '111.111.111-11'],
    ['cpf_cnpj', '123'],
    ['email', 'nao-e-email'],
    ['cep', '123'],
    ['estado', 'XX'],
    ['telefone', '123'],
  ])('responde 400 quando %s é inválido', async (campo, valor) => {
    const res = await api().post('/api/clientes').set('Authorization', auth).send({ nome: 'Teste', [campo]: valor });
    expect(res.status).toBe(400);
  });

  it('aceita cliente só com o nome (todos os outros campos são opcionais)', async () => {
    const res = await api().post('/api/clientes').set('Authorization', auth).send({ nome: 'Só Nome' });
    expect(res.status).toBe(201);
    expect(res.body.cpf_cnpj).toBeNull();
  });

  it('rejeita endereço maior que o limite de 500 caracteres', async () => {
    const res = await api().post('/api/clientes').set('Authorization', auth).send({ nome: 'Teste', endereco: 'a'.repeat(501) });
    expect(res.status).toBe(400);
  });
});

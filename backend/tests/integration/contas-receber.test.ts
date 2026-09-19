import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { api, resetDb, closeDb, autenticar, criarConta, query, UUID_INEXISTENTE } from '../helpers';

let auth: string;

beforeEach(async () => {
  await resetDb();
  ({ auth } = await autenticar());
});
afterAll(closeDb);

describe('registro de recebimentos', () => {
  it('recebimento parcial mantém a conta aberta e acumula o valor pago', async () => {
    const conta = await criarConta({ valor: 100 });

    const res = await api().patch(`/api/contas-receber/${conta.id}/receber`).set('Authorization', auth).send({ valor_pago: 40 });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('aberta');
    expect(Number(res.body.valor_pago)).toBe(40);
  });

  it('parcelas somadas que atingem o valor total quitam a conta', async () => {
    const conta = await criarConta({ valor: 100 });

    await api().patch(`/api/contas-receber/${conta.id}/receber`).set('Authorization', auth).send({ valor_pago: 40 });
    const res = await api().patch(`/api/contas-receber/${conta.id}/receber`).set('Authorization', auth).send({ valor_pago: 60 });

    expect(res.body.status).toBe('recebida');
    expect(Number(res.body.valor_pago)).toBe(100);
  });

  it('pagamento único do valor total quita a conta', async () => {
    const conta = await criarConta({ valor: 250.5 });

    const res = await api().patch(`/api/contas-receber/${conta.id}/receber`).set('Authorization', auth).send({ valor_pago: 250.5 });

    expect(res.body.status).toBe('recebida');
  });

  it('responde 404 para conta inexistente', async () => {
    const res = await api().patch(`/api/contas-receber/${UUID_INEXISTENTE}/receber`).set('Authorization', auth).send({ valor_pago: 10 });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Conta não encontrada' });
  });
});

describe('POST /api/contas-receber/marcar-vencidas', () => {
  it('marca como vencidas somente as contas abertas com vencimento no passado', async () => {
    const vencida = await criarConta({ diasParaVencer: -5 });
    const noPrazo = await criarConta({ diasParaVencer: 10 });
    const jaRecebida = await criarConta({ diasParaVencer: -5, status: 'recebida', valor_pago: 100 });

    const res = await api().post('/api/contas-receber/marcar-vencidas').set('Authorization', auth);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ atualizadas: 1 });

    const status = Object.fromEntries(
      (await query('SELECT id, status FROM contas_receber')).map((c) => [c.id, c.status])
    );
    expect(status[vencida.id]).toBe('vencida');
    expect(status[noPrazo.id]).toBe('aberta');
    expect(status[jaRecebida.id]).toBe('recebida');
  });

  it('não altera nada quando não há contas vencidas', async () => {
    await criarConta({ diasParaVencer: 3 });

    const res = await api().post('/api/contas-receber/marcar-vencidas').set('Authorization', auth);

    expect(res.body).toEqual({ atualizadas: 0 });
  });
});

describe('consulta e filtros', () => {
  it('lista por status, ordenando pelo vencimento mais próximo', async () => {
    await criarConta({ diasParaVencer: 20 });
    await criarConta({ diasParaVencer: 5 });
    await criarConta({ diasParaVencer: 1, status: 'recebida', valor_pago: 100 });

    const res = await api().get('/api/contas-receber').query({ status: 'aberta' }).set('Authorization', auth);

    expect(res.body).toHaveLength(2);
    expect(new Date(res.body[0].vencimento).getTime()).toBeLessThan(new Date(res.body[1].vencimento).getTime());
  });

  it('cria conta manual e busca por id', async () => {
    const criada = await api()
      .post('/api/contas-receber')
      .set('Authorization', auth)
      .send({ descricao: 'Serviço avulso', valor: 300, vencimento: '2030-01-15' });

    expect(criada.status).toBe(201);
    expect(criada.body).toMatchObject({ descricao: 'Serviço avulso', status: 'aberta' });

    const busca = await api().get(`/api/contas-receber/${criada.body.id}`).set('Authorization', auth);
    expect(busca.status).toBe(200);
    expect(Number(busca.body.valor)).toBe(300);
  });
});

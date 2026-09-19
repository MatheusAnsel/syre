import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { api, resetDb, closeDb, autenticar, criarCliente, query, UUID_INEXISTENTE } from '../helpers';

beforeEach(resetDb);
afterAll(closeDb);

// Todas as rotas de negócio declaradas em src/routes/index.ts.
const ROTAS_PROTEGIDAS: Array<[string, string]> = [
  ['get', '/api/dashboard'],
  ['get', '/api/clientes'],
  ['get', `/api/clientes/${UUID_INEXISTENTE}`],
  ['post', '/api/clientes'],
  ['put', `/api/clientes/${UUID_INEXISTENTE}`],
  ['delete', `/api/clientes/${UUID_INEXISTENTE}`],
  ['get', '/api/fornecedores'],
  ['get', `/api/fornecedores/${UUID_INEXISTENTE}`],
  ['post', '/api/fornecedores'],
  ['put', `/api/fornecedores/${UUID_INEXISTENTE}`],
  ['delete', `/api/fornecedores/${UUID_INEXISTENTE}`],
  ['get', '/api/produtos'],
  ['get', `/api/produtos/${UUID_INEXISTENTE}`],
  ['post', '/api/produtos'],
  ['put', `/api/produtos/${UUID_INEXISTENTE}`],
  ['post', `/api/produtos/${UUID_INEXISTENTE}/estoque`],
  ['get', `/api/produtos/${UUID_INEXISTENTE}/movimentacoes`],
  ['get', '/api/vendas'],
  ['get', `/api/vendas/${UUID_INEXISTENTE}`],
  ['post', '/api/vendas'],
  ['patch', `/api/vendas/${UUID_INEXISTENTE}/status`],
  ['get', '/api/contas-receber'],
  ['get', `/api/contas-receber/${UUID_INEXISTENTE}`],
  ['post', '/api/contas-receber'],
  ['patch', `/api/contas-receber/${UUID_INEXISTENTE}/receber`],
  ['post', '/api/contas-receber/marcar-vencidas'],
];

describe('autenticação obrigatória na API', () => {
  it.each(ROTAS_PROTEGIDAS)('%s %s exige token', async (metodo, caminho) => {
    const semToken = await (api() as any)[metodo](caminho);
    expect(semToken.status).toBe(401);

    const tokenInvalido = await (api() as any)[metodo](caminho).set('Authorization', 'Bearer token-invalido');
    expect(tokenInvalido.status).toBe(401);
  });

  it('mantém apenas /health e /api/auth/login como rotas públicas', async () => {
    const health = await api().get('/health');
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ status: 'ok', service: 'Syre API' });
  });
});

describe('cabeçalhos de segurança', () => {
  it('aplica Helmet e não revela a tecnologia do servidor', async () => {
    const res = await api().get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['strict-transport-security']).toBeDefined();
  });

  it('restringe o CORS à origem do frontend, sem curinga e sem refletir origens arbitrárias', async () => {
    const res = await api().get('/health').set('Origin', 'https://site-malicioso.example');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });
});

describe('proteção contra injeção de SQL', () => {
  it('trata o parâmetro de busca como dado, não como código SQL', async () => {
    const { auth } = await autenticar();
    await criarCliente({ nome: 'Maria Silva' });
    await criarCliente({ nome: 'João Souza' });

    const res = await api().get('/api/clientes').query({ search: "' OR '1'='1" }).set('Authorization', auth);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('não executa comandos destrutivos embutidos na busca', async () => {
    const { auth } = await autenticar();
    await criarCliente();

    const res = await api()
      .get('/api/clientes')
      .query({ search: "x'; DROP TABLE clientes; --" })
      .set('Authorization', auth);

    expect(res.status).toBe(200);
    const [{ total }] = await query<{ total: string }>('SELECT COUNT(*) AS total FROM clientes');
    expect(Number(total)).toBe(1);
  });
});

describe('tratamento de erros em produção', () => {
  it('não vaza detalhes do banco de dados na resposta de erro 500', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('NODE_ENV', 'production');
    const { auth } = await autenticar();

    // Sem "nome" o INSERT viola a restrição NOT NULL do banco e cai no errorHandler.
    const res = await api().post('/api/clientes').send({}).set('Authorization', auth);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Erro interno do servidor' });
    expect(JSON.stringify(res.body)).not.toMatch(/null value|violates|constraint|clientes/i);

    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });
});

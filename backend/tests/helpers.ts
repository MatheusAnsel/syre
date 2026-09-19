import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../src/app';
import pool from '../src/db/pool';

export const api = () => request(app);

export async function resetDb(): Promise<void> {
  await pool.query(
    `TRUNCATE TABLE contas_receber, itens_venda, movimentacoes_estoque, vendas,
       produtos, fornecedores, clientes, usuarios RESTART IDENTITY CASCADE`
  );
}

export async function closeDb(): Promise<void> {
  await pool.end();
}

export async function query<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
  const { rows } = await pool.query(sql, params);
  return rows as T[];
}

// ---------- autenticação ----------

export interface UsuarioTeste {
  id: string;
  nome: string;
  email: string;
  senha: string;
}

export async function criarUsuario(
  overrides: Partial<UsuarioTeste> & { ativo?: boolean } = {}
): Promise<UsuarioTeste> {
  const dados = {
    nome: 'Usuário de Teste',
    email: 'teste@syre.dev',
    senha: 'senha-forte-123',
    ativo: true,
    ...overrides,
  };
  const senhaHash = await bcrypt.hash(dados.senha, 4); // custo baixo só para acelerar os testes
  const [row] = await query(
    'INSERT INTO usuarios (nome, email, senha_hash, ativo) VALUES ($1,$2,$3,$4) RETURNING id',
    [dados.nome, dados.email, senhaHash, dados.ativo]
  );
  return { id: row.id, nome: dados.nome, email: dados.email, senha: dados.senha };
}

export function gerarToken(
  usuario: { id: string; email: string },
  opcoes: jwt.SignOptions = { expiresIn: '1h' },
  segredo: string = process.env.JWT_SECRET as string
): string {
  return jwt.sign({ sub: usuario.id, email: usuario.email }, segredo, opcoes);
}

/** Cria um usuário e devolve o header Authorization pronto para usar nas requisições. */
export async function autenticar() {
  const usuario = await criarUsuario();
  return { usuario, auth: `Bearer ${gerarToken(usuario)}` };
}

// ---------- fábricas de dados (inserem direto no banco) ----------

export async function criarCliente(overrides: Record<string, unknown> = {}) {
  const dados = { nome: 'Maria Silva', cpf_cnpj: null, ativo: true, ...overrides };
  const [row] = await query(
    'INSERT INTO clientes (nome, cpf_cnpj, ativo) VALUES ($1,$2,$3) RETURNING *',
    [dados.nome, dados.cpf_cnpj, dados.ativo]
  );
  return row;
}

export async function criarFornecedor(overrides: Record<string, unknown> = {}) {
  const dados = { nome: 'Distribuidora Alfa', cnpj: null, ativo: true, ...overrides };
  const [row] = await query(
    'INSERT INTO fornecedores (nome, cnpj, ativo) VALUES ($1,$2,$3) RETURNING *',
    [dados.nome, dados.cnpj, dados.ativo]
  );
  return row;
}

export async function criarProduto(overrides: Record<string, unknown> = {}) {
  const dados = {
    nome: 'Produto de Teste',
    codigo: null,
    categoria: null,
    fornecedor_id: null,
    preco_venda: 50,
    estoque_atual: 10,
    estoque_minimo: 2,
    ativo: true,
    ...overrides,
  };
  const [row] = await query(
    `INSERT INTO produtos (nome, codigo, categoria, fornecedor_id, preco_venda, estoque_atual, estoque_minimo, ativo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [dados.nome, dados.codigo, dados.categoria, dados.fornecedor_id, dados.preco_venda, dados.estoque_atual, dados.estoque_minimo, dados.ativo]
  );
  return row;
}

export async function criarConta(
  overrides: { valor?: number; valor_pago?: number; status?: string; diasParaVencer?: number } = {}
) {
  const dados = { valor: 100, valor_pago: 0, status: 'aberta', diasParaVencer: 30, ...overrides };
  const [row] = await query(
    `INSERT INTO contas_receber (descricao, valor, valor_pago, status, vencimento)
     VALUES ('Conta de teste', $1, $2, $3, CURRENT_DATE + $4::int) RETURNING *`,
    [dados.valor, dados.valor_pago, dados.status, dados.diasParaVencer]
  );
  return row;
}

export const UUID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';

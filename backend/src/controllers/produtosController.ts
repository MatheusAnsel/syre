import { Request, Response, NextFunction } from 'express';
import pool from '../db/pool';
import {
  ErroHttp,
  textoObrigatorio,
  textoOpcional,
  numeroPositivo,
  numeroNaoNegativoOpcional,
  milesimos,
} from '../utils/validacao';

function validarCampos(body: unknown) {
  const b = (body ?? {}) as Record<string, unknown>;
  return {
    nome: textoObrigatorio(b.nome, 'o nome'),
    codigo: textoOpcional(b.codigo, 50, 'o código'),
    descricao: textoOpcional(b.descricao, 5000, 'a descrição'),
    categoria: textoOpcional(b.categoria, 100, 'a categoria'),
    unidade: textoOpcional(b.unidade, 20, 'a unidade') || 'UN',
    preco_custo: numeroNaoNegativoOpcional(b.preco_custo, 0, 'o preço de custo'),
    preco_venda: numeroNaoNegativoOpcional(b.preco_venda, 0, 'o preço de venda'),
    estoque_minimo: numeroNaoNegativoOpcional(b.estoque_minimo, 0, 'o estoque mínimo'),
    fornecedor_id: b.fornecedor_id || null,
  };
}

export async function listar(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, categoria, baixo_estoque } = req.query;
    let query = `
      SELECT p.*, f.nome as fornecedor_nome
      FROM produtos p
      LEFT JOIN fornecedores f ON f.id = p.fornecedor_id
      WHERE p.ativo=true`;
    const params: unknown[] = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (p.nome ILIKE $${params.length} OR p.codigo ILIKE $${params.length})`;
    }
    if (categoria) {
      params.push(categoria);
      query += ` AND p.categoria = $${params.length}`;
    }
    if (baixo_estoque === 'true') {
      query += ` AND p.estoque_atual <= p.estoque_minimo`;
    }
    query += ' ORDER BY p.nome';

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

export async function buscar(req: Request, res: Response, next: NextFunction) {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, f.nome as fornecedor_nome
       FROM produtos p LEFT JOIN fornecedores f ON f.id=p.fornecedor_id
       WHERE p.id=$1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function criar(req: Request, res: Response, next: NextFunction) {
  try {
    const { nome, codigo, descricao, categoria, unidade, preco_custo, preco_venda, estoque_minimo, fornecedor_id } = validarCampos(req.body);
    const estoque_atual = numeroNaoNegativoOpcional(req.body?.estoque_atual, 0, 'o estoque atual');
    const { rows } = await pool.query(
      `INSERT INTO produtos (codigo,nome,descricao,categoria,unidade,preco_custo,preco_venda,estoque_atual,estoque_minimo,fornecedor_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [codigo, nome, descricao, categoria, unidade, preco_custo, preco_venda, estoque_atual, estoque_minimo, fornecedor_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function atualizar(req: Request, res: Response, next: NextFunction) {
  try {
    const { nome, codigo, descricao, categoria, unidade, preco_custo, preco_venda, estoque_minimo, fornecedor_id } = validarCampos(req.body);
    const ativo = req.body?.ativo === undefined ? true : Boolean(req.body.ativo);
    const { rows } = await pool.query(
      `UPDATE produtos SET codigo=$1,nome=$2,descricao=$3,categoria=$4,unidade=$5,
       preco_custo=$6,preco_venda=$7,estoque_minimo=$8,fornecedor_id=$9,ativo=$10
       WHERE id=$11 RETURNING *`,
      [codigo, nome, descricao, categoria, unidade, preco_custo, preco_venda, estoque_minimo, fornecedor_id, ativo, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function ajustarEstoque(req: Request, res: Response, next: NextFunction) {
  try {
    const { tipo, motivo } = req.body;
    if (tipo !== 'entrada' && tipo !== 'saida') {
      throw new ErroHttp(400, 'Tipo deve ser "entrada" ou "saida"');
    }
    const quantidade = numeroPositivo(req.body.quantidade, 'a quantidade');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Trava a linha do produto para que dois ajustes simultâneos não passem do estoque.
      const { rows: atual } = await client.query(
        'SELECT estoque_atual FROM produtos WHERE id=$1 FOR UPDATE',
        [req.params.id]
      );
      if (!atual[0]) throw new ErroHttp(404, 'Produto não encontrado');
      if (tipo === 'saida' && milesimos(quantidade) > milesimos(atual[0].estoque_atual)) {
        throw new ErroHttp(409, 'Estoque insuficiente para essa saída');
      }

      const op = tipo === 'entrada' ? '+' : '-';
      await client.query(
        `UPDATE produtos SET estoque_atual = estoque_atual ${op} $1 WHERE id=$2`,
        [quantidade, req.params.id]
      );
      await client.query(
        `INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, motivo)
         VALUES ($1,$2,$3,$4)`,
        [req.params.id, tipo, quantidade, motivo]
      );
      await client.query('COMMIT');
      const { rows } = await client.query('SELECT * FROM produtos WHERE id=$1', [req.params.id]);
      res.json(rows[0]);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
}

export async function movimentacoes(req: Request, res: Response, next: NextFunction) {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM movimentacoes_estoque WHERE produto_id=$1 ORDER BY criado_em DESC LIMIT 50`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

export async function remover(req: Request, res: Response, next: NextFunction) {
  try {
    const { rows } = await pool.query(
      'UPDATE produtos SET ativo=false WHERE id=$1 RETURNING id',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Produto não encontrado' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

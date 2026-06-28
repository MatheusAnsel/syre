import { Request, Response, NextFunction } from 'express';
import pool from '../db/pool';

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
    const { codigo, nome, descricao, categoria, unidade, preco_custo, preco_venda, estoque_atual, estoque_minimo, fornecedor_id } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO produtos (codigo,nome,descricao,categoria,unidade,preco_custo,preco_venda,estoque_atual,estoque_minimo,fornecedor_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [codigo, nome, descricao, categoria, unidade || 'UN', preco_custo || 0, preco_venda || 0, estoque_atual || 0, estoque_minimo || 0, fornecedor_id || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function atualizar(req: Request, res: Response, next: NextFunction) {
  try {
    const { codigo, nome, descricao, categoria, unidade, preco_custo, preco_venda, estoque_minimo, fornecedor_id, ativo } = req.body;
    const { rows } = await pool.query(
      `UPDATE produtos SET codigo=$1,nome=$2,descricao=$3,categoria=$4,unidade=$5,
       preco_custo=$6,preco_venda=$7,estoque_minimo=$8,fornecedor_id=$9,ativo=$10
       WHERE id=$11 RETURNING *`,
      [codigo, nome, descricao, categoria, unidade, preco_custo, preco_venda, estoque_minimo, fornecedor_id || null, ativo, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function ajustarEstoque(req: Request, res: Response, next: NextFunction) {
  try {
    const { tipo, quantidade, motivo } = req.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
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

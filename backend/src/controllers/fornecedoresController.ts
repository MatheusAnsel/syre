import { Request, Response, NextFunction } from 'express';
import pool from '../db/pool';

export async function listar(req: Request, res: Response, next: NextFunction) {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM fornecedores WHERE ativo=true';
    const params: unknown[] = [];
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (nome ILIKE $1 OR cnpj ILIKE $1)`;
    }
    query += ' ORDER BY nome';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

export async function buscar(req: Request, res: Response, next: NextFunction) {
  try {
    const { rows } = await pool.query('SELECT * FROM fornecedores WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Fornecedor não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function criar(req: Request, res: Response, next: NextFunction) {
  try {
    const { nome, cnpj, email, telefone, endereco, cidade, estado, cep } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO fornecedores (nome, cnpj, email, telefone, endereco, cidade, estado, cep)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [nome, cnpj, email, telefone, endereco, cidade, estado, cep]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function atualizar(req: Request, res: Response, next: NextFunction) {
  try {
    const { nome, cnpj, email, telefone, endereco, cidade, estado, cep, ativo } = req.body;
    const { rows } = await pool.query(
      `UPDATE fornecedores SET nome=$1,cnpj=$2,email=$3,telefone=$4,
       endereco=$5,cidade=$6,estado=$7,cep=$8,ativo=$9
       WHERE id=$10 RETURNING *`,
      [nome, cnpj, email, telefone, endereco, cidade, estado, cep, ativo, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Fornecedor não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function remover(req: Request, res: Response, next: NextFunction) {
  try {
    await pool.query('UPDATE fornecedores SET ativo=false WHERE id=$1', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

import { Request, Response, NextFunction } from 'express';
import pool from '../db/pool';
import {
  textoObrigatorio,
  cpfCnpjOpcional,
  emailOpcional,
  cepOpcional,
  telefoneOpcional,
  ufOpcional,
  textoOpcional,
} from '../utils/validacao';

function validarCampos(body: unknown) {
  const b = (body ?? {}) as Record<string, unknown>;
  return {
    nome: textoObrigatorio(b.nome, 'o nome'),
    cpf_cnpj: cpfCnpjOpcional(b.cpf_cnpj),
    email: emailOpcional(b.email),
    telefone: telefoneOpcional(b.telefone),
    endereco: textoOpcional(b.endereco, 500, 'o endereço'),
    cidade: textoOpcional(b.cidade, 100, 'a cidade'),
    estado: ufOpcional(b.estado),
    cep: cepOpcional(b.cep),
  };
}

export async function listar(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, ativo } = req.query;
    let query = 'SELECT * FROM clientes WHERE 1=1';
    const params: unknown[] = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (nome ILIKE $${params.length} OR cpf_cnpj ILIKE $${params.length})`;
    }
    // Por padrão só lista clientes ativos — quem quiser ver inativos passa ?ativo=false explicitamente.
    params.push(ativo === undefined ? true : ativo === 'true');
    query += ` AND ativo = $${params.length}`;
    query += ' ORDER BY nome';

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

export async function buscar(req: Request, res: Response, next: NextFunction) {
  try {
    const { rows } = await pool.query('SELECT * FROM clientes WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Cliente não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function criar(req: Request, res: Response, next: NextFunction) {
  try {
    const { nome, cpf_cnpj, email, telefone, endereco, cidade, estado, cep } = validarCampos(req.body);
    const { rows } = await pool.query(
      `INSERT INTO clientes (nome, cpf_cnpj, email, telefone, endereco, cidade, estado, cep)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [nome, cpf_cnpj, email, telefone, endereco, cidade, estado, cep]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function atualizar(req: Request, res: Response, next: NextFunction) {
  try {
    const { nome, cpf_cnpj, email, telefone, endereco, cidade, estado, cep } = validarCampos(req.body);
    const ativo = req.body?.ativo === undefined ? true : Boolean(req.body.ativo);
    const { rows } = await pool.query(
      `UPDATE clientes SET nome=$1, cpf_cnpj=$2, email=$3, telefone=$4,
       endereco=$5, cidade=$6, estado=$7, cep=$8, ativo=$9
       WHERE id=$10 RETURNING *`,
      [nome, cpf_cnpj, email, telefone, endereco, cidade, estado, cep, ativo, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Cliente não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function remover(req: Request, res: Response, next: NextFunction) {
  try {
    await pool.query('UPDATE clientes SET ativo=false WHERE id=$1', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

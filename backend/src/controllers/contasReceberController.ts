import { Request, Response, NextFunction } from 'express';
import pool from '../db/pool';

export async function listar(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, cliente_id } = req.query;
    let query = `
      SELECT cr.*, c.nome as cliente_nome
      FROM contas_receber cr
      LEFT JOIN clientes c ON c.id=cr.cliente_id
      WHERE 1=1`;
    const params: unknown[] = [];

    if (status) { params.push(status); query += ` AND cr.status=$${params.length}`; }
    if (cliente_id) { params.push(cliente_id); query += ` AND cr.cliente_id=$${params.length}`; }
    query += ' ORDER BY cr.vencimento';

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

export async function buscar(req: Request, res: Response, next: NextFunction) {
  try {
    const { rows } = await pool.query(
      `SELECT cr.*, c.nome as cliente_nome FROM contas_receber cr
       LEFT JOIN clientes c ON c.id=cr.cliente_id WHERE cr.id=$1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Conta não encontrada' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function criar(req: Request, res: Response, next: NextFunction) {
  try {
    const { cliente_id, descricao, valor, vencimento } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO contas_receber (cliente_id, descricao, valor, vencimento)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [cliente_id || null, descricao, valor, vencimento]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function registrarRecebimento(req: Request, res: Response, next: NextFunction) {
  try {
    const { valor_pago } = req.body;
    const { rows: atual } = await pool.query('SELECT * FROM contas_receber WHERE id=$1', [req.params.id]);
    if (!atual[0]) return res.status(404).json({ error: 'Conta não encontrada' });

    const totalPago = parseFloat(atual[0].valor_pago) + parseFloat(valor_pago);
    const novoStatus = totalPago >= parseFloat(atual[0].valor) ? 'recebida' : 'aberta';

    const { rows } = await pool.query(
      `UPDATE contas_receber SET valor_pago=$1, status=$2 WHERE id=$3 RETURNING *`,
      [totalPago, novoStatus, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

// Marca vencidas automaticamente
export async function marcarVencidas(_req: Request, res: Response, next: NextFunction) {
  try {
    const { rowCount } = await pool.query(
      `UPDATE contas_receber SET status='vencida'
       WHERE status='aberta' AND vencimento < CURRENT_DATE`
    );
    res.json({ atualizadas: rowCount });
  } catch (err) {
    next(err);
  }
}

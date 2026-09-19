import { Request, Response, NextFunction } from 'express';
import pool from '../db/pool';
import { ErroHttp, textoObrigatorio, numeroPositivo, centavos } from '../utils/validacao';

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
    const { cliente_id, vencimento } = req.body;
    const descricao = textoObrigatorio(req.body.descricao, 'a descrição');
    const valor = numeroPositivo(req.body.valor, 'o valor');
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
    const valorPago = numeroPositivo(req.body.valor_pago, 'o valor_pago');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: atual } = await client.query('SELECT * FROM contas_receber WHERE id=$1 FOR UPDATE', [req.params.id]);
      const conta = atual[0];
      if (!conta) throw new ErroHttp(404, 'Conta não encontrada');
      if (conta.status === 'recebida') throw new ErroHttp(409, 'Conta já quitada');
      if (conta.status === 'cancelada') throw new ErroHttp(409, 'Conta cancelada não aceita recebimento');

      const saldoCent = centavos(conta.valor) - centavos(conta.valor_pago);
      const pagoCent = centavos(valorPago);
      if (pagoCent > saldoCent) {
        throw new ErroHttp(400, `Valor maior que o saldo em aberto (${(saldoCent / 100).toFixed(2)})`);
      }

      const totalPago = (centavos(conta.valor_pago) + pagoCent) / 100;
      // Pagamento parcial não tira a conta de "vencida"; só a quitação total muda o status.
      const novoStatus = pagoCent === saldoCent ? 'recebida' : conta.status;

      const { rows } = await client.query(
        `UPDATE contas_receber SET valor_pago=$1, status=$2 WHERE id=$3 RETURNING *`,
        [totalPago, novoStatus, req.params.id]
      );
      await client.query('COMMIT');
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

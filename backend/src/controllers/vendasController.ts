import { Request, Response, NextFunction } from 'express';
import pool from '../db/pool';

export async function listar(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, cliente_id } = req.query;
    let query = `
      SELECT v.*, c.nome as cliente_nome
      FROM vendas v LEFT JOIN clientes c ON c.id=v.cliente_id
      WHERE 1=1`;
    const params: unknown[] = [];

    if (status) { params.push(status); query += ` AND v.status=$${params.length}`; }
    if (cliente_id) { params.push(cliente_id); query += ` AND v.cliente_id=$${params.length}`; }
    query += ' ORDER BY v.criado_em DESC';

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

export async function buscar(req: Request, res: Response, next: NextFunction) {
  try {
    const { rows: vendas } = await pool.query(
      `SELECT v.*, c.nome as cliente_nome
       FROM vendas v LEFT JOIN clientes c ON c.id=v.cliente_id
       WHERE v.id=$1`,
      [req.params.id]
    );
    if (!vendas[0]) return res.status(404).json({ error: 'Venda não encontrada' });

    const { rows: itens } = await pool.query(
      `SELECT i.*, p.nome as produto_nome, p.unidade
       FROM itens_venda i JOIN produtos p ON p.id=i.produto_id
       WHERE i.venda_id=$1`,
      [req.params.id]
    );
    res.json({ ...vendas[0], itens });
  } catch (err) {
    next(err);
  }
}

export async function criar(req: Request, res: Response, next: NextFunction) {
  try {
    const { cliente_id, desconto = 0, observacoes, itens } = req.body;
    if (!itens || itens.length === 0) {
      return res.status(400).json({ error: 'A venda deve ter ao menos um item' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const total = itens.reduce((acc: number, i: { subtotal: number }) => acc + i.subtotal, 0) - desconto;

      const { rows: vendas } = await client.query(
        `INSERT INTO vendas (cliente_id, desconto, total, observacoes)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [cliente_id || null, desconto, total, observacoes]
      );
      const venda = vendas[0];

      for (const item of itens) {
        await client.query(
          `INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unit, desconto, subtotal)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [venda.id, item.produto_id, item.quantidade, item.preco_unit, item.desconto || 0, item.subtotal]
        );
      }

      // gera conta a receber automaticamente
      await client.query(
        `INSERT INTO contas_receber (venda_id, cliente_id, descricao, valor, vencimento)
         VALUES ($1,$2,$3,$4, NOW() + INTERVAL '30 days')`,
        [venda.id, cliente_id || null, `Venda #${venda.numero}`, total]
      );

      await client.query('COMMIT');
      res.status(201).json(venda);
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

export async function atualizarStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = req.body;
    const { rows } = await pool.query(
      `UPDATE vendas SET status=$1 WHERE id=$2 RETURNING *`,
      [status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Venda não encontrada' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

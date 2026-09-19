import { Request, Response, NextFunction } from 'express';
import pool from '../db/pool';
import { ErroHttp, textoObrigatorio, numeroPositivo, numeroNaoNegativo, centavos, milesimos } from '../utils/validacao';

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

interface ItemNormalizado {
  produto_id: string;
  quantidade: number;
  preco_unit?: number;
  desconto: number;
}

function normalizarItens(bruto: unknown): ItemNormalizado[] {
  if (!Array.isArray(bruto) || bruto.length === 0) {
    throw new ErroHttp(400, 'A venda deve ter ao menos um item');
  }
  return bruto.map((item: any, i: number) => {
    const n = i + 1;
    return {
      produto_id: textoObrigatorio(item?.produto_id, `o produto do item ${n}`),
      quantidade: numeroPositivo(item?.quantidade, `a quantidade do item ${n}`),
      preco_unit:
        item?.preco_unit === undefined || item?.preco_unit === null
          ? undefined
          : numeroNaoNegativo(item.preco_unit, `o preço do item ${n}`),
      desconto:
        item?.desconto === undefined || item?.desconto === null
          ? 0
          : numeroNaoNegativo(item.desconto, `o desconto do item ${n}`),
    };
  });
}

export async function criar(req: Request, res: Response, next: NextFunction) {
  try {
    const { cliente_id, observacoes } = req.body;
    const itens = normalizarItens(req.body.itens);
    const descontoVenda =
      req.body.desconto === undefined || req.body.desconto === null
        ? 0
        : numeroNaoNegativo(req.body.desconto, 'o desconto');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Trava os produtos envolvidos (em ordem fixa, para evitar deadlock) antes de conferir o estoque.
      const ids = [...new Set(itens.map((i) => i.produto_id))].sort();
      const { rows: produtos } = await client.query(
        `SELECT id, nome, preco_venda, estoque_atual, ativo
         FROM produtos WHERE id = ANY($1::uuid[]) ORDER BY id FOR UPDATE`,
        [ids]
      );
      const porId = new Map(produtos.map((p) => [p.id as string, p]));

      const pedidoPorProduto = new Map<string, number>();
      let totalItensCent = 0;
      const itensCalculados = itens.map((item, idx) => {
        const produto = porId.get(item.produto_id);
        if (!produto || !produto.ativo) {
          throw new ErroHttp(400, `Produto do item ${idx + 1} não encontrado ou inativo`);
        }
        pedidoPorProduto.set(
          produto.id,
          (pedidoPorProduto.get(produto.id) ?? 0) + milesimos(item.quantidade)
        );

        // O servidor decide o subtotal; qualquer subtotal enviado pelo cliente é ignorado.
        const precoUnitCent = centavos(item.preco_unit ?? produto.preco_venda);
        const bruto = Math.round((precoUnitCent * milesimos(item.quantidade)) / 1000);
        const descontoItemCent = centavos(item.desconto);
        if (descontoItemCent > bruto) {
          throw new ErroHttp(400, `O desconto do item ${idx + 1} é maior que o valor do item`);
        }
        const subtotalCent = bruto - descontoItemCent;
        totalItensCent += subtotalCent;
        return { ...item, precoUnitCent, descontoItemCent, subtotalCent };
      });

      for (const [produtoId, pedido] of pedidoPorProduto) {
        const produto = porId.get(produtoId)!;
        if (pedido > milesimos(produto.estoque_atual)) {
          throw new ErroHttp(
            409,
            `Estoque insuficiente para "${produto.nome}": disponível ${Number(produto.estoque_atual)}, solicitado ${pedido / 1000}`
          );
        }
      }

      const descontoVendaCent = centavos(descontoVenda);
      if (descontoVendaCent > totalItensCent) {
        throw new ErroHttp(400, 'O desconto é maior que o total dos itens');
      }
      const total = (totalItensCent - descontoVendaCent) / 100;

      const { rows: vendas } = await client.query(
        `INSERT INTO vendas (cliente_id, desconto, total, observacoes)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [cliente_id || null, descontoVendaCent / 100, total, observacoes]
      );
      const venda = vendas[0];

      for (const item of itensCalculados) {
        await client.query(
          `INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unit, desconto, subtotal)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            venda.id,
            item.produto_id,
            item.quantidade,
            item.precoUnitCent / 100,
            item.descontoItemCent / 100,
            item.subtotalCent / 100,
          ]
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

const STATUS_VALIDOS = ['pendente', 'concluida', 'cancelada'];

export async function atualizarStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = req.body;
    if (!STATUS_VALIDOS.includes(status)) {
      throw new ErroHttp(400, 'Status inválido. Use pendente, concluida ou cancelada');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: atual } = await client.query('SELECT * FROM vendas WHERE id=$1 FOR UPDATE', [req.params.id]);
      const venda = atual[0];
      if (!venda) throw new ErroHttp(404, 'Venda não encontrada');

      if (venda.status === status) {
        await client.query('COMMIT');
        return res.json(venda);
      }
      if (venda.status === 'cancelada') {
        throw new ErroHttp(409, 'Venda cancelada não pode ser reativada');
      }

      if (status === 'cancelada') {
        const { rows: contas } = await client.query(
          'SELECT valor_pago FROM contas_receber WHERE venda_id=$1 FOR UPDATE',
          [venda.id]
        );
        if (contas.some((c) => centavos(c.valor_pago) > 0)) {
          throw new ErroHttp(409, 'Venda com pagamento já registrado não pode ser cancelada');
        }

        // Devolve ao estoque tudo o que a venda tinha baixado.
        const { rows: itens } = await client.query(
          'SELECT produto_id, quantidade FROM itens_venda WHERE venda_id=$1',
          [venda.id]
        );
        for (const item of itens) {
          await client.query('UPDATE produtos SET estoque_atual = estoque_atual + $1 WHERE id=$2', [
            item.quantidade,
            item.produto_id,
          ]);
          await client.query(
            `INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, motivo, referencia_id)
             VALUES ($1,'entrada',$2,'Cancelamento de venda',$3)`,
            [item.produto_id, item.quantidade, venda.id]
          );
        }

        await client.query("UPDATE contas_receber SET status='cancelada' WHERE venda_id=$1", [venda.id]);
      }

      const { rows } = await client.query('UPDATE vendas SET status=$1 WHERE id=$2 RETURNING *', [status, venda.id]);
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

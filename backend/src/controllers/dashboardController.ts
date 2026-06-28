import { Request, Response, NextFunction } from 'express';
import pool from '../db/pool';

export async function getDashboard(_req: Request, res: Response, next: NextFunction) {
  try {
    const [
      vendasMes,
      contasAbertas,
      produtosBaixoEstoque,
      clientesAtivos,
      vendasPorMes,
      topProdutos,
    ] = await Promise.all([
      pool.query(`
        SELECT COUNT(*) as vendas_mes, COALESCE(SUM(total),0) as receita_mes
        FROM vendas
        WHERE status != 'cancelada'
        AND DATE_TRUNC('month', criado_em) = DATE_TRUNC('month', NOW())
      `),
      pool.query(`
        SELECT COUNT(*) as contas_abertas, COALESCE(SUM(valor - valor_pago),0) as valor_a_receber
        FROM contas_receber WHERE status IN ('aberta','vencida')
      `),
      pool.query(`
        SELECT COUNT(*) as produtos_baixo_estoque
        FROM produtos WHERE ativo=true AND estoque_atual <= estoque_minimo
      `),
      pool.query(`SELECT COUNT(*) as clientes_ativos FROM clientes WHERE ativo=true`),
      pool.query(`
        SELECT TO_CHAR(DATE_TRUNC('month', criado_em), 'Mon/YY') as mes,
               COALESCE(SUM(total),0) as total
        FROM vendas
        WHERE status != 'cancelada'
        AND criado_em >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', criado_em)
        ORDER BY DATE_TRUNC('month', criado_em)
      `),
      pool.query(`
        SELECT p.nome, SUM(i.quantidade) as quantidade
        FROM itens_venda i
        JOIN produtos p ON p.id=i.produto_id
        JOIN vendas v ON v.id=i.venda_id
        WHERE v.status != 'cancelada'
        AND v.criado_em >= NOW() - INTERVAL '30 days'
        GROUP BY p.id, p.nome
        ORDER BY quantidade DESC
        LIMIT 5
      `),
    ]);

    res.json({
      vendas_mes: parseInt(vendasMes.rows[0].vendas_mes),
      receita_mes: parseFloat(vendasMes.rows[0].receita_mes),
      contas_abertas: parseInt(contasAbertas.rows[0].contas_abertas),
      valor_a_receber: parseFloat(contasAbertas.rows[0].valor_a_receber),
      produtos_baixo_estoque: parseInt(produtosBaixoEstoque.rows[0].produtos_baixo_estoque),
      clientes_ativos: parseInt(clientesAtivos.rows[0].clientes_ativos),
      vendas_por_mes: vendasPorMes.rows,
      top_produtos: topProdutos.rows,
    });
  } catch (err) {
    next(err);
  }
}

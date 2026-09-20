import { Router } from 'express';
import * as clientes from '../controllers/clientesController';
import * as fornecedores from '../controllers/fornecedoresController';
import * as produtos from '../controllers/produtosController';
import * as vendas from '../controllers/vendasController';
import * as contasReceber from '../controllers/contasReceberController';
import { getDashboard } from '../controllers/dashboardController';

const router = Router();

// Dashboard
router.get('/dashboard', getDashboard);

// Clientes
router.get('/clientes', clientes.listar);
router.get('/clientes/:id', clientes.buscar);
router.post('/clientes', clientes.criar);
router.put('/clientes/:id', clientes.atualizar);
router.delete('/clientes/:id', clientes.remover);

// Fornecedores
router.get('/fornecedores', fornecedores.listar);
router.get('/fornecedores/:id', fornecedores.buscar);
router.post('/fornecedores', fornecedores.criar);
router.put('/fornecedores/:id', fornecedores.atualizar);
router.delete('/fornecedores/:id', fornecedores.remover);

// Produtos / Estoque
router.get('/produtos', produtos.listar);
router.get('/produtos/:id', produtos.buscar);
router.post('/produtos', produtos.criar);
router.put('/produtos/:id', produtos.atualizar);
router.post('/produtos/:id/estoque', produtos.ajustarEstoque);
router.get('/produtos/:id/movimentacoes', produtos.movimentacoes);
router.delete('/produtos/:id', produtos.remover);

// Vendas
router.get('/vendas', vendas.listar);
router.get('/vendas/:id', vendas.buscar);
router.post('/vendas', vendas.criar);
router.patch('/vendas/:id/status', vendas.atualizarStatus);

// Contas a Receber
router.get('/contas-receber', contasReceber.listar);
router.get('/contas-receber/:id', contasReceber.buscar);
router.post('/contas-receber', contasReceber.criar);
router.patch('/contas-receber/:id/receber', contasReceber.registrarRecebimento);
router.post('/contas-receber/marcar-vencidas', contasReceber.marcarVencidas);

export default router;

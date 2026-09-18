export interface Usuario {
  id: string;
  nome: string;
  email: string;
  senha_hash: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface Cliente {
  id: string;
  nome: string;
  cpf_cnpj?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface Fornecedor {
  id: string;
  nome: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface Produto {
  id: string;
  codigo?: string;
  nome: string;
  descricao?: string;
  categoria?: string;
  unidade: string;
  preco_custo: number;
  preco_venda: number;
  estoque_atual: number;
  estoque_minimo: number;
  fornecedor_id?: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface ItemVenda {
  id?: string;
  venda_id?: string;
  produto_id: string;
  quantidade: number;
  preco_unit: number;
  desconto: number;
  subtotal: number;
}

export interface Venda {
  id: string;
  cliente_id?: string;
  numero: number;
  status: 'pendente' | 'concluida' | 'cancelada';
  desconto: number;
  total: number;
  observacoes?: string;
  criado_em: string;
  atualizado_em: string;
  itens?: ItemVenda[];
}

export interface ContaReceber {
  id: string;
  venda_id?: string;
  cliente_id?: string;
  descricao: string;
  valor: number;
  valor_pago: number;
  vencimento: string;
  status: 'aberta' | 'recebida' | 'vencida' | 'cancelada';
  criado_em: string;
  atualizado_em: string;
}

export interface DashboardData {
  vendas_mes: number;
  receita_mes: number;
  contas_abertas: number;
  valor_a_receber: number;
  produtos_baixo_estoque: number;
  clientes_ativos: number;
  vendas_por_mes: { mes: string; total: number }[];
  top_produtos: { nome: string; quantidade: number }[];
}

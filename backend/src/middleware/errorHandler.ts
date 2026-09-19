import { Request, Response, NextFunction } from 'express';
import { ErroHttp } from '../utils/validacao';

interface RespostaDeErro {
  status: number;
  error: string;
}

// Erros do PostgreSQL que indicam problema na requisição, não falha do servidor.
// As mensagens são fixas: nunca repassamos texto do banco ao cliente.
const ERROS_DO_BANCO: Record<string, RespostaDeErro> = {
  '23505': { status: 409, error: 'Já existe um registro com esses dados' },
  '23503': { status: 409, error: 'Operação inválida: o registro relacionado não existe ou está em uso' },
  '23502': { status: 400, error: 'Campo obrigatório não informado' },
  '23514': { status: 400, error: 'Valor não permitido em um dos campos' },
  '22P02': { status: 400, error: 'Formato inválido em um dos campos' },
  '22003': { status: 400, error: 'Valor numérico fora do limite permitido' },
  '22001': { status: 400, error: 'Texto longo demais em um dos campos' },
  '22007': { status: 400, error: 'Data inválida' },
  '22008': { status: 400, error: 'Data inválida' },
};

// Mensagens mais úteis para violações de unicidade conhecidas (nomes padrão <tabela>_<coluna>_key).
const DUPLICIDADES: Record<string, string> = {
  clientes_cpf_cnpj_key: 'CPF/CNPJ já cadastrado',
  fornecedores_cnpj_key: 'CNPJ já cadastrado',
  produtos_codigo_key: 'Código de produto já cadastrado',
  usuarios_email_key: 'E-mail já cadastrado',
};

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ErroHttp) {
    return res.status(err.status).json({ error: err.message });
  }

  const { code, constraint, type } = err as Error & { code?: string; constraint?: string; type?: string };

  if (type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido no corpo da requisição' });
  }
  if (type === 'entity.too.large') {
    return res.status(413).json({ error: 'Corpo da requisição grande demais' });
  }

  const doBanco = code ? ERROS_DO_BANCO[code] : undefined;
  if (doBanco) {
    console.warn(`Requisição rejeitada pelo banco (código ${code})`);
    const mensagem = code === '23505' && constraint && DUPLICIDADES[constraint] ? DUPLICIDADES[constraint] : doBanco.error;
    return res.status(doBanco.status).json({ error: mensagem });
  }

  console.error(err);

  const emProducao = process.env.NODE_ENV === 'production';
  res.status(500).json({
    error: emProducao ? 'Erro interno do servidor' : err.message || 'Erro interno do servidor',
  });
}

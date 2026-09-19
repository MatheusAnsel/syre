import { describe, it } from 'vitest';

// Comportamentos que a API ainda não tem. Cada item descreve o resultado esperado quando for implementado.
// Ficam como "todo" para aparecerem no relatório sem quebrar o CI.
describe('lacunas conhecidas (backlog de qualidade)', () => {
  it.todo('POST /api/clientes sem "nome" deve responder 400 (hoje a violação do banco vira 500)');
  it.todo('POST /api/clientes com CPF/CNPJ já cadastrado deve responder 409 (hoje vira 500)');
  it.todo('GET com id que não é UUID deve responder 400 ou 404 (hoje o erro de cast do Postgres vira 500)');
  it.todo('POST /api/vendas deve recusar quantidade maior que o estoque disponível (hoje o estoque pode ficar negativo)');
  it.todo('POST /api/vendas deve calcular subtotal e total no servidor a partir de quantidade e preço (hoje confia no valor enviado)');
  it.todo('PATCH /api/vendas/:id/status para "cancelada" deve devolver o estoque e cancelar a conta a receber (hoje só troca o status)');
  it.todo('PATCH /api/contas-receber/:id/receber deve rejeitar valor_pago ausente, zero ou negativo (hoje grava NaN quando ausente e aceita valores negativos)');
});

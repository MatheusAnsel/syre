/** Erro de regra de negócio ou de entrada inválida, com o status HTTP que deve ser devolvido. */
export class ErroHttp extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ErroHttp';
  }
}

/** Exige um texto não vazio (após remover espaços nas pontas). */
export function textoObrigatorio(valor: unknown, descricao: string): string {
  if (typeof valor !== 'string' || valor.trim() === '') {
    throw new ErroHttp(400, `Informe ${descricao}`);
  }
  return valor.trim();
}

/** Converte number ou string numérica em número finito; qualquer outra coisa é inválida. */
function comoNumero(valor: unknown): number | null {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  if (typeof valor === 'string' && valor.trim() !== '') {
    const n = Number(valor);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function numeroPositivo(valor: unknown, descricao: string): number {
  const n = comoNumero(valor);
  if (n === null || n <= 0) throw new ErroHttp(400, `Informe ${descricao} maior que zero`);
  return n;
}

export function numeroNaoNegativo(valor: unknown, descricao: string): number {
  const n = comoNumero(valor);
  if (n === null || n < 0) throw new ErroHttp(400, `Informe ${descricao} igual ou maior que zero`);
  return n;
}

/** Valores monetários são comparados em centavos inteiros para evitar erros de ponto flutuante. */
export const centavos = (valor: number | string): number => Math.round(Number(valor) * 100);

/** Quantidades têm até 3 casas decimais (NUMERIC(15,3)). */
export const milesimos = (valor: number | string): number => Math.round(Number(valor) * 1000);

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

/** Como numeroNaoNegativo, mas aceita ausência do campo e usa um valor padrão. */
export function numeroNaoNegativoOpcional(valor: unknown, padrao: number, descricao: string): number {
  if (valor === undefined || valor === null || valor === '') return padrao;
  return numeroNaoNegativo(valor, descricao);
}

/** Valores monetários são comparados em centavos inteiros para evitar erros de ponto flutuante. */
export const centavos = (valor: number | string): number => Math.round(Number(valor) * 100);

/** Quantidades têm até 3 casas decimais (NUMERIC(15,3)). */
export const milesimos = (valor: number | string): number => Math.round(Number(valor) * 1000);

const UFS_VALIDAS = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

/** Dígitos verificadores do CPF (algoritmo mod 11 padrão). */
function cpfValido(digitos: string): boolean {
  if (digitos.length !== 11 || /^(\d)\1{10}$/.test(digitos)) return false;
  const calcularDigito = (base: string, pesoInicial: number) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (pesoInicial - i);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const d1 = calcularDigito(digitos.slice(0, 9), 10);
  const d2 = calcularDigito(digitos.slice(0, 10), 11);
  return d1 === Number(digitos[9]) && d2 === Number(digitos[10]);
}

/** Dígitos verificadores do CNPJ (algoritmo mod 11 padrão). */
function cnpjValido(digitos: string): boolean {
  if (digitos.length !== 14 || /^(\d)\1{13}$/.test(digitos)) return false;
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const calcularDigito = (base: string, pesos: number[]) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * pesos[i];
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const d1 = calcularDigito(digitos.slice(0, 12), pesos1);
  const d2 = calcularDigito(digitos.slice(0, 13), pesos2);
  return d1 === Number(digitos[12]) && d2 === Number(digitos[13]);
}

/**
 * CPF/CNPJ é opcional: campo vazio/ausente passa. Quando informado, precisa ter
 * 11 dígitos (CPF) ou 14 dígitos (CNPJ) com dígito verificador válido.
 * Guarda o valor como o usuário digitou (com ou sem pontuação).
 */
export function cpfCnpjOpcional(valor: unknown, descricao = 'o CPF/CNPJ'): string | null {
  if (valor === undefined || valor === null || valor === '') return null;
  if (typeof valor !== 'string') throw new ErroHttp(400, `Informe ${descricao} em formato válido`);
  const texto = valor.trim();
  if (texto === '') return null;
  const digitos = apenasDigitos(texto);
  const valido = digitos.length === 11 ? cpfValido(digitos) : digitos.length === 14 ? cnpjValido(digitos) : false;
  if (!valido) throw new ErroHttp(400, `Informe ${descricao} em formato válido`);
  return texto;
}

/** E-mail é opcional; quando informado, precisa ter um formato básico válido. */
export function emailOpcional(valor: unknown, descricao = 'o e-mail'): string | null {
  if (valor === undefined || valor === null || valor === '') return null;
  if (typeof valor !== 'string') throw new ErroHttp(400, `Informe ${descricao} em formato válido`);
  const texto = valor.trim();
  if (texto === '') return null;
  if (!EMAIL_REGEX.test(texto)) throw new ErroHttp(400, `Informe ${descricao} em formato válido`);
  return texto;
}

/** CEP é opcional; quando informado, precisa ter 8 dígitos (com ou sem hífen). */
export function cepOpcional(valor: unknown, descricao = 'o CEP'): string | null {
  if (valor === undefined || valor === null || valor === '') return null;
  if (typeof valor !== 'string') throw new ErroHttp(400, `Informe ${descricao} em formato válido`);
  const texto = valor.trim();
  if (texto === '') return null;
  if (apenasDigitos(texto).length !== 8) throw new ErroHttp(400, `Informe ${descricao} em formato válido`);
  return texto;
}

/** Telefone é opcional; quando informado, precisa ter 10 ou 11 dígitos (DDD + número). */
export function telefoneOpcional(valor: unknown, descricao = 'o telefone'): string | null {
  if (valor === undefined || valor === null || valor === '') return null;
  if (typeof valor !== 'string') throw new ErroHttp(400, `Informe ${descricao} em formato válido`);
  const texto = valor.trim();
  if (texto === '') return null;
  const digitos = apenasDigitos(texto);
  if (digitos.length !== 10 && digitos.length !== 11) throw new ErroHttp(400, `Informe ${descricao} em formato válido`);
  return texto;
}

/** UF é opcional; quando informada, precisa ser uma das 27 siglas válidas. */
export function ufOpcional(valor: unknown, descricao = 'o estado'): string | null {
  if (valor === undefined || valor === null || valor === '') return null;
  if (typeof valor !== 'string') throw new ErroHttp(400, `Informe ${descricao} válido`);
  const texto = valor.trim().toUpperCase();
  if (texto === '') return null;
  if (!UFS_VALIDAS.has(texto)) throw new ErroHttp(400, `Informe ${descricao} válido`);
  return texto;
}

/** Texto opcional: null/undefined/vazio passam; caso contrário, aplica trim e limite de tamanho. */
export function textoOpcional(valor: unknown, max: number, descricao: string): string | null {
  if (valor === undefined || valor === null || valor === '') return null;
  if (typeof valor !== 'string') throw new ErroHttp(400, `Informe ${descricao} em formato válido`);
  const texto = valor.trim();
  if (texto === '') return null;
  if (texto.length > max) throw new ErroHttp(400, `${descricao} não pode passar de ${max} caracteres`);
  return texto;
}

/** Exige uma data válida (aceita string ISO "AAAA-MM-DD" ou Date). */
export function dataObrigatoria(valor: unknown, descricao: string): string {
  if (valor === undefined || valor === null || valor === '') {
    throw new ErroHttp(400, `Informe ${descricao}`);
  }
  const data = new Date(valor as string);
  if (Number.isNaN(data.getTime())) {
    throw new ErroHttp(400, `Informe ${descricao} em formato de data válido`);
  }
  return typeof valor === 'string' ? valor : data.toISOString().slice(0, 10);
}

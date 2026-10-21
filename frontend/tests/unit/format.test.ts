import { describe, it, expect } from 'vitest';
import { fmt } from '../../src/lib/format';

// O PostgreSQL devolve colunas NUMERIC como texto; a formatação precisa aceitar os dois.
describe('fmt.currency', () => {
  it('formata número em reais', () => {
    expect(fmt.currency(1234.5)).toMatch(/R\$\s1\.234,50/);
  });

  it('formata texto vindo da API do mesmo jeito', () => {
    expect(fmt.currency('263.70')).toMatch(/R\$\s263,70/);
  });
});

describe('fmt.qty', () => {
  it('não mostra casas decimais sobrando', () => {
    expect(fmt.qty('4.000')).toBe('4');
    expect(fmt.qty('2.500')).toBe('2,5');
  });

  it('usa separador de milhar brasileiro', () => {
    expect(fmt.qty(1500)).toBe('1.500');
  });
});

import { describe, it, expect } from 'vitest';
import {
  ErroHttp,
  textoObrigatorio,
  numeroPositivo,
  numeroNaoNegativo,
  numeroNaoNegativoOpcional,
  centavos,
  milesimos,
  cpfCnpjOpcional,
  emailOpcional,
  cepOpcional,
  telefoneOpcional,
  ufOpcional,
  textoOpcional,
  dataObrigatoria,
} from '../../src/utils/validacao';

describe('textoObrigatorio', () => {
  it('devolve o texto sem espaços nas pontas', () => {
    expect(textoObrigatorio('  Maria ', 'o nome')).toBe('Maria');
  });

  it.each([[undefined], [null], [''], ['   '], [42], [{}], [['a']]])('rejeita %s com ErroHttp 400', (valor) => {
    expect(() => textoObrigatorio(valor, 'o nome')).toThrow(ErroHttp);
    try {
      textoObrigatorio(valor, 'o nome');
    } catch (e) {
      expect((e as ErroHttp).status).toBe(400);
      expect((e as ErroHttp).message).toBe('Informe o nome');
    }
  });
});

describe('numeroPositivo', () => {
  it.each([[1, 1], [0.5, 0.5], ['12.5', 12.5], [' 3 ', 3]])('aceita %s', (entrada, esperado) => {
    expect(numeroPositivo(entrada, 'o valor')).toBe(esperado);
  });

  it.each([[0], [-1], ['0'], [''], ['  '], ['abc'], [NaN], [Infinity], [null], [undefined], [true], [{}], [[5]]])('rejeita %s', (valor) => {
    expect(() => numeroPositivo(valor, 'o valor')).toThrow('Informe o valor maior que zero');
  });
});

describe('numeroNaoNegativo', () => {
  it('aceita zero e positivos, rejeita negativos e não numéricos', () => {
    expect(numeroNaoNegativo(0, 'o desconto')).toBe(0);
    expect(numeroNaoNegativo('7.5', 'o desconto')).toBe(7.5);
    expect(() => numeroNaoNegativo(-0.01, 'o desconto')).toThrow(ErroHttp);
    expect(() => numeroNaoNegativo('x', 'o desconto')).toThrow(ErroHttp);
  });
});

describe('conversões de precisão', () => {
  it('centavos evita o erro clássico de ponto flutuante', () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(centavos(0.1) + centavos(0.2)).toBe(centavos(0.3));
    expect(centavos('19.99')).toBe(1999);
  });

  it('milesimos converte quantidades com 3 casas', () => {
    expect(milesimos(1.001)).toBe(1001);
    expect(milesimos('2.5')).toBe(2500);
  });
});

describe('numeroNaoNegativoOpcional', () => {
  it('usa o padrão quando ausente/vazio, valida quando informado', () => {
    expect(numeroNaoNegativoOpcional(undefined, 0, 'x')).toBe(0);
    expect(numeroNaoNegativoOpcional(null, 5, 'x')).toBe(5);
    expect(numeroNaoNegativoOpcional('', 5, 'x')).toBe(5);
    expect(numeroNaoNegativoOpcional(10, 0, 'x')).toBe(10);
    expect(() => numeroNaoNegativoOpcional(-1, 0, 'x')).toThrow(ErroHttp);
  });
});

describe('cpfCnpjOpcional', () => {
  it('aceita ausência do campo', () => {
    expect(cpfCnpjOpcional(undefined)).toBeNull();
    expect(cpfCnpjOpcional('')).toBeNull();
  });

  it('aceita CPF e CNPJ com dígito verificador válido, com ou sem pontuação', () => {
    expect(cpfCnpjOpcional('123.456.789-09')).toBe('123.456.789-09');
    expect(cpfCnpjOpcional('12345678909')).toBe('12345678909');
    expect(cpfCnpjOpcional('12.345.678/0001-95')).toBe('12.345.678/0001-95');
  });

  it.each([['111.111.111-11'], ['123.456.789-00'], ['11.222.333/0001-00'], ['123'], ['abc'], [12345]])(
    'rejeita %s (dígito verificador inválido, tamanho errado ou tipo errado)',
    (valor) => {
      expect(() => cpfCnpjOpcional(valor as never)).toThrow(ErroHttp);
    }
  );
});

describe('emailOpcional', () => {
  it('aceita ausência e e-mails válidos', () => {
    expect(emailOpcional(undefined)).toBeNull();
    expect(emailOpcional('contato@exemplo.com')).toBe('contato@exemplo.com');
  });

  it.each([['sem-arroba'], ['a@'], ['@b.com'], ['a b@c.com'], [42]])('rejeita %s', (valor) => {
    expect(() => emailOpcional(valor as never)).toThrow(ErroHttp);
  });
});

describe('cepOpcional', () => {
  it('aceita ausência e 8 dígitos, com ou sem hífen', () => {
    expect(cepOpcional(undefined)).toBeNull();
    expect(cepOpcional('20000-000')).toBe('20000-000');
    expect(cepOpcional('20000000')).toBe('20000000');
  });

  it.each([['2000-000'], ['abcdefgh'], [123]])('rejeita %s', (valor) => {
    expect(() => cepOpcional(valor as never)).toThrow(ErroHttp);
  });
});

describe('telefoneOpcional', () => {
  it('aceita ausência, 10 ou 11 dígitos', () => {
    expect(telefoneOpcional(undefined)).toBeNull();
    expect(telefoneOpcional('(21) 3333-4444')).toBe('(21) 3333-4444');
    expect(telefoneOpcional('(21) 98691-9858')).toBe('(21) 98691-9858');
  });

  it.each([['123'], ['(21) 1234-567'], [42]])('rejeita %s', (valor) => {
    expect(() => telefoneOpcional(valor as never)).toThrow(ErroHttp);
  });
});

describe('ufOpcional', () => {
  it('aceita ausência e siglas válidas (case-insensitive)', () => {
    expect(ufOpcional(undefined)).toBeNull();
    expect(ufOpcional('RJ')).toBe('RJ');
    expect(ufOpcional('rj')).toBe('RJ');
  });

  it.each([['XX'], ['Rio de Janeiro'], [1]])('rejeita %s', (valor) => {
    expect(() => ufOpcional(valor as never)).toThrow(ErroHttp);
  });
});

describe('textoOpcional', () => {
  it('aceita ausência e aplica trim/limite', () => {
    expect(textoOpcional(undefined, 10, 'x')).toBeNull();
    expect(textoOpcional('  ok  ', 10, 'x')).toBe('ok');
  });

  it('rejeita texto além do limite', () => {
    expect(() => textoOpcional('a'.repeat(11), 10, 'x')).toThrow(ErroHttp);
  });
});

describe('dataObrigatoria', () => {
  it('aceita data ISO válida e rejeita ausência/inválida', () => {
    expect(dataObrigatoria('2026-12-31', 'o vencimento')).toBe('2026-12-31');
    expect(() => dataObrigatoria(undefined, 'o vencimento')).toThrow(ErroHttp);
    expect(() => dataObrigatoria('não é data', 'o vencimento')).toThrow(ErroHttp);
  });
});

import { describe, it, expect } from 'vitest';
import {
  ErroHttp,
  textoObrigatorio,
  numeroPositivo,
  numeroNaoNegativo,
  centavos,
  milesimos,
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

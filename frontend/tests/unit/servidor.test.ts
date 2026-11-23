import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reiniciarVerificacao, verificarServidor } from '../../src/lib/servidor';

describe('verificação do servidor (API em plano gratuito)', () => {
  beforeEach(() => reiniciarVerificacao());

  it('servidor respondendo: pronto, e as chamadas seguintes reaproveitam a mesma verificação', async () => {
    const f = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    expect(await verificarServidor(f)).toBe(true);
    expect(await verificarServidor(f)).toBe(true);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('chamadas simultâneas não duplicam a requisição', async () => {
    const f = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    await Promise.all([verificarServidor(f), verificarServidor(f), verificarServidor(f)]);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('falha de conexão não é tratada como servidor pronto, e libera nova tentativa', async () => {
    const f = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValue(new Response('{}', { status: 200 }));
    expect(await verificarServidor(f)).toBe(false);
    expect(await verificarServidor(f)).toBe(true);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('resposta de erro (ex.: 502 do provedor) conta como indisponível', async () => {
    const f = vi.fn().mockResolvedValue(new Response('', { status: 502 }));
    expect(await verificarServidor(f)).toBe(false);
  });

  it('servidor que não responde no limite vira indisponível (timeout)', async () => {
    const f = vi.fn((_url: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_res, rej) => init?.signal?.addEventListener('abort', () => rej(new DOMException('timeout', 'TimeoutError')))),
    ) as unknown as typeof fetch;
    expect(await verificarServidor(f, 20)).toBe(false);
  });
});

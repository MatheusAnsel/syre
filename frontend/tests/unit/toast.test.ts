import { describe, it, expect, vi } from 'vitest';
import { notify, subscribeToast } from '../../src/lib/toast';

describe('toast (notify/subscribeToast)', () => {
  it('entrega o aviso para quem está inscrito, com type e message corretos', () => {
    const recebidos: unknown[] = [];
    const unsubscribe = subscribeToast((toast) => recebidos.push(toast));

    notify('Algo deu errado', 'error');

    expect(recebidos).toHaveLength(1);
    expect(recebidos[0]).toMatchObject({ type: 'error', message: 'Algo deu errado' });
    unsubscribe();
  });

  it('usa "error" como tipo padrão quando não especificado', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToast(listener);

    notify('Mensagem sem tipo');

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    unsubscribe();
  });

  it('dá ids diferentes para toasts diferentes', () => {
    const recebidos: { id: number }[] = [];
    const unsubscribe = subscribeToast((t) => recebidos.push(t));

    notify('Primeiro');
    notify('Segundo');

    expect(recebidos[0].id).not.toBe(recebidos[1].id);
    unsubscribe();
  });

  it('para de notificar depois do unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToast(listener);
    unsubscribe();

    notify('Não deveria chegar');

    expect(listener).not.toHaveBeenCalled();
  });

  it('não entrega para quem nunca se inscreveu', () => {
    const listener = vi.fn();
    // não chama subscribeToast
    notify('Sem inscritos');
    expect(listener).not.toHaveBeenCalled();
  });
});

export type ToastType = 'error' | 'success';

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

type Listener = (toast: ToastItem) => void;

let listeners: Listener[] = [];
let nextId = 1;

/**
 * Dispara um aviso na tela. Pode ser chamado de qualquer lugar — inclusive
 * fora de componentes React (ex.: lib/api.ts) — porque não depende de contexto.
 */
export function notify(message: string, type: ToastType = 'error') {
  const toast: ToastItem = { id: nextId++, type, message };
  listeners.forEach((l) => l(toast));
}

/** Usado pelo <ToastContainer> para escutar os avisos disparados por notify(). */
export function subscribeToast(listener: Listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

import { useEffect, useState } from 'react';

// A API fica em hospedagem gratuita e dorme sem uso; o primeiro acesso pode levar até um minuto.
// Um ping em /health acorda o servidor assim que a página abre, e a interface avisa enquanto ele não responde.
const HEALTH = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/health` : '/health';
const AVISO_APOS_MS = 1500;

let ping: Promise<void> | null = null;

function acordar(): Promise<void> {
  if (!ping) {
    ping = fetch(HEALTH, { cache: 'no-store', mode: 'no-cors' })
      .then(() => undefined)
      .catch(() => undefined);
  }
  return ping;
}

/** true enquanto o servidor ainda não respondeu e já se passou tempo suficiente para valer o aviso. */
export function useServidorIniciando(): boolean {
  const [iniciando, setIniciando] = useState(false);

  useEffect(() => {
    let ativo = true;
    let pronto = false;
    const timer = setTimeout(() => {
      if (ativo && !pronto) setIniciando(true);
    }, AVISO_APOS_MS);
    void acordar().then(() => {
      pronto = true;
      if (ativo) setIniciando(false);
    });
    return () => {
      ativo = false;
      clearTimeout(timer);
    };
  }, []);

  return iniciando;
}

export const MENSAGEM_SERVIDOR = 'Servidor iniciando, pode levar até 1 minuto.';
export const DETALHE_SERVIDOR =
  'A API fica em hospedagem gratuita e dorme quando não é usada. Pode entrar normalmente: o acesso continua assim que ela responder.';

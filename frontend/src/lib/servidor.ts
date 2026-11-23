import { useCallback, useEffect, useState } from 'react';

// A API fica em hospedagem gratuita e dorme sem uso; o primeiro acesso pode levar até um minuto.
// Um GET em /health acorda o servidor assim que a página abre, e a interface avisa enquanto ele não responde.
// Se ele não responder dentro do limite (ou responder com erro), a falha aparece para quem está usando,
// com a opção de tentar de novo: ela não é tratada como se o servidor estivesse pronto.
const HEALTH = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/health` : '/health';
const AVISO_APOS_MS = 1500;
export const LIMITE_MS = 90_000;

export type EstadoServidor = 'verificando' | 'iniciando' | 'pronto' | 'indisponivel';

// Uma verificação por vez para a página inteira (Login e RequireAuth usam o mesmo hook).
let ping: Promise<boolean> | null = null;

export function verificarServidor(fetchImpl: typeof fetch = fetch, limiteMs = LIMITE_MS): Promise<boolean> {
  if (!ping) {
    ping = fetchImpl(HEALTH, { cache: 'no-store', signal: AbortSignal.timeout(limiteMs) })
      .then((res) => res.ok)
      .catch(() => false)
      .then((ok) => {
        // Falhou: libera uma nova tentativa. Deu certo: as próximas chamadas reaproveitam o resultado.
        if (!ok) ping = null;
        return ok;
      });
  }
  return ping;
}

/** Só para testes. */
export function reiniciarVerificacao(): void {
  ping = null;
}

/**
 * Estado do servidor para a interface:
 * - `iniciando` só depois de AVISO_APOS_MS, para não piscar o aviso quando a API já está acordada;
 * - `indisponivel` quando não respondeu em LIMITE_MS ou respondeu com erro (com `tentarDeNovo`).
 */
export function useServidor(): { estado: EstadoServidor; tentarDeNovo: () => void } {
  const [estado, setEstado] = useState<EstadoServidor>('verificando');
  const [rodada, setRodada] = useState(0);

  useEffect(() => {
    let ativo = true;
    let respondeu = false;
    const timer = setTimeout(() => {
      if (ativo && !respondeu) setEstado('iniciando');
    }, AVISO_APOS_MS);
    void verificarServidor().then((ok) => {
      respondeu = true;
      clearTimeout(timer);
      if (ativo) setEstado(ok ? 'pronto' : 'indisponivel');
    });
    return () => {
      ativo = false;
      clearTimeout(timer);
    };
  }, [rodada]);

  const tentarDeNovo = useCallback(() => {
    setEstado('verificando');
    setRodada((n) => n + 1);
  }, []);

  return { estado, tentarDeNovo };
}

/** true enquanto o servidor ainda não respondeu e já se passou tempo suficiente para valer o aviso. */
export function useServidorIniciando(): boolean {
  return useServidor().estado === 'iniciando';
}

export const MENSAGEM_SERVIDOR = 'Servidor iniciando, pode levar até 1 minuto.';
export const DETALHE_SERVIDOR =
  'A API fica em hospedagem gratuita e dorme quando não é usada. Pode entrar normalmente: o acesso continua assim que ela responder.';
export const MENSAGEM_INDISPONIVEL = 'O servidor não respondeu.';
export const DETALHE_INDISPONIVEL =
  'A API pode estar fora do ar ou ainda subindo. Tente de novo em instantes; o código e as capturas continuam no GitHub.';

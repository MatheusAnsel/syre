import { Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from '../../lib/auth';
import {
  useServidor, MENSAGEM_SERVIDOR, DETALHE_SERVIDOR, MENSAGEM_INDISPONIVEL, DETALHE_INDISPONIVEL,
} from '../../lib/servidor';

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { usuario, carregando } = useAuth();
  const location = useLocation();
  const { estado: servidor } = useServidor();

  if (carregando) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--rich-black)', color: 'var(--gray-400)', fontSize: 13, padding: 16,
      }}>
        {servidor === 'iniciando' || servidor === 'indisponivel' ? (
          <div role="status" aria-live="polite" style={{ maxWidth: 360, textAlign: 'center' }}>
            <p style={{ color: 'var(--white)', fontWeight: 600, marginBottom: 6 }}>
              {servidor === 'iniciando' ? MENSAGEM_SERVIDOR : MENSAGEM_INDISPONIVEL}
            </p>
            <p>{servidor === 'iniciando' ? DETALHE_SERVIDOR : DETALHE_INDISPONIVEL}</p>
            {servidor === 'indisponivel' && (
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{ marginTop: 12, background: 'none', border: '1px solid var(--slate)', borderRadius: 6, padding: '6px 12px', color: 'var(--white)', cursor: 'pointer', font: 'inherit' }}
              >
                Tentar de novo
              </button>
            )}
          </div>
        ) : (
          'Carregando...'
        )}
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

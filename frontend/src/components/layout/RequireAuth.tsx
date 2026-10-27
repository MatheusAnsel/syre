import { Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from '../../lib/auth';
import { useServidorIniciando, MENSAGEM_SERVIDOR, DETALHE_SERVIDOR } from '../../lib/servidor';

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { usuario, carregando } = useAuth();
  const location = useLocation();
  const iniciando = useServidorIniciando();

  if (carregando) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--rich-black)', color: 'var(--gray-400)', fontSize: 13, padding: 16,
      }}>
        {iniciando ? (
          <div role="status" aria-live="polite" style={{ maxWidth: 360, textAlign: 'center' }}>
            <p style={{ color: 'var(--white)', fontWeight: 600, marginBottom: 6 }}>{MENSAGEM_SERVIDOR}</p>
            <p>{DETALHE_SERVIDOR}</p>
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

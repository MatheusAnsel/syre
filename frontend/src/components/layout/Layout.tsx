import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../lib/auth';

export default function Layout() {
  const { isDemo } = useAuth();
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{
        marginLeft: 240, flex: 1, padding: '32px',
        background: 'var(--rich-black)', minHeight: '100vh',
      }}>
        {isDemo && (
          <div role="status" style={{
            background: 'var(--charcoal)', border: '1px solid var(--slate)', borderRadius: 'var(--radius)',
            color: 'var(--gray-400)', fontSize: 12, padding: '8px 12px', marginBottom: 20,
          }}>
            Modo demonstração: você está navegando com uma conta somente leitura. Tentativas de gravar são recusadas.
          </div>
        )}
        <Outlet />
      </main>
      <style>{`
        @media (max-width: 768px) {
          main { margin-left: 0 !important; padding: 16px !important; padding-top: 60px !important; }
        }
      `}</style>
    </div>
  );
}

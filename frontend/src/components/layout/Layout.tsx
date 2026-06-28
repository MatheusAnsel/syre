import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{
        marginLeft: 240, flex: 1, padding: '32px',
        background: 'var(--rich-black)', minHeight: '100vh',
      }}>
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

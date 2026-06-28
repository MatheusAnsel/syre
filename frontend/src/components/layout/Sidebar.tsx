import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Truck, Package, ShoppingCart,
  CreditCard, BarChart2, X, Menu
} from 'lucide-react';
import { useState } from 'react';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/fornecedores', label: 'Fornecedores', icon: Truck },
  { to: '/produtos', label: 'Produtos', icon: Package },
  { to: '/estoque', label: 'Estoque', icon: BarChart2 },
  { to: '/vendas', label: 'Vendas', icon: ShoppingCart },
  { to: '/contas-receber', label: 'Contas a Receber', icon: CreditCard },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', top: 16, left: 16, zIndex: 200,
          background: 'var(--charcoal)', border: '1px solid var(--slate)',
          borderRadius: 'var(--radius)', padding: '8px', display: 'none',
          color: 'var(--white)',
        }}
        className="mobile-menu-btn"
      >
        <Menu size={20} />
      </button>

      {/* Overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            zIndex: 150,
          }}
        />
      )}

      <aside style={{
        width: 240, minHeight: '100vh', background: 'var(--dark-gray)',
        borderRight: '1px solid var(--slate)', display: 'flex', flexDirection: 'column',
        padding: '24px 0', position: 'fixed', top: 0, left: 0, zIndex: 160,
        transition: 'transform 0.2s',
      }}>
        {/* Logo */}
        <div style={{ padding: '0 24px 32px', borderBottom: '1px solid var(--slate)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{
              fontFamily: 'Space Grotesk, sans-serif',
              fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px',
              color: 'var(--white)',
            }}>
              Syre<span style={{ color: 'var(--accent)' }}>.</span>
            </span>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', color: 'var(--gray-400)', display: 'none' }}
              className="close-btn"
            >
              <X size={18} />
            </button>
          </div>
          <p style={{ color: 'var(--gray-600)', fontSize: 11, marginTop: 4 }}>
            Controle Financeiro
          </p>
        </div>

        {/* Nav */}
        <nav style={{ padding: '16px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 'var(--radius)',
                color: isActive ? 'var(--white)' : 'var(--gray-400)',
                background: isActive ? 'var(--accent-glow)' : 'transparent',
                borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                fontSize: 13, fontWeight: isActive ? 500 : 400,
                transition: 'all 0.15s',
              })}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--slate)' }}>
          <p style={{ color: 'var(--gray-600)', fontSize: 11 }}>v1.0.0</p>
        </div>
      </aside>

      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-btn { display: flex !important; }
          aside { transform: translateX(${open ? '0' : '-100%'}); }
          .close-btn { display: flex !important; }
        }
      `}</style>
    </>
  );
}

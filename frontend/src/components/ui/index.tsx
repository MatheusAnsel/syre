import { ReactNode, CSSProperties } from 'react';
import { X } from 'lucide-react';

/* ─── Button ─────────────────────────────────────────────────── */
type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant; size?: 'sm' | 'md'; children: ReactNode;
}
const btnStyles: Record<BtnVariant, CSSProperties> = {
  primary:   { background: 'var(--accent)',    color: '#000' },
  secondary: { background: 'var(--charcoal)', color: 'var(--white)', border: '1px solid var(--slate)' },
  danger:    { background: 'var(--danger)',    color: '#000' },
  ghost:     { background: 'transparent',     color: 'var(--gray-400)', border: '1px solid var(--slate)' },
};
export function Button({ variant = 'primary', size = 'md', children, style, ...props }: BtnProps) {
  return (
    <button style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: size === 'sm' ? '6px 12px' : '9px 16px',
      borderRadius: 'var(--radius)', fontSize: size === 'sm' ? 12 : 13,
      fontWeight: 500, transition: 'opacity 0.15s', cursor: 'pointer',
      ...btnStyles[variant], ...style,
    }} {...props}>
      {children}
    </button>
  );
}

/* ─── Card ────────────────────────────────────────────────────── */
export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{
      background: 'var(--dark-gray)', border: '1px solid var(--slate)',
      borderRadius: 'var(--radius-lg)', padding: 24, ...style,
    }}>
      {children}
    </div>
  );
}

/* ─── Badge ───────────────────────────────────────────────────── */
type BadgeColor = 'green' | 'red' | 'yellow' | 'gray' | 'cyan';
const badgePalette: Record<BadgeColor, { bg: string; color: string }> = {
  green:  { bg: 'rgba(74,222,128,0.15)', color: '#4ADE80' },
  red:    { bg: 'rgba(248,113,113,0.15)', color: '#F87171' },
  yellow: { bg: 'rgba(250,204,21,0.15)',  color: '#FACC15' },
  gray:   { bg: 'rgba(163,163,163,0.15)', color: '#A3A3A3' },
  cyan:   { bg: 'rgba(34,211,238,0.15)',  color: '#22D3EE' },
};
export function Badge({ label, color = 'gray' }: { label: string; color?: BadgeColor }) {
  const p = badgePalette[color];
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 99,
      fontSize: 11, fontWeight: 500, background: p.bg, color: p.color,
    }}>
      {label}
    </span>
  );
}

/* ─── Modal ───────────────────────────────────────────────────── */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        background: 'var(--dark-gray)', border: '1px solid var(--slate)',
        borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 600,
        maxHeight: '90vh', overflow: 'auto',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid var(--slate)',
        }}>
          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 16, fontWeight: 600 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', color: 'var(--gray-400)', lineHeight: 0 }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

/* ─── PageHeader ──────────────────────────────────────────────── */
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      marginBottom: 28, flexWrap: 'wrap', gap: 12,
    }}>
      <div>
        <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 22, fontWeight: 700 }}>{title}</h1>
        {subtitle && <p style={{ color: 'var(--gray-400)', fontSize: 13, marginTop: 4 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ─── StatCard ────────────────────────────────────────────────── */
export function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <Card>
      <p style={{ color: 'var(--gray-400)', fontSize: 12, marginBottom: 8 }}>{label}</p>
      <p style={{
        fontFamily: 'Space Grotesk, sans-serif', fontSize: 26, fontWeight: 700,
        color: accent ? 'var(--accent)' : 'var(--white)',
      }}>{value}</p>
      {sub && <p style={{ color: 'var(--gray-600)', fontSize: 11, marginTop: 4 }}>{sub}</p>}
    </Card>
  );
}

/* ─── EmptyState ──────────────────────────────────────────────── */
export function EmptyState({ message }: { message: string }) {
  return (
    <div style={{
      padding: '48px 24px', textAlign: 'center', color: 'var(--gray-600)',
      border: '1px dashed var(--slate)', borderRadius: 'var(--radius-lg)',
    }}>
      {message}
    </div>
  );
}

/* ─── FormGroup ───────────────────────────────────────────────── */
export function FormGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ color: 'var(--gray-400)', fontSize: 12, fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

/* ─── Grid ────────────────────────────────────────────────────── */
export function FormGrid({ children }: { children: ReactNode }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: 16,
    }}>
      {children}
    </div>
  );
}

/* ─── SearchBar ───────────────────────────────────────────────── */
export function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || 'Buscar...'}
      style={{ maxWidth: 320 }}
    />
  );
}

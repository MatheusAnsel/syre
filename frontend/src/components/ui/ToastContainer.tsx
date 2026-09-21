import { useEffect, useState } from 'react';
import { X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { subscribeToast, ToastItem } from '../../lib/toast';

const DURACAO_MS: Record<ToastItem['type'], number> = {
  error: 6000,
  success: 4000,
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return subscribeToast((toast) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, DURACAO_MS[toast.type]);
    });
  }, []);

  const remove = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 2000,
        display: 'flex', flexDirection: 'column', gap: 10,
        width: 'min(360px, calc(100vw - 32px))',
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: 'var(--dark-gray)', border: '1px solid var(--slate)',
            borderLeft: `3px solid ${t.type === 'error' ? 'var(--danger)' : 'var(--accent)'}`,
            borderRadius: 'var(--radius-lg)', padding: '12px 14px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            animation: 'toast-in 0.2s ease-out',
          }}
        >
          {t.type === 'error' ? (
            <AlertCircle size={16} color="var(--danger)" style={{ flexShrink: 0, marginTop: 1 }} />
          ) : (
            <CheckCircle2 size={16} color="var(--accent)" style={{ flexShrink: 0, marginTop: 1 }} />
          )}
          <p style={{ fontSize: 13, color: 'var(--white)', flex: 1, lineHeight: 1.4, margin: 0 }}>
            {t.message}
          </p>
          <button
            onClick={() => remove(t.id)}
            aria-label="Fechar aviso"
            style={{ background: 'none', color: 'var(--gray-600)', lineHeight: 0, flexShrink: 0, padding: 0 }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

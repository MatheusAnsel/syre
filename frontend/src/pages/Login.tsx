import { useState, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Button, Card } from '../components/ui';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      await login(email, senha);
      const destino = (location.state as any)?.from || '/';
      navigate(destino, { replace: true });
    } catch (err: any) {
      setErro(err.message || 'Não foi possível entrar');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--rich-black)', padding: 16,
    }}>
      <Card style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <span style={{
            fontFamily: 'Space Grotesk, sans-serif', fontSize: 28, fontWeight: 700,
            color: 'var(--white)',
          }}>
            Syre<span style={{ color: 'var(--accent)' }}>.</span>
          </span>
          <p style={{ color: 'var(--gray-400)', fontSize: 13, marginTop: 4 }}>
            Entre para acessar o painel
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ color: 'var(--gray-400)', fontSize: 12, fontWeight: 500 }}>E-mail</label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ color: 'var(--gray-400)', fontSize: 12, fontWeight: 500 }}>Senha</label>
            <input
              type="password"
              required
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {erro && (
            <p style={{ color: 'var(--danger, #F87171)', fontSize: 12 }}>{erro}</p>
          )}

          <Button type="submit" disabled={carregando} style={{ justifyContent: 'center', marginTop: 8 }}>
            {carregando ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

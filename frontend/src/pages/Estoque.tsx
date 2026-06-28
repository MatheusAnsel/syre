import { useEffect, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';
import { Produto } from '../types';
import {
  Button, PageHeader, Card, EmptyState,
  Modal, FormGroup, Badge,
} from '../components/ui';

interface Movimentacao {
  id: string;
  produto_id: string;
  tipo: 'entrada' | 'saida';
  quantidade: number;
  motivo?: string;
  criado_em: string;
}

export default function Estoque() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [movModal, setMovModal] = useState<Produto | null>(null);
  const [histModal, setHistModal] = useState<Produto | null>(null);
  const [historico, setHistorico] = useState<Movimentacao[]>([]);
  const [tipo, setTipo] = useState<'entrada' | 'saida'>('entrada');
  const [quantidade, setQuantidade] = useState('');
  const [motivo, setMotivo] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'baixo'>('todos');

  const load = () =>
    api.get<Produto[]>(`/produtos${filtro === 'baixo' ? '?baixo_estoque=true' : ''}`).then(setProdutos);

  useEffect(() => { load(); }, [filtro]);

  const ajustar = async () => {
    if (!movModal || !quantidade) return;
    await api.post(`/produtos/${movModal.id}/estoque`, {
      tipo, quantidade: Number(quantidade), motivo,
    });
    setMovModal(null); setQuantidade(''); setMotivo(''); load();
  };

  const verHistorico = async (p: Produto) => {
    setHistModal(p);
    const data = await api.get<Movimentacao[]>(`/produtos/${p.id}/movimentacoes`);
    setHistorico(data);
  };

  const estoqueColor = (p: Produto) =>
    p.estoque_atual <= 0 ? 'red' : p.estoque_atual <= p.estoque_minimo ? 'yellow' : 'green';

  const baixoEstoque = produtos.filter(p => p.estoque_atual <= p.estoque_minimo).length;

  return (
    <div>
      <PageHeader
        title="Estoque"
        subtitle={`${produtos.length} produtos`}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              variant={filtro === 'todos' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFiltro('todos')}
            >
              Todos
            </Button>
            <Button
              variant={filtro === 'baixo' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFiltro('baixo')}
            >
              <AlertTriangle size={13} />
              Baixo estoque {baixoEstoque > 0 && `(${baixoEstoque})`}
            </Button>
          </div>
        }
      />

      <Card style={{ padding: 0 }}>
        {produtos.length === 0 ? (
          <div style={{ padding: 24 }}><EmptyState message="Nenhum produto encontrado." /></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--slate)' }}>
                  {['Produto', 'Unidade', 'Estoque Atual', 'Mínimo', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: 'var(--gray-600)', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {produtos.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: i < produtos.length - 1 ? '1px solid var(--graphite)' : 'none' }}>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500 }}>
                      {p.nome}
                      {p.codigo && <span style={{ fontSize: 11, color: 'var(--gray-600)', marginLeft: 8, fontFamily: 'monospace' }}>{p.codigo}</span>}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--gray-400)' }}>{p.unidade}</td>
                    <td style={{ padding: '12px 16px', fontSize: 15, fontWeight: 600 }}>{Number(p.estoque_atual).toFixed(3)}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--gray-600)' }}>{Number(p.estoque_minimo).toFixed(3)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <Badge
                        label={p.estoque_atual <= 0 ? 'Sem estoque' : p.estoque_atual <= p.estoque_minimo ? 'Baixo' : 'OK'}
                        color={estoqueColor(p)}
                      />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button variant="ghost" size="sm" onClick={() => { setMovModal(p); setTipo('entrada'); setQuantidade(''); setMotivo(''); }}>
                          <ArrowDownCircle size={13} /> Ajustar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => verHistorico(p)}>
                          Histórico
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal Ajuste */}
      {movModal && (
        <Modal title={`Ajustar Estoque — ${movModal.nome}`} onClose={() => setMovModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FormGroup label="Tipo de Movimentação">
              <select value={tipo} onChange={e => setTipo(e.target.value as 'entrada' | 'saida')}>
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>
            </FormGroup>
            <FormGroup label={`Quantidade (${movModal.unidade})`}>
              <input type="number" step="0.001" value={quantidade} onChange={e => setQuantidade(e.target.value)} />
            </FormGroup>
            <FormGroup label="Motivo">
              <input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex: Compra, Devolução, Ajuste..." />
            </FormGroup>
            <div style={{
              background: 'var(--graphite)', borderRadius: 8, padding: '12px 16px',
              fontSize: 13, color: 'var(--gray-400)',
            }}>
              Estoque atual: <strong style={{ color: 'var(--white)' }}>{Number(movModal.estoque_atual).toFixed(3)} {movModal.unidade}</strong>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <Button variant="ghost" onClick={() => setMovModal(null)}>Cancelar</Button>
            <Button onClick={ajustar}>Confirmar</Button>
          </div>
        </Modal>
      )}

      {/* Modal Histórico */}
      {histModal && (
        <Modal title={`Histórico — ${histModal.nome}`} onClose={() => setHistModal(null)}>
          {historico.length === 0 ? (
            <EmptyState message="Nenhuma movimentação registrada." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {historico.map(m => (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0', borderBottom: '1px solid var(--graphite)',
                }}>
                  {m.tipo === 'entrada'
                    ? <ArrowDownCircle size={16} color="var(--success)" />
                    : <ArrowUpCircle size={16} color="var(--danger)" />
                  }
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 500 }}>
                      {m.tipo === 'entrada' ? '+' : '-'}{Number(m.quantidade).toFixed(3)} {histModal.unidade}
                      {m.motivo && <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}> — {m.motivo}</span>}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--gray-600)', marginTop: 2 }}>
                      {new Date(m.criado_em).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

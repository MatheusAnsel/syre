import { useEffect, useState } from 'react';
import { Plus, CheckCircle } from 'lucide-react';
import { api } from '../lib/api';
import { ContaReceber, Cliente } from '../types';
import { fmt } from '../lib/format';
import {
  Button, PageHeader, Card, EmptyState,
  Modal, FormGroup, FormGrid, Badge,
} from '../components/ui';

type StatusColor = 'cyan' | 'green' | 'red' | 'gray';
const statusColors: Record<string, StatusColor> = {
  aberta: 'cyan', recebida: 'green', vencida: 'red', cancelada: 'gray',
};
const statusLabel: Record<string, string> = {
  aberta: 'Aberta', recebida: 'Recebida', vencida: 'Vencida', cancelada: 'Cancelada',
};

export default function ContasReceber() {
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [modal, setModal] = useState(false);
  const [recModal, setRecModal] = useState<ContaReceber | null>(null);
  const [valorPago, setValorPago] = useState('');

  const [form, setForm] = useState({
    cliente_id: '', descricao: '', valor: '', vencimento: '',
  });

  const load = () =>
    api.get<ContaReceber[]>(`/contas-receber${filtroStatus ? `?status=${filtroStatus}` : ''}`).then(setContas);

  useEffect(() => {
    load();
    api.get<Cliente[]>('/clientes?ativo=true').then(setClientes);
  }, [filtroStatus]);

  const salvar = async () => {
    await api.post('/contas-receber', {
      cliente_id: form.cliente_id || null,
      descricao: form.descricao,
      valor: Number(form.valor),
      vencimento: form.vencimento,
    });
    setModal(false);
    setForm({ cliente_id: '', descricao: '', valor: '', vencimento: '' });
    load();
  };

  const registrarRecebimento = async () => {
    if (!recModal || !valorPago) return;
    await api.patch(`/contas-receber/${recModal.id}/receber`, { valor_pago: Number(valorPago) });
    setRecModal(null);
    setValorPago('');
    load();
  };

  const marcarVencidas = async () => {
    const res = await api.post<{ atualizadas: number }>('/contas-receber/marcar-vencidas', {});
    alert(`${res.atualizadas} conta(s) marcada(s) como vencida(s).`);
    load();
  };

  const totalAberto = contas
    .filter(c => c.status === 'aberta' || c.status === 'vencida')
    .reduce((s, c) => s + (Number(c.valor) - Number(c.valor_pago)), 0);

  return (
    <div>
      <PageHeader
        title="Contas a Receber"
        subtitle={`${contas.length} registros — ${fmt.currency(totalAberto)} em aberto`}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={marcarVencidas}>
              Atualizar vencidas
            </Button>
            <Button onClick={() => setModal(true)}>
              <Plus size={14} />Nova Conta
            </Button>
          </div>
        }
      />

      {/* Filtros status */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['', 'aberta', 'vencida', 'recebida', 'cancelada'].map(s => (
          <Button
            key={s}
            size="sm"
            variant={filtroStatus === s ? 'primary' : 'ghost'}
            onClick={() => setFiltroStatus(s)}
          >
            {s === '' ? 'Todas' : statusLabel[s]}
          </Button>
        ))}
      </div>

      <Card style={{ padding: 0 }}>
        {contas.length === 0 ? (
          <div style={{ padding: 24 }}><EmptyState message="Nenhuma conta encontrada." /></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--slate)' }}>
                  {['Descrição', 'Cliente', 'Valor', 'Pago', 'Vencimento', 'Status', ''].map(h => (
                    <th key={h} style={{
                      padding: '12px 16px', textAlign: 'left',
                      fontSize: 11, color: 'var(--gray-600)', fontWeight: 500,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contas.map((c, i) => {
                  const saldo = Number(c.valor) - Number(c.valor_pago);
                  const vencida = c.status === 'vencida';
                  return (
                    <tr key={c.id} style={{ borderBottom: i < contas.length - 1 ? '1px solid var(--graphite)' : 'none' }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500 }}>{c.descricao}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--gray-400)' }}>
                        {c.cliente_nome || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13 }}>{fmt.currency(Number(c.valor))}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--gray-600)' }}>
                        {Number(c.valor_pago) > 0 ? fmt.currency(Number(c.valor_pago)) : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: vencida ? 'var(--danger)' : 'var(--gray-400)' }}>
                        {fmt.date(c.vencimento)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Badge label={statusLabel[c.status]} color={statusColors[c.status]} />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {(c.status === 'aberta' || c.status === 'vencida') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setRecModal(c); setValorPago(String(saldo.toFixed(2))); }}
                          >
                            <CheckCircle size={13} /> Receber
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal nova conta */}
      {modal && (
        <Modal title="Nova Conta a Receber" onClose={() => setModal(false)}>
          <FormGrid>
            <div style={{ gridColumn: '1 / -1' }}>
              <FormGroup label="Descrição *">
                <input
                  value={form.descricao}
                  onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
                  placeholder="Ex: Serviço prestado, Venda avulsa..."
                />
              </FormGroup>
            </div>
            <FormGroup label="Cliente">
              <select
                value={form.cliente_id}
                onChange={e => setForm(p => ({ ...p, cliente_id: e.target.value }))}
              >
                <option value="">Sem cliente</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Valor (R$) *">
              <input
                type="number"
                step="0.01"
                value={form.valor}
                onChange={e => setForm(p => ({ ...p, valor: e.target.value }))}
              />
            </FormGroup>
            <div style={{ gridColumn: '1 / -1' }}>
              <FormGroup label="Vencimento *">
                <input
                  type="date"
                  value={form.vencimento}
                  onChange={e => setForm(p => ({ ...p, vencimento: e.target.value }))}
                />
              </FormGroup>
            </div>
          </FormGrid>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={salvar}>Salvar</Button>
          </div>
        </Modal>
      )}

      {/* Modal recebimento */}
      {recModal && (
        <Modal title="Registrar Recebimento" onClose={() => setRecModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--graphite)', borderRadius: 8, padding: '14px 16px' }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{recModal.descricao}</p>
              <div style={{ display: 'flex', gap: 24, fontSize: 12, color: 'var(--gray-400)' }}>
                <span>Total: <strong style={{ color: 'var(--white)' }}>{fmt.currency(Number(recModal.valor))}</strong></span>
                <span>Já pago: <strong style={{ color: 'var(--success)' }}>{fmt.currency(Number(recModal.valor_pago))}</strong></span>
                <span>Saldo: <strong style={{ color: 'var(--accent)' }}>
                  {fmt.currency(Number(recModal.valor) - Number(recModal.valor_pago))}
                </strong></span>
              </div>
            </div>
            <FormGroup label="Valor recebido agora (R$)">
              <input
                type="number"
                step="0.01"
                value={valorPago}
                onChange={e => setValorPago(e.target.value)}
              />
            </FormGroup>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <Button variant="ghost" onClick={() => setRecModal(null)}>Cancelar</Button>
            <Button onClick={registrarRecebimento}>Confirmar</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

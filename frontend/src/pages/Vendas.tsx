import { useEffect, useState } from 'react';
import { Plus, Trash2, Eye } from 'lucide-react';
import { api } from '../lib/api';
import { Venda, Cliente, Produto, ItemVenda } from '../types';
import { fmt } from '../lib/format';
import {
  Button, PageHeader, Card, EmptyState,
  Modal, FormGroup, FormGrid, Badge,
} from '../components/ui';

type StatusColor = 'yellow' | 'green' | 'red';
const statusColors: Record<string, StatusColor> = {
  pendente: 'yellow', concluida: 'green', cancelada: 'red',
};
const statusLabel: Record<string, string> = {
  pendente: 'Pendente', concluida: 'Concluída', cancelada: 'Cancelada',
};

interface VendaDetalhe extends Venda {
  itens: ItemVenda[];
}

export default function Vendas() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [modal, setModal] = useState(false);
  const [detalhe, setDetalhe] = useState<VendaDetalhe | null>(null);
  const [filtroStatus, setFiltroStatus] = useState('');

  // Form nova venda
  const [clienteId, setClienteId] = useState('');
  const [desconto, setDesconto] = useState('0');
  const [obs, setObs] = useState('');
  const [itens, setItens] = useState<(ItemVenda & { produto_nome?: string; unidade?: string })[]>([]);
  const [produtoSel, setProdutoSel] = useState('');
  const [qtd, setQtd] = useState('1');
  const [precoUnit, setPrecoUnit] = useState('0');

  const load = () =>
    api.get<Venda[]>(`/vendas${filtroStatus ? `?status=${filtroStatus}` : ''}`).then(setVendas);

  useEffect(() => {
    load();
    api.get<Cliente[]>('/clientes?ativo=true').then(setClientes);
    api.get<Produto[]>('/produtos').then(setProdutos);
  }, [filtroStatus]);

  const selecionarProduto = (id: string) => {
    setProdutoSel(id);
    const p = produtos.find(p => p.id === id);
    if (p) setPrecoUnit(String(p.preco_venda));
  };

  const addItem = () => {
    const p = produtos.find(p => p.id === produtoSel);
    if (!p || !qtd) return;
    const q = Number(qtd);
    const pu = Number(precoUnit);
    setItens(prev => [...prev, {
      produto_id: p.id, produto_nome: p.nome, unidade: p.unidade,
      quantidade: q, preco_unit: pu, desconto: 0, subtotal: q * pu,
    }]);
    setProdutoSel(''); setQtd('1'); setPrecoUnit('0');
  };

  const removeItem = (i: number) => setItens(prev => prev.filter((_, idx) => idx !== i));

  const totalItens = itens.reduce((s, i) => s + i.subtotal, 0);
  const totalFinal = totalItens - Number(desconto);

  const salvar = async () => {
    await api.post('/vendas', {
      cliente_id: clienteId || null,
      desconto: Number(desconto),
      observacoes: obs,
      itens,
    });
    setModal(false);
    setItens([]); setClienteId(''); setDesconto('0'); setObs('');
    load();
  };

  const verDetalhe = async (id: string) => {
    const v = await api.get<VendaDetalhe>(`/vendas/${id}`);
    setDetalhe(v);
  };

  const atualizarStatus = async (id: string, status: string) => {
    await api.patch(`/vendas/${id}/status`, { status });
    load();
    if (detalhe?.id === id) setDetalhe(prev => prev ? { ...prev, status: status as Venda['status'] } : null);
  };

  return (
    <div>
      <PageHeader
        title="Vendas"
        subtitle={`${vendas.length} registros`}
        action={<Button onClick={() => { setModal(true); setItens([]); setClienteId(''); setDesconto('0'); setObs(''); }}><Plus size={14} />Nova Venda</Button>}
      />

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['', 'pendente', 'concluida', 'cancelada'].map(s => (
          <Button key={s} size="sm" variant={filtroStatus === s ? 'primary' : 'ghost'} onClick={() => setFiltroStatus(s)}>
            {s === '' ? 'Todas' : statusLabel[s]}
          </Button>
        ))}
      </div>

      <Card style={{ padding: 0 }}>
        {vendas.length === 0 ? (
          <div style={{ padding: 24 }}><EmptyState message="Nenhuma venda encontrada." /></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--slate)' }}>
                  {['Nº', 'Cliente', 'Total', 'Status', 'Data', ''].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: 'var(--gray-600)', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendas.map((v, i) => (
                  <tr key={v.id} style={{ borderBottom: i < vendas.length - 1 ? '1px solid var(--graphite)' : 'none' }}>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontFamily: 'monospace', color: 'var(--gray-400)' }}>#{v.numero}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500 }}>{(v as any).cliente_nome || 'Sem cliente'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--accent)' }}>{fmt.currency(v.total)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <Badge label={statusLabel[v.status]} color={statusColors[v.status]} />
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--gray-400)' }}>{fmt.date(v.criado_em)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <Button variant="ghost" size="sm" onClick={() => verDetalhe(v.id)}><Eye size={13} /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal nova venda */}
      {modal && (
        <Modal title="Nova Venda" onClose={() => setModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <FormGrid>
              <div style={{ gridColumn: '1 / -1' }}>
                <FormGroup label="Cliente">
                  <select value={clienteId} onChange={e => setClienteId(e.target.value)}>
                    <option value="">Sem cliente</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </FormGroup>
              </div>
            </FormGrid>

            {/* Adicionar item */}
            <div>
              <p style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 10, fontWeight: 500 }}>ITENS DA VENDA</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 8, alignItems: 'end', marginBottom: 8 }}>
                <FormGroup label="Produto">
                  <select value={produtoSel} onChange={e => selecionarProduto(e.target.value)}>
                    <option value="">Selecionar...</option>
                    {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </FormGroup>
                <FormGroup label="Qtd">
                  <input type="number" step="0.001" value={qtd} onChange={e => setQtd(e.target.value)} style={{ width: 80 }} />
                </FormGroup>
                <FormGroup label="Preço Unit.">
                  <input type="number" step="0.01" value={precoUnit} onChange={e => setPrecoUnit(e.target.value)} style={{ width: 100 }} />
                </FormGroup>
                <Button variant="secondary" onClick={addItem} style={{ marginBottom: 1 }}>
                  <Plus size={14} />
                </Button>
              </div>

              {itens.length > 0 && (
                <div style={{ border: '1px solid var(--slate)', borderRadius: 8, overflow: 'hidden' }}>
                  {itens.map((item, idx) => (
                    <div key={idx} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                      borderBottom: idx < itens.length - 1 ? '1px solid var(--graphite)' : 'none',
                    }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 500 }}>{item.produto_nome}</p>
                        <p style={{ fontSize: 11, color: 'var(--gray-600)' }}>
                          {item.quantidade} {item.unidade} × {fmt.currency(item.preco_unit)}
                        </p>
                      </div>
                      <span style={{ fontSize: 13, color: 'var(--accent)' }}>{fmt.currency(item.subtotal)}</span>
                      <button onClick={() => removeItem(idx)} style={{ background: 'none', color: 'var(--gray-600)' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <FormGrid>
              <FormGroup label="Desconto (R$)">
                <input type="number" step="0.01" value={desconto} onChange={e => setDesconto(e.target.value)} />
              </FormGroup>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <div style={{ background: 'var(--graphite)', borderRadius: 8, padding: '10px 16px', width: '100%' }}>
                  <p style={{ fontSize: 11, color: 'var(--gray-600)' }}>Total</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>{fmt.currency(totalFinal)}</p>
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <FormGroup label="Observações">
                  <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2} style={{ resize: 'none' }} />
                </FormGroup>
              </div>
            </FormGrid>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={itens.length === 0}>Salvar Venda</Button>
          </div>
        </Modal>
      )}

      {/* Modal detalhe venda */}
      {detalhe && (
        <Modal title={`Venda #${detalhe.numero}`} onClose={() => setDetalhe(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Badge label={statusLabel[detalhe.status]} color={statusColors[detalhe.status]} />
              <span style={{ fontSize: 12, color: 'var(--gray-600)' }}>{fmt.date(detalhe.criado_em)}</span>
              {detalhe.cliente_nome && <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{detalhe.cliente_nome}</span>}
            </div>

            <div style={{ border: '1px solid var(--slate)', borderRadius: 8, overflow: 'hidden' }}>
              {(detalhe.itens || []).map((item, i) => (
                <div key={item.id} style={{
                  display: 'flex', gap: 12, padding: '10px 14px',
                  borderBottom: i < (detalhe.itens?.length || 0) - 1 ? '1px solid var(--graphite)' : 'none',
                }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 500 }}>{item.produto_nome}</p>
                    <p style={{ fontSize: 11, color: 'var(--gray-600)' }}>
                      {item.quantidade} {item.unidade} × {fmt.currency(item.preco_unit)}
                    </p>
                  </div>
                  <span style={{ color: 'var(--accent)', fontSize: 13 }}>{fmt.currency(item.subtotal)}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--gray-400)' }}>Desconto</span>
              <span>{fmt.currency(detalhe.desconto)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
              <span>Total</span>
              <span style={{ color: 'var(--accent)', fontSize: 18 }}>{fmt.currency(detalhe.total)}</span>
            </div>

            {detalhe.status === 'pendente' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <Button onClick={() => atualizarStatus(detalhe.id, 'concluida')}>Concluir</Button>
                <Button variant="danger" onClick={() => atualizarStatus(detalhe.id, 'cancelada')}>Cancelar Venda</Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

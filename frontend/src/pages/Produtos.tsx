import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { Produto, Fornecedor } from '../types';
import { fmt } from '../lib/format';
import {
  Button, PageHeader, SearchBar, Card, EmptyState,
  Modal, FormGroup, FormGrid, Badge,
} from '../components/ui';

const empty = {
  codigo: '', nome: '', descricao: '', categoria: '', unidade: 'UN',
  preco_custo: 0, preco_venda: 0, estoque_atual: 0, estoque_minimo: 0,
  fornecedor_id: '', ativo: true,
};

export default function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ ...empty });
  const [editId, setEditId] = useState<string | null>(null);

  const load = () =>
    api.get<Produto[]>(`/produtos${search ? `?search=${search}` : ''}`).then(setProdutos);

  useEffect(() => {
    load();
    api.get<Fornecedor[]>('/fornecedores').then(setFornecedores);
  }, [search]);

  const save = async () => {
    const payload = {
      ...form,
      preco_custo: Number(form.preco_custo),
      preco_venda: Number(form.preco_venda),
      estoque_atual: Number(form.estoque_atual),
      estoque_minimo: Number(form.estoque_minimo),
      fornecedor_id: form.fornecedor_id || null,
    };
    if (editId) await api.put(`/produtos/${editId}`, payload);
    else await api.post('/produtos', payload);
    setModal(false); setEditId(null); setForm({ ...empty }); load();
  };

  const edit = (p: Produto) => {
    setForm({
      codigo: p.codigo || '', nome: p.nome, descricao: p.descricao || '',
      categoria: p.categoria || '', unidade: p.unidade,
      preco_custo: p.preco_custo, preco_venda: p.preco_venda,
      estoque_atual: p.estoque_atual, estoque_minimo: p.estoque_minimo,
      fornecedor_id: p.fornecedor_id || '', ativo: p.ativo,
    });
    setEditId(p.id); setModal(true);
  };

  const remove = async (id: string) => {
    if (!confirm('Desativar produto?')) return;
    await api.delete(`/produtos/${id}`); load();
  };

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const estoqueColor = (p: Produto) =>
    p.estoque_atual <= 0 ? 'red' : p.estoque_atual <= p.estoque_minimo ? 'yellow' : 'green';

  return (
    <div>
      <PageHeader
        title="Produtos"
        subtitle={`${produtos.length} cadastrados`}
        action={
          <Button onClick={() => { setModal(true); setEditId(null); setForm({ ...empty }); }}>
            <Plus size={14} />Novo Produto
          </Button>
        }
      />
      <div style={{ marginBottom: 16 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nome ou código..." />
      </div>
      <Card style={{ padding: 0 }}>
        {produtos.length === 0 ? (
          <div style={{ padding: 24 }}><EmptyState message="Nenhum produto encontrado." /></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--slate)' }}>
                  {['Código', 'Nome', 'Categoria', 'Preço Venda', 'Estoque', 'Mínimo', 'Fornecedor', ''].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: 'var(--gray-600)', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {produtos.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: i < produtos.length - 1 ? '1px solid var(--graphite)' : 'none' }}>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--gray-600)', fontFamily: 'monospace' }}>{p.codigo || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500 }}>{p.nome}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--gray-400)' }}>{p.categoria || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--accent)' }}>{fmt.currency(p.preco_venda)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <Badge label={`${p.estoque_atual} ${p.unidade}`} color={estoqueColor(p)} />
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--gray-600)' }}>{p.estoque_minimo} {p.unidade}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--gray-400)' }}>{p.fornecedor_nome || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button variant="ghost" size="sm" onClick={() => edit(p)}><Pencil size={13} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => remove(p.id)}><Trash2 size={13} /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modal && (
        <Modal title={editId ? 'Editar Produto' : 'Novo Produto'} onClose={() => setModal(false)}>
          <FormGrid>
            <FormGroup label="Código"><input value={form.codigo} onChange={f('codigo')} /></FormGroup>
            <FormGroup label="Unidade">
              <select value={form.unidade} onChange={f('unidade')}>
                {['UN', 'KG', 'LT', 'MT', 'CX', 'PC'].map(u => <option key={u}>{u}</option>)}
              </select>
            </FormGroup>
            <div style={{ gridColumn: '1 / -1' }}>
              <FormGroup label="Nome *"><input value={form.nome} onChange={f('nome')} /></FormGroup>
            </div>
            <FormGroup label="Categoria"><input value={form.categoria} onChange={f('categoria')} /></FormGroup>
            <FormGroup label="Fornecedor">
              <select value={form.fornecedor_id} onChange={f('fornecedor_id')}>
                <option value="">Selecionar...</option>
                {fornecedores.map(fn => <option key={fn.id} value={fn.id}>{fn.nome}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Preço de Custo"><input type="number" step="0.01" value={form.preco_custo} onChange={f('preco_custo')} /></FormGroup>
            <FormGroup label="Preço de Venda"><input type="number" step="0.01" value={form.preco_venda} onChange={f('preco_venda')} /></FormGroup>
            <FormGroup label="Estoque Inicial"><input type="number" step="0.001" value={form.estoque_atual} onChange={f('estoque_atual')} /></FormGroup>
            <FormGroup label="Estoque Mínimo"><input type="number" step="0.001" value={form.estoque_minimo} onChange={f('estoque_minimo')} /></FormGroup>
            <div style={{ gridColumn: '1 / -1' }}>
              <FormGroup label="Descrição">
                <textarea value={form.descricao} onChange={f('descricao')} rows={3} style={{ resize: 'vertical' }} />
              </FormGroup>
            </div>
          </FormGrid>
          <div style={{ display: 'flex', justifyContent: editId ? 'space-between' : 'flex-end', gap: 10, marginTop: 24 }}>
            {editId && (
              <Button variant="danger" onClick={() => { remove(editId); setModal(false); }}>
                <Trash2 size={14} />Excluir
              </Button>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button>
              <Button onClick={save}>Salvar</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

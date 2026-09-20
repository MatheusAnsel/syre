import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { Fornecedor } from '../types';
import {
  Button, PageHeader, SearchBar, Card, EmptyState,
  Modal, FormGroup, FormGrid, Badge,
} from '../components/ui';

const empty: Omit<Fornecedor, 'id' | 'criado_em'> = {
  nome: '', cnpj: '', email: '', telefone: '',
  endereco: '', cidade: '', estado: '', cep: '', ativo: true,
};

export default function Fornecedores() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ ...empty });
  const [editId, setEditId] = useState<string | null>(null);

  const load = () =>
    api.get<Fornecedor[]>(`/fornecedores${search ? `?search=${search}` : ''}`).then(setFornecedores);

  useEffect(() => { load(); }, [search]);

  const save = async () => {
    if (editId) await api.put(`/fornecedores/${editId}`, form);
    else await api.post('/fornecedores', form);
    setModal(false); setEditId(null); setForm({ ...empty }); load();
  };

  const edit = (f: Fornecedor) => {
    setForm({
      nome: f.nome, cnpj: f.cnpj || '', email: f.email || '',
      telefone: f.telefone || '', endereco: f.endereco || '',
      cidade: f.cidade || '', estado: f.estado || '', cep: f.cep || '', ativo: f.ativo,
    });
    setEditId(f.id); setModal(true);
  };

  const remove = async (id: string) => {
    if (!confirm('Desativar fornecedor?')) return;
    await api.delete(`/fornecedores/${id}`); load();
  };

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div>
      <PageHeader
        title="Fornecedores"
        subtitle={`${fornecedores.length} cadastrados`}
        action={
          <Button onClick={() => { setModal(true); setEditId(null); setForm({ ...empty }); }}>
            <Plus size={14} />Novo Fornecedor
          </Button>
        }
      />
      <div style={{ marginBottom: 16 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nome ou CNPJ..." />
      </div>
      <Card style={{ padding: 0 }}>
        {fornecedores.length === 0 ? (
          <div style={{ padding: 24 }}><EmptyState message="Nenhum fornecedor encontrado." /></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--slate)' }}>
                  {['Nome', 'CNPJ', 'Email', 'Telefone', 'Cidade', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: 'var(--gray-600)', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fornecedores.map((fn, i) => (
                  <tr key={fn.id} style={{ borderBottom: i < fornecedores.length - 1 ? '1px solid var(--graphite)' : 'none' }}>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500 }}>{fn.nome}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--gray-400)' }}>{fn.cnpj || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--gray-400)' }}>{fn.email || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--gray-400)' }}>{fn.telefone || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--gray-400)' }}>{fn.cidade || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <Badge label={fn.ativo ? 'Ativo' : 'Inativo'} color={fn.ativo ? 'green' : 'gray'} />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button variant="ghost" size="sm" onClick={() => edit(fn)}><Pencil size={13} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => remove(fn.id)}><Trash2 size={13} /></Button>
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
        <Modal title={editId ? 'Editar Fornecedor' : 'Novo Fornecedor'} onClose={() => setModal(false)}>
          <FormGrid>
            <FormGroup label="Nome *"><input value={form.nome} onChange={f('nome')} /></FormGroup>
            <FormGroup label="CNPJ"><input value={form.cnpj} onChange={f('cnpj')} /></FormGroup>
            <FormGroup label="E-mail"><input type="email" value={form.email} onChange={f('email')} /></FormGroup>
            <FormGroup label="Telefone"><input value={form.telefone} onChange={f('telefone')} /></FormGroup>
            <FormGroup label="CEP"><input value={form.cep} onChange={f('cep')} /></FormGroup>
            <FormGroup label="Estado"><input value={form.estado} onChange={f('estado')} maxLength={2} /></FormGroup>
            <div style={{ gridColumn: '1 / -1' }}>
              <FormGroup label="Cidade"><input value={form.cidade} onChange={f('cidade')} /></FormGroup>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <FormGroup label="Endereço"><input value={form.endereco} onChange={f('endereco')} /></FormGroup>
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

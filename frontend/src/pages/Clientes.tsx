import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { Cliente } from '../types';
import { Button, PageHeader, SearchBar, Card, EmptyState, Modal, FormGroup, FormGrid, Badge } from '../components/ui';

const empty: Omit<Cliente, 'id' | 'criado_em'> = {
  nome: '', cpf_cnpj: '', email: '', telefone: '', endereco: '', cidade: '', estado: '', cep: '', ativo: true,
};

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ ...empty });
  const [editId, setEditId] = useState<string | null>(null);

  const load = () =>
    api.get<Cliente[]>(`/clientes${search ? `?search=${search}` : ''}`).then(setClientes);

  useEffect(() => { load(); }, [search]);

  const save = async () => {
    if (editId) await api.put(`/clientes/${editId}`, form);
    else await api.post('/clientes', form);
    setModal(false); setEditId(null); setForm({ ...empty }); load();
  };

  const edit = (c: Cliente) => {
    setForm({ nome: c.nome, cpf_cnpj: c.cpf_cnpj || '', email: c.email || '', telefone: c.telefone || '',
      endereco: c.endereco || '', cidade: c.cidade || '', estado: c.estado || '', cep: c.cep || '', ativo: c.ativo });
    setEditId(c.id); setModal(true);
  };

  const remove = async (id: string) => {
    if (!confirm('Desativar cliente?')) return;
    await api.delete(`/clientes/${id}`); load();
  };

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={`${clientes.length} cadastrados`}
        action={<Button onClick={() => { setModal(true); setEditId(null); setForm({ ...empty }); }}><Plus size={14} />Novo Cliente</Button>}
      />
      <div style={{ marginBottom: 16 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nome ou CPF/CNPJ..." />
      </div>
      <Card style={{ padding: 0 }}>
        {clientes.length === 0 ? <div style={{ padding: 24 }}><EmptyState message="Nenhum cliente encontrado." /></div> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--slate)' }}>
                  {['Nome', 'CPF/CNPJ', 'Email', 'Telefone', 'Cidade', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: 'var(--gray-600)', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientes.map((c, i) => (
                  <tr key={c.id} style={{ borderBottom: i < clientes.length - 1 ? '1px solid var(--graphite)' : 'none' }}>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500 }}>{c.nome}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--gray-400)' }}>{c.cpf_cnpj || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--gray-400)' }}>{c.email || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--gray-400)' }}>{c.telefone || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--gray-400)' }}>{c.cidade || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <Badge label={c.ativo ? 'Ativo' : 'Inativo'} color={c.ativo ? 'green' : 'gray'} />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button variant="ghost" size="sm" onClick={() => edit(c)}><Pencil size={13} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => remove(c.id)}><Trash2 size={13} /></Button>
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
        <Modal title={editId ? 'Editar Cliente' : 'Novo Cliente'} onClose={() => setModal(false)}>
          <FormGrid>
            <FormGroup label="Nome *"><input value={form.nome} onChange={f('nome')} /></FormGroup>
            <FormGroup label="CPF / CNPJ"><input value={form.cpf_cnpj} onChange={f('cpf_cnpj')} /></FormGroup>
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

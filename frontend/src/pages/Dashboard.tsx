import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api } from '../lib/api';
import { DashboardData } from '../types';
import { Card, StatCard, PageHeader } from '../components/ui';
import { fmt } from '../lib/format';

// A API devolve o mês como 'Mon/YY' (abreviação em inglês do PostgreSQL); exibe em português.
const MESES_PT: Record<string, string> = {
  Jan: 'Jan', Feb: 'Fev', Mar: 'Mar', Apr: 'Abr', May: 'Mai', Jun: 'Jun',
  Jul: 'Jul', Aug: 'Ago', Sep: 'Set', Oct: 'Out', Nov: 'Nov', Dec: 'Dez',
};
const mesPt = (mes: string) => {
  const [abrev, ano] = mes.split('/');
  return ano ? `${MESES_PT[abrev] ?? abrev}/${ano}` : mes;
};

// Eixo Y: R$ 500, R$ 1,5k, R$ 12k — sem repetir rótulo por arredondamento.
const eixoReais = (v: number) =>
  v >= 1000
    ? `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: v % 1000 === 0 ? 0 : 1 })}k`
    : `R$ ${v}`;

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    api.get<DashboardData>('/dashboard').then(setData).catch(console.error);
  }, []);

  if (!data) {
    return (
      <div style={{ color: 'var(--gray-400)', padding: 48, textAlign: 'center' }}>
        Carregando dashboard...
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={`Visão geral — ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`} />

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard label="Vendas no mês" value={data.vendas_mes} />
        <StatCard label="Receita do mês" value={fmt.currency(data.receita_mes)} accent />
        <StatCard label="A receber" value={fmt.currency(data.valor_a_receber)} sub={`${data.contas_abertas} contas em aberto`} />
        <StatCard label="Clientes ativos" value={data.clientes_ativos} />
        <StatCard label="Produtos em baixo estoque" value={data.produtos_baixo_estoque} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        {/* Vendas por mês */}
        <Card>
          <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, marginBottom: 20 }}>
            Vendas — últimos 6 meses
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.vendas_por_mes} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis dataKey="mes" tick={{ fill: '#A3A3A3', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={mesPt} />
              <YAxis tick={{ fill: '#A3A3A3', fontSize: 11 }} axisLine={false} tickLine={false} width={64}
                tickFormatter={eixoReais} />
              <Tooltip
                contentStyle={{ background: '#111', border: '1px solid #262626', borderRadius: 8 }}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                formatter={(v: number | string) => [fmt.currency(Number(v)), 'Total']}
                labelFormatter={(l: string) => mesPt(l)}
              />
              <Bar dataKey="total" fill="#22D3EE" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Top produtos */}
        <Card>
          <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, marginBottom: 20 }}>
            Top produtos (30 dias)
          </p>
          {data.top_produtos.length === 0 && (
            <p style={{ color: 'var(--gray-600)', fontSize: 13 }}>Nenhum dado ainda.</p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.top_produtos.map((p, i) => (
              <div key={p.nome} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  width: 24, height: 24, borderRadius: '50%', background: 'var(--slate)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, color: 'var(--gray-400)', flexShrink: 0,
                }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 500 }}>{p.nome}</p>
                  <p style={{ fontSize: 11, color: 'var(--gray-600)' }}>{fmt.qty(p.quantidade)} un.</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

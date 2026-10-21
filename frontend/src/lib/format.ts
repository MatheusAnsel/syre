export const fmt = {
  // O PostgreSQL devolve NUMERIC como texto ("263.70"); converte antes de formatar.
  currency: (v: number | string) =>
    Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
  // Quantidades: 4 -> "4", 2.5 -> "2,5", 1500 -> "1.500" (até 3 casas, sem zeros sobrando).
  qty: (v: number | string) =>
    Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 3 }),
  date: (v: string) =>
    new Date(v).toLocaleDateString('pt-BR'),
  dateInput: (v: string) =>
    v ? v.split('T')[0] : '',
};

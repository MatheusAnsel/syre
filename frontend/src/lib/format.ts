export const fmt = {
  currency: (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
  date: (v: string) =>
    new Date(v).toLocaleDateString('pt-BR'),
  dateInput: (v: string) =>
    v ? v.split('T')[0] : '',
};

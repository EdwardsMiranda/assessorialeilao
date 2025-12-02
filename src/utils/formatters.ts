
export const formatCurrency = (val: number | undefined | null) => {
  if (val === undefined || val === null) return 'R$ 0,00';
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const formatDate = (dateString: string) => {
  if (!dateString) return 'Data N/D';
  return new Date(dateString).toLocaleDateString('pt-BR');
};

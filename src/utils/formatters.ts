
export const formatCurrency = (val: number | undefined | null) => {
  if (val === undefined || val === null) return 'R$ 0,00';
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const formatDate = (dateString: string) => {
  if (!dateString) return 'Data N/D';

  // Parse the date string and format it without timezone conversion
  // This prevents the "one day off" issue caused by UTC to local timezone conversion
  const date = new Date(dateString + 'T00:00:00'); // Force local timezone interpretation
  return date.toLocaleDateString('pt-BR');
};


export const formatCurrency = (val: number | undefined | null) => {
  if (val === undefined || val === null) return 'R$ 0,00';
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const formatDate = (dateString: string) => {
  if (!dateString || dateString.trim() === '') return 'Data N/D';

  // Check if it's already an ISO string (has 'T') or just YYYY-MM-DD
  const dateToParse = dateString.includes('T')
    ? dateString
    : dateString + 'T00:00:00';

  const date = new Date(dateToParse);

  // Check if date is valid
  if (isNaN(date.getTime())) return 'Data N/D';

  return date.toLocaleDateString('pt-BR');
};

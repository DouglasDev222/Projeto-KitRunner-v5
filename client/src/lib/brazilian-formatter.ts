export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateTime(date: string, time: string): string {
  const formattedDate = formatDate(date);
  return `${formattedDate} - ${time}h`;
}

export function formatZipCode(zipCode: string): string {
  const cleanZipCode = zipCode.replace(/\D/g, '');
  return cleanZipCode.replace(/(\d{5})(\d{3})/, '$1-$2');
}

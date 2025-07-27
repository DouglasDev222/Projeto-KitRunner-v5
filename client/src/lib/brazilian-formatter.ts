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

export function formatPhone(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, "");
  
  if (cleanPhone.length <= 2) {
    return cleanPhone;
  } else if (cleanPhone.length <= 7) {
    return cleanPhone.replace(/(\d{2})(\d+)/, "($1) $2");
  } else if (cleanPhone.length <= 11) {
    return cleanPhone.replace(/(\d{2})(\d{5})(\d+)/, "($1) $2-$3");
  }
  
  return cleanPhone.slice(0, 11).replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
}

export function isValidPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/\D/g, "");
  return cleanPhone.length >= 10 && cleanPhone.length <= 11;
}

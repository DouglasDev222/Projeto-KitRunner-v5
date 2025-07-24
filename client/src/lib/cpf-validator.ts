export function isValidCPF(cpf: string): boolean {
  // Remove all non-digit characters
  const cleanCPF = cpf.replace(/\D/g, "");
  
  // Check if has 11 digits
  if (cleanCPF.length !== 11) {
    return false;
  }
  
  // Validate first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(9))) return false;
  
  // Validate second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(10))) return false;
  
  return true;
}

export function formatCPF(cpf: string): string {
  const cleanCPF = cpf.replace(/\D/g, "");
  
  if (cleanCPF.length <= 3) {
    return cleanCPF;
  } else if (cleanCPF.length <= 6) {
    return cleanCPF.replace(/(\d{3})(\d+)/, "$1.$2");
  } else if (cleanCPF.length <= 9) {
    return cleanCPF.replace(/(\d{3})(\d{3})(\d+)/, "$1.$2.$3");
  } else if (cleanCPF.length <= 11) {
    return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d+)/, "$1.$2.$3-$4");
  }
  
  return cleanCPF.slice(0, 11).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}



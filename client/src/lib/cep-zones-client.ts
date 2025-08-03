// Client-side CEP zones utility functions
export interface CepZoneResult {
  found: boolean;
  zoneName?: string;
  price?: number;
  error?: string;
}

/**
 * Check if a CEP belongs to any CEP zone for pricing calculation
 */
export async function checkCepZone(zipCode: string): Promise<CepZoneResult> {
  try {
    // Clean and format the CEP
    const cleanZip = zipCode.replace(/\D/g, '');
    
    if (cleanZip.length !== 8) {
      return {
        found: false,
        error: "CEP deve ter 8 dígitos"
      };
    }

    // Call the public CEP zone check API
    const response = await fetch(`/api/cep-zones/check/${cleanZip}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("🔍 API Response:", data);
    
    if (data.success && data.result && data.result.found) {
      return {
        found: true,
        zoneName: data.result.zoneName,
        price: Number(data.result.deliveryCost)
      };
    } else {
      return {
        found: false,
        error: data.message || "CEP não encontrado em nenhuma zona de entrega"
      };
    }
  } catch (error: any) {
    console.error('Error checking CEP zone:', error);
    return {
      found: false,
      error: error.message || "Erro ao verificar zona CEP"
    };
  }
}

/**
 * Format CEP for display (adds dash)
 */
export function formatCep(cep: string): string {
  const cleaned = cep.replace(/\D/g, '');
  if (cleaned.length === 8) {
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
  }
  return cep;
}

/**
 * Clean CEP (removes all non-digits)
 */
export function cleanCep(cep: string): string {
  return cep.replace(/\D/g, '');
}
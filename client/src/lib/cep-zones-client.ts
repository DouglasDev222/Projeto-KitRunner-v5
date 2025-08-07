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
export async function checkCepZone(zipCode: string, eventId?: number): Promise<CepZoneResult> {
  try {
    // Clean and format the CEP
    const cleanZip = zipCode.replace(/\D/g, '');
    
    if (cleanZip.length !== 8) {
      return {
        found: false,
        error: "CEP deve ter 8 dígitos"
      };
    }

    // Use the enhanced calculate-cep-price API that supports event-specific pricing
    const queryParams = new URLSearchParams({ 
      cep: cleanZip,
      // Add timestamp to force fresh request and prevent caching
      _t: Date.now().toString()
    });
    if (eventId) {
      queryParams.append('eventId', eventId.toString());
    }
    
    console.log('🚀 Making FRESH API call to /api/calculate-cep-price with params:', queryParams.toString());
    
    const response = await fetch(`/api/calculate-cep-price?${queryParams}`, {
      // Force no cache to ensure fresh data
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        const errorData = await response.json().catch(() => ({}));
        return {
          found: false,
          error: errorData.error || "CEP não encontrado em nenhuma zona de entrega"
        };
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("🔍 API Response:", data);
    
    if (data.price !== undefined) {
      return {
        found: true,
        zoneName: data.zoneName || "Zona de Entrega",
        price: Number(data.price)
      };
    } else {
      return {
        found: false,
        error: "CEP não encontrado em nenhuma zona de entrega"
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
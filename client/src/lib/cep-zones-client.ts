// Client-side CEP zones utility functions
export interface CepZoneResult {
  found: boolean;
  zoneName?: string;
  price?: number;
  error?: string;
  whatsappUrl?: string; // Added for contact via WhatsApp
  deliveryCost?: number;
  description?: string;
}

// Placeholder for generateWhatsAppUrl function as it's not provided in the original code.
// In a real scenario, this function would be defined elsewhere or imported.
function generateWhatsAppUrl(cep: string, eventName?: string): string {
  const baseMessage = `Olá! Gostaria de informações sobre a entrega para o CEP ${cep}.`;
  const fullMessage = eventName ? `${baseMessage} Ref: ${eventName}` : baseMessage;
  return `https://wa.me/?text=${encodeURIComponent(fullMessage)}`;
}


export async function checkCepZone(cep: string, eventNameOrId?: string | number): Promise<CepZoneResult> {
  try {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      return {
        found: false,
        error: "CEP deve ter 8 dígitos",
        whatsappUrl: generateWhatsAppUrl(cep, typeof eventNameOrId === 'string' ? eventNameOrId : undefined)
      };
    }

    // If eventNameOrId is a number, treat it as eventId and pass it as query parameter
    const url = typeof eventNameOrId === 'number' 
      ? `/api/cep-zones/check/${cleanCep}?eventId=${eventNameOrId}`
      : eventNameOrId 
        ? `/api/cep-zones/check/${cleanCep}?eventName=${encodeURIComponent(eventNameOrId)}`
        : `/api/cep-zones/check/${cleanCep}`;

    const response = await fetch(url);

    // Handle 404 responses (CEP not found)
    if (response.status === 404) {
      const data = await response.json();
      return {
        found: false,
        error: "CEP não atendido. Entre em contato via WhatsApp.",
        whatsappUrl: data.whatsappUrl || generateWhatsAppUrl(cep, eventName)
      };
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao verificar CEP');
    }

    if (!data.success || !data.result.found) {
      return {
        found: false,
        error: "CEP não atendido. Entre em contato via WhatsApp.",
        whatsappUrl: data.whatsappUrl || generateWhatsAppUrl(cep, eventName)
      };
    }

    return {
      found: true,
      zoneName: data.result.zoneName,
      price: data.result.deliveryCost,
      deliveryCost: data.result.deliveryCost,
      description: data.result.description
    };

  } catch (error) {
    console.error('Error checking CEP zone:', error);
    return {
      found: false,
      error: error instanceof Error ? error.message : "Erro ao verificar CEP",
      whatsappUrl: generateWhatsAppUrl(cep, eventName)
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
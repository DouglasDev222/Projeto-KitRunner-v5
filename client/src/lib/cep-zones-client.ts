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

    const response = await fetch(url, {
      // Add cache control to prevent network tab errors from being cached
      cache: 'no-cache'
    });

    const data = await response.json();

    // Check if request was successful but CEP was not found or zone is blocked
    if (response.ok && (!data.success || !data.result?.found)) {
      // Handle blocked zones (inactive zones)
      if (data.blocked) {
        return {
          found: false,
          error: data.message || "No momento não atendemos sua região",
          whatsappUrl: data.whatsappUrl || generateWhatsAppUrl(cep, typeof eventNameOrId === 'string' ? eventNameOrId : undefined)
        };
      }
      
      // Handle CEPs not in any zone
      return {
        found: false,
        error: "CEP não atendido. Entre em contato via WhatsApp.",
        whatsappUrl: data.whatsappUrl || generateWhatsAppUrl(cep, typeof eventNameOrId === 'string' ? eventNameOrId : undefined)
      };
    }

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao verificar CEP');
    }


    return {
      found: true,
      zoneName: data.result.zoneName,
      price: data.result.deliveryCost,
      deliveryCost: data.result.deliveryCost,
      description: data.result.description
    };

  } catch (error) {
    // Silently handle expected CEP not found cases to avoid console pollution
    return {
      found: false,
      error: "CEP não atendido. Entre em contato via WhatsApp.",
      whatsappUrl: generateWhatsAppUrl(cep, typeof eventNameOrId === 'string' ? eventNameOrId : undefined)
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
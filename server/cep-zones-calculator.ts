// CEP Zones Calculator for postal code-based pricing
// This service handles zone identification and delivery cost calculation

import type { CepZone } from "../shared/schema";

export interface CepZoneCalculation {
  zoneName: string;
  zoneId: number;
  deliveryCost: number;
  found: boolean;
  description?: string;
}

/**
 * Clean and normalize CEP format
 */
export function cleanCep(zipCode: string): string {
  // Remove any formatting and ensure 8 digits
  const cleaned = zipCode.replace(/\D/g, '');
  return cleaned.padStart(8, '0');
}

/**
 * Validate if CEP is in valid format
 */
export function isValidCep(zipCode: string): boolean {
  const cleaned = cleanCep(zipCode);
  return cleaned.length === 8 && /^\d{8}$/.test(cleaned);
}

/**
 * Check if a CEP falls within a zone's range
 */
export function validateCepInZone(zipCode: string, zone: CepZone): boolean {
  if (!isValidCep(zipCode)) return false;
  
  const cleanZip = cleanCep(zipCode);
  const startCep = cleanCep(zone.cepStart);
  const endCep = cleanCep(zone.cepEnd);
  
  return cleanZip >= startCep && cleanZip <= endCep;
}

/**
 * Find the appropriate zone for a given CEP
 */
export function findCepZoneFromList(zipCode: string, zones: CepZone[]): CepZone | null {
  if (!isValidCep(zipCode)) return null;
  
  // Filter only active zones
  const activeZones = zones.filter(zone => zone.active);
  
  // Find the first zone that contains this CEP
  for (const zone of activeZones) {
    if (validateCepInZone(zipCode, zone)) {
      return zone;
    }
  }
  
  return null;
}

/**
 * Calculate delivery cost for a given CEP using zones
 */
export function calculateCepZoneDelivery(zipCode: string, zones: CepZone[]): CepZoneCalculation {
  const zone = findCepZoneFromList(zipCode, zones);
  
  if (!zone) {
    return {
      zoneName: '',
      zoneId: 0,
      deliveryCost: 0,
      found: false
    };
  }
  
  return {
    zoneName: zone.name,
    zoneId: zone.id,
    deliveryCost: Number(zone.price),
    found: true,
    description: zone.description || undefined
  };
}

/**
 * Check for overlapping CEP ranges
 */
export function checkCepZoneOverlap(
  cepStart: string, 
  cepEnd: string, 
  zones: CepZone[], 
  excludeId?: number
): CepZone | null {
  if (!isValidCep(cepStart) || !isValidCep(cepEnd)) return null;
  
  const startCep = cleanCep(cepStart);
  const endCep = cleanCep(cepEnd);
  
  // Ensure start <= end
  if (startCep > endCep) return null;
  
  // Check against existing active zones
  for (const zone of zones) {
    if (!zone.active) continue;
    if (excludeId && zone.id === excludeId) continue;
    
    const zoneStart = cleanCep(zone.cepStart);
    const zoneEnd = cleanCep(zone.cepEnd);
    
    // Check for overlap: start <= zoneEnd && end >= zoneStart
    if (startCep <= zoneEnd && endCep >= zoneStart) {
      return zone;
    }
  }
  
  return null;
}

/**
 * Generate WhatsApp contact URL for unsupported CEP
 */
export function generateWhatsAppContactUrl(zipCode: string, eventName?: string): string {
  const baseUrl = 'https://wa.me/5583981302961';
  const message = eventName 
    ? `Olá! Meu CEP ${zipCode} não foi reconhecido no sistema para o evento "${eventName}". Vocês atendem essa região?`
    : `Olá! Meu CEP ${zipCode} não foi reconhecido no sistema. Vocês atendem essa região?`;
  
  return `${baseUrl}?text=${encodeURIComponent(message)}`;
}

// Note: ES module exports used - compatible with TypeScript import/export system
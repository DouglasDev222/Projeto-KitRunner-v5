// CEP Zones Calculator for postal code-based pricing
// This service handles zone identification and delivery cost calculation

import { db } from "./db";
import { cepZones, eventCepZonePrices } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import type { CepZone } from "../shared/schema";

export interface CepZoneCalculation {
  zoneName: string;
  zoneId: number;
  deliveryCost: number;
  found: boolean;
  description?: string;
  priority?: number;  // Add priority field for new system
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

// Interface for CEP range
export interface CepRange {
  start: string;
  end: string;
}

/**
 * Parse CEP ranges from JSON string
 */
export function parseCepRanges(cepRangesJson: string): CepRange[] {
  try {
    const ranges = JSON.parse(cepRangesJson);
    return Array.isArray(ranges) ? ranges : [];
  } catch {
    return [];
  }
}

/**
 * Check if a CEP falls within any of the zone's ranges
 */
export function validateCepInZone(zipCode: string, zone: CepZone): boolean {
  if (!isValidCep(zipCode)) return false;
  
  const cleanZip = cleanCep(zipCode);
  const ranges = parseCepRanges(zone.cepRanges);
  
  // Check if CEP falls within any range
  for (const range of ranges) {
    const startCep = cleanCep(range.start);
    const endCep = cleanCep(range.end);
    
    if (cleanZip >= startCep && cleanZip <= endCep) {
      return true;
    }
  }
  
  return false;
}

/**
 * Find the appropriate zone for a given CEP using priority-based search
 * Returns the zone with highest priority (lowest priority number) that matches
 */
export function findCepZoneFromList(zipCode: string, zones: CepZone[]): CepZone | null {
  if (!isValidCep(zipCode)) return null;
  
  // Filter only active zones and sort by priority (ASC = lower number = higher priority)
  const activeZones = zones
    .filter(zone => zone.active)
    .sort((a, b) => (a.priority || 1) - (b.priority || 1));
  
  // Find the first zone that contains this CEP (highest priority match)
  for (const zone of activeZones) {
    if (validateCepInZone(zipCode, zone)) {
      return zone;
    }
  }
  
  return null;
}

/**
 * Calculate delivery cost for a given CEP using zones with priority support
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
    description: zone.description || undefined,
    priority: zone.priority || 1  // Include priority in result
  };
}

/**
 * Check for overlapping CEP ranges
 */
export function checkCepZoneOverlap(
  newRanges: CepRange[], 
  zones: CepZone[], 
  excludeId?: number
): CepZone | null {
  // Check against existing active zones
  for (const zone of zones) {
    if (!zone.active) continue;
    if (excludeId && zone.id === excludeId) continue;
    
    const existingRanges = parseCepRanges(zone.cepRanges);
    
    // Check each new range against each existing range
    for (const newRange of newRanges) {
      if (!isValidCep(newRange.start) || !isValidCep(newRange.end)) continue;
      
      const newStart = cleanCep(newRange.start);
      const newEnd = cleanCep(newRange.end);
      
      if (newStart > newEnd) continue;
      
      for (const existingRange of existingRanges) {
        const existingStart = cleanCep(existingRange.start);
        const existingEnd = cleanCep(existingRange.end);
        
        // Check for overlap: newStart <= existingEnd && newEnd >= existingStart
        if (newStart <= existingEnd && newEnd >= existingStart) {
          return zone;
        }
      }
    }
  }
  
  return null;
}

/**
 * Parse ranges from text input (one range per line in format: start...end)
 */
export function parseRangesFromText(rangesText: string): CepRange[] {
  const lines = rangesText.split('\n').filter(line => line.trim());
  const ranges: CepRange[] = [];
  
  for (const line of lines) {
    const match = line.trim().match(/^(\d{8})\.\.\.(\d{8})$/);
    if (match) {
      const [, start, end] = match;
      if (isValidCep(start) && isValidCep(end) && start <= end) {
        ranges.push({ start, end });
      }
    }
  }
  
  return ranges;
}

/**
 * Format ranges to text for display (one range per line)
 */
export function formatRangesToText(ranges: CepRange[]): string {
  return ranges.map(range => `${range.start}...${range.end}`).join('\n');
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

/**
 * Calculate delivery cost for a given CEP with event-specific pricing support
 */
export async function calculateCepZonePrice(cep: string, eventId?: number): Promise<number | null> {
  try {
    const cleanedCep = cep.replace(/\D/g, '').padStart(8, '0');
    
    if (!isValidCep(cleanedCep)) {
      return null;
    }
    
    // If eventId provided, try to find event-specific pricing first
    if (eventId) {
      const customPrices = await db
        .select({
          price: eventCepZonePrices.price,
          cepRanges: cepZones.cepRanges,
          priority: cepZones.priority,
          active: cepZones.active
        })
        .from(eventCepZonePrices)
        .innerJoin(cepZones, eq(cepZones.id, eventCepZonePrices.cepZoneId))
        .where(
          and(
            eq(eventCepZonePrices.eventId, eventId),
            eq(cepZones.active, true)
          )
        )
        .orderBy(cepZones.priority);
      
      // Check if CEP matches any event-specific zone
      for (const zonePrice of customPrices) {
        const ranges = parseCepRanges(zonePrice.cepRanges);
        for (const range of ranges) {
          const startCepClean = cleanCep(range.start);
          const endCepClean = cleanCep(range.end);
          
          if (cleanedCep >= startCepClean && cleanedCep <= endCepClean) {
            return parseFloat(zonePrice.price);
          }
        }
      }
    }
    
    // Fallback to global zone pricing
    const zones = await db
      .select()
      .from(cepZones)
      .where(eq(cepZones.active, true))
      .orderBy(cepZones.priority);
    
    for (const zone of zones) {
      if (validateCepInZone(cleanedCep, zone)) {
        return parseFloat(zone.price);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao calcular preço por CEP:', error);
    return null;
  }
}

/**
 * Calculate CEP zone price and return both price and zone name
 */
export async function calculateCepZoneInfo(cep: string, eventId?: number): Promise<{ price: number; zoneName: string } | null> {
  try {
    const cleanedCep = cep.replace(/\D/g, '').padStart(8, '0');
    
    if (!isValidCep(cleanedCep)) {
      return null;
    }
    
    // If eventId provided, try to find event-specific pricing first
    if (eventId) {
      const customPrices = await db
        .select({
          price: eventCepZonePrices.price,
          zoneName: cepZones.name,
          cepRanges: cepZones.cepRanges,
          priority: cepZones.priority,
          active: cepZones.active
        })
        .from(eventCepZonePrices)
        .innerJoin(cepZones, eq(cepZones.id, eventCepZonePrices.cepZoneId))
        .where(
          and(
            eq(eventCepZonePrices.eventId, eventId),
            eq(cepZones.active, true)
          )
        )
        .orderBy(cepZones.priority);
      
      // Check if CEP matches any event-specific zone
      for (const zonePrice of customPrices) {
        const ranges = parseCepRanges(zonePrice.cepRanges);
        for (const range of ranges) {
          const startCepClean = cleanCep(range.start);
          const endCepClean = cleanCep(range.end);
          
          if (cleanedCep >= startCepClean && cleanedCep <= endCepClean) {
            return {
              price: parseFloat(zonePrice.price),
              zoneName: zonePrice.zoneName
            };
          }
        }
      }
    }
    
    // Fallback to global zone pricing
    const zones = await db
      .select()
      .from(cepZones)
      .where(eq(cepZones.active, true))
      .orderBy(cepZones.priority);
    
    for (const zone of zones) {
      if (validateCepInZone(cleanedCep, zone)) {
        return {
          price: parseFloat(zone.price),
          zoneName: zone.name
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao calcular preço e zona por CEP:', error);
    return null;
  }
}

// Note: ES module exports used - compatible with TypeScript import/export system
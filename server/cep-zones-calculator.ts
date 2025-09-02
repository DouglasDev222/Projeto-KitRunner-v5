// CEP Zones Calculator for postal code-based pricing
// This service handles zone identification and delivery cost calculation

import { db } from "./db";
import { cepZones, eventCepZonePrices } from "@shared/schema";
import { eq, and, asc } from "drizzle-orm";
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
 * Calcula preço de entrega para um CEP em um evento específico
 */
export async function calculateCepZonePrice(cep: string, eventId?: number): Promise<number | null> {
  try {
    const cleanedCep = cep.replace(/\D/g, '').padStart(8, '0');

    if (!isValidCep(cleanedCep)) {
      console.error(`🚨 CEP zone validation failed: Invalid CEP format ${cep}`);
      return null;
    }

    console.log(`🔍 Validating CEP ${cleanedCep} for event ${eventId || 'global'}`);


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
            console.log(`✅ CEP ${cleanedCep} found in event-specific zone: ${zonePrice.price}`);
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
        console.log(`✅ CEP ${cleanedCep} found in global zone ${zone.name}: ${zone.price}`);
        return parseFloat(zone.price);
      }
    }

    console.warn(`⚠️ CEP ${cleanedCep} not found in any zones`);
    return null;
  } catch (error) {
    console.error('🚨 Critical error calculating CEP zone price:', error);
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

export class CepZonesCalculator {
  /**
   * Função de debug para analisar como um CEP é processado
   */
  static async debugCepZoneLogic(cep: string, eventId: number): Promise<void> {
    try {
      console.log(`🔍 DEBUG: Analisando CEP ${cep} para evento ${eventId}`);

      // Buscar todas as zonas ativas
      const zones = await db
        .select()
        .from(cepZones)
        .where(eq(cepZones.isActive, true))
        .orderBy(asc(cepZones.priority));

      console.log(`📊 Zonas ativas encontradas: ${zones.length}`);

      zones.forEach((zone, index) => {
        const isMatch = this.isInCepRange(cep, zone.cepStart, zone.cepEnd);
        console.log(`${index + 1}. ${zone.name} (${zone.cepStart}-${zone.cepEnd}) - Prioridade: ${zone.priority} - Match: ${isMatch ? '✅' : '❌'}`);
      });

      // Buscar preços personalizados
      const eventPrices = await db
        .select()
        .from(eventCepZonePrices)
        .where(eq(eventCepZonePrices.eventId, eventId));

      console.log(`💰 Preços personalizados para evento ${eventId}:`, eventPrices.length);
      eventPrices.forEach(ep => {
        const zone = zones.find(z => z.id === ep.cepZoneId);
        console.log(`   - ${zone?.name || 'Zona desconhecida'} (ID: ${ep.cepZoneId}): R$ ${ep.price}`);
      });

    } catch (error) {
      console.error('Erro no debug:', error);
    }
  }

  /**
   * Calcula preço de entrega para um CEP em um evento específico
   */
  static async calculateDeliveryPrice(cep: string, eventId: number): Promise<{ price: number; zoneName: string; zoneId: number }> {
    try {
      // Buscar todas as zonas ativas ordenadas por prioridade
      const zones = await db
        .select()
        .from(cepZones)
        .where(eq(cepZones.isActive, true))
        .orderBy(asc(cepZones.priority));

      if (zones.length === 0) {
        throw new Error('Nenhuma zona de CEP ativa encontrada');
      }

      // Buscar preços personalizados do evento (se existirem)
      const eventPrices = await db
        .select()
        .from(eventCepZonePrices)
        .where(eq(eventCepZonePrices.eventId, eventId));

      // Criar mapa de preços personalizados por zona
      const eventPriceMap = new Map(
        eventPrices.map(ep => [ep.cepZoneId, ep.price])
      );

      // CORREÇÃO: Encontrar a zona correta para o CEP
      let matchedZone = null;
      let fallbackZone = null;

      // Primeiro, separar fallback das outras zonas
      for (const zone of zones) {
        if (zone.priority === 999) { // Zona de fallback
          fallbackZone = zone;
          continue;
        }

        // Verificar se CEP se encaixa na zona específica
        if (this.isInCepRange(cep, zone.cepStart, zone.cepEnd)) {
          matchedZone = zone;
          break; // Para na primeira zona encontrada (maior prioridade)
        }
      }

      // CORREÇÃO: Usar fallback APENAS se CEP não se encaixar em nenhuma zona específica
      if (!matchedZone && fallbackZone) {
        matchedZone = fallbackZone;
      }

      if (!matchedZone) {
        throw new Error('CEP não atendido');
      }

      // CORREÇÃO: Determinar preço correto
      // 1. Verificar se existe preço personalizado para a zona encontrada
      // 2. Se não, usar preço padrão da zona encontrada
      // 3. NUNCA usar preço personalizado de outra zona
      const finalPrice = eventPriceMap.has(matchedZone.id) 
        ? eventPriceMap.get(matchedZone.id)!
        : parseFloat(matchedZone.price);

      console.log(`📍 CEP ${cep} → Zona: ${matchedZone.name} (ID: ${matchedZone.id}, Prioridade: ${matchedZone.priority})`);
      console.log(`💰 Preço aplicado: R$ ${finalPrice} (${eventPriceMap.has(matchedZone.id) ? 'personalizado' : 'padrão'})`);

      return {
        price: finalPrice,
        zoneName: matchedZone.name,
        zoneId: matchedZone.id
      };

    } catch (error) {
      console.error('Erro ao calcular preço de entrega:', error);
      throw error;
    }
  }

  /**
   * Encontra zona para um CEP específico
   */
  static async findZoneForCep(cep: string): Promise<{ zoneId: number; zoneName: string; price: number } | null> {
    try {
      const zones = await db
        .select()
        .from(cepZones)
        .where(eq(cepZones.isActive, true))
        .orderBy(asc(cepZones.priority));

      let matchedZone = null;
      let fallbackZone = null;

      // CORREÇÃO: Separar fallback das zonas específicas
      for (const zone of zones) {
        if (zone.priority === 999) {
          fallbackZone = zone;
          continue;
        }

        // Verificar se CEP se encaixa na zona específica
        if (this.isInCepRange(cep, zone.cepStart, zone.cepEnd)) {
          matchedZone = zone;
          break; // Para na primeira zona encontrada (maior prioridade)
        }
      }

      // CORREÇÃO: Usar fallback APENAS se CEP não se encaixar em nenhuma zona específica
      if (!matchedZone && fallbackZone) {
        matchedZone = fallbackZone;
      }

      if (!matchedZone) {
        return null;
      }

      console.log(`📍 CEP ${cep} encontrado na zona: ${matchedZone.name} (Prioridade: ${matchedZone.priority})`);

      return {
        zoneId: matchedZone.id,
        zoneName: matchedZone.name,
        price: parseFloat(matchedZone.price)
      };

    } catch (error) {
      console.error('Erro ao encontrar zona para CEP:', error);
      return null;
    }
  }

  /**
   * Verifica se um CEP está dentro de uma faixa
   */
  private static isInCepRange(cep: string, cepStart: string, cepEnd: string): boolean {
    const cepNum = parseInt(cep);
    const startNum = parseInt(cepStart);
    const endNum = parseInt(cepEnd);

    const isInRange = cepNum >= startNum && cepNum <= endNum;

    // Log para debug (pode ser removido após correção)
    if (isInRange) {
      console.log(`✅ CEP ${cep} encontrado na faixa ${cepStart}-${cepEnd}`);
    }

    return isInRange;
  }
}

// Note: ES module exports used - compatible with TypeScript import/export system
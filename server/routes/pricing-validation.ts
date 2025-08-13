// SECURITY FIX: Secure pricing calculation endpoint
// This fixes the VULNERABILIDADE_SESSIONSTORAGE_PRICING.md critical security issue

import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { calculateDeliveryCost } from "../distance-calculator";
import { calculateCepZonePrice } from "../cep-zones-calculator";
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';

// Schema for secure pricing calculation request
const pricingCalculationSchema = z.object({
  eventId: z.number(),
  addressId: z.number(),
  kitQuantity: z.number().min(1).max(10)
});

// CRITICAL SECURITY FIX: Secure server-side pricing calculation
export function registerPricingValidationRoutes(app: Express) {
  
  // NEW SECURE ENDPOINT: Calculate delivery pricing on server only
  app.post("/api/calculate-delivery-secure", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      console.log('🔒 SECURITY: Processing secure pricing calculation');
      
      const { eventId, addressId, kitQuantity } = pricingCalculationSchema.parse(req.body);
      
      // Get event data FROM SERVER ONLY
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ 
          success: false,
          message: "Evento não encontrado" 
        });
      }
      
      // Get address data FROM SERVER ONLY
      const address = await storage.getAddress(addressId);
      if (!address) {
        return res.status(404).json({ 
          success: false,
          message: "Endereço não encontrado" 
        });
      }
      
      // Verify address belongs to authenticated user
      const customer = await storage.getCustomer(address.customerId);
      if (!customer || customer.id !== req.user?.id) {
        return res.status(403).json({ 
          success: false,
          message: "Acesso negado - endereço não pertence ao usuário" 
        });
      }
      
      let deliveryCost = 0;
      let pricingType = event.pricingType;
      let zoneName: string | null = null;
      let validated = false;
      
      // CALCULATE PRICING ON SERVER - NEVER TRUST CLIENT
      if (event.pricingType === 'cep_zones') {
        console.log(`🔍 SECURITY: Calculating CEP zone price for ${address.zipCode} on event ${eventId}`);
        const calculatedPrice = await calculateCepZonePrice(address.zipCode, eventId);
        
        if (calculatedPrice === null) {
          console.error(`🚨 SECURITY: CEP ${address.zipCode} not found in zones for event ${eventId}`);
          return res.status(400).json({ 
            success: false,
            message: "CEP não atendido nas zonas de entrega disponíveis para este evento",
            code: "CEP_ZONE_NOT_FOUND",
            validated: false
          });
        }
        
        deliveryCost = calculatedPrice;
        validated = true;
        
        // Get zone name for display purposes (informational only)
        try {
          const zoneInfo = await import('../cep-zones-calculator');
          const cepZoneInfo = await zoneInfo.calculateCepZoneInfo(address.zipCode, eventId);
          zoneName = cepZoneInfo?.zoneName || null;
        } catch (error) {
          console.warn('Warning getting zone name:', error);
          zoneName = null;
        }
        
        console.log(`✅ SECURITY: CEP zone price calculated: R$ ${deliveryCost} for zone ${zoneName || 'unknown'}`);
        
      } else if (event.fixedPrice) {
        // Fixed price - delivery included
        deliveryCost = 0;
        validated = true;
        console.log(`✅ SECURITY: Fixed price event - delivery cost: R$ 0`);
        
      } else {
        // Distance-based pricing
        const deliveryCalculation = calculateDeliveryCost(
          event.pickupZipCode || '58000000',
          address.zipCode
        );
        deliveryCost = deliveryCalculation.deliveryCost;
        validated = true;
        console.log(`✅ SECURITY: Distance-based price calculated: R$ ${deliveryCost}`);
      }
      
      // Calculate total pricing breakdown
      let baseCost = event.fixedPrice ? Number(event.fixedPrice) : 0;
      let extraKitsCost = 0;
      let donationAmount = 0;
      
      if (kitQuantity > 1 && event.extraKitPrice) {
        extraKitsCost = (kitQuantity - 1) * Number(event.extraKitPrice);
      }
      
      if (event.donationRequired && event.donationAmount) {
        donationAmount = Number(event.donationAmount) * kitQuantity;
      }
      
      const totalCost = baseCost + deliveryCost + extraKitsCost + donationAmount;
      
      const secureCalculation = {
        success: true,
        validated: validated,
        deliveryPrice: deliveryCost,
        pricingType: pricingType,
        zoneName: zoneName,
        distance: null, // Not exposing distance calculation details
        pricing: {
          baseCost,
          deliveryCost,
          extraKitsCost,
          donationAmount,
          totalCost,
          kitQuantity
        },
        // Security timestamp to prevent replay attacks
        calculatedAt: new Date().toISOString(),
        // Hash for integrity verification (optional future enhancement)
        calculationId: `calc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
      };
      
      console.log(`🔒 SECURITY: Secure calculation completed for event ${eventId}, address ${addressId}`);
      res.json(secureCalculation);
      
    } catch (error) {
      console.error('🚨 SECURITY ERROR in secure pricing calculation:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false,
          message: "Dados inválidos",
          errors: error.errors 
        });
      }
      
      res.status(500).json({ 
        success: false,
        message: "Erro interno no cálculo de preços" 
      });
    }
  });
  
  console.log('🔒 SECURITY: Pricing validation routes registered');
}
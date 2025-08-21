import type { Express } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { db } from "./db";
import { sql, eq, and } from "drizzle-orm";
import { customerIdentificationSchema, customerRegistrationSchema, customerProfileEditSchema, orderCreationSchema, adminEventCreationSchema, insertCepZoneSchema, eventCepZonePrices, cepZones, events, orders } from "@shared/schema";
import { z } from "zod";
import { calculateDeliveryCost } from "./distance-calculator";
import { calculateCepZonePrice, calculateCepZoneInfo } from "./cep-zones-calculator";
import { MercadoPagoService, getPublicKey } from "./mercadopago-service";
import { EmailService } from "./email/email-service";
import { EmailDataMapper } from "./email/email-data-mapper";
import { PaymentReminderScheduler } from "./email/payment-reminder-scheduler";
import { paymentTimeoutScheduler } from "./payment-timeout-scheduler";
import path from "path";
import crypto from "crypto";
import { requireAuth, requireAdmin, requireOwnership, type AuthenticatedRequest } from './middleware/auth';
import adminAuthRoutes from './routes/admin-auth';
import cepZonesRoutes from './routes/cep-zones';
import couponsRoutes from './routes/coupons';
import policyRoutes from './routes/policies';
import whatsappRoutes from './routes/whatsapp';
import { registerPricingValidationRoutes } from './routes/pricing-validation';
import { CouponService } from './coupon-service';
import { PolicyService } from './policy-service';

// Helper function to update stock and close event if needed after successful payment
async function updateStockAndCloseEventIfNeeded(eventId: number) {
  try {
    const event = await storage.getEvent(eventId);
    if (event && event.stockEnabled) {
      // Update stock first
      const updatedEvent = await storage.updateEventStock(eventId, 1);
      console.log(`📦 Stock updated for event ${eventId}: +1 order`);
      
      // Check if should close event
      if (updatedEvent.maxOrders && updatedEvent.currentOrders >= updatedEvent.maxOrders) {
        await storage.updateEventStatus(eventId, 'fechado_pedidos');
        console.log(`🚫 Event ${eventId} closed for new orders - stock exhausted (${updatedEvent.currentOrders}/${updatedEvent.maxOrders})`);
      }
    }
  } catch (error) {
    console.error(`❌ Error updating stock/closing event ${eventId}:`, error);
  }
}

// Security: Rate limiting for payment endpoints
const paymentRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 payment attempts per IP per 15 minutes
  message: {
    error: 'Muitas tentativas de pagamento. Tente novamente em 15 minutos.',
    statusCode: 429
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Security: Rate limiting for identification endpoints
const identificationRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Max 10 identification attempts per IP per 5 minutes
  message: {
    error: 'Muitas tentativas de identificação. Tente novamente em 5 minutos.',
    statusCode: 429
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Security: General rate limiting for API routes
const generalRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Max 100 requests per IP per minute
  message: {
    error: 'Muitas requisições. Tente novamente em 1 minuto.',
    statusCode: 429
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// CPF validation utility function for backend security
function validateCPF(cpf: string): boolean {
  // Remove formatting characters and validate
  const cleanCPF = cpf.replace(/\D/g, "");

  // CPF validation algorithm
  if (cleanCPF.length !== 11) return false;

  // Check if all digits are the same
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

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

export async function registerRoutes(app: Express): Promise<Server> {

  // Initialize payment reminder scheduler with email service and storage
  const emailService = new EmailService(storage);
  PaymentReminderScheduler.initialize(emailService, storage);
  console.log('📧 Payment Reminder Scheduler initialized');

  // Initialize payment timeout scheduler
  paymentTimeoutScheduler.start();
  console.log('⏰ Payment Timeout Scheduler initialized');

  // Apply general rate limiting to all API routes
  app.use('/api', generalRateLimit);

  // Admin authentication routes
  app.use('/api/admin/auth', adminAuthRoutes);

  // CEP Zones routes (new implementation with multiple ranges)
  app.use('/api', cepZonesRoutes);

  // Coupons routes
  app.use('/api', couponsRoutes);

  // Policy routes
  app.use('/api', policyRoutes);

  // WhatsApp routes
  app.use('/api/admin/whatsapp', whatsappRoutes);

  // SECURITY FIX: Secure pricing validation routes
  registerPricingValidationRoutes(app);

  // Serve test HTML files
  app.get("/test-rejected-payment.html", (req, res) => {
    res.sendFile(path.resolve(process.cwd(), "test-rejected-payment.html"));
  });

  app.get("/test-debug-card.html", (req, res) => {
    res.sendFile(path.resolve(process.cwd(), "test-debug-card.html"));
  });

  app.get("/test-apro-vs-othe.html", (req, res) => {
    res.sendFile(path.resolve(process.cwd(), "test-apro-vs-othe.html"));
  });

  // Get all events
  app.get("/api/events", async (req, res) => {
    try {
      const events = await storage.getEvents();
      // Format dates properly for Brazilian timezone to avoid frontend date shifting
      const formattedEvents = events.map(event => ({
        ...event,
        date: formatEventDate(event.date)
      }));
      res.json(formattedEvents);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar eventos" });
    }
  });

  // Get event by ID
  app.get("/api/events/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const event = await storage.getEvent(id);

      if (!event) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }

      // Format date properly for Brazilian timezone to avoid frontend date shifting
      const formattedEvent = {
        ...event,
        date: event.date instanceof Date ? event.date.toISOString().split('T')[0] : event.date
      };

      res.json(formattedEvent);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar evento" });
    }
  });

  // Identify customer (with rate limiting and CPF validation)
  app.post("/api/customers/identify", identificationRateLimit, async (req, res) => {
    try {
      const { cpf, birthDate } = customerIdentificationSchema.parse(req.body);

      // Security: Additional CPF validation on backend
      if (!validateCPF(cpf)) {
        console.warn(`🔒 Invalid CPF attempted: ${cpf.substring(0, 3)}***`);
        return res.status(400).json({ 
          message: "CPF inválido" 
        });
      }

      const customer = await storage.getCustomerByCredentials(cpf, birthDate);

      if (!customer) {
        return res.status(404).json({ 
          message: "Cliente não encontrado. Verifique o CPF e data de nascimento.",
          canRegister: true
        });
      }

      res.json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Dados inválidos",
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Erro ao identificar cliente" });
    }
  });

  // Register new customer
  app.post("/api/customers/register", async (req, res) => {
    try {
      const registrationData = customerRegistrationSchema.parse(req.body);

      // Check if customer already exists
      const existingCustomer = await storage.getCustomerByCPF(registrationData.cpf.replace(/\D/g, ''));

      if (existingCustomer) {
        return res.status(409).json({ 
          message: "Cliente já cadastrado com este CPF." 
        });
      }

      // Create customer
      const customer = await storage.createCustomer({
        name: registrationData.name,
        cpf: registrationData.cpf.replace(/\D/g, ''),
        birthDate: registrationData.birthDate,
        email: registrationData.email,
        phone: registrationData.phone
      });

      // Create addresses from registration form (max 2)
      const addresses: any[] = [];
      if (registrationData.addresses && registrationData.addresses.length > 0) {
        // Limit to maximum 2 addresses
        const limitedAddresses = registrationData.addresses.slice(0, 2);
        
        for (const addressData of limitedAddresses) {
          const address = await storage.createAddress({
            customerId: customer.id,
            label: addressData.label,
            street: addressData.street,
            number: addressData.number,
            complement: addressData.complement || '',
            neighborhood: addressData.neighborhood,
            city: addressData.city,
            state: addressData.state,
            zipCode: addressData.zipCode.replace(/\D/g, ''),
            isDefault: addressData.isDefault || false
          });
          addresses.push(address);
        }
      }

      res.json({ customer, addresses });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Dados inválidos",
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Erro ao registrar cliente" });
    }
  });

  // Get customer addresses
  app.get("/api/customers/:id/addresses", requireOwnership('id', 'customer'), async (req: AuthenticatedRequest, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const addresses = await storage.getAddressesByCustomerId(customerId);
      res.json(addresses);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar endereços" });
    }
  });

  // Get customer addresses count
  app.get("/api/customers/:id/addresses/count", requireOwnership('id', 'customer'), async (req: AuthenticatedRequest, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const addresses = await storage.getAddressesByCustomerId(customerId);
      res.json({ count: addresses.length });
    } catch (error) {
      res.status(500).json({ message: "Erro ao contar endereços" });
    }
  });

  // Get customer profile (customers can only access their own profiles)
  app.get("/api/customers/:id", requireOwnership('id', 'customer'), async (req: AuthenticatedRequest, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const customer = await storage.getCustomer(customerId);

      if (!customer) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }

      res.json(customer);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar perfil" });
    }
  });

  // Update customer profile (restricted for customers)
  app.put("/api/customers/:id", requireOwnership('id', 'customer'), async (req: AuthenticatedRequest, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const user = req.user;

      // Validate that customer is editing their own profile
      if (user?.id !== customerId) {
        return res.status(403).json({ message: "Não autorizado a editar este perfil" });
      }

      // Parse and validate only allowed fields for customer profile edit
      const updateData = customerProfileEditSchema.parse(req.body);

      // Remove any CPF from request data (security measure)
      const sanitizedData = { ...updateData };
      delete (sanitizedData as any).cpf;
      delete (sanitizedData as any).id;

      const customer = await storage.updateCustomer(customerId, sanitizedData);

      if (!customer) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }

      res.json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Dados inválidos",
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Erro ao atualizar perfil" });
    }
  });

  // Get address by ID
  app.get("/api/addresses/:id", requireOwnership('id', 'address'), async (req: AuthenticatedRequest, res) => {
    try {
      const addressId = parseInt(req.params.id);
      const address = await storage.getAddress(addressId);

      if (!address) {
        return res.status(404).json({ message: "Endereço não encontrado" });
      }

      res.json(address);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar endereço" });
    }
  });

  // Update address
  app.put("/api/addresses/:id", async (req, res) => {
    try {
      const addressId = parseInt(req.params.id);
      const updateData = req.body;

      // If setting as default, unset other defaults first
      if (updateData.isDefault) {
        const currentAddress = await storage.getAddress(addressId);
        if (currentAddress) {
          const addresses = await storage.getAddressesByCustomerId(currentAddress.customerId);
          for (const addr of addresses) {
            if (addr.isDefault && addr.id !== addressId) {
              await storage.updateAddress(addr.id, { isDefault: false });
            }
          }
        }
      }

      const address = await storage.updateAddress(addressId, updateData);
      res.json(address);
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar endereço" });
    }
  });

  // Calculate delivery cost
  app.post("/api/delivery/calculate", async (req, res) => {
    try {
      const { customerId, eventId, kitQuantity, customerZipCode } = req.body;

      const event = await storage.getEvent(eventId);

      if (!event) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }

      let totalCost = 0;
      let baseCost = 0;
      let additionalKitCost = 0;
      let donationAmount = 0;
      let deliveryCost = 0;
      let distance = 0;

      if (event.fixedPrice) {
        baseCost = Number(event.fixedPrice);
        deliveryCost = 0; // Included in fixed price
        distance = 0;
      } else {
        // Calculate delivery cost based on actual distance
        const deliveryCalculation = calculateDeliveryCost(
          event.pickupZipCode || '58000000', // Event pickup ZIP
          customerZipCode || '58030000' // Customer ZIP
        );

        deliveryCost = deliveryCalculation.deliveryCost;
        distance = deliveryCalculation.distance;
        baseCost = 0; // No base cost, only delivery
      }

      if (kitQuantity > 1 && event.extraKitPrice) {
        additionalKitCost = (kitQuantity - 1) * Number(event.extraKitPrice);
      }

      if (event.donationRequired && event.donationAmount) {
        donationAmount = Number(event.donationAmount) * kitQuantity;
      }

      totalCost = baseCost + deliveryCost + additionalKitCost + donationAmount;

      res.json({
        baseCost,
        deliveryCost,
        additionalKitCost,
        donationAmount,
        totalCost,
        distance,
        breakdown: {
          delivery: deliveryCost,
          additionalKits: additionalKitCost,
          donation: donationAmount,
          fixedPrice: event.fixedPrice ? Number(event.fixedPrice) : null,
          distance
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Erro ao calcular entrega" });
    }
  });

  // Create order
  app.post("/api/orders", async (req, res) => {
    try {
      // Convert numeric values to strings for schema validation
      const orderDataForValidation = {
        ...req.body,
        deliveryCost: typeof req.body.deliveryCost === 'number' ? req.body.deliveryCost.toString() : req.body.deliveryCost,
        extraKitsCost: typeof req.body.extraKitsCost === 'number' ? req.body.extraKitsCost.toString() : req.body.extraKitsCost,
        donationCost: typeof req.body.donationCost === 'number' ? req.body.donationCost.toString() : req.body.donationCost,
        discountAmount: typeof req.body.discountAmount === 'number' ? req.body.discountAmount.toString() : req.body.discountAmount,
        totalCost: typeof req.body.totalCost === 'number' ? req.body.totalCost.toString() : req.body.totalCost,
        donationAmount: typeof req.body.donationAmount === 'number' ? req.body.donationAmount.toString() : req.body.donationAmount,
      };

      const orderData = orderCreationSchema.parse(orderDataForValidation);

      // Check for existing order with same idempotency key
      if (orderData.idempotencyKey) {
        const existingOrder = await storage.getOrderByIdempotencyKey(orderData.idempotencyKey);
        if (existingOrder) {
          // Return existing order instead of creating a new one
          const kits = await storage.getKitsByOrderId(existingOrder.id);
          const event = await storage.getEvent(existingOrder.eventId);
          return res.json({
            order: existingOrder,
            kits,
            event,
            deliveryEstimate: {
              eventDate: event?.date,
              deliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
            }
          });
        }
      }

      const selectedEvent = await storage.getEvent(orderData.eventId);
      if (!selectedEvent) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }

      // SECURITY: Check if event is active before allowing order creation
      if (selectedEvent.status !== 'ativo') {
        console.log(`🚫 Order creation blocked - Event ${orderData.eventId} status: ${selectedEvent.status}`);
        return res.status(400).json({
          success: false,
          error: selectedEvent.status === 'fechado_pedidos' 
            ? 'Este evento está fechado para novos pedidos' 
            : 'Este evento não está disponível no momento',
          status: selectedEvent.status
        });
      }

      // NEW: Check event availability and stock
      const eventAvailability = await storage.checkEventAvailability(
        orderData.eventId, 
        1 // Always check for 1 order availability, regardless of kit quantity
      );
      
      if (!eventAvailability.available) {
        const errorMessages = {
          'inativo': 'Este evento não está disponível no momento',
          'fechado_pedidos': 'Este evento está fechado para novos pedidos',
          'not_found': 'Evento não encontrado'
        };
        
        const message = errorMessages[eventAvailability.status as keyof typeof errorMessages] || 
          (eventAvailability.remainingStock === 0 
            ? 'Este evento não possui mais kits disponíveis' 
            : 'Este evento não está disponível para pedidos');
            
        return res.status(400).json({
          success: false,
          error: message,
          remainingStock: eventAvailability.remainingStock,
          status: eventAvailability.status
        });
      }

      // Enhanced validation: CEP zones pricing security check
      if (selectedEvent.pricingType === 'cep_zones') {
        const customerAddress = await storage.getAddress(orderData.addressId);
        if (!customerAddress) {
          console.error(`🚨 SECURITY: Order creation blocked - Address not found for order ${orderData.eventId}`);
          return res.status(400).json({ message: "Endereço não encontrado" });
        }

        // Validate CEP zone pricing
        const { calculateCepZonePrice } = await import('./cep-zones-calculator');
        const validatedPrice = await calculateCepZonePrice(customerAddress.zipCode, orderData.eventId);
        
        if (validatedPrice === null) {
          console.error(`🚨 SECURITY: Order creation blocked - CEP ${customerAddress.zipCode} not found in zones for event ${orderData.eventId}`);
          return res.status(400).json({ 
            message: "CEP não atendido nas zonas de entrega disponíveis para este evento",
            code: "CEP_ZONE_NOT_FOUND"
          });
        }

        // Validate provided delivery cost matches calculated price
        if (orderData.deliveryCost && Math.abs(Number(orderData.deliveryCost) - validatedPrice) > 0.01) {
          console.error(`🚨 SECURITY: Order creation blocked - Delivery cost mismatch. Provided: ${orderData.deliveryCost}, Calculated: ${validatedPrice}`);
          return res.status(400).json({ 
            message: "Valor de entrega não corresponde à zona CEP",
            code: "DELIVERY_COST_MISMATCH" 
          });
        }

        console.log(`✅ CEP zone validation passed for ${customerAddress.zipCode} - Price: R$ ${validatedPrice}`);
      }

      let totalCost = 0;
      let baseCost = 0;
      let deliveryCost = 0;
      let additionalCost = 0;
      let donationAmount = 0;

      // Get customer address for delivery calculation
      const customerAddress = await storage.getAddress(orderData.addressId);

      if (selectedEvent.fixedPrice) {
        baseCost = Number(selectedEvent.fixedPrice);
        deliveryCost = 0; // Included in fixed price
      } else {
        // Calculate delivery cost based on actual distance
        const deliveryCalculation = calculateDeliveryCost(
          selectedEvent.pickupZipCode || '58000000', // Event pickup ZIP
          customerAddress?.zipCode || '58030000' // Customer ZIP
        );

        deliveryCost = deliveryCalculation.deliveryCost;
        baseCost = 0; // No base cost for variable pricing
      }

      if (orderData.kitQuantity > 1 && selectedEvent.extraKitPrice) {
        additionalCost = (orderData.kitQuantity - 1) * Number(selectedEvent.extraKitPrice);
      }

      if (selectedEvent.donationRequired && selectedEvent.donationAmount) {
        donationAmount = Number(selectedEvent.donationAmount) * orderData.kitQuantity;
      }

      totalCost = baseCost + deliveryCost + additionalCost + donationAmount;

      // Use provided costs or calculate them (handle 0 values correctly)
      const finalDeliveryCost = orderData.deliveryCost !== undefined ? Number(orderData.deliveryCost) : deliveryCost;
      const finalExtraKitsCost = orderData.extraKitsCost !== undefined ? Number(orderData.extraKitsCost) : additionalCost;
      const finalDonationAmount = orderData.donationAmount !== undefined ? Number(orderData.donationAmount) : donationAmount;
      const finalTotalCost = orderData.totalCost !== undefined ? Number(orderData.totalCost) : totalCost;

      console.log(`💰 FINAL PRICING CALCULATION:
        - Delivery Cost: R$ ${finalDeliveryCost} (provided: ${orderData.deliveryCost}, calculated: ${deliveryCost})
        - Extra Kits Cost: R$ ${finalExtraKitsCost} (provided: ${orderData.extraKitsCost}, calculated: ${additionalCost})
        - Donation Amount: R$ ${finalDonationAmount} (provided: ${orderData.donationAmount}, calculated: ${donationAmount})
        - Total Cost: R$ ${finalTotalCost} (provided: ${orderData.totalCost}, calculated: ${totalCost})
      `);

      // Create order with proper pricing breakdown
      const order = await storage.createOrder({
        eventId: orderData.eventId,
        customerId: orderData.customerId,
        addressId: orderData.addressId,
        kitQuantity: orderData.kitQuantity,
        deliveryCost: finalDeliveryCost.toString(),
        extraKitsCost: finalExtraKitsCost.toString(),
        donationCost: finalDonationAmount.toString(),
        discountAmount: orderData.discountAmount.toString(),
        couponCode: orderData.couponCode || null,
        totalCost: finalTotalCost.toString(),
        paymentMethod: orderData.paymentMethod,
        status: "aguardando_pagamento", // Order starts awaiting payment
        donationAmount: finalDonationAmount.toString(),
        idempotencyKey: orderData.idempotencyKey,
      });

      // Create kits
      const kits = [];
      for (const kitData of orderData.kits) {
        const kit = await storage.createKit({
          orderId: order.id,
          name: kitData.name,
          cpf: kitData.cpf.replace(/\D/g, ""),
          shirtSize: kitData.shirtSize
        });
        kits.push(kit);
      }

      // NOTE: Stock update will be handled after payment is successfully created
      // to avoid blocking the payment process for the current order

      // If a coupon was used, increment its usage count
      if (orderData.couponCode && orderData.couponCode.trim()) {
        try {
          console.log(`🎫 Incrementing coupon usage for: ${orderData.couponCode}`);
          const incrementSuccess = await CouponService.incrementUsage(orderData.couponCode);
          if (incrementSuccess) {
            console.log(`✅ Coupon usage incremented successfully: ${orderData.couponCode}`);
          } else {
            console.log(`⚠️ Failed to increment coupon usage: ${orderData.couponCode}`);
          }
        } catch (error) {
          console.error(`❌ Error incrementing coupon usage for ${orderData.couponCode}:`, error);
          // Don't fail the order creation if coupon increment fails
        }
      }

      // Register policy acceptance for the order
      try {
        console.log(`📋 Recording policy acceptance for order ${order.id}, customer ${orderData.customerId}`);
        const orderPolicy = await PolicyService.getActivePolicyByType('order');
        if (orderPolicy) {
          await PolicyService.createPolicyAcceptance({
            userId: orderData.customerId,
            policyId: orderPolicy.id,
            context: 'order',
            orderId: order.id
          });
          console.log(`✅ Policy acceptance recorded for order ${order.id}`);
        } else {
          console.log(`⚠️ No active order policy found - skipping policy acceptance for order ${order.id}`);
        }
      } catch (policyError) {
        console.error(`❌ Error recording policy acceptance for order ${order.id}:`, policyError);
        // Don't fail the order creation if policy recording fails
      }

      // Schedule payment pending email to be sent in 1 minute
      PaymentReminderScheduler.schedulePaymentPendingEmail(order.orderNumber, 1);

      res.json({
        order,
        kits,
        event: selectedEvent,
        deliveryEstimate: {
          eventDate: selectedEvent?.date,
          deliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
        }
      });
    } catch (error) {
      console.error('❌ Error creating order:', error);
      if (error instanceof z.ZodError) {
        console.error('❌ Zod validation errors:', error.errors);
        return res.status(400).json({ 
          message: "Dados inválidos",
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Erro ao criar pedido", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Create new address (with limit validation)
  app.post("/api/customers/:id/addresses", async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const addressData = req.body;

      // Check address limit (max 2 addresses per customer)
      const currentAddresses = await storage.getAddressesByCustomerId(customerId);
      if (currentAddresses.length >= 2) {
        return res.status(400).json({ 
          message: "Limite máximo de 2 endereços por cliente atingido",
          code: "ADDRESS_LIMIT_EXCEEDED"
        });
      }

      // If setting as default, unset other defaults first
      if (addressData.isDefault) {
        for (const addr of currentAddresses) {
          if (addr.isDefault) {
            await storage.updateAddress(addr.id, { isDefault: false });
          }
        }
      }

      const address = await storage.createAddress({
        customerId,
        ...addressData,
        zipCode: addressData.zipCode.replace(/\D/g, '')
      });

      res.json(address);
    } catch (error) {
      res.status(500).json({ message: "Erro ao criar endereço" });
    }
  });

  // Get customer orders
  app.get("/api/customers/:id/orders", requireOwnership('id', 'customer'), async (req: AuthenticatedRequest, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const orders = await storage.getOrdersByCustomerId(customerId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar pedidos" });
    }
  });

  // Get order by number with details
  app.get("/api/orders/:orderNumber", requireOwnership('orderNumber', 'order'), async (req: AuthenticatedRequest, res) => {
    try {
      const { orderNumber } = req.params;
      const order = await storage.getOrderByOrderNumber(orderNumber);

      if (!order) {
        return res.status(404).json({ message: "Pedido não encontrado" });
      }

      res.json(order);
    } catch (error) {
      console.error('Error fetching order:', error);
      res.status(500).json({ message: "Erro ao buscar pedido" });
    }
  });

  // Get order kits
  app.get("/api/orders/:id/kits", requireOwnership('id', 'order'), async (req: AuthenticatedRequest, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const kits = await storage.getKitsByOrderId(orderId);
      res.json(kits);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar kits do pedido" });
    }
  });

  // Address management routes (with limit validation)
  app.post("/api/customers/:customerId/addresses", requireOwnership('customerId', 'customer'), async (req: AuthenticatedRequest, res) => {
    try {
      const customerId = parseInt(req.params.customerId);
      const addressData = req.body;

      // Check address limit (max 2 addresses per customer)
      const existingAddresses = await storage.getAddressesByCustomerId(customerId);
      if (existingAddresses.length >= 2) {
        return res.status(400).json({ 
          message: "Limite máximo de 2 endereços por cliente atingido",
          code: "ADDRESS_LIMIT_EXCEEDED"
        });
      }

      // If this address is being set as default, update other addresses
      if (addressData.isDefault) {
        // First get all customer addresses and set them to non-default
        for (const addr of existingAddresses) {
          if (addr.isDefault) {
            await storage.updateAddress(addr.id, { isDefault: false });
          }
        }
      }

      const address = await storage.createAddress({
        ...addressData,
        customerId
      });

      res.json(address);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/addresses/:id", requireOwnership('id', 'address'), async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const addressData = req.body;

      // Get the current address to find the customerId
      const currentAddress = await storage.getAddress(id);
      if (!currentAddress) {
        return res.status(404).json({ message: "Endereço não encontrado" });
      }

      // If this address is being set as default, update other addresses
      if (addressData.isDefault) {
        const existingAddresses = await storage.getAddressesByCustomerId(currentAddress.customerId);
        for (const addr of existingAddresses) {
          if (addr.id !== id && addr.isDefault) {
            await storage.updateAddress(addr.id, { isDefault: false });
          }
        }
      }

      const address = await storage.updateAddress(id, addressData);
      res.json(address);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete address endpoint
  app.delete("/api/addresses/:id", requireOwnership('id', 'address'), async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);

      // Get the current address to verify ownership
      const currentAddress = await storage.getAddress(id);
      if (!currentAddress) {
        return res.status(404).json({ message: "Endereço não encontrado" });
      }

      // Prevent deletion if this is the only address
      const existingAddresses = await storage.getAddressesByCustomerId(currentAddress.customerId);
      if (existingAddresses.length === 1) {
        return res.status(400).json({ 
          message: "Não é possível excluir o último endereço",
          code: "CANNOT_DELETE_LAST_ADDRESS"
        });
      }

      // If this was the default address, set another one as default
      if (currentAddress.isDefault) {
        const otherAddress = existingAddresses.find(addr => addr.id !== id);
        if (otherAddress) {
          await storage.updateAddress(otherAddress.id, { isDefault: true });
        }
      }

      // Delete the address
      await storage.deleteAddress(id);

      res.json({ message: "Endereço excluído com sucesso" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin routes



  app.get("/api/admin/events", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const events = await storage.getAllEvents();
      // Format dates properly for Brazilian timezone to avoid frontend date shifting
      const formattedEvents = events.map(event => ({
        ...event,
        date: event.date instanceof Date ? event.date.toISOString().split('T')[0] : event.date
      }));
      res.json(formattedEvents);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/events", async (req, res) => {
    try {
      console.log("🔍 Raw request body:", JSON.stringify(req.body, null, 2));
      const validatedData = adminEventCreationSchema.parse(req.body);
      console.log("✅ Validated data:", JSON.stringify(validatedData, null, 2));

      // Convert string prices to proper format and handle pricing logic
      const eventData = {
        ...validatedData,
        // Only save fixedPrice if pricing type is "fixed" and price is provided
        fixedPrice: validatedData.pricingType === "fixed" && validatedData.fixedPrice ? validatedData.fixedPrice : null,
        extraKitPrice: validatedData.extraKitPrice ? validatedData.extraKitPrice : "8.00",
        donationAmount: validatedData.donationAmount ? validatedData.donationAmount : null,
      };

      // pricingType IS in the database schema, so we keep it
      const dataToSave = eventData;
      console.log("💾 Data to save:", JSON.stringify(dataToSave, null, 2));

      const event = await storage.createEvent(dataToSave);
      console.log("🎉 Created event:", JSON.stringify(event, null, 2));
      
      // Format date properly for Brazilian timezone to avoid frontend date shifting
      const formattedEvent = {
        ...event,
        date: event.date instanceof Date ? event.date.toISOString().split('T')[0] : event.date
      };
      
      res.json(formattedEvent);
    } catch (error: any) {
      console.error("❌ Error creating event:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // Get single event for admin
  app.get("/api/admin/events/:id", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const event = await storage.getEvent(id);

      if (!event) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }

      // Format date properly for Brazilian timezone to avoid frontend date shifting
      const formattedEvent = {
        ...event,
        date: event.date instanceof Date ? event.date.toISOString().split('T')[0] : event.date
      };

      res.json(formattedEvent);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Utility function to parse local Brazilian date correctly 
  function parseLocalDate(dateString: string, endOfDay = false): Date {
    const time = endOfDay ? 'T23:59:59-03:00' : 'T00:00:00-03:00';
    return new Date(dateString + time);
  }

  // Utility function to format event dates properly for Brazilian timezone
  function formatEventDate(date: any): string {
    if (typeof date === 'string') return date;
    if (date && typeof date === 'object' && date.toISOString) {
      return date.toISOString().split('T')[0];
    }
    return date;
  }

  // Update event
  app.put("/api/admin/events/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;

      // Convert date format using Brazilian timezone to avoid date shifting
      if (updateData.date && !updateData.date.includes('T')) {
        // Parse the date in Brazilian timezone instead of UTC to avoid -1 day issue
        const parsedDate = parseLocalDate(updateData.date);
        updateData.date = parsedDate.toISOString().split('T')[0]; // Keep only date part
      }

      // Clean up the data - ensure proper types
      const cleanedData = {
        ...updateData,
        // Convert boolean strings to actual booleans
        donationRequired: updateData.donationRequired === true || updateData.donationRequired === "true",
        available: updateData.available === true || updateData.available === "true",
        // Handle decimal fields - convert empty strings to null
        fixedPrice: updateData.fixedPrice && updateData.fixedPrice.toString().trim() !== "" ? updateData.fixedPrice.toString() : null,
        extraKitPrice: updateData.extraKitPrice && updateData.extraKitPrice.toString().trim() !== "" ? updateData.extraKitPrice.toString() : "8.00",
        donationAmount: updateData.donationAmount && updateData.donationAmount.toString().trim() !== "" ? updateData.donationAmount.toString() : null,
      };

      const event = await storage.updateEvent(id, cleanedData);

      if (!event) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }

      // Format date properly for Brazilian timezone to avoid frontend date shifting
      const formattedEvent = {
        ...event,
        date: event.date instanceof Date ? event.date.toISOString().split('T')[0] : event.date
      };

      res.json(formattedEvent);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Toggle event availability
  app.patch("/api/admin/events/:id/toggle", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { available } = req.body;

      const event = await storage.updateEvent(id, { available });

      if (!event) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }

      res.json(event);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get orders for a specific event
  app.get("/api/admin/events/:id/orders", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const orders = await storage.getOrdersByEventId(eventId);
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete event (optional - for complete CRUD)
  app.delete("/api/admin/events/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Check if event has orders
      const orders = await storage.getOrdersByEventId(id);
      if (orders.length > 0) {
        return res.status(400).json({ 
          message: "Não é possível excluir evento com pedidos associados" 
        });
      }

      const success = await storage.deleteEvent(id);

      if (!success) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }

      res.json({ message: "Evento excluído com sucesso" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // NEW: Update event status (admin endpoint)
  app.patch("/api/admin/events/:id/status", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ message: "Status é obrigatório" });
      }

      const validStatuses = ['ativo', 'inativo', 'fechado_pedidos'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          message: "Status inválido",
          validStatuses 
        });
      }

      const updatedEvent = await storage.updateEventStatus(id, status);
      console.log(`📊 Event ${id} status updated to: ${status}`);
      
      res.json(updatedEvent);
    } catch (error) {
      console.error('Error updating event status:', error);
      res.status(500).json({ message: "Erro ao atualizar status do evento" });
    }
  });

  // NEW: Update event stock settings (admin endpoint)
  app.patch("/api/admin/events/:id/stock", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { stockEnabled, maxOrders, currentOrders } = req.body;

      const updateData: any = {};
      
      if (typeof stockEnabled === 'boolean') {
        updateData.stockEnabled = stockEnabled;
      }
      
      if (maxOrders !== undefined) {
        updateData.maxOrders = maxOrders;
      }
      
      if (currentOrders !== undefined) {
        updateData.currentOrders = currentOrders;
      }

      const updatedEvent = await storage.updateEvent(id, updateData);
      
      if (!updatedEvent) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }

      console.log(`📦 Event ${id} stock settings updated:`, updateData);
      res.json(updatedEvent);
    } catch (error) {
      console.error('Error updating event stock:', error);
      res.status(500).json({ message: "Erro ao atualizar controle de estoque" });
    }
  });

  // NEW: Get event availability info (admin endpoint)
  app.get("/api/admin/events/:id/availability", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const requestedQuantity = parseInt(req.query.quantity as string) || 1;

      const availability = await storage.checkEventAvailability(id, requestedQuantity);
      
      res.json({
        eventId: id,
        requestedQuantity,
        ...availability
      });
    } catch (error) {
      console.error('Error checking event availability:', error);
      res.status(500).json({ message: "Erro ao verificar disponibilidade do evento" });
    }
  });

  // Event CEP Zone Prices Routes - Custom pricing per event

  // Get CEP zones with current prices for an event (custom or global fallback)
  app.get("/api/events/:id/cep-zone-prices", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const eventId = parseInt(req.params.id);

      // Get all active CEP zones
      const zones = await db.select().from(cepZones).where(eq(cepZones.active, true));

      // Get custom prices for this event
      const customPrices = await db
        .select()
        .from(eventCepZonePrices)
        .where(eq(eventCepZonePrices.eventId, eventId));

      // Combine data: custom price or global price fallback
      const result = zones.map(zone => {
        const customPrice = customPrices.find(cp => cp.cepZoneId === zone.id);
        return {
          ...zone,
          currentPrice: customPrice ? customPrice.price : zone.price,
          hasCustomPrice: !!customPrice
        };
      });

      res.json(result);
    } catch (error: any) {
      console.error('Error fetching event CEP zone prices:', error);
      res.status(500).json({ error: "Erro ao buscar preços das zonas CEP" });
    }
  });

  // Save custom CEP zone prices for an event
  app.put("/api/events/:id/cep-zone-prices", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const { zonePrices } = req.body; // Array: [{ cepZoneId: 1, price: "25.00" }]

      // Verify event exists and uses CEP zones pricing
      const event = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
      if (!event[0]) {
        return res.status(404).json({ error: "Evento não encontrado" });
      }

      if (event[0].pricingType !== 'cep_zones') {
        return res.status(400).json({ error: "Evento não usa precificação por zonas CEP" });
      }

      // Validate zonePrices array
      if (!Array.isArray(zonePrices)) {
        return res.status(400).json({ error: "zonePrices deve ser um array" });
      }

      // Remove existing custom prices for this event
      await db.delete(eventCepZonePrices).where(eq(eventCepZonePrices.eventId, eventId));

      // Insert new custom prices
      if (zonePrices.length > 0) {
        const validatedPrices = zonePrices.map(zp => ({
          eventId,
          cepZoneId: parseInt(zp.cepZoneId),
          price: zp.price
        }));

        await db.insert(eventCepZonePrices).values(validatedPrices);
      }

      res.json({ success: true, message: "Preços personalizados salvos com sucesso" });
    } catch (error: any) {
      console.error('Error saving event CEP zone prices:', error);
      res.status(500).json({ error: "Erro ao salvar preços personalizados" });
    }
  });

  // Calculate price for a CEP considering event-specific pricing
  app.get("/api/calculate-cep-price", async (req, res) => {
    try {
      const { cep, eventId } = req.query;

      if (!cep) {
        return res.status(400).json({ error: "CEP é obrigatório" });
      }

      const result = await calculateCepZoneInfo(
        cep as string, 
        eventId ? parseInt(eventId as string) : undefined
      );

      if (result === null) {
        return res.status(404).json({ error: "CEP não atendido nas zonas disponíveis" });
      }

      res.json({ 
        price: result.price.toFixed(2),
        zoneName: result.zoneName
      });
    } catch (error: any) {
      console.error('Error calculating CEP price:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Admin Orders Management Routes

  // Get all orders with filters and pagination
  app.get("/api/admin/orders", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { page = 1, limit = 10, ...filters } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);

      // Check if pagination is requested
      if (req.query.paginated === 'true') {
        const result = await storage.getAllOrdersWithDetailsPaginated(pageNum, limitNum, filters);
        res.json(result);
      } else {
        // Fallback to original non-paginated method for backward compatibility
        const orders = await storage.getAllOrdersWithDetails(filters);
        res.json(orders);
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single order with full details
  app.get("/api/admin/orders/:id", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const order = await storage.getOrderWithFullDetails(id);

      if (!order) {
        return res.status(404).json({ message: "Pedido não encontrado" });
      }

      res.json(order);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update order status
  app.patch("/api/admin/orders/:id/status", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, reason, sendEmail = true } = req.body;

      console.log('📧 Status update request:', { id, status, sendEmail, reason });

      // Validate status - using Portuguese status names
      const validStatuses = ["confirmado", "aguardando_pagamento", "cancelado", "kits_sendo_retirados", "em_transito", "entregue"];
      console.log('Received status:', status, 'Valid statuses:', validStatuses);
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Status inválido", received: status, valid: validStatuses });
      }

      // Get current order to capture old status for email notification
      const currentOrder = await storage.getOrderWithFullDetails(id);
      const oldStatus = currentOrder?.status;

      const order = await storage.updateOrderStatus(
        id, 
        status, 
        'admin', 
        'Administrador', 
        reason || 'Status alterado pelo administrador',
        undefined, // bulkOperationId
        false // Don't send automatic email - we'll handle it manually based on sendEmail parameter
      );

      if (!order) {
        return res.status(404).json({ message: "Pedido não encontrado" });
      }

      // For admin status changes, let the automatic system handle specific emails
      // Only send generic status updates for non-specific statuses when requested
      if (currentOrder && oldStatus !== status && sendEmail && !['confirmado', 'em_transito', 'entregue'].includes(status)) {
        console.log('📧 Sending generic status update email because sendEmail is true');
        const emailService = new EmailService(storage);
        const { EmailDataMapper } = await import("./email/email-data-mapper");

        // Prepare status update data using the mapper
        const statusUpdateData = EmailDataMapper.mapToStatusUpdate(
          currentOrder, 
          oldStatus || '', 
          status
        );

        // Send email asynchronously (don't block the response)
        emailService.sendStatusUpdateEmail(
          statusUpdateData,
          currentOrder.customer.email,
          currentOrder.id,
          currentOrder.customer.id
        ).catch(error => {
          console.error('❌ Failed to send generic status update email:', error);
        });
      } else if (currentOrder && oldStatus !== status) {
        console.log(`📧 Status change to ${status} - specific email will be handled by automatic system`);
      }

      res.json(order);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get order status history (admin endpoint)
  app.get("/api/admin/orders/:id/status-history", requireAdmin, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);

      if (!orderId || isNaN(orderId)) {
        return res.status(400).json({ message: "ID do pedido inválido" });
      }

      const history = await storage.getOrderStatusHistory(orderId);

      res.json({
        success: true,
        history
      });
    } catch (error) {
      console.error('Error getting order status history:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Update order details (admin can edit order)
  app.put("/api/admin/orders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;

      const order = await storage.updateOrder(id, updateData);

      if (!order) {
        return res.status(404).json({ message: "Pedido não encontrado" });
      }

      res.json(order);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Test email system (admin only)
  app.post("/api/admin/test-email", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email é obrigatório" });
      }

      const emailService = new EmailService(storage);
      const success = await emailService.sendTestEmail(email);

      if (success) {
        res.json({ 
          message: "Email de teste enviado com sucesso", 
          email,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({ message: "Falha ao enviar email de teste" });
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Get email logs (admin only)
  app.get("/api/admin/email-logs", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { page = 1, limit = 50, orderId, customerId, emailType, status } = req.query;

      const filters: any = {
        limit: parseInt(limit as string),
        offset: (parseInt(page as string) - 1) * parseInt(limit as string)
      };

      if (orderId) filters.orderId = parseInt(orderId as string);
      if (customerId) filters.customerId = parseInt(customerId as string);
      if (emailType) filters.emailType = emailType as string;
      if (status) filters.status = status as string;

      const emailLogs = await storage.getEmailLogs(filters);

      res.json({
        success: true,
        logs: emailLogs,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: emailLogs.length
        }
      });
    } catch (error) {
      console.error('Error getting email logs:', error);
      res.status(500).json({ message: "Erro ao buscar logs de email" });
    }
  });

  // Test route
  app.get("/api/admin/test-stats", requireAdmin, (req: AuthenticatedRequest, res) => {
    res.json({
      totalOrders: 5,
      confirmedOrders: 2,
      awaitingPayment: 1,
      cancelledOrders: 0,
      inTransitOrders: 2,
      deliveredOrders: 0,
      totalRevenue: 204.50,
    });
  });

  // Get order statistics (renamed to avoid cache/middleware issues)
  app.get("/api/admin/orders/stats", requireAdmin, (req: AuthenticatedRequest, res) => {
    res.json({
      totalOrders: 5,
      confirmedOrders: 2,
      awaitingPayment: 1,
      cancelledOrders: 0,
      inTransitOrders: 2,
      deliveredOrders: 0,
      totalRevenue: 204.50,
    });
  });

  // Stats endpoint with detailed status breakdowns
  app.get("/api/admin/stats", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const filters = req.query;
      console.log('Stats request with filters:', filters);

      // Get filtered stats if filters are provided
      const stats = await storage.getAdminStats();
      const orderStats = await storage.getFilteredOrderStats(filters);

      // Return comprehensive stats with real data from database
      const response = {
        totalCustomers: stats.totalCustomers,
        totalOrders: orderStats.totalOrders,
        activeEvents: stats.activeEvents,
        totalRevenue: orderStats.totalRevenue,
        confirmedOrders: orderStats.confirmedOrders,
        awaitingPayment: orderStats.awaitingPayment,
        cancelledOrders: orderStats.cancelledOrders,
        inTransitOrders: orderStats.inTransitOrders,
        deliveredOrders: orderStats.deliveredOrders,
      };

      console.log('Sending filtered admin stats response:', response);
      res.json(response);
    } catch (error: any) {
      console.error('Error getting admin stats:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Debug endpoint to test response
  app.get("/api/debug-stats", async (req, res) => {
    res.json({
      totalCustomers: 3,
      totalOrders: 6,
      activeEvents: 3,
      totalRevenue: 239.5,
      confirmedOrders: 3,
      awaitingPayment: 1,
      cancelledOrders: 0,
      inTransitOrders: 2,
      deliveredOrders: 0,
    });
  });

  // Generate delivery label for single order
  app.get("/api/admin/orders/:id/label", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrderWithFullDetails(orderId);

      if (!order) {
        return res.status(404).json({ message: "Pedido não encontrado" });
      }

      const { generateDeliveryLabel } = await import('./label-generator');
      const pdfBuffer = await generateDeliveryLabel(order);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="etiqueta-${order.orderNumber}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error('Error generating delivery label:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate delivery labels for multiple orders by event
  app.get("/api/admin/events/:eventId/labels", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const orders = await storage.getOrdersByEventId(eventId);

      if (!orders || orders.length === 0) {
        return res.status(404).json({ message: "Nenhum pedido encontrado para este evento" });
      }

      // Get full details for each order
      const ordersWithDetails = await Promise.all(
        orders.map(order => storage.getOrderWithFullDetails(order.id))
      );

      const validOrders = ordersWithDetails.filter(order => order !== undefined);

      if (validOrders.length === 0) {
        return res.status(404).json({ message: "Nenhum pedido válido encontrado" });
      }

      const { generateMultipleLabels } = await import('./label-generator');
      const pdfBuffer = await generateMultipleLabels(validOrders);

      // Get event name for filename
      const event = await storage.getEvent(eventId);
      const eventName = event?.name.replace(/[^a-zA-Z0-9]/g, '-') || 'evento';
      const currentDate = new Date().toISOString().split('T')[0];

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="etiquetas-${eventName}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error('Error generating multiple labels:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate delivery labels for selected orders
  app.post("/api/admin/orders/labels", async (req, res) => {
    try {
      const { orderIds } = req.body;

      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({ message: "Lista de pedidos é obrigatória" });
      }

      // Get full details for each order
      const ordersWithDetails = await Promise.all(
        orderIds.map((id: number) => storage.getOrderWithFullDetails(id))
      );

      const validOrders = ordersWithDetails.filter(order => order !== undefined);

      if (validOrders.length === 0) {
        return res.status(404).json({ message: "Nenhum pedido válido encontrado" });
      }

      const { generateMultipleLabels } = await import('./label-generator');
      const pdfBuffer = await generateMultipleLabels(validOrders);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="etiquetas-selecionadas.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error('Error generating selected labels:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin Customer Management Routes

  // Get all customers with addresses and order count
  app.get("/api/admin/customers", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { page = 1, limit = 10, search, paginated } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);

      console.log("🚀 API called for /api/admin/customers", { page: pageNum, limit: limitNum, search, paginated });

      // Check if pagination is requested
      if (req.query.paginated === 'true') {
        const result = await storage.getAllCustomersWithAddressesPaginated(pageNum, limitNum, search as string);
        console.log("📊 Paginated customers returned:", result.customers.length, "total:", result.total);
        res.json(result);
      } else {
        // Fallback to original non-paginated method for backward compatibility
        const customers = await storage.getAllCustomersWithAddresses();
        console.log("📊 All customers returned:", customers.length);
        res.json(customers);
      }
    } catch (error: any) {
      console.error("❌ Error in /api/admin/customers:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create new customer (admin)
  app.post("/api/admin/customers", async (req, res) => {
    try {
      const registrationData = customerRegistrationSchema.parse(req.body);

      // Check if CPF already exists
      const existingCustomer = await storage.getCustomerByCPF(registrationData.cpf.replace(/\D/g, ''));
      if (existingCustomer) {
        return res.status(400).json({ 
          success: false,
          message: "CPF já cadastrado no sistema",
          field: "cpf"
        });
      }

      const result = await storage.createCustomerWithAddresses(registrationData);
      res.json(result);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Update customer (admin)
  app.put("/api/admin/customers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;

      const customer = await storage.updateCustomer(id, updateData);

      if (!customer) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }

      res.json(customer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete customer (admin)
  app.delete("/api/admin/customers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Check if customer has orders
      const orders = await storage.getOrdersByCustomerId(id);
      if (orders.length > 0) {
        return res.status(400).json({ 
          message: "Não é possível excluir cliente com pedidos associados" 
        });
      }

      const success = await storage.deleteCustomer(id);

      if (!success) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }

      res.json({ message: "Cliente excluído com sucesso" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get customer details with addresses (admin)
  app.get("/api/admin/customers/:id", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await storage.getCustomerWithAddresses(id);

      if (!customer) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }

      res.json(customer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Reports Routes

  // Get events for reports dropdown
  app.get("/api/admin/reports/events", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { getEventsForReports } = await import('./report-generator');
      const events = await getEventsForReports();
      res.json(events);
    } catch (error: any) {
      console.error('Error getting events for reports:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate kits report for event
  app.get("/api/admin/reports/kits/:eventId", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const eventId = parseInt(req.params.eventId);

      if (isNaN(eventId)) {
        return res.status(400).json({ message: "ID do evento inválido" });
      }

      const { generateKitsReport } = await import('./report-generator');
      const excelBuffer = await generateKitsReport(eventId);

      // Get event name for filename
      const event = await storage.getEvent(eventId);
      const eventName = event?.name.replace(/[^a-zA-Z0-9]/g, '-') || 'evento';
      const currentDate = new Date().toISOString().split('T')[0];

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="relatorio-kits-${eventName}-${currentDate}.xlsx"`);
      res.send(excelBuffer);
    } catch (error: any) {
      console.error('Error generating kits report:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ========================================
  // MERCADO PAGO PAYMENT ROUTES
  // ========================================

  // Get MercadoPago public key for frontend
  app.get("/api/mercadopago/public-key", async (req, res) => {
    try {
      console.log('🔍 Debug public key request - process.env.MERCADO_PAGO_PUBLIC_KEY:', process.env.MERCADO_PAGO_PUBLIC_KEY ? '[MASKED]' : 'UNDEFINED');
      const publicKey = getPublicKey();
      console.log('🔍 Debug getPublicKey() result:', publicKey ? '[MASKED]' : 'UNDEFINED');

      if (!publicKey) {
        return res.status(500).json({ message: "Chave pública do Mercado Pago não configurada" });
      }
      res.json({ publicKey });
    } catch (error) {
      console.error('Error getting public key:', error);
      res.status(500).json({ message: "Erro ao obter chave pública" });
    }
  });

  // Process card payment with order creation (credit/debit) - with rate limiting
  app.post("/api/mercadopago/process-card-payment", paymentRateLimit, async (req, res) => {
    try {
      const { token, paymentMethodId, amount, email, customerName, cpf, orderData } = req.body;

      console.log('Card payment request data:', { 
        token: token ? '[MASKED_TOKEN]' : 'NO_TOKEN', 
        paymentMethodId, 
        amount, 
        email, 
        customerName, 
        cpf: cpf ? '[MASKED_CPF]' : 'NO_CPF', 
        hasOrderData: !!orderData 
      });

      if (!token || !paymentMethodId || !amount || !orderData) {
        return res.status(400).json({ 
          message: "Dados obrigatórios não fornecidos",
          missing: { token: !token, paymentMethodId: !paymentMethodId, amount: !amount, orderData: !orderData }
        });
      }

      // Critical Security Fix: Validate idempotency to prevent duplicate payments
      if (orderData.idempotencyKey) {
        const existingOrder = await storage.getOrderByIdempotencyKey(orderData.idempotencyKey);
        if (existingOrder) {
          console.log(`🛡️ SECURITY: Duplicate payment attempt blocked - idempotency key already used: ${orderData.idempotencyKey}`);
          return res.status(409).json({
            success: false,
            message: "Pagamento já processado",
            orderNumber: existingOrder.orderNumber,
            isDuplicate: true
          });
        }
      }

      // SECURITY: Check if event is active BEFORE processing payment
      const eventForPayment = await storage.getEvent(orderData.eventId);
      if (!eventForPayment || eventForPayment.status !== 'ativo') {
        console.log(`🚫 Card payment blocked BEFORE gateway - Event ${orderData.eventId} status: ${eventForPayment?.status || 'not found'}`);
        
        let errorMessage = 'Este evento não está mais disponível para pedidos';
        let errorTitle = 'Evento indisponível';
        
        if (eventForPayment?.status === 'fechado_pedidos') {
          errorMessage = 'Este evento está fechado para novos pedidos. Entre em contato conosco pelo WhatsApp para verificar possibilidades de pagamento.';
          errorTitle = 'Evento fechado';
        } else if (eventForPayment?.status === 'inativo') {
          errorMessage = 'Este evento foi temporariamente desativado.';
          errorTitle = 'Evento desativado';
        } else if (!eventForPayment) {
          errorMessage = 'Evento não encontrado no sistema.';
          errorTitle = 'Evento não encontrado';
        }
        
        return res.status(400).json({
          success: false,
          message: errorMessage,
          title: errorTitle,
          code: 'EVENT_NOT_AVAILABLE',
          eventStatus: eventForPayment?.status || 'not_found'
        });
      }

      // 🚨 CRITICAL SECURITY FIX: VALIDATE PRICE BEFORE PAYMENT
      console.log('🔒 SECURITY: Validating pricing before payment processing');
      
      // Get customer address for pricing calculation
      const customerAddress = await storage.getAddress(orderData.addressId);
      if (!customerAddress) {
        return res.status(400).json({
          success: false,
          message: "Endereço de entrega não encontrado"
        });
      }

      // Calculate the REAL price on server-side
      let serverCalculatedTotal = 0;
      let baseCost = 0;
      let deliveryCost = 0;
      let additionalCost = 0;
      let donationAmount = 0;

      if (eventForPayment.fixedPrice) {
        baseCost = Number(eventForPayment.fixedPrice);
        deliveryCost = 0;
      } else if (eventForPayment.pricingType === 'cep_zones') {
        // Calculate CEP zones pricing
        const { calculateCepZonePrice } = await import('./cep-zones-calculator');
        const calculatedPrice = await calculateCepZonePrice(customerAddress.zipCode, eventForPayment.id);
        
        if (calculatedPrice === null) {
          console.error(`🚨 SECURITY: CEP ${customerAddress.zipCode} not found in zones for event ${eventForPayment.id}`);
          return res.status(400).json({ 
            success: false,
            message: "CEP não atendido nas zonas de entrega disponíveis para este evento",
            code: "CEP_ZONE_NOT_FOUND"
          });
        }
        
        deliveryCost = calculatedPrice;
        baseCost = 0;
        console.log(`🔒 SECURITY: CEP zone pricing calculated: R$ ${calculatedPrice} for CEP ${customerAddress.zipCode}`);
      } else {
        // Distance-based pricing
        const deliveryCalculation = calculateDeliveryCost(
          eventForPayment.pickupZipCode || '58000000',
          customerAddress.zipCode
        );
        deliveryCost = deliveryCalculation.deliveryCost;
        baseCost = 0;
      }

      // Calculate additional costs
      if (orderData.kitQuantity > 1 && eventForPayment.extraKitPrice) {
        additionalCost = (orderData.kitQuantity - 1) * Number(eventForPayment.extraKitPrice);
      }

      if (eventForPayment.donationRequired && eventForPayment.donationAmount) {
        donationAmount = Number(eventForPayment.donationAmount) * orderData.kitQuantity;
      }

      serverCalculatedTotal = baseCost + deliveryCost + additionalCost + donationAmount - Number(orderData.discountAmount || 0);
      
      // Ensure minimum payment of R$ 0.01
      serverCalculatedTotal = Math.max(0.01, serverCalculatedTotal);

      // 🛡️ SECURITY CHECK: Compare client amount with server calculation
      const clientAmount = parseFloat(amount);
      const priceDifference = Math.abs(clientAmount - serverCalculatedTotal);
      
      console.log(`🔒 SECURITY CHECK: Client amount: R$ ${clientAmount.toFixed(2)}, Server calculated: R$ ${serverCalculatedTotal.toFixed(2)}, Difference: R$ ${priceDifference.toFixed(2)}`);
      
      // Allow small floating point differences (1 cent)
      if (priceDifference > 0.01) {
        console.error(`🚨 SECURITY VIOLATION: Price manipulation detected! Client: R$ ${clientAmount.toFixed(2)}, Server: R$ ${serverCalculatedTotal.toFixed(2)}`);
        return res.status(400).json({
          success: false,
          message: "Erro na validação do preço. Por favor, atualize a página e tente novamente.",
          title: "Erro de Validação",
          code: "PRICE_VALIDATION_FAILED",
          clientAmount: clientAmount.toFixed(2),
          serverAmount: serverCalculatedTotal.toFixed(2)
        });
      }
      
      console.log('✅ SECURITY: Price validation passed - proceeding with payment');

      const [firstName, ...lastNameParts] = customerName.split(' ');
      const lastName = lastNameParts.join(' ') || '';

      // Generate a temporary order reference for the payment
      const tempOrderReference = `TEMP-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      const paymentData = {
        token,
        paymentMethodId,
        email,
        amount: serverCalculatedTotal,  // 🔒 SECURITY: Use server-calculated amount only
        description: `Pedido KitRunner - Processamento`,
        orderId: tempOrderReference,
        payer: {
          name: firstName,
          surname: lastName,
          email,
          identification: {
            type: 'CPF',
            number: cpf.replace(/\D/g, ''),
          },
        },
      };

      console.log(`🧪 Processing payment FIRST - temp reference: ${tempOrderReference}`);
      const result = await MercadoPagoService.processCardPayment(paymentData);

      console.log(`💳 Payment result: success=${result.success}, status=${result.status}`);

      // ONLY create order if payment is approved or pending
      if (result.success && (result.status === 'approved' || result.status === 'pending')) {
        console.log(`✅ Payment ${result.status} - creating order now`);

        try {
          // Convert numeric values to strings for schema validation
          const orderDataForValidation = {
            ...orderData,
            deliveryCost: typeof orderData.deliveryCost === 'number' ? orderData.deliveryCost.toString() : orderData.deliveryCost,
            extraKitsCost: typeof orderData.extraKitsCost === 'number' ? orderData.extraKitsCost.toString() : orderData.extraKitsCost,
            donationCost: typeof orderData.donationCost === 'number' ? orderData.donationCost.toString() : orderData.donationCost,
            discountAmount: typeof orderData.discountAmount === 'number' ? orderData.discountAmount.toString() : orderData.discountAmount,
            totalCost: typeof orderData.totalCost === 'number' ? orderData.totalCost.toString() : orderData.totalCost,
            donationAmount: typeof orderData.donationAmount === 'number' ? orderData.donationAmount.toString() : orderData.donationAmount,
          };

          // Parse and validate order data
          const validatedOrderData = orderCreationSchema.parse(orderDataForValidation);

          // Create the order now that payment is confirmed
          const orderNumber = `KR${new Date().getFullYear()}${String(Date.now() + Math.random() * 1000).slice(-6)}`;

          // 🔒 SECURITY: Use previously calculated values from server validation
          console.log('✅ SECURITY: Using server-validated pricing for order creation');

          // Create the order with status "aguardando_pagamento" first
          const order = await storage.createOrder({
            eventId: validatedOrderData.eventId,
            customerId: validatedOrderData.customerId,
            addressId: validatedOrderData.addressId,
            kitQuantity: validatedOrderData.kitQuantity,
            deliveryCost: deliveryCost.toString(),
            extraKitsCost: additionalCost.toString(),
            donationCost: donationAmount.toString(),
            totalCost: serverCalculatedTotal.toString(),  // 🔒 SECURITY: Use server-calculated total
            status: 'aguardando_pagamento', // Always start with awaiting payment
            paymentMethod: paymentMethodId === 'master' ? 'credit' : paymentMethodId,
            // paymentProcessorOrderId: result.id?.toString() || null, // Field not in schema
            donationAmount: donationAmount.toString(),
            discountAmount: (validatedOrderData.discountAmount || 0).toString(),
            idempotencyKey: validatedOrderData.idempotencyKey || null,
          });

          // Create kits
          if (validatedOrderData.kits && validatedOrderData.kits.length > 0) {
            for (const kit of validatedOrderData.kits) {
              await storage.createKit({
                orderId: order.id,
                name: kit.name,
                cpf: kit.cpf,
                shirtSize: kit.shirtSize,
              });
            }
          }

          console.log(`✅ Order ${order.orderNumber} created successfully with status: ${order.status}`);

          // Register policy acceptance for the order (card payment flow)
          try {
            console.log(`📋 Recording policy acceptance for card payment order ${order.id}, customer ${validatedOrderData.customerId}`);
            const orderPolicy = await PolicyService.getActivePolicyByType('order');
            if (orderPolicy) {
              await PolicyService.createPolicyAcceptance({
                userId: validatedOrderData.customerId,
                policyId: orderPolicy.id,
                context: 'order',
                orderId: order.id
              });
              console.log(`✅ Policy acceptance recorded for card payment order ${order.id}`);
            } else {
              console.log(`⚠️ No active order policy found - skipping policy acceptance for card payment order ${order.id}`);
            }
          } catch (policyError) {
            console.error(`❌ Error recording policy acceptance for card payment order ${order.id}:`, policyError);
            // Don't fail the order creation if policy recording fails
          }

          // After successful order creation, update stock and close event if needed
          await updateStockAndCloseEventIfNeeded(validatedOrderData.eventId);

          // Schedule payment pending email if payment is not yet approved
          if (result.status !== 'approved') {
            PaymentReminderScheduler.schedulePaymentPendingEmail(order.orderNumber, 1);
          }

          // If payment was approved, update status to "confirmado" with proper history
          if (result.status === 'approved') {
            // Cancel any scheduled payment pending email since payment was approved
            PaymentReminderScheduler.cancelScheduledEmail(order.orderNumber);

            // Update order status to confirmado (automatically sends customer email)
            await storage.updateOrderStatus(
              order.id, 
              'confirmado', 
              'mercadopago', 
              'Mercado Pago', 
              'Pagamento aprovado via cartão',
              undefined,
              true // Send customer email
            );

            // Send admin notifications for card payment
            try {
              const orderWithDetails = await storage.getOrderWithFullDetails(order.id);
              if (orderWithDetails) {
                const { EmailService } = await import('./email/email-service');
                const { EmailDataMapper } = await import('./email/email-data-mapper');
                
                const emailService = new EmailService(storage);
                const adminEmailData = EmailDataMapper.mapToAdminOrderConfirmation(
                  orderWithDetails,
                  `${req.protocol}://${req.get('host')}/admin/orders/${order.id}`
                );
                
                console.log('📧 Sending admin notifications for card payment approval...');
                await emailService.sendAdminOrderConfirmations(adminEmailData, order.id);
              }
            } catch (emailError) {
              console.error('❌ Error sending admin notification for card payment:', emailError);
              // Don't fail the payment process if email fails
            }

            console.log(`✅ Order ${order.orderNumber} status updated to confirmado - payment approved via card`);

            // Send WhatsApp confirmation notification for card payment
            try {
              const fullOrder = await storage.getOrderWithFullDetails(order.id);
              if (fullOrder && fullOrder.customer && fullOrder.customer.phone) {
                const WhatsAppService = (await import('./whatsapp-service')).default;
                const whatsAppService = new WhatsAppService(storage);
                
                console.log(`📱 Card Payment: Sending WhatsApp confirmation for order ${fullOrder.orderNumber} to phone: ${fullOrder.customer.phone}`);
                await whatsAppService.sendOrderConfirmation(fullOrder);
                console.log(`📱 Card Payment: WhatsApp notification sent for order ${fullOrder.orderNumber}`);
              } else {
                console.log(`📱 Card Payment: No phone number found for order ${order.orderNumber}, skipping WhatsApp`);
              }
            } catch (whatsappError) {
              console.error('Card Payment: Error sending WhatsApp notification:', whatsappError);
            }
          }

          res.json({
            success: true,
            status: result.status,
            paymentId: result.id,
            orderNumber: order.orderNumber,
            orderId: order.id,
            message: result.status === 'approved' ? 'Pagamento aprovado e pedido criado!' : 'Pagamento em processamento - aguardando confirmação'
          });

        } catch (orderError) {
          console.error('Error creating order after payment approval:', orderError);
          res.status(500).json({ 
            success: false,
            message: "Pagamento aprovado mas erro ao criar pedido. Entre em contato com o suporte.",
            paymentId: result.id 
          });
        }

      } else {
        // Payment rejected or failed - do NOT create order
        console.log(`❌ Payment ${result.status} - NOT creating order`);
        res.status(400).json({
          success: false,
          status: result.status,
          paymentId: result.id,
          message: result.message || 'Pagamento rejeitado. Tente novamente com outro cartão.'
        });
      }
    } catch (error) {
      console.error('Card payment error:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Create PIX payment (with rate limiting)
  app.post("/api/mercadopago/create-pix-payment", paymentRateLimit, async (req, res) => {
    try {
      const { orderId, amount, email, customerName, cpf } = req.body;

      console.log('PIX payment request data:', { orderId, amount, email, customerName, cpf });

      if (!orderId || !amount || !email || !customerName || !cpf) {
        return res.status(400).json({ message: "Dados obrigatórios não fornecidos" });
      }

      // Check if orderId is numeric ID or orderNumber string
      let order;
      const orderIdNum = parseInt(orderId);

      if (isNaN(orderIdNum)) {
        // If not a number, assume it's an orderNumber (like "KR2025575306")
        console.log(`Looking up PIX order by orderNumber: ${orderId}`);
        order = await storage.getOrderByOrderNumber(orderId);
      } else {
        // If it's a number, use it as ID
        console.log(`Looking up PIX order by ID: ${orderIdNum}`);
        order = await storage.getOrderWithFullDetails(orderIdNum);
      }
      if (!order) {
        return res.status(404).json({ message: "Pedido não encontrado" });
      }

      // SECURITY: Check if event is still active before processing PIX payment
      const event = await storage.getEvent(order.eventId);
      if (!event || event.status !== 'ativo') {
        console.log(`🚫 PIX payment blocked - Event ${order.eventId} status: ${event?.status || 'not found'}`);
        return res.status(400).json({
          success: false,
          message: event?.status === 'fechado_pedidos' 
            ? 'Este evento está fechado para novos pagamentos' 
            : 'Este evento não está mais disponível para pagamentos',
          code: 'EVENT_NOT_AVAILABLE'
        });
      }

      // 🚨 CRITICAL SECURITY FIX: VALIDATE PIX PRICE BEFORE PAYMENT
      console.log('🔒 SECURITY: Validating PIX pricing before payment processing');
      
      // Get customer address for pricing calculation
      const customerAddress = await storage.getAddress(order.addressId);
      if (!customerAddress) {
        return res.status(400).json({
          success: false,
          message: "Endereço de entrega não encontrado"
        });
      }

      // Calculate the REAL price on server-side
      let serverCalculatedTotal = 0;
      let baseCost = 0;
      let deliveryCost = 0;
      let additionalCost = 0;
      let donationAmount = 0;

      if (event.fixedPrice) {
        baseCost = Number(event.fixedPrice);
        deliveryCost = 0;
      } else if (event.pricingType === 'cep_zones') {
        // Calculate CEP zones pricing
        const { calculateCepZonePrice } = await import('./cep-zones-calculator');
        const calculatedPrice = await calculateCepZonePrice(customerAddress.zipCode, event.id);
        
        if (calculatedPrice === null) {
          console.error(`🚨 SECURITY: CEP ${customerAddress.zipCode} not found in zones for event ${event.id}`);
          return res.status(400).json({ 
            success: false,
            message: "CEP não atendido nas zonas de entrega disponíveis para este evento",
            code: "CEP_ZONE_NOT_FOUND"
          });
        }
        
        deliveryCost = calculatedPrice;
        baseCost = 0;
        console.log(`🔒 SECURITY: PIX CEP zone pricing calculated: R$ ${calculatedPrice} for CEP ${customerAddress.zipCode}`);
      } else {
        // Distance-based pricing
        const deliveryCalculation = calculateDeliveryCost(
          event.pickupZipCode || '58000000',
          customerAddress.zipCode
        );
        deliveryCost = deliveryCalculation.deliveryCost;
        baseCost = 0;
      }

      // Calculate additional costs
      if (order.kitQuantity > 1 && event.extraKitPrice) {
        additionalCost = (order.kitQuantity - 1) * Number(event.extraKitPrice);
      }

      if (event.donationRequired && event.donationAmount) {
        donationAmount = Number(event.donationAmount) * order.kitQuantity;
      }

      serverCalculatedTotal = baseCost + deliveryCost + additionalCost + donationAmount - Number(order.discountAmount || 0);
      
      // Ensure minimum payment of R$ 0.01
      serverCalculatedTotal = Math.max(0.01, serverCalculatedTotal);

      // 🛡️ SECURITY CHECK: Compare client amount with server calculation
      const clientAmount = parseFloat(amount);
      const priceDifference = Math.abs(clientAmount - serverCalculatedTotal);
      
      console.log(`🔒 SECURITY CHECK PIX: Client amount: R$ ${clientAmount.toFixed(2)}, Server calculated: R$ ${serverCalculatedTotal.toFixed(2)}, Difference: R$ ${priceDifference.toFixed(2)}`);
      
      // Allow small floating point differences (1 cent)
      if (priceDifference > 0.01) {
        console.error(`🚨 SECURITY VIOLATION PIX: Price manipulation detected! Client: R$ ${clientAmount.toFixed(2)}, Server: R$ ${serverCalculatedTotal.toFixed(2)}`);
        return res.status(400).json({
          success: false,
          message: "Erro na validação do preço. Por favor, atualize a página e tente novamente.",
          title: "Erro de Validação",
          code: "PRICE_VALIDATION_FAILED",
          clientAmount: clientAmount.toFixed(2),
          serverAmount: serverCalculatedTotal.toFixed(2)
        });
      }
      
      console.log('✅ SECURITY: PIX price validation passed - proceeding with payment');

      const [firstName, ...lastNameParts] = customerName.split(' ');
      const lastName = lastNameParts.join(' ') || '';

      const paymentData = {
        paymentMethodId: 'pix',
        email,
        amount: serverCalculatedTotal,  // 🔒 SECURITY: Use server-calculated amount only
        description: `Pedido KitRunner #${order.orderNumber}`,
        orderId: order.orderNumber, // Use orderNumber instead of numeric ID
        payer: {
          name: firstName,
          surname: lastName,
          email,
          identification: {
            type: 'CPF',
            number: cpf.replace(/\D/g, ''),
          },
        },
      };

      const result = await MercadoPagoService.createPIXPayment(paymentData);

      if (result) {
        console.log(`💳 PIX payment created for order ${orderId} (${order.orderNumber}) - Payment ID: ${result.id}`);
        
        // After successful PIX creation, update stock and close event if needed
        await updateStockAndCloseEventIfNeeded(order.eventId);

        // Calculate PIX expiration date (30 minutes from now) with proper timezone handling
        const pixExpiration = new Date();
        pixExpiration.setMinutes(pixExpiration.getMinutes() + 30);
        
        // Current timestamp for payment creation tracking
        const paymentCreatedAt = new Date();

        // Update order with PIX payment data and status
        try {
          await db
            .update(orders)
            .set({
              status: 'aguardando_pagamento',
              paymentId: result.id?.toString() || null,
              pixQrCode: result.qr_code_base64 || null,
              pixCopyPaste: result.qr_code || null,
              pixExpirationDate: pixExpiration,
              paymentCreatedAt: paymentCreatedAt
            })
            .where(eq(orders.id, order.id));
          
          console.log(`✅ Order ${order.orderNumber} updated with PIX data and status: aguardando_pagamento`);
          console.log(`📅 PIX expiration set to: ${pixExpiration.toISOString()}`);
          console.log(`📅 Payment created at: ${paymentCreatedAt.toISOString()}`);
          console.log(`💾 PIX QR Code saved: ${result.qr_code_base64 ? 'Yes' : 'No'}`);
          console.log(`💾 PIX Copy/Paste saved: ${result.qr_code ? 'Yes' : 'No'}`);
          console.log(`💾 Payment ID saved: ${result.id}`);
        } catch (updateError) {
          console.error('Error updating order with PIX data:', updateError);
        }

        res.json({
          success: true,
          paymentId: result.id,
          qrCode: result.qr_code,
          qrCodeBase64: result.qr_code_base64,
          ticketUrl: result.ticket_url,
          expirationDate: pixExpiration.toISOString()
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Erro ao criar pagamento PIX'
        });
      }
    } catch (error) {
      console.error('PIX payment error:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Check payment status
  app.get("/api/mercadopago/payment-status/:paymentId", async (req, res) => {
    try {
      const paymentId = parseInt(req.params.paymentId);

      if (!paymentId) {
        return res.status(400).json({ message: "ID de pagamento inválido" });
      }

      const result = await MercadoPagoService.getPaymentStatus(paymentId);

      if (result.success && result.payment) {
        // Get order by payment external reference
        const orderId = result.payment.external_reference;

        console.log(`🔍 Payment ${paymentId} status: ${result.status} for order: ${orderId}`);

        // Update order status based on payment status
        if (orderId) {
          try {
            // Find order by orderNumber to get the actual order ID
            const order = await storage.getOrderByNumber(orderId);
            if (order) {
              if (result.status === 'approved') {
                console.log(`✅ Payment approved for order ${orderId} (ID: ${order.id}) - updating to confirmado`);
                // Update status - this will automatically send customer email via sendStatusChangeEmail
                await storage.updateOrderStatus(order.id, 'confirmado', 'mercadopago', 'Mercado Pago', 'Pagamento aprovado via verificação de status');
                console.log(`✅ Order ${orderId} status successfully updated to confirmado`);

                // Send ONLY admin notifications (customer email sent automatically by updateOrderStatus)
                try {
                  const fullOrder = await storage.getOrderWithFullDetails(order.id);
                  if (fullOrder) {
                    const emailService = new EmailService(storage);
                    const { EmailDataMapper } = await import('./email/email-data-mapper');
                    const adminNotificationData = EmailDataMapper.mapToAdminOrderConfirmation(fullOrder);
                    await emailService.sendAdminOrderConfirmations(adminNotificationData, fullOrder.id);
                    console.log(`📧 Admin notification sent for order ${fullOrder.orderNumber}`);
                  }
                } catch (adminEmailError) {
                  console.error('Error sending admin order confirmation:', adminEmailError);
                }
              } else if (result.status === 'cancelled' || result.status === 'rejected') {
                console.log(`❌ Payment failed for order ${orderId} (ID: ${order.id}) - updating to cancelado`);
                await storage.updateOrderStatus(order.id, 'cancelado', 'mercadopago', 'Mercado Pago', 'Pagamento rejeitado via verificação de status');
                console.log(`❌ Order ${orderId} status successfully updated to cancelado`);
              } else if (result.status === 'pending') {
                console.log(`⏳ Payment pending for order ${orderId} - keeping aguardando_pagamento`);
              }
            } else {
              console.error(`Order not found with orderNumber: ${orderId}`);
            }
          } catch (error) {
            console.error('Error updating order status:', error);
          }
        }

        res.json({
          success: true,
          status: result.status,
          payment: {
            id: result.payment.id,
            status: result.payment.status,
            status_detail: result.payment.status_detail,
            external_reference: result.payment.external_reference
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Erro ao verificar status do pagamento'
        });
      }
    } catch (error) {
      console.error('Payment status error:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // MercadoPago webhook for payment notifications (with signature validation)
  app.post("/api/mercadopago/webhook", async (req, res) => {
    try {
      console.log('📬 Webhook received from IP:', req.ip);
      console.log('📬 Headers:', JSON.stringify(req.headers, null, 2));
      console.log('📬 Body:', JSON.stringify(req.body, null, 2));

      // Security: Validate webhook signature 
      const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
      const isProduction = process.env.NODE_ENV === 'production';
      
      // For testing with production keys in development, allow bypass with environment flag
      const skipValidationForTesting = process.env.SKIP_WEBHOOK_VALIDATION === 'true';
      
      if (skipValidationForTesting) {
        console.log('🔧 TESTING MODE: Webhook validation bypassed - use only for testing with production keys');
      } else if (webhookSecret) {
        console.log('🔒 Validating webhook signature...');

        const signature = req.headers['x-signature'] as string;
        const requestId = req.headers['x-request-id'] as string;

        if (!signature || !requestId) {
          console.warn('🔒 Webhook rejected: Missing signature or request ID');
          return res.status(401).json({ error: 'Unauthorized: Missing signature' });
        }

        // Parse signature components
        const signatureParts = signature.split(',');
        let ts: string | undefined;
        let v1: string | undefined;

        for (const part of signatureParts) {
          const [key, value] = part.split('=');
          if (key === 'ts') ts = value;
          if (key === 'v1') v1 = value;
        }

        if (!ts || !v1) {
          console.warn('🔒 Webhook rejected: Invalid signature format');
          return res.status(401).json({ error: 'Invalid signature format' });
        }

        // Create payload for signature validation (MercadoPago format)
        const bodyString = JSON.stringify(req.body);
        const manifest = `id:${requestId};request-id:${requestId};ts:${ts};`;
        
        console.log('🔍 Signature validation data:');
        console.log('  Request ID:', requestId);
        console.log('  Timestamp:', ts);
        console.log('  Manifest:', manifest);
        console.log('  Received signature:', v1);

        // Verify signature using HMAC-SHA256
        const expectedSignature = crypto
          .createHmac('sha256', webhookSecret)
          .update(manifest)
          .digest('hex');
        
        console.log('  Expected signature:', expectedSignature);

        if (expectedSignature !== v1) {
          console.warn('🔒 Webhook rejected: Signature mismatch');
          console.warn('  Expected:', expectedSignature);
          console.warn('  Received:', v1);
          return res.status(401).json({ error: 'Invalid signature' });
        }

        // Rate limiting: Check for excessive requests
        const now = Date.now();
        const timestampMs = parseInt(ts) * 1000;

        // Reject old requests (older than 5 minutes)
        if (now - timestampMs > 5 * 60 * 1000) {
          console.warn('🔒 Webhook rejected: Request too old');
          return res.status(401).json({ error: 'Request too old' });
        }

        console.log('✅ Webhook signature validated successfully');
      } else if (isProduction) {
        console.error('🚨 PRODUCTION ERROR: MERCADOPAGO_WEBHOOK_SECRET is mandatory in production');
        return res.status(500).json({ error: 'Webhook not properly configured' });
      } else {
        console.log('🔧 DEVELOPMENT: No webhook secret configured - allowing for development testing');
      }

      const { action, data } = req.body;

      if ((action === 'payment.updated' || action === 'payment.created') && data?.id) {
        const result = await MercadoPagoService.getPaymentStatus(data.id);

        if (result.success && result.payment) {
          const orderId = result.payment.external_reference;

          // Update order status based on payment status
          if (orderId) {
            const order = await storage.getOrderByNumber(orderId);
            if (order) {
              if (result.status === 'approved') {
                console.log(`🔍 Webhook: Checking order ${orderId} current status: ${order.status}`);
                
                // For already confirmed orders, just ensure email was sent if needed
                if (order.status === 'confirmado') {
                  console.log(`⚠️ Webhook: Order ${orderId} is already confirmed - ensuring email was sent`);
                  
                  // Do NOT send duplicate email - already sent when status was updated
                  console.log(`⚠️ Webhook: Order ${order.orderNumber} already confirmed - skipping duplicate email`);
                  // Note: Email already sent when status was first updated to 'confirmado'
                  return res.status(200).send('OK');
                }
                
                console.log(`✅ Webhook: Payment approved for order ${orderId} (ID: ${order.id}) - updating to confirmed`);
                await storage.updateOrderStatus(order.id, 'confirmado', 'mercadopago', 'Mercado Pago', 'Pagamento aprovado via webhook');
                console.log(`✅ Webhook: Order ${orderId} status successfully updated to confirmed`);

                // Send admin order confirmation notifications
                try {
                  const fullOrder = await storage.getOrderWithFullDetails(order.id);
                  if (fullOrder) {
                    const emailService = new EmailService(storage);
                    const { EmailDataMapper } = await import('./email/email-data-mapper');
                    const adminNotificationData = EmailDataMapper.mapToAdminOrderConfirmation(fullOrder);
                    await emailService.sendAdminOrderConfirmations(adminNotificationData, fullOrder.id);
                    console.log(`📧 Webhook: Admin notification sent for order ${fullOrder.orderNumber}`);
                  }
                } catch (adminEmailError) {
                  console.error('Webhook: Error sending admin order confirmation:', adminEmailError);
                }

                // Send WhatsApp confirmation notification
                try {
                  const fullOrder = await storage.getOrderWithFullDetails(order.id);
                  if (fullOrder && fullOrder.customer && fullOrder.customer.phone) {
                    const WhatsAppService = (await import('./whatsapp-service')).default;
                    const whatsAppService = new WhatsAppService(storage);
                    
                    console.log(`📱 Webhook: Sending WhatsApp confirmation for order ${fullOrder.orderNumber} to phone: ${fullOrder.customer.phone}`);
                    await whatsAppService.sendOrderConfirmation(fullOrder);
                    console.log(`📱 Webhook: WhatsApp notification sent for order ${fullOrder.orderNumber}`);
                  } else {
                    console.log(`📱 Webhook: No phone number found for order ${order.orderNumber}, skipping WhatsApp`);
                  }
                } catch (whatsappError) {
                  console.error('Webhook: Error sending WhatsApp notification:', whatsappError);
                }
              } else if (result.status === 'cancelled' || result.status === 'rejected') {
                console.log(`❌ Webhook: Payment failed for order ${orderId} (ID: ${order.id}) - updating to canceled`);
                await storage.updateOrderStatus(order.id, 'cancelado', 'mercadopago', 'Mercado Pago', 'Pagamento rejeitado via webhook');
                console.log(`❌ Webhook: Order ${orderId} status successfully updated to canceled`);
              } else if (result.status === 'pending') {
                console.log(`⏳ Webhook: Payment pending for order ${orderId} - keeping awaiting_payment`);
              }
            } else {
              console.error(`Webhook: Order not found with orderNumber: ${orderId}`);
            }
          }
        }
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).send('Error');
    }
  });

  // Get order status history
  app.get("/api/orders/:orderId/status-history", requireOwnership('orderId', 'order'), async (req: AuthenticatedRequest, res) => {
    try {
      const orderId = parseInt(req.params.orderId);

      if (!orderId || isNaN(orderId)) {
        return res.status(400).json({ message: "ID do pedido inválido" });
      }

      const history = await storage.getOrderStatusHistory(orderId);

      res.json({
        success: true,
        history
      });
    } catch (error) {
      console.error('Error getting order status history:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Get order status history by order number (for customer access)
  app.get("/api/orders/number/:orderNumber/status-history", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const orderNumber = req.params.orderNumber;

      if (!orderNumber) {
        return res.status(400).json({ message: "Número do pedido inválido" });
      }

      // First get the order to get its ID
      const order = await storage.getOrderByNumber(orderNumber);
      if (!order) {
        return res.status(404).json({ message: "Pedido não encontrado" });
      }

      const history = await storage.getOrderStatusHistory(order.id);

      res.json({
        success: true,
        history
      });
    } catch (error) {
      console.error('Error getting order status history:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Bulk status change for admin
  app.post("/api/admin/orders/bulk-status-change", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { orderIds, newStatus, sendEmails, reason } = req.body;

      // Validate input
      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({ error: 'Lista de pedidos inválida' });
      }

      if (!newStatus) {
        return res.status(400).json({ error: 'Novo status é obrigatório' });
      }

      const validStatuses = ['confirmado', 'aguardando_pagamento', 'cancelado', 'kits_sendo_retirados', 'em_transito', 'entregue'];
      if (!validStatuses.includes(newStatus)) {
        return res.status(400).json({ error: 'Status inválido' });
      }

      // Validate all orders exist and get current data
      const orders = await Promise.all(
        orderIds.map(async (id: number) => {
          const order = await storage.getOrderByIdWithDetails(id);
          if (!order) {
            throw new Error(`Pedido com ID ${id} não encontrado`);
          }
          return order;
        })
      );

      // Check if all orders are from the same event
      const eventIds = Array.from(new Set(orders.map(order => order.eventId)));
      if (eventIds.length > 1) {
        return res.status(400).json({ 
          error: 'Todos os pedidos devem ser do mesmo evento',
          details: `Encontrados pedidos de ${eventIds.length} eventos diferentes`
        });
      }

      // Generate bulk operation ID for tracking
      const bulkOperationId = `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      let successCount = 0;
      let errors: any[] = [];
      let emailsSent = 0;

      // Process each order
      for (const order of orders) {
        try {
          const previousStatus = order.status;

          // Skip if already at target status
          if (previousStatus === newStatus) {
            continue;
          }

          // Update order status
          await storage.updateOrderStatus(
            order.id, 
            newStatus, 
            'admin', 
            req.user?.name || 'Admin',
            reason || `Alteração em massa via painel administrativo`,
            bulkOperationId,
            false  // Don't send individual emails, we'll handle them manually
          );

          successCount++;

          // Send specific status email if requested (not generic update)
          if (sendEmails && order.customer?.email) {
            try {
              const emailService = new EmailService(storage);
              let emailSent = false;

              // Send specific email based on status instead of generic update
              switch (newStatus) {
                case 'confirmado':
                  const confirmationData = EmailDataMapper.mapToServiceConfirmation(order);
                  emailSent = await emailService.sendServiceConfirmation(
                    confirmationData, 
                    order.customer.email, 
                    order.id, 
                    order.customerId
                  );
                  break;

                case 'em_transito':
                  const enRouteData = EmailDataMapper.mapToKitEnRoute(order);
                  emailSent = await emailService.sendKitEnRoute(
                    enRouteData, 
                    order.customer.email, 
                    order.id, 
                    order.customerId
                  );
                  break;

                case 'entregue':
                  const deliveryData = EmailDataMapper.mapToDeliveryConfirmation(order);
                  emailSent = await emailService.sendDeliveryConfirmation(
                    deliveryData, 
                    order.customer.email, 
                    order.id, 
                    order.customerId
                  );
                  break;

                case 'aguardando_pagamento':
                  const paymentData = EmailDataMapper.orderToPaymentPendingData(order);
                  emailSent = await emailService.sendPaymentPending(
                    paymentData, 
                    order.customer.email, 
                    order.id, 
                    order.customerId
                  );
                  break;

                default:
                  // For other statuses (kits_sendo_retirados, cancelado), send generic update
                  const emailData = EmailDataMapper.mapOrderStatusChange({
                    orderNumber: order.orderNumber,
                    customerName: order.customer.name,
                    customerCPF: order.customer.cpf,
                    eventName: order.event?.name || 'Evento',
                    eventDate: order.event?.date || new Date().toISOString(),
                    eventLocation: order.event?.location || 'Local a definir',
                    newStatus: newStatus,
                    previousStatus: previousStatus,
                    address: order.address ? {
                      street: order.address.street,
                      number: order.address.number,
                      complement: order.address.complement || '',
                      neighborhood: order.address.neighborhood,
                      city: order.address.city,
                      state: order.address.state,
                      zipCode: order.address.zipCode
                    } : {
                      street: 'Endereço não definido',
                      number: '', complement: '', neighborhood: '',
                      city: '', state: '', zipCode: ''
                    },
                    kits: order.kits?.map((kit: any) => ({
                      name: kit.name, cpf: kit.cpf, shirtSize: kit.shirtSize
                    })) || []
                  });

                  emailSent = await emailService.sendOrderStatusUpdate(
                    emailData,
                    order.customer.email,
                    order.id,
                    order.customerId
                  );
                  break;
              }

              if (emailSent) {
                emailsSent++;
              }
            } catch (emailError) {
              console.error(`Error sending email for order ${order.orderNumber}:`, emailError);
              // Don't fail the entire operation for email errors
            }
          }

        } catch (orderError) {
          console.error(`Error updating order ${order.id}:`, orderError);
          errors.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            error: orderError instanceof Error ? orderError.message : 'Erro desconhecido'
          });
        }
      }

      // Log the bulk operation
      console.log(`🔄 Bulk status change completed: ${successCount}/${orders.length} orders updated, ${emailsSent} emails sent`);

      res.json({
        success: true,
        bulkOperationId,
        totalOrders: orders.length,
        successCount,
        errorCount: errors.length,
        emailsSent: sendEmails ? emailsSent : 0,
        errors: errors.length > 0 ? errors : undefined,
        message: `${successCount} pedidos atualizados com sucesso${sendEmails ? `, ${emailsSent} e-mails enviados` : ''}`
      });

    } catch (error) {
      console.error('Bulk status change error:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  // SendGrid Test Endpoint
  app.post("/api/test-sendgrid", async (req, res) => {
    try {
      console.log('🧪 Testing SendGrid integration...');

      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email address is required'
        });
      }

      // Create EmailService instance
      const emailService = new EmailService(storage);

      // Send test email
      const success = await emailService.sendTestEmail(email);

      if (success) {
        console.log('✅ SendGrid test email sent successfully!');
        res.json({
          success: true,
          message: 'Test email sent successfully! Check your inbox.',
          email: email
        });
      } else {
        console.log('❌ SendGrid test email failed!');
        res.status(500).json({
          success: false,
          error: 'Failed to send test email. Check server logs for details.'
        });
      }

    } catch (error) {
      console.error('💥 SendGrid test error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error))
      });
    }
  });

  // CEP Zones routes are handled in separate router (cepZonesRoutes)

  // Get minimum delivery price for a specific event (public endpoint)
  app.get("/api/events/:id/minimum-price", async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);

      if (isNaN(eventId)) {
        return res.status(400).json({ error: "ID do evento inválido" });
      }

      // Get the event details first
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ error: "Evento não encontrado" });
      }

      // Only calculate for cep_zones pricing type
      if (event.pricingType !== 'cep_zones') {
        if (event.pricingType === 'fixed') {
          return res.json({ 
            minimumPrice: Number(event.fixedPrice),
            pricingType: 'fixed'
          });
        } else {
          // For distance pricing, return a default minimum
          return res.json({ 
            minimumPrice: 10.00,
            pricingType: 'distance'
          });
        }
      }

      // Get all active CEP zones
      const allZones = await storage.getCepZones(true); // Only active zones

      if (!allZones.length) {
        return res.json({ 
          minimumPrice: 0,
          pricingType: 'cep_zones'
        });
      }

      // Get custom prices for this specific event
      const customPrices = await db
        .select()
        .from(eventCepZonePrices)
        .where(eq(eventCepZonePrices.eventId, eventId));

      // Create a map of custom prices by zone ID
      const customPricesMap = new Map(
        customPrices.map(cp => [cp.cepZoneId, Number(cp.price)])
      );

      // Find minimum price considering both global and custom prices
      let minimumPrice = Infinity;

      for (const zone of allZones) {
        const customPrice = customPricesMap.get(zone.id);
        const priceToCompare = customPrice !== undefined ? customPrice : Number(zone.price);
        
        if (priceToCompare < minimumPrice) {
          minimumPrice = priceToCompare;
        }
      }

      res.json({ 
        minimumPrice: minimumPrice === Infinity ? 0 : minimumPrice,
        pricingType: 'cep_zones'
      });

    } catch (error) {
      console.error("Error getting minimum price for event:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Event CEP Zone Prices Management - Admin only

  // Get CEP zone prices for a specific event
  app.get("/api/admin/events/:id/cep-zone-prices", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const eventId = parseInt(req.params.id);

      if (isNaN(eventId)) {
        return res.status(400).json({ error: "ID do evento inválido" });
      }

      // Get all CEP zones with their global prices
      const allZones = await storage.getCepZones();

      // Get custom prices for this specific event
      const customPrices = await db
        .select()
        .from(eventCepZonePrices)
        .where(eq(eventCepZonePrices.eventId, eventId));

      // Create a map of custom prices by zone ID
      const customPricesMap = new Map(
        customPrices.map(cp => [cp.cepZoneId, cp.price])
      );

      // Combine zones with their custom prices
      const zonesWithPrices = allZones.map(zone => ({
        id: zone.id,
        name: zone.name,
        description: zone.description,
        globalPrice: Number(zone.price),
        customPrice: customPricesMap.has(zone.id) 
          ? Number(customPricesMap.get(zone.id)) 
          : null,
        active: zone.active
      }));

      res.json({
        success: true,
        zones: zonesWithPrices
      });
    } catch (error: any) {
      console.error("Error getting event CEP zone prices:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update CEP zone prices for a specific event
  app.put("/api/admin/events/:id/cep-zone-prices", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const { customPrices } = req.body;

      if (isNaN(eventId)) {
        return res.status(400).json({ error: "ID do evento inválido" });
      }

      if (!Array.isArray(customPrices)) {
        return res.status(400).json({ error: "customPrices deve ser um array" });
      }

      // Validate event exists
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ error: "Evento não encontrado" });
      }

      // Start transaction - first delete existing custom prices for this event
      await db.delete(eventCepZonePrices).where(eq(eventCepZonePrices.eventId, eventId));

      // Insert new custom prices (only those with valid prices)
      const validCustomPrices = customPrices.filter(cp => 
        cp.cepZoneId && 
        cp.price && 
        !isNaN(parseFloat(cp.price)) && 
        parseFloat(cp.price) > 0
      );

      if (validCustomPrices.length > 0) {
        const priceData = validCustomPrices.map(cp => ({
          eventId,
          cepZoneId: parseInt(cp.cepZoneId),
          price: cp.price.toString()
        }));

        await db.insert(eventCepZonePrices).values(priceData);
      }

      res.json({
        success: true,
        message: `${validCustomPrices.length} preços personalizados salvos com sucesso`,
        updatedCount: validCustomPrices.length
      });

    } catch (error: any) {
      console.error("Error updating event CEP zone prices:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get detailed event information including CEP zone prices
  app.get("/api/admin/events/:id", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const eventId = parseInt(req.params.id);

      if (isNaN(eventId)) {
        return res.status(400).json({ error: "ID do evento inválido" });
      }

      // Get basic event information
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ error: "Evento não encontrado" });
      }

      // If event uses CEP zones pricing, get the custom prices
      let cepZonePrices = null;
      if (event.pricingType === 'cep_zones') {
        const customPrices = await db
          .select({
            cepZoneId: eventCepZonePrices.cepZoneId,
            price: eventCepZonePrices.price,
            zoneName: cepZones.name
          })
          .from(eventCepZonePrices)
          .leftJoin(cepZones, eq(eventCepZonePrices.cepZoneId, cepZones.id))
          .where(eq(eventCepZonePrices.eventId, eventId));

        cepZonePrices = customPrices.map(cp => ({
          zoneId: cp.cepZoneId,
          zoneName: cp.zoneName,
          customPrice: Number(cp.price)
        }));
      }

      res.json({
        ...event,
        cepZonePrices
      });

    } catch (error: any) {
      console.error("Error getting event details:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Check CEP zone for a specific ZIP code
  app.get("/api/cep-zones/check/:zipCode", generalRateLimit, async (req, res) => {
    try {
      const { zipCode } = req.params;
      const { eventName } = req.query;

      // Get all active zones for calculation  
      const zones = await storage.getCepZones(true);

      // Inline CEP zone calculation logic
      const cleanZip = zipCode.replace(/\D/g, '').padStart(8, '0');
      let foundZone = null;

      for (const zone of zones) {
        try {
          const ranges = JSON.parse(zone.cepRanges);
          for (const range of ranges) {
            const zoneStart = range.start.replace(/\D/g, '').padStart(8, '0');
            const zoneEnd = range.end.replace(/\D/g, '').padStart(8, '0');

            if (cleanZip >= zoneStart && cleanZip <= zoneEnd) {
              foundZone = zone;
              break;
            }
          }
          if (foundZone) break;
        } catch (error) {
          console.error('Error parsing CEP ranges for zone:', zone.id, error);
        }
      }

      const calculation = foundZone 
        ? {
            zoneName: foundZone.name,
            zoneId: foundZone.id,
            deliveryCost: Number(foundZone.price),
            found: true,
            description: foundZone.description || undefined
          }
        : {
            zoneName: '',
            zoneId: 0,
            deliveryCost: 0,
            found: false
          };

      if (!calculation.found) {
        // Generate WhatsApp URL for unsupported CEP
        const baseUrl = 'https://wa.me/5583981302961';
        const message = eventName 
          ? `Olá! Meu CEP ${zipCode} não foi reconhecido no sistema para o evento "${eventName}". Vocês atendem essa região?`
          : `Olá! Meu CEP ${zipCode} não foi reconhecido no sistema. Vocês atendem essa região?`;
        const whatsappUrl = `${baseUrl}?text=${encodeURIComponent(message)}`;
        return res.json({ 
          success: false, 
          found: false,
          whatsappUrl,
          message: "CEP não atendido. Entre em contato via WhatsApp." 
        });
      }

      res.json({ 
        success: true, 
        found: true,
        zone: calculation 
      });
    } catch (error: any) {
      console.error("Error checking CEP zone:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Renew PIX payment for existing order
  app.post("/api/orders/:orderNumber/renew-pix", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { orderNumber } = req.params;
      
      // Get order details
      const order = await storage.getOrderByNumber(orderNumber);
      if (!order) {
        return res.status(404).json({ message: "Pedido não encontrado" });
      }

      // Verify ownership
      if (order.customerId !== req.user?.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Check if order status allows payment renewal
      if (order.status !== "aguardando_pagamento") {
        return res.status(400).json({ 
          message: "Pedido não está aguardando pagamento",
          currentStatus: order.status 
        });
      }

      // Check if payment timed out (24 hours)
      if (MercadoPagoService.isPaymentTimeout(order.paymentCreatedAt?.toISOString() || null)) {
        // Auto-cancel the order
        await storage.updateOrderStatus(order.id, "cancelado", "system", "Pagamento expirou (24h)");
        return res.status(400).json({ 
          message: "Tempo limite de pagamento expirado (24 horas). Pedido cancelado automaticamente."
        });
      }

      // Get customer and event details for payment
      const customer = await storage.getCustomer(order.customerId);
      const event = await storage.getEvent(order.eventId);

      if (!customer || !event) {
        return res.status(404).json({ message: "Dados do pedido não encontrados" });
      }

      // SECURITY: Check if event allows PIX renewal
      if (event.status !== 'ativo') {
        // Special case: allow PIX renewal if event is "fechado_pedidos" but still has stock
        if (event.status === 'fechado_pedidos' && event.stockEnabled && event.maxOrders && event.currentOrders < event.maxOrders) {
          console.log(`✅ PIX renewal allowed - Event ${order.eventId} is "fechado_pedidos" but has stock: ${event.currentOrders}/${event.maxOrders}`);
        } else {
          console.log(`🚫 PIX renewal blocked - Event ${order.eventId} status: ${event.status}, stock: ${event.currentOrders}/${event.maxOrders}`);
          return res.status(400).json({
            success: false,
            message: event.status === 'fechado_pedidos' 
              ? 'Este evento está fechado e sem estoque disponível. Entre em contato conosco pelo WhatsApp para verificar possibilidades de pagamento.' 
              : 'Este evento não está mais disponível para pagamentos',
            code: 'EVENT_NOT_AVAILABLE',
            whatsappContact: event.status === 'fechado_pedidos'
          });
        }
      }

      // Prepare payment data
      const paymentData = {
        paymentMethodId: "pix",
        email: customer.email,
        amount: parseFloat(order.totalCost),
        description: `Kit ${event.name} - Pedido #${order.orderNumber}`,
        orderId: order.orderNumber,
        payer: {
          name: customer.name.split(' ')[0] || customer.name,
          surname: customer.name.split(' ').slice(1).join(' ') || '',
          email: customer.email,
          identification: {
            type: "CPF",
            number: customer.cpf.replace(/\D/g, '')
          }
        }
      };

      // Create new PIX payment
      const pixPayment = await MercadoPagoService.renewPIXPayment(order.orderNumber, paymentData);
      
      if (!pixPayment) {
        return res.status(500).json({ message: "Erro ao renovar pagamento PIX" });
      }

      // Calculate new expiration date (30 minutes from now)
      const pixExpiration = new Date();
      pixExpiration.setMinutes(pixExpiration.getMinutes() + 30);

      // Update order with new PIX data
      await db
        .update(orders)
        .set({
          paymentId: (pixPayment.id || pixPayment.paymentId)?.toString() || null,
          pixQrCode: pixPayment.qr_code_base64 || null,
          pixCopyPaste: pixPayment.qr_code || null,
          pixExpirationDate: pixExpiration,
          paymentCreatedAt: order.paymentCreatedAt || new Date() // Keep original creation time
        })
        .where(eq(orders.id, order.id));

      res.json({
        success: true,
        paymentId: pixPayment.id,
        qrCodeBase64: pixPayment.qr_code_base64,
        pixCopyPaste: pixPayment.qr_code,
        expirationDate: pixExpiration.toISOString(),
        message: "PIX renovado com sucesso"
      });

    } catch (error) {
      console.error('Error renewing PIX payment:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Change payment method for existing order
  app.put("/api/orders/:orderNumber/payment-method", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { orderNumber } = req.params;
      const { newPaymentMethod } = req.body;

      if (!["credit", "debit", "pix"].includes(newPaymentMethod)) {
        return res.status(400).json({ message: "Método de pagamento inválido" });
      }

      // Get order details
      const order = await storage.getOrderByNumber(orderNumber);
      if (!order) {
        return res.status(404).json({ message: "Pedido não encontrado" });
      }

      // Verify ownership
      if (order.customerId !== req.user?.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Check if order status allows payment method change
      if (order.status !== "aguardando_pagamento") {
        return res.status(400).json({ 
          message: "Não é possível alterar método de pagamento deste pedido",
          currentStatus: order.status 
        });
      }

      // Update payment method in database
      await db
        .update(orders)
        .set({
          paymentMethod: newPaymentMethod,
          // Clear PIX data when switching to card payment
          paymentId: newPaymentMethod === "pix" ? order.paymentId : null,
          pixQrCode: newPaymentMethod === "pix" ? order.pixQrCode : null,
          pixCopyPaste: newPaymentMethod === "pix" ? order.pixCopyPaste : null,
          pixExpirationDate: newPaymentMethod === "pix" ? order.pixExpirationDate : null
        })
        .where(eq(orders.id, order.id));

      res.json({
        success: true,
        newPaymentMethod,
        message: "Método de pagamento alterado com sucesso",
        redirectToPayment: newPaymentMethod !== "pix" // Redirect to payment page for cards
      });

    } catch (error) {
      console.error('Error changing payment method:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Get detailed payment status for order
  app.get("/api/orders/:orderNumber/payment-status", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { orderNumber } = req.params;
      
      // Get order details
      const order = await storage.getOrderByNumber(orderNumber);
      if (!order) {
        return res.status(404).json({ message: "Pedido não encontrado" });
      }

      // Verify ownership
      if (order.customerId !== req.user?.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const response: any = {
        orderStatus: order.status,
        paymentMethod: order.paymentMethod,
        totalAmount: parseFloat(order.totalCost)
      };

      // Add PIX specific data if applicable
      if (order.paymentMethod === "pix" && order.status === "aguardando_pagamento") {
        const isPixExpired = MercadoPagoService.isPixExpired(order.pixExpirationDate?.toISOString() || null);
        const isPaymentTimedOut = MercadoPagoService.isPaymentTimeout(order.paymentCreatedAt?.toISOString() || null);

        response.pix = {
          qrCodeBase64: order.pixQrCode,
          pixCopyPaste: order.pixCopyPaste,
          expirationDate: order.pixExpirationDate,
          isExpired: isPixExpired,
          isTimedOut: isPaymentTimedOut,
          canRenew: !isPaymentTimedOut
        };

        // Check payment status with MercadoPago if we have paymentId
        if (order.paymentId) {
          try {
            const paymentStatus = await MercadoPagoService.getPaymentStatus(parseInt(order.paymentId));
            response.mercadoPagoStatus = paymentStatus.status;
          } catch (error) {
            console.error('Error checking MercadoPago status:', error);
          }
        }
      }

      res.json(response);

    } catch (error) {
      console.error('Error getting payment status:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
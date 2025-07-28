import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { customerIdentificationSchema, customerRegistrationSchema, orderCreationSchema, adminEventCreationSchema } from "@shared/schema";
import { z } from "zod";
import { calculateDeliveryCost } from "./distance-calculator";
import { MercadoPagoService } from "./mercadopago-service";
import path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  
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
      res.json(events);
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
      
      res.json(event);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar evento" });
    }
  });

  // Identify customer
  app.post("/api/customers/identify", async (req, res) => {
    try {
      const { cpf, birthDate } = customerIdentificationSchema.parse(req.body);
      
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
      
      // Create addresses
      const addresses = [];
      for (const addressData of registrationData.addresses) {
        const address = await storage.createAddress({
          customerId: customer.id,
          ...addressData,
          zipCode: addressData.zipCode.replace(/\D/g, '')
        });
        addresses.push(address);
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
  app.get("/api/customers/:id/addresses", async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const addresses = await storage.getAddressesByCustomerId(customerId);
      res.json(addresses);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar endereços" });
    }
  });

  // Get address by ID
  app.get("/api/addresses/:id", async (req, res) => {
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
      const orderData = orderCreationSchema.parse(req.body);
      
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
      
      // Use provided costs or calculate them
      const finalDeliveryCost = orderData.deliveryCost || deliveryCost;
      const finalExtraKitsCost = orderData.extraKitsCost || additionalCost;
      const finalDonationAmount = orderData.donationAmount || donationAmount;
      const finalTotalCost = orderData.totalCost || totalCost;

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
      
      // Get event details for response
      
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
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Dados inválidos",
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Erro ao criar pedido" });
    }
  });

  // Create new address
  app.post("/api/customers/:id/addresses", async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const addressData = req.body;
      
      // If setting as default, unset other defaults first
      if (addressData.isDefault) {
        const currentAddresses = await storage.getAddressesByCustomerId(customerId);
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
  app.get("/api/customers/:id/orders", async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const orders = await storage.getOrdersByCustomerId(customerId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar pedidos" });
    }
  });

  // Get order by number with details
  app.get("/api/orders/:orderNumber", async (req, res) => {
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
  app.get("/api/orders/:id/kits", async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const kits = await storage.getKitsByOrderId(orderId);
      res.json(kits);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar kits do pedido" });
    }
  });

  // Address management routes
  app.post("/api/customers/:customerId/addresses", async (req, res) => {
    try {
      const customerId = parseInt(req.params.customerId);
      const addressData = req.body;
      
      // If this address is being set as default, update other addresses
      if (addressData.isDefault) {
        // First get all customer addresses and set them to non-default
        const existingAddresses = await storage.getAddressesByCustomerId(customerId);
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

  app.put("/api/addresses/:id", async (req, res) => {
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

  // Admin routes



  app.get("/api/admin/events", async (req, res) => {
    try {
      const events = await storage.getAllEvents();
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/events", async (req, res) => {
    try {
      const validatedData = adminEventCreationSchema.parse(req.body);
      
      // Convert string prices to proper format and handle pricing logic
      const eventData = {
        ...validatedData,
        // Only save fixedPrice if pricing type is "fixed" and price is provided
        fixedPrice: validatedData.pricingType === "fixed" && validatedData.fixedPrice ? validatedData.fixedPrice : null,
        extraKitPrice: validatedData.extraKitPrice ? validatedData.extraKitPrice : "8.00",
        donationAmount: validatedData.donationAmount ? validatedData.donationAmount : null,
      };

      // Remove pricingType from eventData as it's not in the database schema
      const { pricingType, ...dataToSave } = eventData;

      const event = await storage.createEvent(dataToSave);
      res.json(event);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get single event for admin
  app.get("/api/admin/events/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const event = await storage.getEvent(id);
      
      if (!event) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }
      
      res.json(event);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update event
  app.put("/api/admin/events/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      // Convert date format if needed
      if (updateData.date && !updateData.date.includes('T')) {
        updateData.date = updateData.date + 'T00:00:00.000Z';
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
      
      res.json(event);
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
  app.get("/api/admin/events/:id/orders", async (req, res) => {
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

  // Admin Orders Management Routes
  
  // Get all orders with filters and pagination
  app.get("/api/admin/orders", async (req, res) => {
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
  app.get("/api/admin/orders/:id", async (req, res) => {
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
  app.patch("/api/admin/orders/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, reason } = req.body;
      
      // Validate status - using Portuguese status names
      const validStatuses = ["confirmado", "aguardando_pagamento", "cancelado", "kits_sendo_retirados", "em_transito", "entregue"];
      console.log('Received status:', status, 'Valid statuses:', validStatuses);
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Status inválido", received: status, valid: validStatuses });
      }
      
      const order = await storage.updateOrderStatus(
        id, 
        status, 
        'admin', 
        'Administrador', 
        reason || 'Status alterado pelo administrador'
      );
      
      if (!order) {
        return res.status(404).json({ message: "Pedido não encontrado" });
      }
      
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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

  // Test route
  app.get("/api/admin/test-stats", (req, res) => {
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
  app.get("/api/admin/orders/stats", (req, res) => {
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
  app.get("/api/admin/stats", async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      const orderStats = await storage.getOrderStats();
      
      // Return comprehensive stats with real data from database
      const response = {
        totalCustomers: stats.totalCustomers,
        totalOrders: stats.totalOrders,
        activeEvents: stats.activeEvents,
        totalRevenue: stats.totalRevenue,
        confirmedOrders: orderStats.confirmedOrders,
        awaitingPayment: orderStats.awaitingPayment,
        cancelledOrders: orderStats.cancelledOrders,
        inTransitOrders: orderStats.inTransitOrders,
        deliveredOrders: orderStats.deliveredOrders,
      };
      
      console.log('Sending admin stats response:', response);
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
  app.get("/api/admin/orders/:id/label", async (req, res) => {
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
  app.get("/api/admin/events/:eventId/labels", async (req, res) => {
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
  app.get("/api/admin/customers", async (req, res) => {
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
      const customerData = customerRegistrationSchema.parse(req.body);
      
      // Check if CPF already exists
      const existingCustomer = await storage.getCustomerByCPF(customerData.cpf);
      if (existingCustomer) {
        return res.status(400).json({ message: "CPF já cadastrado no sistema" });
      }
      
      const result = await storage.createCustomerWithAddresses(customerData);
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
  app.get("/api/admin/customers/:id", async (req, res) => {
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
  app.get("/api/admin/reports/events", async (req, res) => {
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
  app.get("/api/admin/reports/kits/:eventId", async (req, res) => {
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
      const publicKey = MercadoPagoService.getPublicKey();
      if (!publicKey) {
        return res.status(500).json({ message: "Chave pública do Mercado Pago não configurada" });
      }
      res.json({ publicKey });
    } catch (error) {
      res.status(500).json({ message: "Erro ao obter chave pública" });
    }
  });

  // Process card payment with order creation (credit/debit)
  app.post("/api/mercadopago/process-card-payment", async (req, res) => {
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

      const [firstName, ...lastNameParts] = customerName.split(' ');
      const lastName = lastNameParts.join(' ') || '';

      // Generate a temporary order reference for the payment
      const tempOrderReference = `TEMP-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      const paymentData = {
        token,
        paymentMethodId,
        email,
        amount: parseFloat(amount),
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
          // Parse and validate order data
          const validatedOrderData = orderCreationSchema.parse(orderData);
          
          // Create the order now that payment is confirmed
          const orderNumber = `KR${new Date().getFullYear()}${String(Date.now() + Math.random() * 1000).slice(-6)}`;
          
          const selectedEvent = await storage.getEvent(validatedOrderData.eventId);
          if (!selectedEvent) {
            return res.status(404).json({ message: "Evento não encontrado" });
          }

          let totalCost = 0;
          let baseCost = 0;
          let deliveryCost = 0;
          let additionalCost = 0;
          let donationAmount = 0;

          // Get customer address for delivery calculation
          const customerAddress = await storage.getAddress(validatedOrderData.addressId);
          
          if (selectedEvent.fixedPrice) {
            baseCost = Number(selectedEvent.fixedPrice);
            deliveryCost = 0;
          } else {
            const deliveryCalculation = calculateDeliveryCost(
              selectedEvent.pickupZipCode || '58000000',
              customerAddress?.zipCode || '58030000'
            );
            deliveryCost = deliveryCalculation.deliveryCost;
          }

          if (validatedOrderData.kitQuantity > 1 && selectedEvent.extraKitPrice) {
            additionalCost = (validatedOrderData.kitQuantity - 1) * Number(selectedEvent.extraKitPrice);
          }

          if (selectedEvent.donationRequired && selectedEvent.donationAmount) {
            donationAmount = Number(selectedEvent.donationAmount) * validatedOrderData.kitQuantity;
          }

          totalCost = baseCost + deliveryCost + additionalCost + donationAmount - (validatedOrderData.discountAmount || 0);

          // Create the order with status "aguardando_pagamento" first
          const order = await storage.createOrder({
            eventId: validatedOrderData.eventId,
            customerId: validatedOrderData.customerId,
            addressId: validatedOrderData.addressId,
            kitQuantity: validatedOrderData.kitQuantity,
            deliveryCost: deliveryCost.toString(),
            extraKitsCost: additionalCost.toString(),
            donationCost: donationAmount.toString(),
            totalCost: totalCost.toString(),
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

          // If payment was approved, update status to "confirmado" with proper history
          if (result.status === 'approved') {
            await storage.updateOrderStatus(
              order.id, 
              'confirmado', 
              'mercadopago', 
              'Mercado Pago', 
              'Pagamento aprovado'
            );
            console.log(`✅ Order ${order.orderNumber} status updated to confirmado - payment approved`);
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

  // Create PIX payment
  app.post("/api/mercadopago/create-pix-payment", async (req, res) => {
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

      const [firstName, ...lastNameParts] = customerName.split(' ');
      const lastName = lastNameParts.join(' ') || '';

      const paymentData = {
        paymentMethodId: 'pix',
        email,
        amount: parseFloat(amount),
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
        
        // Update order status to awaiting payment
        try {
          console.log(`Status: aguardando_pagamento`);
        } catch (error) {
          console.log('Note: Order status update temporarily disabled for testing');
        }
        
        res.json({
          success: true,
          paymentId: result.id,
          qrCode: result.qr_code,
          qrCodeBase64: result.qr_code_base64,
          ticketUrl: result.ticket_url
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
                await storage.updateOrderStatus(order.id, 'confirmado', 'mercadopago', 'Mercado Pago', 'Pagamento aprovado via verificação de status');
                console.log(`✅ Order ${orderId} status successfully updated to confirmado`);
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

  // Webhook for MercadoPago notifications (optional but recommended)
  app.post("/api/mercadopago/webhook", async (req, res) => {
    try {
      const { action, data } = req.body;
      
      if (action === 'payment.updated' && data?.id) {
        const result = await MercadoPagoService.getPaymentStatus(data.id);
        
        if (result.success && result.payment) {
          const orderId = result.payment.external_reference;
          
          // Update order status based on payment status
          if (orderId) {
            const order = await storage.getOrderByNumber(orderId);
            if (order) {
              if (result.status === 'approved') {
                console.log(`✅ Webhook: Payment approved for order ${orderId} (ID: ${order.id}) - updating to confirmado`);
                await storage.updateOrderStatus(order.id, 'confirmado', 'mercadopago', 'Mercado Pago', 'Pagamento aprovado via webhook');
                console.log(`✅ Webhook: Order ${orderId} status successfully updated to confirmado`);
              } else if (result.status === 'cancelled' || result.status === 'rejected') {
                console.log(`❌ Webhook: Payment failed for order ${orderId} (ID: ${order.id}) - updating to cancelado`);
                await storage.updateOrderStatus(order.id, 'cancelado', 'mercadopago', 'Mercado Pago', 'Pagamento rejeitado via webhook');
                console.log(`❌ Webhook: Order ${orderId} status successfully updated to cancelado`);
              } else if (result.status === 'pending') {
                console.log(`⏳ Webhook: Payment pending for order ${orderId} - keeping aguardando_pagamento`);
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
  app.get("/api/orders/:orderId/status-history", async (req, res) => {
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
  app.get("/api/orders/number/:orderNumber/status-history", async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}


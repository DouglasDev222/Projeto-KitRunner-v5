import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { customerIdentificationSchema, customerRegistrationSchema, orderCreationSchema, adminEventCreationSchema } from "@shared/schema";
import { z } from "zod";
import { calculateDeliveryCost } from "./distance-calculator";

export async function registerRoutes(app: Express): Promise<Server> {
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
      
      // Create order with proper pricing breakdown
      const order = await storage.createOrder({
        eventId: orderData.eventId,
        customerId: orderData.customerId,
        addressId: orderData.addressId,
        kitQuantity: orderData.kitQuantity,
        deliveryCost: deliveryCost.toString(),
        extraKitsCost: additionalCost.toString(),
        donationCost: donationAmount.toString(),
        discountAmount: "0",
        totalCost: totalCost.toString(),
        paymentMethod: orderData.paymentMethod,
        status: "confirmado",
        donationAmount: donationAmount.toString(),
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
      const order = await storage.getOrderByNumber(orderNumber);
      
      if (!order) {
        return res.status(404).json({ message: "Pedido não encontrado" });
      }
      
      // Get related data
      const event = await storage.getEvent(order.eventId);
      const address = await storage.getAddress(order.addressId);
      
      res.json({
        ...order,
        event,
        address
      });
    } catch (error) {
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

  // Admin routes
  app.get("/api/admin/customers", async (req, res) => {
    try {
      const customers = await storage.getAllCustomers();
      res.json(customers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/orders", async (req, res) => {
    try {
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

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
      const filters = req.query;
      
      // Get all orders with customer, event, and address details
      const orders = await storage.getAllOrdersWithDetails(filters);
      
      res.json(orders);
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
      const { status } = req.body;
      
      // Validate status - using Portuguese status names
      const validStatuses = ["confirmado", "aguardando_pagamento", "cancelado", "kits_sendo_retirados", "em_transito", "entregue"];
      console.log('Received status:', status, 'Valid statuses:', validStatuses);
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Status inválido", received: status, valid: validStatuses });
      }
      
      const order = await storage.updateOrderStatus(id, status);
      
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

  const httpServer = createServer(app);
  return httpServer;
}


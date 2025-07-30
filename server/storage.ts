import { 
  Event, 
  InsertEvent, 
  Customer, 
  InsertCustomer, 
  Address,
  InsertAddress,
  Kit, 
  InsertKit,
  Order,
  InsertOrder,
  Coupon,
  InsertCoupon,
  OrderStatusHistory,
  InsertOrderStatusHistory,
  CustomerIdentification,
  events,
  customers,
  addresses,
  orders,
  kits,
  coupons,
  orderStatusHistory
} from "@shared/schema";
import { db } from "./db";
import { eq, and, count, sum, desc, ne, sql, like, or, asc } from "drizzle-orm";

export interface IStorage {
  // Events
  getEvents(): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;

  // Customers
  getCustomerByCredentials(cpf: string, birthDate: string): Promise<Customer | undefined>;
  getCustomerByCPF(cpf: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;

  // Addresses
  createAddress(address: InsertAddress): Promise<Address>;
  getAddressesByCustomerId(customerId: number): Promise<Address[]>;
  getAddress(id: number): Promise<Address | undefined>;
  updateAddress(id: number, address: Partial<InsertAddress>): Promise<Address>;

  // Orders
  createOrder(order: InsertOrder): Promise<Order>;
  getOrderById(id: number): Promise<Order | undefined>;
  getOrderByNumber(orderNumber: string): Promise<Order | undefined>;
  getOrderByIdempotencyKey(idempotencyKey: string): Promise<Order | undefined>;
  getOrdersByCustomerId(customerId: number): Promise<Order[]>;

  // Kits
  createKit(kit: InsertKit): Promise<Kit>;
  getKitsByOrderId(orderId: number): Promise<Kit[]>;

  // Admin methods
  getAllCustomers(): Promise<Customer[]>;
  getAllOrders(): Promise<(Order & { customer: Customer; event: Event })[]>;
  getAllEvents(): Promise<Event[]>;
  getAdminStats(): Promise<{
    totalCustomers: number;
    totalOrders: number;
    activeEvents: number;
    totalRevenue: number;
  }>;

  // Coupons
  getCouponByCode(code: string): Promise<Coupon | undefined>;
  createCoupon(coupon: InsertCoupon): Promise<Coupon>;
  
  // Price calculation
  calculateDeliveryPrice(fromZipCode: string, toZipCode: string): Promise<number>;

  // Additional methods needed for event administration
  updateEvent(id: number, eventData: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<boolean>;
  getOrdersByEventId(eventId: number): Promise<(Order & { customer: Customer })[]>;
  
  // Order statistics
  getOrderStats(): Promise<{
    totalOrders: number;
    confirmedOrders: number;
    awaitingPayment: number;
    cancelledOrders: number;
    inTransitOrders: number;
    deliveredOrders: number;
    totalRevenue: number;
  }>;

  // Admin customer management methods
  getAllCustomersWithAddresses(): Promise<(Customer & { addresses: Address[]; orderCount: number })[]>;
  getAllCustomersWithAddressesPaginated(page: number, limit: number, search?: string): Promise<{
    customers: (Customer & { addresses: Address[]; orderCount: number })[];
    total: number;
    totalPages: number;
    currentPage: number;
  }>;
  createCustomerWithAddresses(customerData: any): Promise<{ customer: Customer; addresses: Address[] }>;
  updateCustomer(id: number, customerData: any): Promise<Customer | undefined>;
  deleteCustomer(id: number): Promise<boolean>;
  getCustomerWithAddresses(id: number): Promise<(Customer & { addresses: Address[] }) | undefined>;

  // Admin order management methods
  getAllOrdersWithDetailsPaginated(page: number, limit: number, filters?: any): Promise<{
    orders: any[];
    total: number;
    totalPages: number;
    currentPage: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getEvents(): Promise<Event[]> {
    const result = await db.select().from(events);
    return result;
  }

  async getEvent(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event || undefined;
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const [event] = await db
      .insert(events)
      .values(insertEvent)
      .returning();
    return event;
  }

  async updateEvent(id: number, eventData: Partial<InsertEvent>): Promise<Event | undefined> {
    const [event] = await db
      .update(events)
      .set(eventData)
      .where(eq(events.id, id))
      .returning();
    return event || undefined;
  }

  async deleteEvent(id: number): Promise<boolean> {
    const result = await db
      .delete(events)
      .where(eq(events.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getOrdersByEventId(eventId: number): Promise<(Order & { customer: Customer })[]> {
    const result = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        eventId: orders.eventId,
        customerId: orders.customerId,
        addressId: orders.addressId,
        kitQuantity: orders.kitQuantity,
        deliveryCost: orders.deliveryCost,
        extraKitsCost: orders.extraKitsCost,
        donationCost: orders.donationCost,
        discountAmount: orders.discountAmount,
        couponCode: orders.couponCode,
        totalCost: orders.totalCost,
        paymentMethod: orders.paymentMethod,
        status: orders.status,
        donationAmount: orders.donationAmount,
        createdAt: orders.createdAt,
        customer: customers,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(eq(orders.eventId, eventId))
      .orderBy(desc(orders.createdAt));
      
    return result as (Order & { customer: Customer })[];
  }

  async getCustomerByCredentials(cpf: string, birthDate: string): Promise<Customer | undefined> {
    const cleanCpf = cpf.replace(/\D/g, "");
    const result = await db
      .select()
      .from(customers)
      .where(and(eq(customers.cpf, cleanCpf), eq(customers.birthDate, birthDate)));
    return result[0] || undefined;
  }

  async getCustomerByCPF(cpf: string): Promise<Customer | undefined> {
    const cleanCpf = cpf.replace(/\D/g, "");
    const result = await db
      .select()
      .from(customers)
      .where(eq(customers.cpf, cleanCpf));
    return result[0] || undefined;
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const [customer] = await db
      .insert(customers)
      .values(insertCustomer)
      .returning();
    return customer;
  }

  async createAddress(insertAddress: InsertAddress): Promise<Address> {
    const [address] = await db
      .insert(addresses)
      .values(insertAddress)
      .returning();
    return address;
  }

  async getAddressesByCustomerId(customerId: number): Promise<Address[]> {
    const result = await db
      .select()
      .from(addresses)
      .where(eq(addresses.customerId, customerId));
    return result;
  }

  async getAddress(id: number): Promise<Address | undefined> {
    const [address] = await db.select().from(addresses).where(eq(addresses.id, id));
    return address || undefined;
  }

  async updateAddress(id: number, updateData: Partial<InsertAddress>): Promise<Address> {
    const [address] = await db
      .update(addresses)
      .set(updateData)
      .where(eq(addresses.id, id))
      .returning();
    return address;
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const orderNumber = `KR${new Date().getFullYear()}${String(Date.now()).slice(-6)}`;
    const [order] = await db
      .insert(orders)
      .values({
        ...insertOrder,
        orderNumber,
      })
      .returning();
    
    // Add initial status history record
    try {
      console.log(`📋 Adding initial status history for order ${order.id} with status: ${order.status}`);
      await this.addStatusHistory(
        order.id, 
        null, // No previous status for new orders
        order.status, 
        'system', 
        'Sistema', 
        'Pedido criado'
      );
      console.log(`✅ Initial status history added successfully for order ${order.id}`);
    } catch (error) {
      console.error(`❌ Error adding initial status history for order ${order.id}:`, error);
    }
    
    return order;
  }

  async getOrderById(id: number): Promise<Order | undefined> {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id));
    return order || undefined;
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber));
    return order || undefined;
  }

  async getOrderByIdempotencyKey(idempotencyKey: string): Promise<Order | undefined> {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.idempotencyKey, idempotencyKey));
    return order || undefined;
  }

  async getOrdersByCustomerId(customerId: number): Promise<any[]> {
    try {
      // First get orders
      const ordersList = await db
        .select()
        .from(orders)
        .where(eq(orders.customerId, customerId))
        .orderBy(desc(orders.createdAt));
      
      // Then get event details for each order
      const result = [];
      for (const order of ordersList) {
        const [event] = await db
          .select({
            id: events.id,
            name: events.name,
            date: events.date,
            location: events.location,
            city: events.city,
            state: events.state,
          })
          .from(events)
          .where(eq(events.id, order.eventId))
          .limit(1);
        
        result.push({
          ...order,
          event: event || null
        });
      }
      
      console.log(`✅ Found ${result.length} orders for customer ${customerId}`);
      return result;
    } catch (error) {
      console.error(`❌ Error getting orders for customer ${customerId}:`, error);
      throw error;
    }
  }

  async createKit(insertKit: InsertKit): Promise<Kit> {
    const [kit] = await db
      .insert(kits)
      .values(insertKit)
      .returning();
    return kit;
  }

  async getKitsByOrderId(orderId: number): Promise<Kit[]> {
    const result = await db
      .select()
      .from(kits)
      .where(eq(kits.orderId, orderId));
    return result;
  }

  // Admin methods
  async getAllCustomers(): Promise<Customer[]> {
    const result = await db.select().from(customers).orderBy(desc(customers.createdAt));
    return result;
  }

  async getAllOrders(): Promise<(Order & { customer: Customer; event: Event })[]> {
    const result = await db.select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      eventId: orders.eventId,
      customerId: orders.customerId,
      addressId: orders.addressId,
      kitQuantity: orders.kitQuantity,
      deliveryCost: orders.deliveryCost,
      extraKitsCost: orders.extraKitsCost,
      donationCost: orders.donationCost,
      discountAmount: orders.discountAmount,
      couponCode: orders.couponCode,
      totalCost: orders.totalCost,
      paymentMethod: orders.paymentMethod,
      status: orders.status,
      createdAt: orders.createdAt,
      customer: customers,
      event: events,
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .leftJoin(events, eq(orders.eventId, events.id))
    .orderBy(desc(orders.createdAt));
    
    return result as (Order & { customer: Customer; event: Event })[];
  }

  async getAllEvents(): Promise<Event[]> {
    const result = await db.select().from(events).orderBy(desc(events.createdAt));
    return result;
  }

  async getAdminStats(): Promise<{
    totalCustomers: number;
    totalOrders: number;
    activeEvents: number;
    totalRevenue: number;
  }> {
    const [customersCount] = await db.select({ count: count() }).from(customers);
    const [ordersCount] = await db.select({ count: count() }).from(orders);
    const [activeEventsCount] = await db.select({ count: count() }).from(events).where(eq(events.available, true));
    const [revenue] = await db.select({ total: sum(orders.totalCost) }).from(orders).where(ne(orders.status, 'cancelled'));

    return {
      totalCustomers: customersCount.count,
      totalOrders: ordersCount.count,
      activeEvents: activeEventsCount.count,
      totalRevenue: Number(revenue.total) || 0,
    };
  }

  // Coupons
  async getCouponByCode(code: string): Promise<Coupon | undefined> {
    const result = await db.select().from(coupons).where(eq(coupons.code, code));
    return result[0];
  }

  async createCoupon(insertCoupon: InsertCoupon): Promise<Coupon> {
    const result = await db.insert(coupons).values(insertCoupon).returning();
    return result[0];
  }

  // Admin Order Management Functions
  async getAllOrdersWithDetails(filters: any = {}): Promise<any[]> {
    console.log('Filters received:', filters);
    let query = db.select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      eventId: orders.eventId,
      customerId: orders.customerId,
      addressId: orders.addressId,
      kitQuantity: orders.kitQuantity,
      deliveryCost: orders.deliveryCost,
      extraKitsCost: orders.extraKitsCost,
      donationCost: orders.donationCost,
      discountAmount: orders.discountAmount,
      couponCode: orders.couponCode,
      totalCost: orders.totalCost,
      paymentMethod: orders.paymentMethod,
      status: orders.status,
      donationAmount: orders.donationAmount,
      createdAt: orders.createdAt,
      customer: {
        id: customers.id,
        name: customers.name,
        cpf: customers.cpf,
        email: customers.email,
        phone: customers.phone,
      },
      event: {
        id: events.id,
        name: events.name,
        date: events.date,
        location: events.location,
        city: events.city,
        state: events.state,
      },
      address: {
        id: addresses.id,
        street: addresses.street,
        number: addresses.number,
        complement: addresses.complement,
        neighborhood: addresses.neighborhood,
        city: addresses.city,
        state: addresses.state,
        zipCode: addresses.zipCode,
      },
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .leftJoin(events, eq(orders.eventId, events.id))
    .leftJoin(addresses, eq(orders.addressId, addresses.id));

    // Apply filters - fix by creating proper where conditions
    const conditions = [];
    if (filters.status && filters.status !== 'all') {
      conditions.push(eq(orders.status, filters.status));
    }
    if (filters.eventId && !isNaN(Number(filters.eventId))) {
      conditions.push(eq(orders.eventId, Number(filters.eventId)));
    }
    if (filters.orderNumber) {
      conditions.push(eq(orders.orderNumber, filters.orderNumber));
    }
    
    let result;
    if (conditions.length > 0) {
      result = await query.where(and(...conditions)).orderBy(desc(orders.createdAt));
    } else {
      result = await query.orderBy(desc(orders.createdAt));
    }
    return result;
  }

  async getOrderByOrderNumber(orderNumber: string): Promise<any | undefined> {
    const [order] = await db.select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      eventId: orders.eventId,
      customerId: orders.customerId,
      addressId: orders.addressId,
      kitQuantity: orders.kitQuantity,
      deliveryCost: orders.deliveryCost,
      extraKitsCost: orders.extraKitsCost,
      donationCost: orders.donationCost,
      discountAmount: orders.discountAmount,
      couponCode: orders.couponCode,
      totalCost: orders.totalCost,
      paymentMethod: orders.paymentMethod,
      status: orders.status,
      donationAmount: orders.donationAmount,
      createdAt: orders.createdAt,
      customer: {
        id: customers.id,
        name: customers.name,
        cpf: customers.cpf,
        email: customers.email,
        phone: customers.phone,
      },
      event: {
        id: events.id,
        name: events.name,
        date: events.date,
        location: events.location,
        city: events.city,
        state: events.state,
        pickupZipCode: events.pickupZipCode,
        fixedPrice: events.fixedPrice,
        extraKitPrice: events.extraKitPrice,
        donationRequired: events.donationRequired,
        donationAmount: events.donationAmount,
        donationDescription: events.donationDescription,
      },
      address: {
        id: addresses.id,
        label: addresses.label,
        street: addresses.street,
        number: addresses.number,
        complement: addresses.complement,
        neighborhood: addresses.neighborhood,
        city: addresses.city,
        state: addresses.state,
        zipCode: addresses.zipCode,
      },
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .leftJoin(events, eq(orders.eventId, events.id))
    .leftJoin(addresses, eq(orders.addressId, addresses.id))
    .where(eq(orders.orderNumber, orderNumber));
    
    return order;
  }

  async getOrderWithFullDetails(orderId: number): Promise<any | undefined> {
    const [order] = await db.select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      eventId: orders.eventId,
      customerId: orders.customerId,
      addressId: orders.addressId,
      kitQuantity: orders.kitQuantity,
      deliveryCost: orders.deliveryCost,
      extraKitsCost: orders.extraKitsCost,
      donationCost: orders.donationCost,
      discountAmount: orders.discountAmount,
      couponCode: orders.couponCode,
      totalCost: orders.totalCost,
      paymentMethod: orders.paymentMethod,
      status: orders.status,
      donationAmount: orders.donationAmount,
      createdAt: orders.createdAt,
      customer: {
        id: customers.id,
        name: customers.name,
        cpf: customers.cpf,
        email: customers.email,
        phone: customers.phone,
      },
      event: {
        id: events.id,
        name: events.name,
        date: events.date,
        location: events.location,
        city: events.city,
        state: events.state,
        pickupZipCode: events.pickupZipCode,
        fixedPrice: events.fixedPrice,
        extraKitPrice: events.extraKitPrice,
        donationRequired: events.donationRequired,
        donationAmount: events.donationAmount,
        donationDescription: events.donationDescription,
      },
      address: {
        id: addresses.id,
        label: addresses.label,
        street: addresses.street,
        number: addresses.number,
        complement: addresses.complement,
        neighborhood: addresses.neighborhood,
        city: addresses.city,
        state: addresses.state,
        zipCode: addresses.zipCode,
      },
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .leftJoin(events, eq(orders.eventId, events.id))
    .leftJoin(addresses, eq(orders.addressId, addresses.id))
    .where(eq(orders.id, orderId));

    if (!order) return undefined;

    // Get kits for this order
    const orderKits = await db.select().from(kits).where(eq(kits.orderId, orderId));

    return {
      ...order,
      kits: orderKits,
    };
  }

  async addStatusHistory(orderId: number, previousStatus: string | null, newStatus: string, changedBy: string, changedByName?: string, reason?: string): Promise<OrderStatusHistory> {
    const [history] = await db.insert(orderStatusHistory).values({
      orderId,
      previousStatus,
      newStatus,
      changedBy,
      changedByName,
      reason
    }).returning();
    
    return history;
  }

  async getOrderStatusHistory(orderId: number): Promise<OrderStatusHistory[]> {
    return await db.select()
      .from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, orderId))
      .orderBy(desc(orderStatusHistory.createdAt));
  }

  async updateOrderStatus(orderId: number | string, status: string, changedBy: string = 'system', changedByName?: string, reason?: string): Promise<Order | undefined> {
    let targetOrderId: number;
    let previousStatus: string | null = null;
    
    // If orderId is a string (orderNumber), find the order by orderNumber first
    if (typeof orderId === 'string') {
      const existingOrder = await db.select()
        .from(orders)
        .where(eq(orders.orderNumber, orderId))
        .limit(1);
      
      if (existingOrder.length === 0) {
        throw new Error(`Order not found with orderNumber: ${orderId}`);
      }
      
      targetOrderId = existingOrder[0].id;
      previousStatus = existingOrder[0].status;
    } else {
      // Get current status first
      const currentOrder = await db.select({ status: orders.status })
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);
      
      if (currentOrder.length === 0) {
        throw new Error(`Order not found with id: ${orderId}`);
      }
      
      targetOrderId = orderId;
      previousStatus = currentOrder[0].status;
    }
    
    // Only update if status actually changed
    if (previousStatus !== status) {
      // Add to status history
      await this.addStatusHistory(targetOrderId, previousStatus, status, changedBy, changedByName, reason);
      
      // Update order status
      const [order] = await db
        .update(orders)
        .set({ status })
        .where(eq(orders.id, targetOrderId))
        .returning();
      
      return order;
    }
    
    // Return current order if status didn't change
    const [order] = await db.select().from(orders).where(eq(orders.id, targetOrderId)).limit(1);
    return order;
  }

  async updateOrder(orderId: number, updateData: Partial<InsertOrder>): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, orderId))
      .returning();
    return order;
  }

  async getOrderStats(): Promise<{
    totalOrders: number;
    confirmedOrders: number;
    awaitingPayment: number;
    cancelledOrders: number;
    inTransitOrders: number;
    deliveredOrders: number;
    totalRevenue: number;
  }> {
    // Get total orders count
    const [totalOrdersResult] = await db.select({ count: count() }).from(orders);
    
    // Get order counts by status
    const [confirmedResult] = await db.select({ count: count() }).from(orders).where(eq(orders.status, 'confirmado'));
    const [awaitingResult] = await db.select({ count: count() }).from(orders).where(eq(orders.status, 'aguardando_pagamento'));
    const [cancelledResult] = await db.select({ count: count() }).from(orders).where(eq(orders.status, 'cancelado'));
    const [deliveredResult] = await db.select({ count: count() }).from(orders).where(eq(orders.status, 'entregue'));
    
    // In transit includes both "em_transito" and "kits_sendo_retirados"
    const [inTransitResult] = await db.select({ count: count() }).from(orders).where(
      sql`${orders.status} IN ('em_transito', 'kits_sendo_retirados')`
    );
    
    // Get total revenue (excluding cancelled orders)
    const [revenueResult] = await db.select({ 
      total: sum(orders.totalCost) 
    }).from(orders).where(ne(orders.status, 'cancelado'));

    return {
      totalOrders: totalOrdersResult.count,
      confirmedOrders: confirmedResult.count,
      awaitingPayment: awaitingResult.count,
      cancelledOrders: cancelledResult.count,
      inTransitOrders: inTransitResult.count,
      deliveredOrders: deliveredResult.count,
      totalRevenue: Number(revenueResult.total) || 0,
    };
  }

  // Price calculation - provisório
  async calculateDeliveryPrice(fromZipCode: string, toZipCode: string): Promise<number> {
    // Algoritmo provisório baseado na diferença dos CEPs
    const from = parseInt(fromZipCode.substring(0, 5));
    const to = parseInt(toZipCode.substring(0, 5));
    const distance = Math.abs(from - to);
    
    // Preço base + valor por distância (simulação)
    const basePrice = 15.00;
    const pricePerKm = 0.05;
    
    return basePrice + (distance * pricePerKm);
  }

  // Admin customer management methods
  async getAllCustomersWithAddresses(): Promise<(Customer & { addresses: Address[]; orderCount: number })[]> {
    console.log("🔍 Getting all customers with addresses...");
    const customersData = await db.select().from(customers).orderBy(desc(customers.createdAt));
    console.log(`Found ${customersData.length} customers`);
    
    const result = [];
    for (const customer of customersData) {
      const customerAddresses = await db.select().from(addresses).where(eq(addresses.customerId, customer.id));
      const [orderCountResult] = await db.select({ count: count() }).from(orders).where(eq(orders.customerId, customer.id));
      
      console.log(`Customer ${customer.name}: ${customerAddresses.length} addresses, ${orderCountResult.count} orders`);
      
      result.push({
        ...customer,
        addresses: customerAddresses,
        orderCount: Number(orderCountResult.count)
      });
    }
    
    console.log("✅ Customer data prepared, sample:", JSON.stringify(result[0], null, 2));
    return result;
  }

  async createCustomerWithAddresses(customerData: any): Promise<{ customer: Customer; addresses: Address[] }> {
    const { addresses: addressesData, ...customerInfo } = customerData;
    
    // Create customer first
    const [customer] = await db.insert(customers).values(customerInfo).returning();
    
    // Create addresses for the customer
    const createdAddresses = [];
    for (const addressData of addressesData) {
      const [address] = await db.insert(addresses).values({
        ...addressData,
        customerId: customer.id
      }).returning();
      createdAddresses.push(address);
    }
    
    return { customer, addresses: createdAddresses };
  }

  async updateCustomer(id: number, customerData: any): Promise<Customer | undefined> {
    const [customer] = await db
      .update(customers)
      .set(customerData)
      .where(eq(customers.id, id))
      .returning();
    return customer || undefined;
  }

  async deleteCustomer(id: number): Promise<boolean> {
    // First delete all addresses for this customer
    await db.delete(addresses).where(eq(addresses.customerId, id));
    
    // Then delete the customer
    const result = await db.delete(customers).where(eq(customers.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getCustomerWithAddresses(id: number): Promise<(Customer & { addresses: Address[] }) | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    if (!customer) return undefined;
    
    const customerAddresses = await db.select().from(addresses).where(eq(addresses.customerId, id));
    
    return {
      ...customer,
      addresses: customerAddresses
    };
  }

  async getAllCustomersWithAddressesPaginated(page: number, pageLimit: number, search?: string): Promise<{
    customers: (Customer & { addresses: Address[]; orderCount: number })[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    const offset_value = (page - 1) * pageLimit;
    
    // Build search conditions
    const baseQuery = db.select().from(customers);
    const baseCountQuery = db.select({ count: count() }).from(customers);
    
    let query: any = baseQuery;
    let countQuery: any = baseCountQuery;
    
    if (search && search.trim()) {
      const searchCondition = or(
        like(customers.name, `%${search}%`),
        like(customers.cpf, `%${search}%`),
        like(customers.email, `%${search}%`)
      );
      query = baseQuery.where(searchCondition);
      countQuery = baseCountQuery.where(searchCondition);
    }
    
    // Get total count
    const [totalResult] = await countQuery;
    const total = totalResult.count;
    
    // Get paginated customers
    const customersData = await query
      .orderBy(desc(customers.createdAt))
      .limit(pageLimit)
      .offset(offset_value);
    
    // Get addresses and order count for each customer
    const result = [];
    for (const customer of customersData) {
      const customerAddresses = await db.select().from(addresses).where(eq(addresses.customerId, customer.id));
      const [orderCountResult] = await db.select({ count: count() }).from(orders).where(eq(orders.customerId, customer.id));
      
      result.push({
        ...customer,
        addresses: customerAddresses,
        orderCount: Number(orderCountResult.count)
      });
    }
    
    const totalPages = Math.ceil(total / pageLimit);
    
    return {
      customers: result,
      total,
      totalPages,
      currentPage: page
    };
  }

  async getAllOrdersWithDetailsPaginated(page: number, pageLimit: number, filters?: any): Promise<{
    orders: any[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    // Use the existing getAllOrdersWithDetails method and paginate in memory
    // This is more reliable than complex Drizzle queries with pagination issues
    const allOrders = await this.getAllOrdersWithDetails(filters);
    
    const total = allOrders.length;
    const startIndex = (page - 1) * pageLimit;
    const endIndex = startIndex + pageLimit;
    const paginatedOrders = allOrders.slice(startIndex, endIndex);
    
    const totalPages = Math.ceil(total / pageLimit);
    
    return {
      orders: paginatedOrders,
      total,
      totalPages,
      currentPage: page
    };
  }
}

// Mock implementation for development without database
class MockStorage implements IStorage {
  private events: Event[] = [
    {
      id: 1,
      name: "Maratona de São Paulo 2024",
      date: "2024-12-15",
      location: "Parque do Ibirapuera",
      city: "São Paulo",
      state: "SP",
      pickupZipCode: "04094050",
      fixedPrice: null,
      extraKitPrice: "8.00",
      donationRequired: false,
      donationDescription: null,
      donationAmount: null,
      available: true,
      createdAt: new Date("2024-01-15T10:00:00Z")
    }
  ];
  
  private customers: Customer[] = [];
  private addresses: Address[] = [];
  private orders: (Order & { customer: Customer; event: Event })[] = [];
  private kits: Kit[] = [];

  async getEvents(): Promise<Event[]> {
    return this.events;
  }

  async getEvent(id: number): Promise<Event | undefined> {
    return this.events.find(e => e.id === id);
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const newEvent = { ...event, id: Date.now(), createdAt: new Date() } as Event;
    this.events.push(newEvent);
    return newEvent;
  }

  async updateEvent(id: number, eventData: Partial<InsertEvent>): Promise<Event | undefined> {
    const index = this.events.findIndex(e => e.id === id);
    if (index === -1) return undefined;
    
    this.events[index] = { ...this.events[index], ...eventData };
    return this.events[index];
  }

  async deleteEvent(id: number): Promise<boolean> {
    const index = this.events.findIndex(e => e.id === id);
    if (index === -1) return false;
    
    this.events.splice(index, 1);
    return true;
  }

  async getOrdersByEventId(eventId: number): Promise<(Order & { customer: Customer })[]> {
    return this.orders.filter(o => o.eventId === eventId);
  }

  async getCustomerByCredentials(cpf: string, birthDate: string): Promise<Customer | undefined> {
    return this.customers.find(c => c.cpf === cpf && c.birthDate === birthDate);
  }

  async getCustomerByCPF(cpf: string): Promise<Customer | undefined> {
    return this.customers.find(c => c.cpf === cpf);
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.find(c => c.id === id);
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const newCustomer = { ...customer, id: Date.now(), createdAt: new Date() } as Customer;
    this.customers.push(newCustomer);
    return newCustomer;
  }

  async createAddress(address: InsertAddress): Promise<Address> {
    const newAddress = { ...address, id: Date.now(), createdAt: new Date() } as Address;
    this.addresses.push(newAddress);
    return newAddress;
  }

  async getAddressesByCustomerId(customerId: number): Promise<Address[]> {
    return this.addresses.filter(a => a.customerId === customerId);
  }

  async getAddress(id: number): Promise<Address | undefined> {
    return this.addresses.find(a => a.id === id);
  }

  async updateAddress(id: number, addressData: Partial<InsertAddress>): Promise<Address> {
    const index = this.addresses.findIndex(a => a.id === id);
    if (index === -1) throw new Error("Address not found");
    
    this.addresses[index] = { ...this.addresses[index], ...addressData };
    return this.addresses[index];
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const newOrder = { 
      ...order, 
      id: Date.now(), 
      orderNumber: `ORD-${Date.now()}`,
      status: "confirmado" as const,
      createdAt: new Date(), 
      updatedAt: new Date() 
    } as Order;
    
    // Para a MockStorage, precisamos simular a adição de customer e event
    const customer = await this.getCustomer(newOrder.customerId);
    const event = await this.getEvent(newOrder.eventId);

    this.orders.push({ ...newOrder, customer, event } as Order & { customer: Customer; event: Event });
    return newOrder;
  }

  async getOrderById(id: number): Promise<Order | undefined> {
    return this.orders.find(o => o.id === id);
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    return this.orders.find(o => o.orderNumber === orderNumber);
  }

  async getOrderByIdempotencyKey(idempotencyKey: string): Promise<Order | undefined> {
    return this.orders.find(o => (o as any).idempotencyKey === idempotencyKey);
  }

  async getOrdersByCustomerId(customerId: number): Promise<Order[]> {
    return this.orders.filter(o => o.customerId === customerId);
  }

  async createKit(kit: InsertKit): Promise<Kit> {
    const newKit = { ...kit, id: Date.now(), createdAt: new Date(), updatedAt: new Date() } as Kit;
    this.kits.push(newKit);
    return newKit;
  }

  async getKitsByOrderId(orderId: number): Promise<Kit[]> {
    return this.kits.filter(k => k.orderId === orderId);
  }

  async getAllCustomers(): Promise<Customer[]> {
    return this.customers;
  }

  async getAllCustomersWithAddresses(): Promise<(Customer & { addresses: Address[]; orderCount: number })[]> {
    return this.customers.map(customer => ({
      ...customer,
      addresses: this.addresses.filter(a => a.customerId === customer.id),
      orderCount: this.orders.filter(o => o.customerId === customer.id).length
    }));
  }

  async getAllCustomersWithAddressesPaginated(page: number, pageLimit: number, search?: string): Promise<{
    customers: (Customer & { addresses: Address[]; orderCount: number })[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    let filteredCustomers = this.customers;
    
    if (search && search.trim()) {
      const searchLower = search.toLowerCase();
      filteredCustomers = this.customers.filter(customer => 
        customer.name.toLowerCase().includes(searchLower) ||
        customer.cpf.includes(search) ||
        customer.email.toLowerCase().includes(searchLower)
      );
    }
    
    const total = filteredCustomers.length;
    const totalPages = Math.ceil(total / pageLimit);
    const offset = (page - 1) * pageLimit;
    const paginatedCustomers = filteredCustomers.slice(offset, offset + pageLimit);
    
    const result = paginatedCustomers.map(customer => ({
      ...customer,
      addresses: this.addresses.filter(a => a.customerId === customer.id),
      orderCount: this.orders.filter(o => o.customerId === customer.id).length
    }));
    
    return {
      customers: result,
      total,
      totalPages,
      currentPage: page
    };
  }

  async getAllOrdersWithDetailsPaginated(page: number, pageLimit: number, filters?: any): Promise<{
    orders: any[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    let filteredOrders = this.orders;
    
    // Apply filters
    if (filters?.status && filters.status !== 'all') {
      filteredOrders = filteredOrders.filter(order => order.status === filters.status);
    }
    if (filters?.eventId) {
      filteredOrders = filteredOrders.filter(order => order.eventId === parseInt(filters.eventId));
    }
    if (filters?.orderNumber) {
      filteredOrders = filteredOrders.filter(order => 
        order.orderNumber.includes(filters.orderNumber)
      );
    }
    if (filters?.customerName) {
      filteredOrders = filteredOrders.filter(order => 
        order.customer.name.toLowerCase().includes(filters.customerName.toLowerCase())
      );
    }
    
    const total = filteredOrders.length;
    const totalPages = Math.ceil(total / pageLimit);
    const offset = (page - 1) * pageLimit;
    const paginatedOrders = filteredOrders.slice(offset, offset + pageLimit);
    
    // Add kits to each order
    const ordersWithKits = paginatedOrders.map(order => ({
      ...order,
      kits: this.kits.filter(kit => kit.orderId === order.id)
    }));
    
    return {
      orders: ordersWithKits,
      total,
      totalPages,
      currentPage: page
    };
  }

  async getAllOrders(): Promise<(Order & { customer: Customer; event: Event })[]> {
    return this.orders;
  }

  async getAllEvents(): Promise<Event[]> {
    return this.events;
  }

  async getAdminStats(): Promise<{ totalCustomers: number; totalOrders: number; activeEvents: number; totalRevenue: number; }> {
    return {
      totalCustomers: this.customers.length,
      totalOrders: this.orders.length,
      activeEvents: this.events.filter(e => e.available).length,
      totalRevenue: this.orders.reduce((sum, o) => sum + Number(o.totalCost), 0)
    };
  }

  async getCouponByCode(code: string): Promise<Coupon | undefined> {
    return undefined;
  }

  async createCoupon(coupon: InsertCoupon): Promise<Coupon> {
    const newCoupon = { 
      ...coupon, 
      id: Date.now(), 
      usageCount: 0,
      createdAt: new Date()
    } as Coupon;
    return newCoupon;
  }

  async calculateDeliveryPrice(fromZipCode: string, toZipCode: string): Promise<number> {
    return 15.50;
  }

  async getOrderStats(): Promise<{
    totalOrders: number;
    confirmedOrders: number;
    awaitingPayment: number;
    cancelledOrders: number;
    inTransitOrders: number;
    deliveredOrders: number;
    totalRevenue: number;
  }> {
    // Get order counts by status from database
    const totalOrdersResult = await db.select({ count: count() }).from(orders);
    const totalOrders = totalOrdersResult[0]?.count || 0;

    const confirmedOrdersResult = await db.select({ count: count() }).from(orders).where(eq(orders.status, 'confirmado'));
    const confirmedOrders = confirmedOrdersResult[0]?.count || 0;

    const awaitingPaymentResult = await db.select({ count: count() }).from(orders).where(eq(orders.status, 'aguardando_pagamento'));
    const awaitingPayment = awaitingPaymentResult[0]?.count || 0;

    const cancelledOrdersResult = await db.select({ count: count() }).from(orders).where(eq(orders.status, 'cancelado'));
    const cancelledOrders = cancelledOrdersResult[0]?.count || 0;

    const inTransitOrdersResult = await db.select({ count: count() }).from(orders).where(eq(orders.status, 'em_transito'));
    const inTransitOrders = inTransitOrdersResult[0]?.count || 0;

    const deliveredOrdersResult = await db.select({ count: count() }).from(orders).where(eq(orders.status, 'entregue'));
    const deliveredOrders = deliveredOrdersResult[0]?.count || 0;

    // Calculate total revenue
    const revenueResult = await db.select({ 
      total: sql<number>`COALESCE(SUM(CAST(${orders.totalCost} AS DECIMAL)), 0)`
    }).from(orders);
    const totalRevenue = Number(revenueResult[0]?.total || 0);

    return {
      totalOrders,
      confirmedOrders,
      awaitingPayment,
      cancelledOrders,
      inTransitOrders,
      deliveredOrders,
      totalRevenue,
    };
  }



  async createCustomerWithAddresses(customerData: any): Promise<{ customer: Customer; addresses: Address[] }> {
    // Start a transaction to ensure data consistency
    const { name, cpf, birthDate, email, phone, addresses: addressesData } = customerData;
    
    // Create customer
    const [customer] = await db
      .insert(customers)
      .values({
        name,
        cpf,
        birthDate,
        email,
        phone,
      })
      .returning();
    
    // Create addresses
    const createdAddresses = await Promise.all(
      addressesData.map(async (addressData: any) => {
        const [address] = await db
          .insert(addresses)
          .values({
            ...addressData,
            customerId: customer.id,
          })
          .returning();
        return address;
      })
    );
    
    return {
      customer,
      addresses: createdAddresses,
    };
  }

  async updateCustomer(id: number, customerData: any): Promise<Customer | undefined> {
    const [customer] = await db
      .update(customers)
      .set(customerData)
      .where(eq(customers.id, id))
      .returning();
    
    return customer || undefined;
  }

  async deleteCustomer(id: number): Promise<boolean> {
    // First delete all addresses
    await db.delete(addresses).where(eq(addresses.customerId, id));
    
    // Then delete customer
    const result = await db.delete(customers).where(eq(customers.id, id));
    
    return (result.rowCount || 0) > 0;
  }

  async getCustomerWithAddresses(id: number): Promise<(Customer & { addresses: Address[] }) | undefined> {
    // Get customer
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    
    if (!customer) {
      return undefined;
    }
    
    // Get addresses for this customer
    const customerAddresses = await db
      .select()
      .from(addresses)
      .where(eq(addresses.customerId, id));
    
    return {
      ...customer,
      addresses: customerAddresses,
    };
  }
}

export const storage = new DatabaseStorage();


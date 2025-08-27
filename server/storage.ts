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
  CepZone,
  InsertCepZone,
  WhatsappMessage,
  InsertWhatsappMessage,
  WhatsappSettings,
  InsertWhatsappSettings,
  events,
  customers,
  addresses,
  orders,
  kits,
  coupons,
  orderStatusHistory,
  emailLogs,
  cepZones,
  adminUsers,
  whatsappMessages,
  whatsappSettings,
  insertEmailLogSchema
} from "@shared/schema";
import { db } from "./db";
import { eq, and, count, sum, desc, ne, sql, like, or, asc, inArray } from "drizzle-orm";

export interface IStorage {
  // Events
  getEvents(): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;

  // Customers
  getCustomerByCredentials(cpf: string, birthDate: string): Promise<Customer | undefined>;
  getCustomerByCPF(cpf: string): Promise<Customer | undefined>;
  getCustomerById(id: number): Promise<Customer | undefined>;
  getCustomer(id: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;

  // Addresses
  createAddress(address: InsertAddress): Promise<Address>;
  getAddressesByCustomerId(customerId: number): Promise<Address[]>;
  getAddress(id: number): Promise<Address | undefined>;
  updateAddress(id: number, address: Partial<InsertAddress>): Promise<Address>;
  deleteAddress(id: number): Promise<void>;

  // Orders
  createOrder(order: InsertOrder): Promise<Order>;
  getOrderById(id: number): Promise<Order | undefined>;
  getOrderByNumber(orderNumber: string): Promise<Order | undefined>;
  getOrderByIdempotencyKey(idempotencyKey: string): Promise<Order | undefined>;
  getOrdersByCustomerId(customerId: number, page?: number, limit?: number): Promise<{ orders: Order[]; total: number; hasMore: boolean }>;

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

  // CEP Zones
  getCepZones(activeOnly?: boolean): Promise<CepZone[]>;
  getCepZoneById(id: number): Promise<CepZone | undefined>;
  createCepZone(zone: InsertCepZone): Promise<CepZone>;
  updateCepZone(id: number, zone: Partial<InsertCepZone>): Promise<CepZone | undefined>;
  deleteCepZone(id: number): Promise<boolean>;
  checkCepZoneOverlap(cepStart: string, cepEnd: string, excludeId?: number): Promise<CepZone | null>;
  
  // Price calculation
  calculateDeliveryPrice(fromZipCode: string, toZipCode: string): Promise<number>;

  // Additional methods needed for event administration
  updateEvent(id: number, eventData: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<boolean>;
  getOrdersByEventId(eventId: number): Promise<(Order & { customer: Customer })[]>;
  
  // Event stock control methods
  updateEventStock(eventId: number, increment: number): Promise<Event>;
  checkEventAvailability(eventId: number, requestedQuantity: number): Promise<{
    available: boolean;
    remainingStock: number | null;
    status: string;
  }>;
  updateEventStatus(eventId: number, status: string): Promise<Event>;
  
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

  // Filtered order statistics
  getFilteredOrderStats(filters?: any): Promise<{
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

  // Order with full details including customer, event, address, kits
  getFullOrderById(id: number): Promise<any>;
  getOrderByIdWithDetails(id: number): Promise<any>;
  getOrderWithFullDetails(id: number): Promise<any>;
  updateOrderStatus(orderId: number | string, status: string, changedBy?: string, changedByName?: string, reason?: string, bulkOperationId?: string, sendEmail?: boolean): Promise<Order | undefined>;

  // Email logs
  createEmailLog(emailData: any): Promise<any>;
  getEmailLogs(filters?: any): Promise<any[]>;
  
  // Admin users email notifications
  getAdminUsersWithEmailNotifications(): Promise<{ id: number; email: string; fullName: string }[]>;
  
  // WhatsApp methods
  createWhatsappMessage(message: InsertWhatsappMessage): Promise<WhatsappMessage>;
  updateWhatsappMessage(id: number, updates: Partial<{ status: string; jobId?: string; errorMessage?: string; sentAt?: Date }>): Promise<void>;
  getWhatsappMessages(limit: number, offset: number): Promise<{ messages: WhatsappMessage[]; total: number }>;
  getLastWhatsappMessageId(): Promise<number>;
  getActiveWhatsappTemplate(): Promise<WhatsappSettings | null>;
  createWhatsappTemplate(template: InsertWhatsappSettings): Promise<WhatsappSettings>;
  updateWhatsappTemplate(id: number, template: Partial<InsertWhatsappSettings>): Promise<WhatsappSettings | undefined>;
  
  // Report Preview Methods
  getKitsDataForPreview(eventId: number, statusFilter?: string[], limit?: number): Promise<{totalCount: number, sample: any[]}>;
  getCircuitDataForPreview(eventId: number, zoneIds?: number[], limit?: number): Promise<{totalCount: number, sample: any[]}>;
  getOrdersDataForPreview(eventId: number, statusFilter?: string[], zoneIds?: number[], limit?: number): Promise<{totalCount: number, sample: any[], totalRevenue: number, zonesSummary: any[]}>;

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

  async getCustomerById(id: number): Promise<Customer | undefined> {
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id));
    return customer || undefined;
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.getCustomerById(id);
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

  async deleteAddress(id: number): Promise<void> {
    await db.delete(addresses).where(eq(addresses.id, id));
  }

  /**
   * Generates unique order number with format: KR{YY}-{NNNN} or KR{YY}-{TIMESTAMP}
   * - KR: Fixed prefix
   * - YY: Last 2 digits of current year
   * - Nnnn: Sequential or timestamp-based number for uniqueness
   * - Uses timestamp + random approach to avoid race conditions
   */
  async generateUniqueOrderNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const yearSuffix = String(currentYear).slice(-2); // Last 2 digits (25, 26, etc.)
    
    // Maximum attempts to prevent infinite loops
    const maxAttempts = 50;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        let newOrderNumber: string;
        
        if (attempt < 10) {
          // First 10 attempts: Try sequential numbering
          const yearPrefix = `KR${yearSuffix}-`;
          
          // Query orders that match current year pattern
          const existingOrders = await db
            .select({ orderNumber: orders.orderNumber })
            .from(orders)
            .where(sql`${orders.orderNumber} LIKE ${yearPrefix + '%'}`)
            .orderBy(sql`${orders.orderNumber} DESC`)
            .limit(1);

          let nextSequential: number;
          const startingNumber = currentYear === 2025 ? 1000 : 1;
          
          if (existingOrders.length === 0) {
            nextSequential = startingNumber;
          } else {
            const lastOrderNumber = existingOrders[0].orderNumber;
            const sequentialPart = lastOrderNumber.split('-')[1];
            
            if (sequentialPart && !isNaN(parseInt(sequentialPart))) {
              nextSequential = parseInt(sequentialPart) + 1;
            } else {
              nextSequential = startingNumber;
            }
          }
          
          const formattedSequential = String(nextSequential).padStart(4, '0');
          newOrderNumber = `KR${yearSuffix}-${formattedSequential}`;
        } else {
          // After 10 attempts: Use timestamp + random to avoid race conditions
          const timestamp = Date.now();
          const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
          const timestampPart = String(timestamp).slice(-5); // Last 5 digits of timestamp
          newOrderNumber = `KR${yearSuffix}-${timestampPart}${randomSuffix}`;
          
          console.log(`⚡ Using timestamp-based order number generation: ${newOrderNumber} (attempt ${attempt + 1})`);
        }
        
        // Database-level uniqueness check with INSERT attempt
        try {
          // Try to insert a temporary record to test uniqueness
          const testOrder = await db
            .select({ orderNumber: orders.orderNumber })
            .from(orders)
            .where(eq(orders.orderNumber, newOrderNumber))
            .limit(1);
            
          if (testOrder.length === 0) {
            console.log(`✅ Generated unique order number: ${newOrderNumber} (attempt ${attempt + 1})`);
            return newOrderNumber;
          } else {
            console.warn(`⚠️ Order number ${newOrderNumber} already exists, trying again (attempt ${attempt + 1})`);
            continue;
          }
        } catch (error: any) {
          if (error.code === '23505') {
            // Unique constraint violation - try again
            console.warn(`⚠️ Unique constraint violation for ${newOrderNumber}, retrying (attempt ${attempt + 1})`);
            continue;
          }
          throw error;
        }
        
      } catch (error) {
        console.error(`❌ Error generating order number (attempt ${attempt + 1}):`, error);
        
        // For the last attempt, use guaranteed unique timestamp-based number
        if (attempt === maxAttempts - 1) {
          const timestamp = Date.now();
          const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
          const guaranteedNumber = `KR${yearSuffix}-T${String(timestamp).slice(-4)}${random}`;
          
          console.log(`🆘 FINAL ATTEMPT: Generated order number ${guaranteedNumber}`);
          return guaranteedNumber;
        }
      }
    }
    
    // This should never happen, but just in case
    throw new Error('Failed to generate unique order number after maximum attempts');
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const maxRetries = 5;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const orderNumber = await this.generateUniqueOrderNumber();
        
        console.log(`🔄 Attempting to create order with number: ${orderNumber} (attempt ${attempt + 1})`);
        
        const [order] = await db
          .insert(orders)
          .values({
            ...insertOrder,
            orderNumber,
          })
          .returning();
        
        console.log(`✅ Order created successfully: ${orderNumber} (ID: ${order.id})`);
        
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
        
      } catch (error: any) {
        if (error.code === '23505' && error.constraint === 'orders_order_number_unique') {
          console.warn(`⚠️ Unique constraint violation on attempt ${attempt + 1}, retrying...`);
          if (attempt === maxRetries - 1) {
            console.error(`🚨 Failed to create order after ${maxRetries} attempts due to unique constraint violations`);
            throw new Error('Failed to create order after multiple attempts due to concurrency. Please try again.');
          }
          // Add a small random delay to reduce collision probability
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
          continue;
        } else {
          console.error(`❌ Error creating order (attempt ${attempt + 1}):`, error);
          throw error;
        }
      }
    }
    
    throw new Error('Unexpected error: exceeded maximum retry attempts');
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

  async getOrdersByCustomerId(customerId: number, page = 1, limit = 5): Promise<{ orders: any[]; total: number; hasMore: boolean }> {
    try {
      // First get total count
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(eq(orders.customerId, customerId));
      
      const total = Number(count);
      const offset = (page - 1) * limit;
      
      // Then get paginated orders
      const ordersList = await db
        .select()
        .from(orders)
        .where(eq(orders.customerId, customerId))
        .orderBy(desc(orders.createdAt))
        .limit(limit)
        .offset(offset);
      
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
      
      const hasMore = offset + limit < total;
      
      console.log(`✅ Found ${result.length} orders for customer ${customerId} (page ${page}, total ${total})`);
      return { orders: result, total, hasMore };
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
      // PIX payment fields
      paymentId: orders.paymentId,
      pixQrCode: orders.pixQrCode,
      pixCopyPaste: orders.pixCopyPaste,
      pixExpirationDate: orders.pixExpirationDate,
      paymentCreatedAt: orders.paymentCreatedAt,
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



  // Alias method for compatibility
  async getFullOrderById(id: number): Promise<any> {
    return this.getOrderByIdWithDetails(id);
  }

  async getOrderWithFullDetails(id: number): Promise<any> {
    return this.getOrderByIdWithDetails(id);
  }

  async addStatusHistory(orderId: number, previousStatus: string | null, newStatus: string, changedBy: string, changedByName?: string, reason?: string, bulkOperationId?: string): Promise<OrderStatusHistory> {
    const [history] = await db.insert(orderStatusHistory).values({
      orderId,
      previousStatus,
      newStatus,
      changedBy,
      changedByName,
      reason,
      bulkOperationId
    }).returning();
    
    return history;
  }

  async getOrderStatusHistory(orderId: number): Promise<OrderStatusHistory[]> {
    return await db.select()
      .from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, orderId))
      .orderBy(desc(orderStatusHistory.createdAt));
  }

  async getOrderByIdWithDetails(orderId: number): Promise<any> {
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

    if (!order) return null;

    // Get kits for this order
    const orderKits = await db
      .select()
      .from(kits)
      .where(eq(kits.orderId, orderId));

    return {
      ...order,
      kits: orderKits
    };
  }

  async updateOrderStatus(orderId: number | string, status: string, changedBy: string = 'system', changedByName?: string, reason?: string, bulkOperationId?: string, sendEmail: boolean = true): Promise<Order | undefined> {
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
      await this.addStatusHistory(targetOrderId, previousStatus, status, changedBy, changedByName, reason, bulkOperationId);
      
      // Update order status
      const [order] = await db
        .update(orders)
        .set({ 
          status
        })
        .where(eq(orders.id, targetOrderId))
        .returning();

      // Send email notification based on the new status (async, don't block)
      // FIXED: Only send emails when sendEmail is true to prevent duplicates in bulk operations
      if (sendEmail) {
        this.sendStatusChangeEmail(targetOrderId, previousStatus, status, sendEmail).catch(error => {
          console.error(`❌ Failed to send status change email for order ${targetOrderId}:`, error);
        });
      } else {
        console.log(`📧 Skipping automatic email for order ${targetOrderId} - sendEmail is false`);
      }
      
      return order;
    }
    
    // Return current order if status didn't change
    const [order] = await db.select().from(orders).where(eq(orders.id, targetOrderId)).limit(1);
    return order;
  }

  private async sendStatusChangeEmail(orderId: number, previousStatus: string | null, newStatus: string, sendGenericUpdates: boolean = true): Promise<void> {
    try {
      const { EmailService } = await import("./email/email-service");
      const { EmailDataMapper } = await import("./email/email-data-mapper");
      
      const order = await this.getOrderByIdWithDetails(orderId);
      if (!order || !order.customer?.email) {
        console.log(`No email to send for order ${orderId} - customer not found or no email`);
        return;
      }

      const emailService = new EmailService(this);

      switch (newStatus) {
        case 'confirmado':
          // Always send service confirmation when payment is confirmed
          const serviceConfirmationData = EmailDataMapper.mapToServiceConfirmation(order);
          await emailService.sendServiceConfirmation(
            serviceConfirmationData,
            order.customer.email,
            order.id,
            order.customerId
          );
          console.log(`📧 Service confirmation email sent for order ${order.orderNumber}`);
          break;

        case 'em_transito':
          // Always send kit en route notification
          const kitEnRouteData = EmailDataMapper.mapToKitEnRoute(order);
          await emailService.sendKitEnRoute(
            kitEnRouteData,
            order.customer.email,
            order.id,
            order.customerId
          );
          console.log(`📧 Kit en route email sent for order ${order.orderNumber}`);
          break;

        case 'entregue':
          // Always send delivery confirmation
          const deliveryConfirmationData = EmailDataMapper.mapToDeliveryConfirmation(order);
          await emailService.sendDeliveryConfirmation(
            deliveryConfirmationData,
            order.customer.email,
            order.id,
            order.customerId
          );
          console.log(`📧 Delivery confirmation email sent for order ${order.orderNumber}`);
          break;

        case 'kits_sendo_retirados':
        case 'cancelado':
        case 'aguardando_pagamento':
          // Send generic status update for these statuses only if requested
          if (sendGenericUpdates) {
            const statusUpdateData = EmailDataMapper.mapToStatusUpdate(order, previousStatus || '', newStatus);
            await emailService.sendStatusUpdateEmail(
              statusUpdateData,
              order.customer.email,
              order.id,
              order.customerId
            );
            console.log(`📧 Status update email sent for order ${order.orderNumber}: ${newStatus}`);
          } else {
            console.log(`📧 Skipping generic status update email for order ${order.orderNumber}: ${newStatus} (sendGenericUpdates: false)`);
          }
          break;

        default:
          console.log(`No specific email template for status: ${newStatus}`);
          break;
      }
    } catch (error) {
      console.error(`❌ Error sending status change email for order ${orderId}:`, error);
      throw error;
    }
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

  async getFilteredOrderStats(filters?: any): Promise<{
    totalOrders: number;
    confirmedOrders: number;
    awaitingPayment: number;
    cancelledOrders: number;
    inTransitOrders: number;
    deliveredOrders: number;
    totalRevenue: number;
  }> {
    // Build where conditions based on filters
    const whereConditions = [];
    
    if (filters?.status && filters.status !== 'all') {
      whereConditions.push(eq(orders.status, filters.status));
    }
    
    if (filters?.eventId) {
      whereConditions.push(eq(orders.eventId, parseInt(filters.eventId)));
    }
    
    if (filters?.orderNumber) {
      whereConditions.push(sql`${orders.orderNumber} ILIKE ${`%${filters.orderNumber}%`}`);
    }

    // Add date filters
    if (filters?.startDate) {
      whereConditions.push(sql`DATE(${orders.createdAt}) >= ${filters.startDate}`);
    }
    
    if (filters?.endDate) {
      whereConditions.push(sql`DATE(${orders.createdAt}) <= ${filters.endDate}`);
    }

    // If we have a specific status filter that's not 'all', return stats only for that status
    if (filters?.status && filters.status !== 'all') {
      const mainWhere = whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0];
      
      const [filteredResult] = await db.select({ count: count(), total: sum(orders.totalCost) })
        .from(orders)
        .where(mainWhere);

      return {
        totalOrders: filteredResult.count,
        confirmedOrders: filters.status === 'confirmado' ? filteredResult.count : 0,
        awaitingPayment: filters.status === 'aguardando_pagamento' ? filteredResult.count : 0,
        cancelledOrders: filters.status === 'cancelado' ? filteredResult.count : 0,
        inTransitOrders: ['em_transito', 'kits_sendo_retirados'].includes(filters.status) ? filteredResult.count : 0,
        deliveredOrders: filters.status === 'entregue' ? filteredResult.count : 0,
        totalRevenue: filters.status === 'cancelado' ? 0 : Number(filteredResult.total) || 0,
      };
    }

    // For filters without specific status or with status 'all', calculate all statuses with filters
    const mainWhere = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    
    // Get total orders count with filters
    const [totalOrdersResult] = await db.select({ count: count() }).from(orders).where(mainWhere);
    
    // Get order counts by status with filters
    const confirmedWhere = mainWhere ? and(mainWhere, eq(orders.status, 'confirmado')) : eq(orders.status, 'confirmado');
    const [confirmedResult] = await db.select({ count: count() }).from(orders).where(confirmedWhere);
    
    const awaitingWhere = mainWhere ? and(mainWhere, eq(orders.status, 'aguardando_pagamento')) : eq(orders.status, 'aguardando_pagamento');
    const [awaitingResult] = await db.select({ count: count() }).from(orders).where(awaitingWhere);
    
    const cancelledWhere = mainWhere ? and(mainWhere, eq(orders.status, 'cancelado')) : eq(orders.status, 'cancelado');
    const [cancelledResult] = await db.select({ count: count() }).from(orders).where(cancelledWhere);
    
    const deliveredWhere = mainWhere ? and(mainWhere, eq(orders.status, 'entregue')) : eq(orders.status, 'entregue');
    const [deliveredResult] = await db.select({ count: count() }).from(orders).where(deliveredWhere);
    
    // In transit includes both "em_transito" and "kits_sendo_retirados"
    const inTransitWhere = mainWhere ? 
      and(mainWhere, sql`${orders.status} IN ('em_transito', 'kits_sendo_retirados')`) :
      sql`${orders.status} IN ('em_transito', 'kits_sendo_retirados')`;
    const [inTransitResult] = await db.select({ count: count() }).from(orders).where(inTransitWhere);
    
    // Get total revenue (excluding cancelled orders) with filters
    const revenueWhere = mainWhere ? 
      and(mainWhere, ne(orders.status, 'cancelado')) : 
      ne(orders.status, 'cancelado');
    const [revenueResult] = await db.select({ 
      total: sum(orders.totalCost) 
    }).from(orders).where(revenueWhere);

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

  // Email log methods
  async createEmailLog(emailData: {
    orderId?: number;
    customerId?: number;
    emailType: string;
    recipientEmail: string;
    subject: string;
    status: 'sent' | 'failed' | 'delivered' | 'bounced';
    sendgridMessageId?: string;
    errorMessage?: string;
  }): Promise<any> {
    const [emailLog] = await db.insert(emailLogs).values({
      orderId: emailData.orderId || null,
      customerId: emailData.customerId || null,
      emailType: emailData.emailType,
      recipientEmail: emailData.recipientEmail,
      subject: emailData.subject,
      status: emailData.status,
      sendgridMessageId: emailData.sendgridMessageId || null,
      errorMessage: emailData.errorMessage || null,
    }).returning();
    return emailLog;
  }

  async getEmailLogs(filters?: {
    orderId?: number;
    customerId?: number;
    emailType?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    let query = db.select().from(emailLogs);
    
    if (filters?.orderId) {
      query = query.where(eq(emailLogs.orderId, filters.orderId)) as any;
    }
    if (filters?.customerId) {
      query = query.where(eq(emailLogs.customerId, filters.customerId)) as any;
    }
    if (filters?.emailType) {
      query = query.where(eq(emailLogs.emailType, filters.emailType)) as any;
    }
    if (filters?.status) {
      query = query.where(eq(emailLogs.status, filters.status)) as any;
    }
    
    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }
    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }
    
    query = query.orderBy(desc(emailLogs.sentAt)) as any;
    
    return await query;
  }

  // Email logs method for EmailService integration  
  async logEmail(log: Omit<any, 'id' | 'sentAt'>): Promise<void> {
    try {
      await this.createEmailLog({
        orderId: log.orderId,
        customerId: log.customerId,
        emailType: log.emailType,
        recipientEmail: log.recipientEmail,
        subject: log.subject,
        status: log.status,
        sendgridMessageId: log.sendgridMessageId,
        errorMessage: log.errorMessage
      });
    } catch (error) {
      console.error('Error logging email:', error);
    }
  }

  async updateEmailLogStatus(id: number, status: string, deliveredAt?: Date, openedAt?: Date, clickedAt?: Date): Promise<any> {
    const updateData: any = { status };
    if (deliveredAt) updateData.deliveredAt = deliveredAt;
    if (openedAt) updateData.openedAt = openedAt;
    if (clickedAt) updateData.clickedAt = clickedAt;
    
    const [emailLog] = await db.update(emailLogs)
      .set(updateData)
      .where(eq(emailLogs.id, id))
      .returning();
    return emailLog;
  }

  // CEP Zone methods using new JSON ranges structure with priority support
  async getCepZones(activeOnly = false): Promise<CepZone[]> {
    if (activeOnly) {
      return await db.select().from(cepZones).where(eq(cepZones.active, true)).orderBy(asc(cepZones.priority));
    }
    
    return await db.select().from(cepZones).orderBy(asc(cepZones.priority));
  }

  async getCepZoneById(id: number): Promise<CepZone | undefined> {
    const [cepZone] = await db
      .select()
      .from(cepZones)
      .where(eq(cepZones.id, id));
    return cepZone;
  }

  async createCepZone(zone: InsertCepZone): Promise<CepZone> {
    const [newZone] = await db
      .insert(cepZones)
      .values(zone)
      .returning();
    return newZone;
  }

  async updateCepZone(id: number, zone: Partial<InsertCepZone>): Promise<CepZone | undefined> {
    const [updatedZone] = await db
      .update(cepZones)
      .set({ ...zone, updatedAt: new Date() })
      .where(eq(cepZones.id, id))
      .returning();
    return updatedZone;
  }

  async deleteCepZone(id: number): Promise<boolean> {
    const result = await db
      .delete(cepZones)
      .where(eq(cepZones.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async checkCepZoneOverlap(cepStart: string, cepEnd: string, excludeId?: number): Promise<CepZone | null> {
    // Check for overlapping CEP ranges with existing zones
    const allZones = await this.getCepZones();
    
    for (const zone of allZones) {
      if (excludeId && zone.id === excludeId) continue;
      
      try {
        const ranges = JSON.parse(zone.cepRanges);
        for (const range of ranges) {
          const rangeStart = parseInt(range.start);
          const rangeEnd = parseInt(range.end);
          const newStart = parseInt(cepStart);
          const newEnd = parseInt(cepEnd);
          
          // Check for overlap
          if ((newStart >= rangeStart && newStart <= rangeEnd) ||
              (newEnd >= rangeStart && newEnd <= rangeEnd) ||
              (newStart <= rangeStart && newEnd >= rangeEnd)) {
            return zone; // Return the overlapping zone
          }
        }
      } catch (error) {
        console.error('Error parsing cep ranges:', error);
      }
    }
    
    return null; // No overlap found
  }

  // Event stock control methods implementation
  async updateEventStock(eventId: number, increment: number): Promise<Event> {
    const [event] = await db
      .update(events)
      .set({ 
        currentOrders: sql`${events.currentOrders} + ${increment}` 
      })
      .where(eq(events.id, eventId))
      .returning();
    
    if (!event) {
      throw new Error(`Event with ID ${eventId} not found`);
    }
    
    return event;
  }

  async checkEventAvailability(eventId: number, requestedQuantity: number): Promise<{
    available: boolean;
    remainingStock: number | null;
    status: string;
  }> {
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId));
    
    if (!event) {
      return {
        available: false,
        remainingStock: null,
        status: 'not_found'
      };
    }

    // Check event status
    if (event.status !== 'ativo') {
      return {
        available: false,
        remainingStock: event.stockEnabled ? event.maxOrders ? (event.maxOrders - event.currentOrders) : null : null,
        status: event.status
      };
    }

    // Check stock if enabled
    if (event.stockEnabled && event.maxOrders !== null) {
      const remainingStock = event.maxOrders - event.currentOrders;
      const hasStock = remainingStock >= 1; // Only check if there's space for 1 more order
      
      return {
        available: hasStock,
        remainingStock,
        status: event.status
      };
    }

    // Event is active and no stock limit or stock control disabled
    return {
      available: true,
      remainingStock: null,
      status: event.status
    };
  }

  async updateEventStatus(eventId: number, status: string): Promise<Event> {
    const [event] = await db
      .update(events)
      .set({ status })
      .where(eq(events.id, eventId))
      .returning();
    
    if (!event) {
      throw new Error(`Event with ID ${eventId} not found`);
    }
    
    return event;
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
      pricingType: "distance",
      fixedPrice: null,
      extraKitPrice: "8.00",
      donationRequired: false,
      donationDescription: null,
      donationAmount: null,
      status: "ativo",
      stockEnabled: false,
      maxOrders: null,
      currentOrders: 0,
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

  async getCustomerById(id: number): Promise<Customer | undefined> {
    return this.customers.find(c => c.id === id);
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.getCustomerById(id);
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
    const customer = await this.getCustomerById(newOrder.customerId);
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

  async getOrdersByCustomerId(customerId: number, page = 1, limit = 5): Promise<{ orders: Order[]; total: number; hasMore: boolean }> {
    const allOrders = this.orders.filter(o => o.customerId === customerId);
    const total = allOrders.length;
    const offset = (page - 1) * limit;
    const orders = allOrders.slice(offset, offset + limit);
    const hasMore = offset + limit < total;
    
    return { orders, total, hasMore };
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
    const totalRevenue = this.orders.reduce((sum, order) => sum + parseFloat(order.totalCost || "0"), 0);
    return {
      totalCustomers: this.customers.length,
      totalOrders: this.orders.length,
      activeEvents: this.events.filter(e => e.available).length,
      totalRevenue
    };
  }

  // Add missing methods for IStorage interface
  async getCouponByCode(code: string): Promise<Coupon | undefined> {
    // Mock implementation - would need to add coupons array
    return undefined;
  }

  async createCoupon(coupon: InsertCoupon): Promise<Coupon> {
    // Mock implementation
    const newCoupon = { ...coupon, id: Date.now(), createdAt: new Date(), updatedAt: new Date() } as Coupon;
    return newCoupon;
  }

  async getCepZones(activeOnly?: boolean): Promise<CepZone[]> {
    // Mock implementation - would return empty array for now
    return [];
  }

  async getCepZoneById(id: number): Promise<CepZone | undefined> {
    return undefined;
  }

  async createCepZone(zone: InsertCepZone): Promise<CepZone> {
    const newZone = { ...zone, id: Date.now(), createdAt: new Date(), updatedAt: new Date() } as CepZone;
    return newZone;
  }

  async updateCepZone(id: number, zone: Partial<InsertCepZone>): Promise<CepZone | undefined> {
    return undefined;
  }

  async deleteCepZone(id: number): Promise<boolean> {
    return true;
  }

  async checkCepZoneOverlap(cepStart: string, cepEnd: string, excludeId?: number): Promise<CepZone | null> {
    return null;
  }

  async calculateDeliveryPrice(fromZipCode: string, toZipCode: string): Promise<number> {
    // Mock implementation - return fixed price
    return 15.00;
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
    const totalRevenue = this.orders.reduce((sum, order) => sum + parseFloat(order.totalCost || "0"), 0);
    return {
      totalOrders: this.orders.length,
      confirmedOrders: this.orders.filter(o => o.status === "confirmado").length,
      awaitingPayment: this.orders.filter(o => o.status === "aguardando_pagamento").length,
      cancelledOrders: this.orders.filter(o => o.status === "cancelado").length,
      inTransitOrders: this.orders.filter(o => o.status === "em_transito").length,
      deliveredOrders: this.orders.filter(o => o.status === "entregue").length,
      totalRevenue
    };
  }

  async getFilteredOrderStats(filters?: any): Promise<{
    totalOrders: number;
    confirmedOrders: number;
    awaitingPayment: number;
    cancelledOrders: number;
    inTransitOrders: number;
    deliveredOrders: number;
    totalRevenue: number;
  }> {
    // For MockStorage, return same as getOrderStats
    return this.getOrderStats();
  }

  async createCustomerWithAddresses(customerData: any): Promise<{ customer: Customer; addresses: Address[] }> {
    const customer = await this.createCustomer(customerData.customer);
    const addresses: Address[] = [];
    
    for (const addressData of customerData.addresses || []) {
      const address = await this.createAddress({ ...addressData, customerId: customer.id });
      addresses.push(address);
    }
    
    return { customer, addresses };
  }

  async updateCustomer(id: number, customerData: any): Promise<Customer | undefined> {
    const index = this.customers.findIndex(c => c.id === id);
    if (index === -1) return undefined;
    
    this.customers[index] = { ...this.customers[index], ...customerData };
    return this.customers[index];
  }

  async deleteCustomer(id: number): Promise<boolean> {
    const index = this.customers.findIndex(c => c.id === id);
    if (index === -1) return false;
    
    this.customers.splice(index, 1);
    return true;
  }

  async getCustomerWithAddresses(id: number): Promise<(Customer & { addresses: Address[] }) | undefined> {
    const customer = this.customers.find(c => c.id === id);
    if (!customer) return undefined;
    
    const addresses = this.addresses.filter(a => a.customerId === id);
    return { ...customer, addresses };
  }

  async getFullOrderById(id: number): Promise<any> {
    return this.getOrderByIdWithDetails(id);
  }

  async getOrderByIdWithDetails(id: number): Promise<any> {
    const order = this.orders.find(o => o.id === id);
    if (!order) return undefined;
    
    const kits = this.kits.filter(k => k.orderId === id);
    return { ...order, kits };
  }

  async getOrderWithFullDetails(id: number): Promise<any> {
    return this.getOrderByIdWithDetails(id);
  }

  async updateOrderStatus(orderId: number | string, status: string, changedBy?: string, changedByName?: string, reason?: string, bulkOperationId?: string, sendEmail?: boolean): Promise<Order | undefined> {
    const id = typeof orderId === 'string' ? parseInt(orderId) : orderId;
    const index = this.orders.findIndex(o => o.id === id);
    if (index === -1) return undefined;
    
    this.orders[index].status = status;
    return this.orders[index];
  }

  async createEmailLog(emailData: any): Promise<any> {
    // Mock implementation
    return { ...emailData, id: Date.now(), sentAt: new Date() };
  }

  async getEmailLogs(filters?: any): Promise<any[]> {
    // Mock implementation
    return [];
  }

  // Admin user email notifications
  async getAdminUsersWithEmailNotifications(): Promise<{ id: number; email: string; fullName: string }[]> {
    const result = await db
      .select({
        id: adminUsers.id,
        email: adminUsers.email,
        fullName: adminUsers.fullName
      })
      .from(adminUsers)
      .where(eq(adminUsers.receiveOrderEmails, true));
    
    return result;
  }

  // WhatsApp methods implementation
  async createWhatsappMessage(message: InsertWhatsappMessage): Promise<WhatsappMessage> {
    const [result] = await db
      .insert(whatsappMessages)
      .values(message)
      .returning();
    return result;
  }

  async updateWhatsappMessage(id: number, updates: Partial<{ status: string; jobId?: string; errorMessage?: string; sentAt?: Date }>): Promise<void> {
    await db
      .update(whatsappMessages)
      .set(updates)
      .where(eq(whatsappMessages.id, id));
  }

  async getWhatsappMessages(limit: number, offset: number): Promise<{ messages: WhatsappMessage[]; total: number }> {
    const messages = await db
      .select()
      .from(whatsappMessages)
      .orderBy(desc(whatsappMessages.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await db
      .select({ count: count() })
      .from(whatsappMessages);

    return {
      messages,
      total: totalResult.count
    };
  }

  async getLastWhatsappMessageId(): Promise<number> {
    const [result] = await db
      .select({ id: whatsappMessages.id })
      .from(whatsappMessages)
      .orderBy(desc(whatsappMessages.id))
      .limit(1);
    
    return result?.id || 0;
  }

  async getActiveWhatsappTemplate(): Promise<WhatsappSettings | null> {
    const [result] = await db
      .select()
      .from(whatsappSettings)
      .where(eq(whatsappSettings.isActive, true))
      .orderBy(desc(whatsappSettings.createdAt))
      .limit(1);
    
    return result || null;
  }

  async createWhatsappTemplate(template: InsertWhatsappSettings): Promise<WhatsappSettings> {
    // Deactivate existing templates
    await db
      .update(whatsappSettings)
      .set({ isActive: false });

    const [result] = await db
      .insert(whatsappSettings)
      .values(template)
      .returning();
    
    return result;
  }

  async updateWhatsappTemplate(id: number, template: Partial<InsertWhatsappSettings>): Promise<WhatsappSettings | undefined> {
    const [result] = await db
      .update(whatsappSettings)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(whatsappSettings.id, id))
      .returning();
    
    return result || undefined;
  }

  // Report Preview Methods - Return sample data with real counts
  async getKitsDataForPreview(eventId: number, statusFilter?: string[], limit: number = 5): Promise<{totalCount: number, sample: any[]}> {
    let whereConditions = [eq(orders.eventId, eventId)];
    
    if (statusFilter && statusFilter.length > 0) {
      whereConditions.push(inArray(orders.status, statusFilter));
    }

    const totalCount = await db.select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(and(...whereConditions));

    const sample = await db.select({
      orderNumber: orders.orderNumber,
      name: kits.name,
      cpf: kits.cpf,
      shirtSize: kits.shirtSize,
      customerName: customers.name
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .innerJoin(kits, eq(kits.orderId, orders.id))
    .where(and(...whereConditions))
    .limit(limit);

    return {
      totalCount: totalCount[0]?.count || 0,
      sample
    };
  }

  async getCircuitDataForPreview(eventId: number, zoneIds?: number[], limit: number = 5): Promise<{totalCount: number, sample: any[]}> {
    let query = db.select({
      orderNumber: orders.orderNumber,
      street: addresses.street,
      number: addresses.number,
      city: addresses.city,
      state: addresses.state,
      zipCode: addresses.zipCode
    })
    .from(orders)
    .innerJoin(addresses, eq(orders.addressId, addresses.id))
    .where(eq(orders.eventId, eventId));

    // Apply zone filtering if provided
    if (zoneIds && zoneIds.length > 0) {
      // Note: This would need CEP zone checking logic
      console.log('Zone filtering not yet implemented for preview');
    }

    const sample = await query.limit(limit);
    
    const totalCountResult = await db.select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(eq(orders.eventId, eventId));

    return {
      totalCount: totalCountResult[0]?.count || 0,
      sample
    };
  }

  async getOrdersDataForPreview(eventId: number, statusFilter?: string[], zoneIds?: number[], limit: number = 5): Promise<{totalCount: number, sample: any[], totalRevenue: number, zonesSummary: any[]}> {
    let whereConditions = [eq(orders.eventId, eventId)];

    if (statusFilter && statusFilter.length > 0) {
      whereConditions.push(sql`${orders.status} = ANY(${statusFilter})`);
    }

    const sample = await db.select({
      orderNumber: orders.orderNumber,
      customerName: customers.name,
      status: orders.status,
      totalCost: orders.totalCost,
      zoneName: sql<string>`'Zona não implementada'` // Placeholder for zone name
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(and(...whereConditions))
    .limit(limit);

    const totalCountResult = await db.select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(and(...whereConditions));

    const revenueResult = await db.select({ 
      revenue: sql<number>`COALESCE(SUM(CAST(${orders.totalCost} AS DECIMAL)), 0)` 
    })
    .from(orders)
    .where(and(...whereConditions));

    return {
      totalCount: totalCountResult[0]?.count || 0,
      sample,
      totalRevenue: revenueResult[0]?.revenue || 0,
      zonesSummary: [
        { name: 'Todas as Zonas', count: totalCountResult[0]?.count || 0 }
      ]
    };
  }
}

// Export the storage implementation
export const storage = new DatabaseStorage();


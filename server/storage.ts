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
  CustomerIdentification,
  events,
  customers,
  addresses,
  orders,
  kits,
  coupons
} from "@shared/schema";
import { db } from "./db";
import { eq, and, count, sum, desc } from "drizzle-orm";

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
  getOrderByNumber(orderNumber: string): Promise<Order | undefined>;
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
    return order;
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber));
    return order || undefined;
  }

  async getOrdersByCustomerId(customerId: number): Promise<Order[]> {
    const result = await db
      .select()
      .from(orders)
      .where(eq(orders.customerId, customerId))
      .orderBy(orders.createdAt);
    return result;
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
    const [revenue] = await db.select({ total: sum(orders.totalCost) }).from(orders);

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
      status: "confirmed" as const,
      createdAt: new Date(), 
      updatedAt: new Date() 
    } as Order;
    
    // Para a MockStorage, precisamos simular a adição de customer e event
    const customer = await this.getCustomer(newOrder.customerId);
    const event = await this.getEvent(newOrder.eventId);

    this.orders.push({ ...newOrder, customer, event } as Order & { customer: Customer; event: Event });
    return newOrder;
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    return this.orders.find(o => o.orderNumber === orderNumber);
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
}

export const storage = new DatabaseStorage();


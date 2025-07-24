import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  date: text("date").notNull(),
  location: text("location").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  pickupZipCode: text("pickup_zip_code").notNull(), // CEP de retirada
  fixedPrice: decimal("fixed_price", { precision: 10, scale: 2 }), // Preço fixo opcional
  extraKitPrice: decimal("extra_kit_price", { precision: 10, scale: 2 }).default("8.00"), // Preço por kit extra
  donationRequired: boolean("donation_required").default(false), // Se requer doação
  donationAmount: decimal("donation_amount", { precision: 10, scale: 2 }), // Valor da doação se obrigatória
  donationDescription: text("donation_description"), // Ex: "1 kg de alimento"
  available: boolean("available").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  cpf: text("cpf").notNull().unique(),
  birthDate: text("birth_date").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const addresses = pgTable("addresses", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  label: text("label").notNull(), // "casa", "trabalho", etc.
  street: text("street").notNull(),
  number: text("number").notNull(),
  complement: text("complement"),
  neighborhood: text("neighborhood").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull().default("PB"),
  zipCode: text("zip_code").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const kits = pgTable("kits", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  name: text("name").notNull(),
  cpf: text("cpf").notNull(),
  shirtSize: text("shirt_size").notNull(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  eventId: integer("event_id").notNull(),
  customerId: integer("customer_id").notNull(),
  addressId: integer("address_id").notNull().references(() => addresses.id),
  kitQuantity: integer("kit_quantity").notNull(),
  deliveryCost: decimal("delivery_cost", { precision: 10, scale: 2 }).notNull(), // Custo da entrega baseado na distância
  extraKitsCost: decimal("extra_kits_cost", { precision: 10, scale: 2 }).notNull().default("0"), // Custo dos kits extras
  donationCost: decimal("donation_cost", { precision: 10, scale: 2 }).notNull().default("0"), // Custo da doação
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull().default("0"), // Desconto aplicado
  couponCode: text("coupon_code"), // Código do cupom usado
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(),
  status: text("status").notNull().default("confirmed"),
  donationAmount: decimal("donation_amount", { precision: 10, scale: 2 }).notNull().default("0"), // Valor da doação
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Add coupons table
export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  discountType: text("discount_type").notNull(), // "percentage" or "fixed"
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  maxDiscount: decimal("max_discount", { precision: 10, scale: 2 }), // Para cupons percentuais
  validFrom: timestamp("valid_from").notNull(),
  validUntil: timestamp("valid_until").notNull(),
  usageLimit: integer("usage_limit"), // null = ilimitado
  usageCount: integer("usage_count").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
});

export const insertAddressSchema = createInsertSchema(addresses).omit({
  id: true,
  createdAt: true,
});

export const insertKitSchema = createInsertSchema(kits).omit({
  id: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  orderNumber: true,
  createdAt: true,
});

export const insertCouponSchema = createInsertSchema(coupons).omit({
  id: true,
  usageCount: true,
  createdAt: true,
});

export const customerIdentificationSchema = z.object({
  cpf: z.string().length(11, "CPF deve ter 11 dígitos numéricos").refine((cpf) => {
    // CPF validation algorithm
    if (cpf.length !== 11) return false;
    
    // Check if all digits are the same
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    
    // Validate first check digit
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(9))) return false;
    
    // Validate second check digit
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(10))) return false;
    
    return true;
  }, "CPF inválido"),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de nascimento deve estar no formato YYYY-MM-DD"),
});

export const addressSchema = z.object({
  label: z.string().min(1, "Rótulo é obrigatório"),
  street: z.string().min(1, "Rua é obrigatória"),
  number: z.string().min(1, "Número é obrigatório"),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, "Bairro é obrigatório"),
  city: z.string().min(1, "Cidade é obrigatória"),
  state: z.string().default("PB"),
  zipCode: z.string().min(8, "CEP deve ter 8 dígitos"),
  isDefault: z.boolean().default(false),
});

export const customerRegistrationSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  cpf: z.string().length(11, "CPF deve ter 11 dígitos numéricos").refine((cpf) => {
    // CPF validation algorithm
    if (cpf.length !== 11) return false;
    
    // Check if all digits are the same
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    
    // Validate first check digit
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(9))) return false;
    
    // Validate second check digit
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(10))) return false;
    
    return true;
  }, "CPF inválido"),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de nascimento deve estar no formato YYYY-MM-DD"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
  addresses: z.array(addressSchema).min(1, "Pelo menos um endereço é obrigatório"),
});

export const kitInformationSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  cpf: z.string().length(11, "CPF deve ter 11 dígitos numéricos").refine((cpf) => {
    // CPF validation algorithm
    if (cpf.length !== 11) return false;
    
    // Check if all digits are the same
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    
    // Validate first check digit
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(9))) return false;
    
    // Validate second check digit
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(10))) return false;
    
    return true;
  }, "CPF inválido"),
  shirtSize: z.string().min(1, "Tamanho da camiseta é obrigatório"),
});

export const orderCreationSchema = z.object({
  eventId: z.number(),
  customerId: z.number(),
  addressId: z.number(),
  kitQuantity: z.number().min(1).max(5),
  kits: z.array(kitInformationSchema),
  paymentMethod: z.enum(["credit", "debit", "pix"]),
  couponCode: z.string().optional(),
});

// Admin schemas
export const adminEventCreationSchema = z.object({
  name: z.string().min(1, "Nome do evento é obrigatório"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
  location: z.string().min(1, "Local é obrigatório"),
  city: z.string().min(1, "Cidade é obrigatória"),
  state: z.string().length(2, "Estado deve ter 2 caracteres"),
  pickupZipCode: z.string().length(8, "CEP deve ter 8 dígitos"),
  fixedPrice: z.string().optional(),
  extraKitPrice: z.string().default("8.00"),
  donationRequired: z.boolean().default(false),
  donationAmount: z.string().optional(),
  donationDescription: z.string().optional(),
});

// Type exports
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Address = typeof addresses.$inferSelect;
export type InsertAddress = z.infer<typeof insertAddressSchema>;

export type Kit = typeof kits.$inferSelect;
export type InsertKit = z.infer<typeof insertKitSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = z.infer<typeof insertCouponSchema>;

export type CustomerIdentification = z.infer<typeof customerIdentificationSchema>;
export type KitInformation = z.infer<typeof kitInformationSchema>;
export type OrderCreation = z.infer<typeof orderCreationSchema>;
export type CustomerRegistration = z.infer<typeof customerRegistrationSchema>;
export type AdminEventCreation = z.infer<typeof adminEventCreationSchema>;
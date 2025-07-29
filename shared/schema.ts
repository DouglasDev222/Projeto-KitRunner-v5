import { pgTable, text, serial, integer, boolean, timestamp, decimal, varchar, inet } from "drizzle-orm/pg-core";
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

export const orderStatusHistory = pgTable("order_status_history", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  previousStatus: text("previous_status"),
  newStatus: text("new_status").notNull(),
  changedBy: text("changed_by").notNull(), // 'admin', 'mercadopago', 'system'
  changedByName: text("changed_by_name"), // Nome do admin ou 'Mercado Pago'
  reason: text("reason"), // Motivo da mudança
  createdAt: timestamp("created_at").notNull().defaultNow(),
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
  status: text("status").notNull().default("confirmado"), // "confirmado", "aguardando_pagamento", "cancelado", "kits_sendo_retirados", "em_transito", "entregue"
  donationAmount: decimal("donation_amount", { precision: 10, scale: 2 }).notNull().default("0"), // Valor da doação
  idempotencyKey: text("idempotency_key").unique(), // Chave para evitar duplicação
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

// Admin authentication tables
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).notNull().default("admin"), // 'super_admin' | 'admin'
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdBy: integer("created_by"),
});

export const adminSessions = pgTable("admin_sessions", {
  id: serial("id").primaryKey(),
  adminUserId: integer("admin_user_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: inet("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const adminAuditLog = pgTable("admin_audit_log", {
  id: serial("id").primaryKey(),
  adminUserId: integer("admin_user_id").references(() => adminUsers.id),
  action: varchar("action", { length: 100 }).notNull(), // 'login', 'logout', 'create_user', 'update_order', etc.
  resourceType: varchar("resource_type", { length: 50 }), // 'user', 'order', 'event', 'customer'
  resourceId: varchar("resource_id", { length: 50 }),
  details: text("details"), // JSON string
  ipAddress: inet("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  adminUserId: integer("admin_user_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
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

// Admin user schemas
export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
});

export const insertAdminSessionSchema = createInsertSchema(adminSessions).omit({
  id: true,
  createdAt: true,
});

export const insertAdminAuditLogSchema = createInsertSchema(adminAuditLog).omit({
  id: true,
  createdAt: true,
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
  usedAt: true,
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
  cpf: z.string().min(11, "CPF deve ter pelo menos 11 dígitos").refine((cpf) => {
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
  }, "CPF inválido"),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de nascimento deve estar no formato YYYY-MM-DD"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos").refine((phone) => {
    const cleanPhone = phone.replace(/\D/g, "");
    return cleanPhone.length >= 10 && cleanPhone.length <= 11;
  }, "Telefone deve ter 10 ou 11 dígitos"),
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
  totalCost: z.number(),
  deliveryCost: z.number(),
  extraKitsCost: z.number(),
  donationCost: z.number(),
  discountAmount: z.number(),
  donationAmount: z.number(),
  idempotencyKey: z.string().optional(),
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
  pricingType: z.enum(["distance", "fixed"]).default("distance"),
  fixedPrice: z.string().optional(),
  extraKitPrice: z.string().default("8.00"),
  donationRequired: z.boolean().default(false),
  donationAmount: z.string().optional(),
  donationDescription: z.string().optional(),
}).refine((data) => {
  // If pricing type is "fixed", fixedPrice must be provided and be a valid number > 0
  if (data.pricingType === "fixed") {
    if (!data.fixedPrice || data.fixedPrice.trim() === "") {
      return false;
    }
    const price = parseFloat(data.fixedPrice);
    return !isNaN(price) && price > 0;
  }
  return true;
}, {
  message: "Preço fixo é obrigatório e deve ser maior que zero quando o tipo de precificação for 'Preço Fixo'",
  path: ["fixedPrice"]
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

export type OrderStatusHistory = typeof orderStatusHistory.$inferSelect;
export type InsertOrderStatusHistory = typeof orderStatusHistory.$inferInsert;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = z.infer<typeof insertCouponSchema>;

export type CustomerIdentification = z.infer<typeof customerIdentificationSchema>;
export type KitInformation = z.infer<typeof kitInformationSchema>;
export type OrderCreation = z.infer<typeof orderCreationSchema>;
export type CustomerRegistration = z.infer<typeof customerRegistrationSchema>;
export type AdminEventCreation = z.infer<typeof adminEventCreationSchema>;

// Admin order management schemas
export const orderStatusUpdateSchema = z.object({
  status: z.enum(["confirmed", "awaiting_payment", "cancelled", "kits_being_prepared", "kits_ready", "in_transit", "delivered"]),
});

export const orderSearchFiltersSchema = z.object({
  status: z.enum(["all", "confirmed", "awaiting_payment", "cancelled", "kits_being_prepared", "kits_ready", "in_transit", "delivered"]).default("all"),
  eventId: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  customerName: z.string().optional(),
  orderNumber: z.string().optional(),
});

// Admin authentication schemas
export const adminLoginSchema = z.object({
  username: z.string().min(1, "Nome de usuário é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export const adminUserCreationSchema = z.object({
  username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres").max(50, "Nome de usuário deve ter no máximo 50 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
  fullName: z.string().min(1, "Nome completo é obrigatório"),
  role: z.enum(["super_admin", "admin"]).default("admin"),
});

export const adminUserUpdateSchema = z.object({
  username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres").max(50, "Nome de usuário deve ter no máximo 50 caracteres").optional(),
  email: z.string().email("Email inválido").optional(),
  fullName: z.string().min(1, "Nome completo é obrigatório").optional(),
  role: z.enum(["super_admin", "admin"]).optional(),
  isActive: z.boolean().optional(),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email("Email inválido"),
});

export const passwordResetSchema = z.object({
  token: z.string().min(1, "Token é obrigatório"),
  newPassword: z.string().min(8, "Nova senha deve ter pelo menos 8 caracteres"),
});

export const auditLogFiltersSchema = z.object({
  adminUserId: z.number().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(50),
});

export type OrderStatusUpdate = z.infer<typeof orderStatusUpdateSchema>;
export type OrderSearchFilters = z.infer<typeof orderSearchFiltersSchema>;

// Admin user types
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type CreateAdminUser = z.infer<typeof adminUserCreationSchema>;
export type UpdateAdminUser = z.infer<typeof adminUserUpdateSchema>;

export type AdminSession = typeof adminSessions.$inferSelect;
export type InsertAdminSession = z.infer<typeof insertAdminSessionSchema>;

export type AdminAuditLog = typeof adminAuditLog.$inferSelect;
export type InsertAdminAuditLog = z.infer<typeof insertAdminAuditLogSchema>;

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

// Admin authentication types
export type AdminLogin = z.infer<typeof adminLoginSchema>;
export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;
export type PasswordReset = z.infer<typeof passwordResetSchema>;
export type AuditLogFilters = z.infer<typeof auditLogFiltersSchema>;

// Authentication result types
export type AuthResult = {
  success: boolean;
  token?: string;
  user?: AdminUser;
  error?: string;
};
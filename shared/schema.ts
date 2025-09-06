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
  pricingType: varchar("pricing_type", { length: 20 }).notNull().default("distance"), // 'distance', 'fixed', 'cep_zones'
  fixedPrice: decimal("fixed_price", { precision: 10, scale: 2 }), // Preço fixo opcional
  extraKitPrice: decimal("extra_kit_price", { precision: 10, scale: 2 }).default("8.00"), // Preço por kit extra
  donationRequired: boolean("donation_required").default(false), // Se requer doação
  donationAmount: decimal("donation_amount", { precision: 10, scale: 2 }), // Valor da doação se obrigatória
  donationDescription: text("donation_description"), // Ex: "1 kg de alimento"
  description: text("description").default("**Importante:**\n\nPara utilizar nosso serviço, você precisa estar devidamente inscrito no evento através da página oficial da organização. Após a inscrição, basta solicitar a retirada conosco com seu número de inscrição e dados necessários.\n\n**Este é um serviço independente, sem vínculo com a organização do evento. Nossa missão é facilitar sua experiência!**"), // Descrição do evento
  
  // Novo sistema de status (substitui available)
  status: varchar("status", { length: 20 }).notNull().default("ativo"), // 'ativo', 'inativo', 'fechado_pedidos'
  
  // Controle de estoque
  stockEnabled: boolean("stock_enabled").notNull().default(false), // Se o controle de estoque está habilitado
  maxOrders: integer("max_orders"), // Limite máximo de pedidos (null = ilimitado)
  currentOrders: integer("current_orders").notNull().default(0), // Quantidade atual de pedidos
  
  // Manter available por compatibilidade (deprecated)
  available: boolean("available").notNull().default(true),
  
  // Parceria oficial
  isOfficial: boolean("is_official").notNull().default(false),
  
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
  cepZoneName: text("cep_zone_name"), // Nome da zona de CEP utilizada na hora do pedido
  idempotencyKey: text("idempotency_key").unique(), // Chave para evitar duplicação
  // PIX payment tracking fields
  paymentId: text("payment_id"), // MercadoPago payment ID
  pixQrCode: text("pix_qr_code"), // QR code base64 para PIX
  pixCopyPaste: text("pix_copy_paste"), // Código PIX para copiar/colar
  pixExpirationDate: timestamp("pix_expiration_date"), // Data de expiração do QR PIX (30 min)
  paymentCreatedAt: timestamp("payment_created_at"), // Para cálculo de timeout 24h
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const kits = pgTable("kits", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
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
  bulkOperationId: text("bulk_operation_id"), // ID para agrupar operações em massa
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Add coupons table
export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  discountType: text("discount_type").notNull(), // "percentage" or "fixed"
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  description: text("description"), // Descrição do cupom
  maxDiscount: decimal("max_discount", { precision: 10, scale: 2 }), // Para cupons percentuais
  productIds: integer("product_ids").array(), // Array de IDs de eventos elegíveis (null = todos)
  cepZoneIds: integer("cep_zone_ids").array(), // Array de IDs de zonas de CEP (null = todas as zonas)
  validFrom: timestamp("valid_from").notNull(),
  validUntil: timestamp("valid_until").notNull(),
  usageLimit: integer("usage_limit"), // null = ilimitado
  usageCount: integer("usage_count").notNull().default(0),
  perCustomerEnabled: boolean("per_customer_enabled").notNull().default(false), // Se controle por cliente está habilitado
  perCustomerLimit: integer("per_customer_limit"), // Limite de uso por cliente (null = sem limite por cliente)
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// New table to track coupon usage per customer
export const couponUsages = pgTable("coupon_usages", {
  id: serial("id").primaryKey(),
  couponId: integer("coupon_id").notNull().references(() => coupons.id, { onDelete: "cascade" }),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  usedAt: timestamp("used_at").notNull().defaultNow(),
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
  receiveOrderEmails: boolean("receive_order_emails").notNull().default(false), // Email notifications for new orders
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

// CEP Zones table for postal code-based pricing - UPDATED FOR MULTIPLE RANGES
export const cepZones = pgTable("cep_zones", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // Ex: "João Pessoa Z2"
  description: text("description"), // Optional description
  cepRanges: text("cep_ranges").notNull(), // JSON array: [{"start":"58083000","end":"58083500"},{"start":"58081400","end":"58082815"}]
  price: decimal("price", { precision: 10, scale: 2 }).notNull(), // Ex: 20.00
  priority: integer("priority").notNull().default(1), // Campo de prioridade - menor número = maior prioridade
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Policy Documents table - for terms and privacy policies
export const policyDocuments = pgTable("policy_documents", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 20 }).notNull(), // 'register' | 'order'
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Policy Acceptances table - tracks user consent
export const policyAcceptances = pgTable("policy_acceptances", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => customers.id),
  policyId: integer("policy_id").notNull().references(() => policyDocuments.id),
  acceptedAt: timestamp("accepted_at").notNull().defaultNow(),
  context: varchar("context", { length: 20 }).notNull(), // 'register' | 'order'
  orderId: integer("order_id").references(() => orders.id), // nullable, only for order context
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

// Email system tables
export const emailLogs = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id),
  customerId: integer("customer_id").references(() => customers.id),
  emailType: varchar("email_type", { length: 50 }).notNull(), // 'order_confirmation', 'status_update', etc.
  recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(), // 'sent', 'failed', 'delivered', 'bounced'
  sendgridMessageId: varchar("sendgrid_message_id", { length: 255 }),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  deliveredAt: timestamp("delivered_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
});

// Event CEP Zone Prices table for per-event price customization
export const eventCepZonePrices = pgTable("event_cep_zone_prices", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  cepZoneId: integer("cep_zone_id").notNull().references(() => cepZones.id, { onDelete: "cascade" }),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  active: boolean("active").notNull().default(true), // Indica se a zona está ativa para este evento
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// WhatsApp integration tables
export const whatsappMessages = pgTable("whatsapp_messages", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
  messageContent: text("message_content").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending', 'sent', 'error'
  jobId: varchar("job_id", { length: 100 }), // ID retornado pela API do WhatsApp
  errorMessage: text("error_message"), // Mensagem de erro se houver
  createdAt: timestamp("created_at").notNull().defaultNow(),
  sentAt: timestamp("sent_at"), // Quando foi enviado com sucesso
});

export const whatsappSettings = pgTable("whatsapp_settings", {
  id: serial("id").primaryKey(),
  templateContent: text("template_content").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Nova tabela para templates de WhatsApp com mais funcionalidades
export const whatsappTemplates = pgTable("whatsapp_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // Nome do template ex: "Confirmação de Pedido"
  type: varchar("type", { length: 50 }).notNull(), // Tipo: 'order_status', 'custom', 'notification'
  status: varchar("status", { length: 30 }), // Status do pedido relacionado: 'confirmado', 'em_transito', etc.
  content: text("content").notNull(), // Conteúdo do template
  description: text("description"), // Descrição do template
  isActive: boolean("is_active").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false), // Se é o template padrão para aquele status
  quickSend: boolean("quick_send").notNull().default(false), // Se aparece como botão de envio rápido
  placeholders: text("placeholders"), // JSON com placeholders disponíveis
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Event status enum and types
export const eventStatusEnum = z.enum(['ativo', 'inativo', 'fechado_pedidos']);
export type EventStatus = z.infer<typeof eventStatusEnum>;

// Validation schemas
export const insertEventSchema = createInsertSchema(events).omit({ id: true, createdAt: true }).extend({
  status: eventStatusEnum.optional(),
  stockEnabled: z.boolean().optional(),
  maxOrders: z.number().int().min(1).nullable().optional(),
});

export const eventUpdateSchema = createInsertSchema(events).extend({
  status: eventStatusEnum,
  stockEnabled: z.boolean(),
  maxOrders: z.number().int().min(1).nullable(),
}).partial();
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true });
export const insertAddressSchema = createInsertSchema(addresses).omit({ id: true, createdAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, orderNumber: true, createdAt: true });
export const insertKitSchema = createInsertSchema(kits).omit({ id: true });
export const insertCouponSchema = createInsertSchema(coupons).omit({ id: true, createdAt: true });
export const insertCouponUsageSchema = createInsertSchema(couponUsages).omit({ 
  id: true, 
  usedAt: true 
});
export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAdminSessionSchema = createInsertSchema(adminSessions).omit({ id: true, createdAt: true });
export const insertAdminAuditLogSchema = createInsertSchema(adminAuditLog).omit({ id: true, createdAt: true });
export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({ id: true, createdAt: true });
export const insertCepZoneSchema = createInsertSchema(cepZones).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEventCepZonePriceSchema = createInsertSchema(eventCepZonePrices).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({ id: true, sentAt: true });
export const insertPolicyDocumentSchema = createInsertSchema(policyDocuments).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export const insertPolicyAcceptanceSchema = createInsertSchema(policyAcceptances).omit({ 
  id: true, 
  acceptedAt: true 
});

// WhatsApp schemas
export const insertWhatsappMessageSchema = createInsertSchema(whatsappMessages).omit({ 
  id: true, 
  createdAt: true, 
  sentAt: true 
});
export const insertWhatsappSettingsSchema = createInsertSchema(whatsappSettings).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export const insertWhatsappTemplateSchema = createInsertSchema(whatsappTemplates).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

// Types
export type WhatsappMessage = typeof whatsappMessages.$inferSelect;
export type WhatsappSettings = typeof whatsappSettings.$inferSelect;
export type WhatsappTemplate = typeof whatsappTemplates.$inferSelect;
export type InsertWhatsappMessage = z.infer<typeof insertWhatsappMessageSchema>;
export type InsertWhatsappSettings = z.infer<typeof insertWhatsappSettingsSchema>;
export type InsertWhatsappTemplate = z.infer<typeof insertWhatsappTemplateSchema>;

// Customer identification validation
export const customerIdentificationSchema = z.object({
  cpf: z.string().min(11, "CPF deve ter 11 dígitos").max(11, "CPF deve ter 11 dígitos"),
  birthDate: z.string().min(10, "Data de nascimento é obrigatória").max(10, "Data inválida"),
});

// Individual kit validation
export const kitSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  cpf: z.string()
    .min(11, "CPF deve ter 11 dígitos")
    .max(11, "CPF deve ter 11 dígitos")
    .regex(/^\d{11}$/, "CPF deve conter apenas números")
    .refine((cpf) => {
      // CPF validation algorithm
      if (cpf.length !== 11) return false;
      
      // Check for known invalid patterns
      if (/^(\d)\1{10}$/.test(cpf)) return false;
      
      // Validate check digits
      let sum = 0;
      for (let i = 0; i < 9; i++) {
        sum += parseInt(cpf[i]) * (10 - i);
      }
      let digit1 = (sum * 10) % 11;
      if (digit1 === 10) digit1 = 0;
      
      if (parseInt(cpf[9]) !== digit1) return false;
      
      sum = 0;
      for (let i = 0; i < 10; i++) {
        sum += parseInt(cpf[i]) * (11 - i);
      }
      let digit2 = (sum * 10) % 11;
      if (digit2 === 10) digit2 = 0;
      
      return parseInt(cpf[10]) === digit2;
    }, "CPF inválido"),
  shirtSize: z.string().min(1, "Tamanho da camisa é obrigatório"),
});

// Kit information validation
export const kitInformationSchema = z.object({
  kitQuantity: z.number().min(1).max(5),
  kits: z.array(kitSchema).min(1, "Pelo menos um kit deve ser configurado"),
});

// Order creation validation
export const orderCreationSchema = z.object({
  eventId: z.number().min(1, "Evento é obrigatório"),
  customerId: z.number().min(1, "Cliente é obrigatório"),
  addressId: z.number().min(1, "Endereço é obrigatório"),
  kitQuantity: z.number().min(1, "Quantidade de kits deve ser pelo menos 1"),
  deliveryCost: z.string().min(1, "Custo de entrega é obrigatório"),
  extraKitsCost: z.string().default("0"),
  donationCost: z.string().default("0"),
  discountAmount: z.string().default("0"),
  couponCode: z.string().optional(),
  totalCost: z.string().min(1, "Custo total é obrigatório"),
  paymentMethod: z.enum(["credit", "debit", "pix", "gratuito"], { required_error: "Método de pagamento é obrigatório" }),
  kits: z.array(z.object({
    name: z.string().min(1, "Nome é obrigatório"),
    cpf: z.string().min(11, "CPF deve ter 11 dígitos").max(11, "CPF deve ter 11 dígitos"),
    shirtSize: z.string().min(1, "Tamanho da camisa é obrigatório"),
  })),
  donationAmount: z.string().default("0"),
  zoneName: z.string().optional(), // 🎯 CEP ZONE FIX: Add zone name from secure calculation
  idempotencyKey: z.string().optional(),
});

// Customer profile edit validation (restricted fields for customers)
export const customerProfileEditSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
  birthDate: z.string().min(10, "Data de nascimento é obrigatória").max(10, "Data inválida"),
});

// Customer registration validation
export const customerRegistrationSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  cpf: z.string()
    .min(11, "CPF deve ter 11 dígitos")
    .max(11, "CPF deve ter 11 dígitos")
    .refine((cpf) => {
      // Basic CPF validation logic
      const cleanCPF = cpf.replace(/\D/g, "");
      if (cleanCPF.length !== 11) return false;
      
      // Check for repeated digits
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
  birthDate: z.string().min(10, "Data de nascimento é obrigatória").max(10, "Data inválida"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
  addresses: z.array(z.object({
    label: z.string().min(1, "Etiqueta do endereço é obrigatória"),
    street: z.string().min(1, "Rua é obrigatória"),
    number: z.string().min(1, "Número é obrigatório"),
    complement: z.string().optional(),
    neighborhood: z.string().min(1, "Bairro é obrigatório"),
    city: z.string().min(1, "Cidade é obrigatória"),
    state: z.string().min(1, "Estado é obrigatório"),
    zipCode: z.string().regex(/^\d{5}-?\d{3}$/, "CEP deve ter o formato 12345-678"),
    isDefault: z.boolean().default(true),
  })).min(1, "Pelo menos um endereço é obrigatório"),
});

// Admin event creation validation
export const adminEventCreationSchema = z.object({
  name: z.string().min(1, "Nome do evento é obrigatório"),
  date: z.string().min(1, "Data do evento é obrigatória"),
  location: z.string().min(1, "Local do evento é obrigatório"),
  city: z.string().min(1, "Cidade é obrigatória"),
  state: z.string().min(1, "Estado é obrigatório"),
  pickupZipCode: z.string().regex(/^\d{5}-?\d{3}$/, "CEP deve ter o formato 12345-678"),
  pricingType: z.enum(["fixed", "distance", "cep_zones"], { required_error: "Tipo de precificação é obrigatório" }),
  fixedPrice: z.string().optional(),
  extraKitPrice: z.string().default("8.00"),
  donationRequired: z.boolean().default(false),
  donationAmount: z.string().optional(),
  donationDescription: z.string().optional(),
  description: z.string().default("**Importante:**\n\nPara utilizar nosso serviço, você precisa estar devidamente inscrito no evento através da página oficial da organização. Após a inscrição, basta solicitar a retirada conosco com seu número de inscrição e dados necessários.\n\n**Este é um serviço independente, sem vínculo com a organização do evento. Nossa missão é facilitar sua experiência!**"),
  status: z.enum(["ativo", "inativo", "fechado_pedidos"]).default("ativo"),
  stockEnabled: z.boolean().default(false),
  maxOrders: z.number().optional(),
  currentOrders: z.number().default(0),
  isOfficial: z.boolean().default(false),
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

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = z.infer<typeof insertCouponSchema>;

// Admin types
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;

export type AdminSession = typeof adminSessions.$inferSelect;
export type InsertAdminSession = z.infer<typeof insertAdminSessionSchema>;

export type AdminAuditLog = typeof adminAuditLog.$inferSelect;
export type InsertAdminAuditLog = z.infer<typeof insertAdminAuditLogSchema>;

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

export type OrderStatusHistory = typeof orderStatusHistory.$inferSelect;
export type InsertOrderStatusHistory = typeof orderStatusHistory.$inferInsert;

export type CustomerIdentification = z.infer<typeof customerIdentificationSchema>;
export type KitInformation = z.infer<typeof kitInformationSchema>;
export type OrderCreation = z.infer<typeof orderCreationSchema>;
export type CustomerRegistration = z.infer<typeof customerRegistrationSchema>;
export type AdminEventCreation = z.infer<typeof adminEventCreationSchema>;

// Policy types
export type PolicyDocument = typeof policyDocuments.$inferSelect;
export type NewPolicyDocument = z.infer<typeof insertPolicyDocumentSchema>;
export type PolicyAcceptance = typeof policyAcceptances.$inferSelect;
export type NewPolicyAcceptance = z.infer<typeof insertPolicyAcceptanceSchema>;

// Email Log types
export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;

// CEP Zone types
export type CepZone = typeof cepZones.$inferSelect;
export type InsertCepZone = z.infer<typeof insertCepZoneSchema>;

// Auth types
export interface AuthResult {
  success: boolean;
  token?: string;
  user?: Omit<AdminUser, 'passwordHash'>;
  error?: string;
}

export interface CreateAdminUser {
  username: string;
  email: string;
  password: string;
  fullName: string;
  role?: string;
  receiveOrderEmails?: boolean;
}

export interface UpdateAdminUser {
  username?: string;
  email?: string;
  fullName?: string;
  role?: string;
  isActive?: boolean;
  receiveOrderEmails?: boolean;
}

export interface AuditLogFilters {
  adminUserId?: number;
  action?: string;
  resourceType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  page?: number;
}

// Admin schemas
export const orderStatusUpdateSchema = z.object({
  status: z.enum(["confirmado", "aguardando_pagamento", "cancelado", "kits_sendo_retirados", "em_transito", "entregue"]),
});

export const orderSearchFiltersSchema = z.object({
  status: z.enum(["all", "confirmado", "aguardando_pagamento", "cancelado", "kits_sendo_retirados", "em_transito", "entregue"]).default("all"),
  eventId: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  customerName: z.string().optional(),
  orderNumber: z.string().optional(),
});

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

// Address schema for frontend forms
export const addressSchema = z.object({
  street: z.string().min(1, "Rua é obrigatória"),
  number: z.string().min(1, "Número é obrigatório"),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, "Bairro é obrigatório"),
  city: z.string().min(1, "Cidade é obrigatória"),
  state: z.string().min(2, "Estado é obrigatório").max(2, "Estado deve ter 2 caracteres"),
  zipCode: z.string().regex(/^\d{5}-?\d{3}$/, "CEP deve ter o formato 12345-678"),
  label: z.string().min(1, "Identificação do endereço é obrigatória"),
});

export type AddressData = z.infer<typeof addressSchema>;

// AuditLogFilters schema  
export const auditLogFiltersSchema = z.object({
  adminUserId: z.number().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
  page: z.number().optional(),
});

// Bulk operations schema
export const bulkStatusChangeSchema = z.object({
  orderIds: z.array(z.number()).min(1, "Pelo menos um pedido deve ser selecionado"),
  newStatus: z.enum(["confirmado", "aguardando_pagamento", "cancelado", "kits_sendo_retirados", "em_transito", "entregue"]),
  sendEmails: z.boolean().default(false),
  reason: z.string().optional(),
});

export type BulkStatusChange = z.infer<typeof bulkStatusChangeSchema>;
// Email Types for KitRunner - Kit Pickup and Delivery Service

export interface EmailTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  fontFamily: string;
  companyName: string;
  logoUrl?: string;
  supportEmail: string;
  supportPhone: string;
  websiteUrl: string;
  instagramHandle: string;
  address: string;
}

export const DEFAULT_THEME: EmailTheme = {
  primaryColor: '#5e17eb',
  secondaryColor: '#077d2e', 
  accentColor: '#7c3aed',
  backgroundColor: '#f8fafc',
  textColor: '#1f2937',
  borderColor: '#e5e7eb',
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  companyName: 'KitRunner',
  logoUrl: '/kitrunner-logo.png',
  supportEmail: 'contato@kitrunner.com.br',
  supportPhone: '(11) 99999-9999',
  websiteUrl: 'https://kitrunner.com.br',
  instagramHandle: '@kitrunner_',
  address: 'João Pessoa, PB - Brasil'
};

export interface KitItem {
  name: string;
  cpf: string;
  shirtSize: 'PP' | 'P' | 'M' | 'G' | 'GG' | 'XG' | 'XXG';
  category: string;
  ticketNumber?: string;
}

export interface DeliveryAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  reference?: string;
}

export interface PricingInfo {
  deliveryCost: string;
  extraKitsCost: string;
  donationCost?: string;
  totalCost: string;
}

export type OrderStatus = 
  | 'aguardando_pagamento'
  | 'pagamento_confirmado'
  | 'retirada_confirmada'
  | 'em_transito'
  | 'saiu_para_entrega'
  | 'entregue'
  | 'cancelado';

export type PaymentMethod = 'pix' | 'cartao' | 'boleto';

// Base interface for all email templates
export interface BaseEmailData {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  theme?: Partial<EmailTheme>;
}

// Service Confirmation Email
export interface ServiceConfirmationData extends BaseEmailData {
  customerCPF: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  pickupLocation: string;
  kits: KitItem[];
  address: DeliveryAddress;
  pricing: PricingInfo;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  estimatedDelivery?: string;
}

// Kit En Route Email
export interface KitEnRouteData extends BaseEmailData {
  eventName: string;
  kits: KitItem[];
  address: DeliveryAddress;
  estimatedDelivery: string;
  trackingCode?: string;
  driverName?: string;
  driverPhone?: string;
}

// Delivery Confirmation Email
export interface DeliveryConfirmationData extends BaseEmailData {
  eventName: string;
  kits: KitItem[];
  deliveredAt: string;
  receivedBy?: string;
  feedbackUrl?: string;
  shareMessage?: string;
}

// Status Update Email
export interface StatusUpdateData extends BaseEmailData {
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
  eventName: string;
  kits: KitItem[];
  statusDescription: string;
  nextSteps?: string;
  estimatedTime?: string;
  trackingCode?: string;
}

// Payment Pending Email
export interface PaymentPendingData extends BaseEmailData {
  eventName: string;
  eventDate: string;
  eventLocation: string;
  kits: KitItem[];
  address: DeliveryAddress;
  pricing: PricingInfo;
  paymentMethod: PaymentMethod;
  paymentUrl?: string;
  expiresAt: string; // 24 hours from order creation
  totalAmount: string;
}

// Welcome Email
export interface WelcomeData extends BaseEmailData {
  // Welcome email is simpler, just basic info
}

// Password Reset Email
export interface PasswordResetData extends BaseEmailData {
  resetToken: string;
  resetUrl: string;
  expirationTime: string;
}

// Promotional Email
export interface PromotionalData extends BaseEmailData {
  promoTitle: string;
  promoDescription: string;
  discountPercentage?: number;
  discountCode?: string;
  validUntil: string;
  ctaText: string;
  ctaUrl: string;
  features?: string[];
}

// Email template result
export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

// Status display information
export interface StatusDisplay {
  text: string;
  color: string;
  class: string;
  description: string;
}

// Utility type for email type identification
export type EmailType = 
  | 'service_confirmation'
  | 'kit_en_route'
  | 'delivery_confirmation'
  | 'status_update'
  | 'payment_pending'
  | 'welcome'
  | 'password_reset'
  | 'promotional';

export interface EmailMetadata {
  type: EmailType;
  version: string;
  timestamp: string;
  locale: string;
}
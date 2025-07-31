// Email Types - KitRunner
// Sistema de tipos TypeScript para templates de email modernos e responsivos

export interface EmailTheme {
  primaryColor: string;      // #5e17eb (roxo KitRunner)
  secondaryColor: string;    // #077d2e (verde para confirmações)
  accentColor: string;       // #10b981 (verde claro)
  backgroundColor: string;   // #f8fafc (cinza claro)
  textColor: string;         // #1f2937 (cinza escuro)
  companyName: string;       // KitRunner
  logoUrl?: string;
  supportEmail: string;
  supportPhone: string;
  instagramHandle: string;   // @kitrunner_
  websiteUrl: string;
}

export const DEFAULT_THEME: EmailTheme = {
  primaryColor: '#5e17eb',
  secondaryColor: '#077d2e', 
  accentColor: '#10b981',
  backgroundColor: '#f8fafc',
  textColor: '#1f2937',
  companyName: 'KitRunner',
  logoUrl: undefined,
  supportEmail: 'contato@kitrunner.com.br',
  supportPhone: '(83) 99999-9999',
  instagramHandle: '@kitrunner_',
  websiteUrl: 'https://kitrunner.com.br'
};

// Dados para confirmação de serviço/pedido
export interface OrderConfirmationData {
  customerName: string;
  customerEmail: string;
  customerCPF: string;
  orderNumber: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  kits: Array<{
    name: string;
    cpf: string;
    shirtSize: string;
  }>;
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  pricing: {
    deliveryCost: string;
    extraKitsCost: string;
    donationCost: string;
    totalCost: string;
  };
  paymentMethod: string;
  status: string;
  theme?: Partial<EmailTheme>;
}

// Dados para atualização de status
export interface StatusUpdateData {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  eventName: string;
  oldStatus: string;
  newStatus: string;
  statusDescription: string;
  estimatedNextStep?: string;
  trackingUrl?: string;
  theme?: Partial<EmailTheme>;
}

// Dados para confirmação de entrega
export interface DeliveryConfirmationData {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  eventName: string;
  deliveryDate: string;
  deliveryTime: string;
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  theme?: Partial<EmailTheme>;
}

// Template de email gerado
export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

// Tipos de email disponíveis
export type EmailType = 
  | 'order_confirmation'     // Confirmação de serviço
  | 'status_update'         // Atualização de status
  | 'kit_on_way'           // Kit a caminho
  | 'delivery_completed'    // Entrega concluída
  | 'welcome'              // Boas-vindas
  | 'promotional';         // Promocional

// Status de pedidos com descrições amigáveis
export interface StatusInfo {
  text: string;
  description: string;
  color: string;
  class: string;
}

export const STATUS_MAPPINGS: Record<string, StatusInfo> = {
  'confirmado': {
    text: 'Serviço Confirmado',
    description: 'Seu pedido de retirada foi confirmado e nossa equipe está se preparando.',
    color: '#077d2e',
    class: 'status-confirmado'
  },
  'aguardando_pagamento': {
    text: 'Aguardando Pagamento',
    description: 'Aguardando confirmação do pagamento para prosseguir com o serviço.',
    color: '#f59e0b',
    class: 'status-aguardando'
  },
  'kits_sendo_retirados': {
    text: 'Retirando seus Kits',
    description: 'Nossa equipe está no local do evento retirando seus kits.',
    color: '#3b82f6',
    class: 'status-retirando'
  },
  'em_transito': {
    text: 'A Caminho da sua Casa',
    description: 'Seus kits foram retirados e estão a caminho do endereço de entrega.',
    color: '#f97316',
    class: 'status-transito'
  },
  'entregue': {
    text: 'Entregue com Sucesso',
    description: 'Seus kits foram entregues no endereço informado. Obrigado pela confiança!',
    color: '#10b981',
    class: 'status-entregue'
  },
  'cancelado': {
    text: 'Cancelado',
    description: 'Este pedido foi cancelado.',
    color: '#ef4444',
    class: 'status-cancelado'
  }
};
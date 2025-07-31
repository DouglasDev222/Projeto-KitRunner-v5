// Types for email system
export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export type EmailType = 
  | 'order_confirmation'
  | 'status_update' 
  | 'payment_confirmation'
  | 'delivery_notification'
  | 'delivery_completed';

export interface OrderConfirmationData {
  orderNumber: string;
  customerName: string;
  customerCPF: string;
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
}

export interface PaymentConfirmationData {
  orderNumber: string;
  customerName: string;
  customerCPF: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  kits: Array<{
    name: string;
    cpf: string;
    shirtSize: string;
  }>;
}

export interface StatusUpdateData {
  orderNumber: string;
  customerName: string;
  eventName: string;
  oldStatus: string;
  newStatus: string;
  statusDescription: string;
  estimatedTime?: string;
}

export interface DeliveryCompletedData {
  orderNumber: string;
  customerName: string;
  eventName: string;
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

export interface EmailLog {
  id: number;
  orderId?: number;
  customerId?: number;
  emailType: EmailType;
  recipientEmail: string;
  subject: string;
  status: 'sent' | 'failed' | 'delivered' | 'bounced';
  sendgridMessageId?: string;
  errorMessage?: string;
  sentAt: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
}
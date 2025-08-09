import { 
  ServiceConfirmationData, 
  KitEnRouteData, 
  DeliveryConfirmationData, 
  StatusUpdateData,
  PaymentPendingData,
  KitItem,
  DeliveryAddress,
  PricingInfo,
  OrderStatus,
  PaymentMethod
} from './email-types';

// Database types from our system
interface DatabaseOrder {
  id: number;
  orderNumber: string;
  eventId: number;
  customerId: number;
  addressId: number;
  kitQuantity: number;
  deliveryCost: string;
  extraKitsCost: string;
  donationCost: string;
  discountAmount: string;
  couponCode?: string;
  totalCost: string;
  paymentMethod: string;
  status: string;
  donationAmount: string;
  createdAt: string;
  customer: {
    id: number;
    name: string;
    cpf: string;
    email: string;
    phone: string;
  };
  event: {
    id: number;
    name: string;
    date: string;
    location: string;
    city: string;
    state: string;
    pickupZipCode: string;
    fixedPrice?: string;
    extraKitPrice: string;
    donationRequired: boolean;
    donationAmount: string;
    donationDescription?: string;
  };
  address: {
    id: number;
    label: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  kits?: Array<{
    id: number;
    orderId: number;
    name: string;
    cpf: string;
    shirtSize: string;
  }>;
}

export class EmailDataMapper {
  
  /**
   * Map database order to ServiceConfirmationData
   */
  static mapToServiceConfirmation(order: DatabaseOrder): ServiceConfirmationData {
    return {
      customerName: order.customer.name,
      customerEmail: order.customer.email,
      customerCPF: order.customer.cpf,
      orderNumber: order.orderNumber,
      eventName: order.event.name,
      eventDate: order.event.date,
      eventLocation: order.event.location,
      pickupLocation: order.event.location, // Same as event location
      kits: this.mapKits(order.kits || []),
      address: this.mapAddress(order.address),
      pricing: this.mapPricing(order),
      paymentMethod: this.mapPaymentMethod(order.paymentMethod),
      status: this.mapOrderStatus(order.status),
      estimatedDelivery: this.calculateEstimatedDelivery(order.event.date)
    };
  }

  /**
   * Map database order to KitEnRouteData
   */
  static mapToKitEnRoute(order: DatabaseOrder): KitEnRouteData {
    return {
      customerName: order.customer.name,
      customerEmail: order.customer.email,
      orderNumber: order.orderNumber,
      eventName: order.event.name,
      kits: this.mapKits(order.kits || []),
      address: this.mapAddress(order.address),
      estimatedDelivery: this.calculateEstimatedDelivery(order.event.date),
      trackingCode: order.orderNumber, // Use order number as tracking code
      driverName: 'Equipe KitRunner', // Default driver name
      driverPhone: '(83) 99999-9999' // Default support phone
    };
  }

  /**
   * Map database order to DeliveryConfirmationData
   */
  static mapToDeliveryConfirmation(order: DatabaseOrder): DeliveryConfirmationData {
    return {
      customerName: order.customer.name,
      customerEmail: order.customer.email,
      orderNumber: order.orderNumber,
      eventName: order.event.name,
      kits: this.mapKits(order.kits || []),
      deliveredAt: new Date().toISOString(), // Current timestamp
      receivedBy: order.customer.name, // Assume customer received
      feedbackUrl: `https://kitrunner.com.br/feedback/${order.orderNumber}`,
      shareMessage: `Acabei de receber meu kit da ${order.event.name} através da @kitrunner_! Serviço excelente! #BoraCorrer`
    };
  }

  /**
   * Map database order to StatusUpdateData
   */
  static mapToStatusUpdate(order: DatabaseOrder, previousStatus: string, newStatus: string): StatusUpdateData {
    return {
      customerName: order.customer.name,
      customerEmail: order.customer.email,
      orderNumber: order.orderNumber,
      previousStatus: this.mapOrderStatus(previousStatus),
      newStatus: this.mapOrderStatus(newStatus),
      eventName: order.event.name,
      kits: this.mapKits(order.kits || []),
      statusDescription: this.getStatusDescription(newStatus),
      nextSteps: this.getNextSteps(newStatus),
      estimatedTime: this.getEstimatedTime(newStatus, order.event.date),
      trackingCode: order.orderNumber
    };
  }

  /**
   * Map database kits to email format
   */
  private static mapKits(kits: Array<{ name: string; cpf: string; shirtSize: string; }>): KitItem[] {
    return kits.map(kit => ({
      name: kit.name,
      cpf: kit.cpf,
      shirtSize: kit.shirtSize as any, // Cast to expected type
      category: 'Kit de Corrida', // Default category
      ticketNumber: undefined
    }));
  }

  /**
   * Map database address to email format
   */
  private static mapAddress(address: any): DeliveryAddress {
    return {
      street: address.street,
      number: address.number,
      complement: address.complement,
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      reference: undefined // Not available in our schema
    };
  }

  /**
   * Map order pricing to email format
   */
  private static mapPricing(order: DatabaseOrder): PricingInfo {
    return {
      deliveryCost: order.deliveryCost,
      extraKitsCost: order.extraKitsCost,
      donationCost: order.donationCost,
      totalCost: order.totalCost
    };
  }

  /**
   * Map payment method string to enum
   */
  private static mapPaymentMethod(paymentMethod: string): PaymentMethod {
    switch (paymentMethod.toLowerCase()) {
      case 'pix':
        return 'pix';
      case 'credit_card':
      case 'cartao':
        return 'cartao';
      case 'boleto':
        return 'boleto';
      default:
        return 'pix';
    }
  }

  /**
   * Map order status string to enum
   */
  private static mapOrderStatus(status: string): OrderStatus {
    // Return status as-is since the database and templates use the same status names
    return status as OrderStatus;
  }

  /**
   * Calculate estimated delivery date based on event date
   */
  private static calculateEstimatedDelivery(eventDate: string): string {
    const eventDateObj = new Date(eventDate);
    const deliveryDate = new Date(eventDateObj);
    deliveryDate.setDate(deliveryDate.getDate() + 1); // Next day after event
    
    return deliveryDate.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  /**
   * Get status description in Portuguese
   */
  private static getStatusDescription(status: string): string {
    const descriptions = {
      'aguardando_pagamento': 'Aguardando confirmação do pagamento',
      'confirmado': 'Pagamento confirmado! Seu pedido está sendo processado',
      'kits_sendo_retirados': 'Nossa equipe está retirando seu kit do evento',
      'em_transito': 'Seu kit foi retirado e está a caminho do endereço de entrega',
      'entregue': 'Kit entregue com sucesso no endereço informado',
      'cancelado': 'Pedido cancelado'
    };

    return descriptions[status as keyof typeof descriptions] || 'Status atualizado';
  }

  /**
   * Get next steps based on status
   */
  private static getNextSteps(status: string): string {
    const nextSteps = {
      'aguardando_pagamento': 'Complete o pagamento para confirmar seu pedido',
      'confirmado': 'Aguarde o dia do evento para retirarmos seu kit',
      'kits_sendo_retirados': 'Nossa equipe está no local do evento retirando seu kit',
      'em_transito': 'Mantenha-se disponível para receber a entrega',
      'entregue': 'Aproveite seu kit e boa corrida!',
      'cancelado': 'Entre em contato conosco se tiver dúvidas'
    };

    return nextSteps[status as keyof typeof nextSteps] || 'Acompanhe as atualizações';
  }

  /**
   * Get estimated time for next update
   */
  private static getEstimatedTime(status: string, eventDate: string): string {
    const eventDateObj = new Date(eventDate);
    const today = new Date();
    
    switch (status) {
      case 'confirmado':
        return `Retirada no dia ${eventDateObj.toLocaleDateString('pt-BR')}`;
      case 'kits_sendo_retirados':
        return 'Em algumas horas';
      case 'em_transito':
        return 'Hoje ou amanhã';
      case 'entregue':
        return 'Entrega concluída';
      default:
        return 'Em breve';
    }
  }

  /**
   * Convert order data to payment pending email data
   */
  static orderToPaymentPendingData(order: DatabaseOrder): PaymentPendingData {
    // Calculate 24 hours from order creation
    const createdAt = new Date(order.createdAt);
    const expiresAt = new Date(createdAt.getTime() + (24 * 60 * 60 * 1000)); // 24 hours

    return {
      customerName: order.customer.name,
      customerEmail: order.customer.email,
      orderNumber: order.orderNumber,
      eventName: order.event.name,
      eventDate: order.event.date,
      eventLocation: order.event.location,
      kits: order.kits?.map(kit => ({
        name: kit.name,
        cpf: kit.cpf,
        shirtSize: kit.shirtSize as "PP" | "P" | "M" | "G" | "GG" | "XG" | "XXG",
        category: 'Kit'
      })) || [],
      address: {
        street: order.address.street,
        number: order.address.number,
        complement: order.address.complement,
        neighborhood: order.address.neighborhood,
        city: order.address.city,
        state: order.address.state,
        zipCode: order.address.zipCode,
        reference: ''
      },
      pricing: {
        deliveryCost: order.deliveryCost,
        extraKitsCost: order.extraKitsCost,
        donationCost: order.donationCost,
        totalCost: order.totalCost
      },
      paymentMethod: order.paymentMethod as PaymentMethod,
      paymentUrl: undefined, // To be set by payment service if available
      expiresAt: expiresAt.toISOString(),
      totalAmount: order.totalCost
    };
  }

  /**
   * Map data for order timeout notification
   */
  static mapOrderTimeout(data: {
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    eventName: string;
    eventDate: string;
    totalAmount: number;
    timeoutHours: number;
  }) {
    return {
      orderNumber: data.orderNumber,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      eventName: data.eventName,
      eventDate: data.eventDate,
      totalAmount: data.totalAmount,
      timeoutHours: data.timeoutHours,
      subject: `Pedido ${data.orderNumber} foi cancelado - ${data.eventName}`,
      heading: 'Pedido Cancelado Automaticamente'
    };
  }

  /**
   * Map order status change data for bulk updates
   */
  static mapOrderStatusChange(data: {
    orderNumber: string;
    customerName: string;
    customerCPF: string;
    eventName: string;
    eventDate: string;
    eventLocation: string;
    newStatus: string;
    previousStatus: string;
    address: DeliveryAddress;
    kits: Array<{ name: string; cpf: string; shirtSize: string; }>;
  }): StatusUpdateData {
    return {
      customerName: data.customerName,
      customerEmail: '', // Will be set by caller
      orderNumber: data.orderNumber,
      eventName: data.eventName,
      eventDate: data.eventDate,
      eventLocation: data.eventLocation,
      kits: data.kits.map(kit => ({
        name: kit.name,
        cpf: kit.cpf,
        shirtSize: kit.shirtSize as "PP" | "P" | "M" | "G" | "GG" | "XG" | "XXG",
        category: 'Kit'
      })),
      address: data.address,
      newStatus: data.newStatus as OrderStatus,
      previousStatus: data.previousStatus as OrderStatus,
      statusDescription: this.getStatusDescription(data.newStatus),
      nextSteps: this.getNextSteps(data.newStatus),
      estimatedTime: this.getEstimatedTime(data.newStatus, data.eventDate),
      trackingCode: undefined // Not used for status updates
    };
  }
}
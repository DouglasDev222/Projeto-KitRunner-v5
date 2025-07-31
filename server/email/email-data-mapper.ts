import { 
  ServiceConfirmationData, 
  KitEnRouteData, 
  DeliveryConfirmationData, 
  StatusUpdateData,
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
    switch (status) {
      case 'aguardando_pagamento':
        return 'aguardando_pagamento';
      case 'confirmado':
        return 'pagamento_confirmado';
      case 'kits_sendo_retirados':
        return 'retirada_confirmada';
      case 'em_transito':
        return 'em_transito';
      case 'entregue':
        return 'entregue';
      case 'cancelado':
        return 'cancelado';
      default:
        return 'aguardando_pagamento';
    }
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
}
import { storage } from "./storage";
import { MercadoPagoService } from "./mercadopago-service";
import { EmailService } from "./email/email-service";
import { EmailDataMapper } from "./email/email-data-mapper";

/**
 * PaymentTimeoutScheduler - Auto-cancel orders after 24 hours without payment
 */
export class PaymentTimeoutScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly checkIntervalMs: number;

  constructor(checkIntervalHours: number = 1) {
    this.checkIntervalMs = checkIntervalHours * 60 * 60 * 1000; // Convert hours to milliseconds
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.intervalId) {
      console.log('⏰ Payment timeout scheduler is already running');
      return;
    }

    console.log(`⏰ Starting payment timeout scheduler (checking every ${this.checkIntervalMs / (1000 * 60 * 60)}h)`);
    
    // Run immediately on start
    this.checkExpiredOrders();

    // Then run at intervals
    this.intervalId = setInterval(() => {
      this.checkExpiredOrders();
    }, this.checkIntervalMs);
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏰ Payment timeout scheduler stopped');
    }
  }

  /**
   * Check and cancel expired orders
   */
  private async checkExpiredOrders(): Promise<void> {
    try {
      console.log('⏰ Checking for expired payment orders...');

      // Get all orders awaiting payment
      const allOrders = await storage.getAllOrders();
      const awaitingPaymentOrders = allOrders.filter(order => order.status === 'aguardando_pagamento');

      console.log(`⏰ Found ${awaitingPaymentOrders.length} orders awaiting payment`);

      let expiredCount = 0;

      for (const order of awaitingPaymentOrders) {
        const isExpired = this.isOrderPaymentExpired(order.paymentCreatedAt || order.createdAt);

        if (isExpired) {
          try {
            console.log(`⏰ Canceling expired order: ${order.orderNumber} (created ${order.paymentCreatedAt || order.createdAt})`);
            
            // Send timeout notification email first
            await this.sendTimeoutNotificationEmail(order);

            // Update order status to cancelled (without sending generic email since we already sent specific timeout email)
            await storage.updateOrderStatus(
              order.id, 
              "cancelado", 
              "system", 
              "Sistema Automático",
              "Pagamento expirou após 24 horas",
              `timeout-batch-${new Date().getTime()}`,
              false // Don't send generic email - we already sent specific timeout email above
            );

            expiredCount++;
          } catch (error) {
            console.error(`⏰ Error canceling order ${order.orderNumber}:`, error);
          }
        }
      }

      if (expiredCount > 0) {
        console.log(`⏰ Successfully canceled ${expiredCount} expired orders`);
      } else {
        console.log('⏰ No expired orders found');
      }

    } catch (error) {
      console.error('⏰ Error in payment timeout scheduler:', error);
    }
  }

  /**
   * Check if order payment is expired (24 hours)
   */
  private isOrderPaymentExpired(createdAt: Date | string): boolean {
    if (!createdAt) return false;

    const created = new Date(createdAt);
    const now = new Date();
    const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);

    return diffHours >= 24;
  }

  /**
   * Send timeout notification email
   */
  private async sendTimeoutNotificationEmail(order: any): Promise<void> {
    try {
      // Get customer details
      const customer = await storage.getCustomer(order.customerId);
      const event = await storage.getEvent(order.eventId);

      if (!customer || !event) {
        console.error(`⏰ Cannot send timeout email - missing customer or event data for order ${order.orderNumber}`);
        return;
      }

      // Prepare email data
      const emailData = EmailDataMapper.mapOrderTimeout({
        orderNumber: order.orderNumber,
        customerName: customer.name,
        customerEmail: customer.email,
        eventName: event.name,
        eventDate: event.date,
        totalAmount: parseFloat(order.totalCost),
        timeoutHours: 24
      });

      // Send email
      await EmailService.sendOrderTimeoutNotification(emailData);

      console.log(`⏰ Timeout notification sent to ${customer.email} for order ${order.orderNumber}`);
    } catch (error) {
      console.error(`⏰ Error sending timeout notification for order ${order.orderNumber}:`, error);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): { running: boolean; checkInterval: number } {
    return {
      running: this.intervalId !== null,
      checkInterval: this.checkIntervalMs / (1000 * 60 * 60) // Convert back to hours
    };
  }
}

// Export singleton instance
export const paymentTimeoutScheduler = new PaymentTimeoutScheduler();
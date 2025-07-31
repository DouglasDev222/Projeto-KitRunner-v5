import { EmailService } from './email-service';
import { EmailDataMapper } from './email-data-mapper';
import { DatabaseStorage } from '../storage';

/**
 * Payment Reminder Scheduler
 * Handles automatic sending of payment pending emails
 */
export class PaymentReminderScheduler {
  private static emailService: EmailService;
  private static storage: DatabaseStorage;
  private static scheduledEmails: Map<string, NodeJS.Timeout> = new Map();

  static initialize(emailService: EmailService, storage: DatabaseStorage) {
    this.emailService = emailService;
    this.storage = storage;
    console.log('📧 Payment Reminder Scheduler initialized');
  }

  /**
   * Schedule payment pending email to be sent 1 minute after order creation
   */
  static schedulePaymentPendingEmail(orderNumber: string, delayMinutes: number = 1): void {
    // Clear any existing schedule for this order
    this.cancelScheduledEmail(orderNumber);

    const delayMs = delayMinutes * 60 * 1000; // Convert minutes to milliseconds
    
    const timeout = setTimeout(async () => {
      try {
        console.log(`📧 Checking payment status for order ${orderNumber}...`);
        
        // Get order details from database
        const orders = await this.storage.getAllOrdersWithDetails();
        const order = orders.find(o => o.orderNumber === orderNumber);
        
        if (!order) {
          console.log(`⚠️ Order ${orderNumber} not found, skipping payment reminder`);
          return;
        }

        // Check if payment is still pending
        if (order.status === 'aguardando_pagamento') {
          console.log(`📧 Sending payment pending email for order ${orderNumber}`);
          
          // Convert order to email data
          const emailData = EmailDataMapper.orderToPaymentPendingData(order);
          
          // Send payment pending email
          const emailSent = await this.emailService.sendPaymentPending(
            emailData,
            order.customer.email,
            order.id,
            order.customerId
          );

          if (emailSent) {
            console.log(`✅ Payment pending email sent for order ${orderNumber}`);
          } else {
            console.log(`❌ Failed to send payment pending email for order ${orderNumber}`);
          }
        } else {
          console.log(`✅ Order ${orderNumber} payment status is now ${order.status}, no reminder needed`);
        }
      } catch (error) {
        console.error(`❌ Error sending payment pending email for order ${orderNumber}:`, error);
      } finally {
        // Remove from scheduled emails map
        this.scheduledEmails.delete(orderNumber);
      }
    }, delayMs);

    // Store the timeout so we can cancel it if needed
    this.scheduledEmails.set(orderNumber, timeout);
    
    console.log(`⏰ Payment pending email scheduled for order ${orderNumber} in ${delayMinutes} minute(s)`);
  }

  /**
   * Cancel scheduled email for an order (e.g., when payment is confirmed)
   */
  static cancelScheduledEmail(orderNumber: string): void {
    const timeout = this.scheduledEmails.get(orderNumber);
    if (timeout) {
      clearTimeout(timeout);
      this.scheduledEmails.delete(orderNumber);
      console.log(`🚫 Cancelled scheduled payment reminder for order ${orderNumber}`);
    }
  }

  /**
   * Get count of currently scheduled emails
   */
  static getScheduledEmailsCount(): number {
    return this.scheduledEmails.size;
  }

  /**
   * Cancel all scheduled emails (useful for cleanup)
   */
  static cancelAllScheduledEmails(): void {
    this.scheduledEmails.forEach((timeout, orderNumber) => {
      clearTimeout(timeout);
    });
    this.scheduledEmails.clear();
    console.log('🚫 All scheduled payment reminders cancelled');
  }
}
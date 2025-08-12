import sgMail from '@sendgrid/mail';
import { DatabaseStorage } from '../storage';
import { db } from '../db';
import { adminUsers } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { 
  generateServiceConfirmationTemplate, 
  generateStatusUpdateTemplate,
  generateDeliveryConfirmationTemplate,
  generateKitEnRouteTemplate,
  generatePaymentPendingTemplate,
  generateAdminOrderConfirmationTemplate,
  EmailUtils
} from './email-templates';
import { 
  ServiceConfirmationData, 
  StatusUpdateData, 
  DeliveryConfirmationData,
  KitEnRouteData,
  PaymentPendingData,
  AdminOrderConfirmationData,
  EmailType
} from './email-types';

// Configure SendGrid (optional - will log if not configured)
const SENDGRID_ENABLED = !!process.env.SENDGRID_API_KEY;

if (SENDGRID_ENABLED) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
  console.log('📧 SendGrid configured successfully');
} else {
  console.log('⚠️ SendGrid not configured - email notifications disabled');
}

export class EmailService {
  private storage: DatabaseStorage;
  private fromEmail: string;
  private fromName: string;

  constructor(storage: DatabaseStorage) {
    this.storage = storage;
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'contato@kitrunner.com.br';
    this.fromName = process.env.SENDGRID_FROM_NAME || 'KitRunner';
  }

  /**
   * Send service confirmation email (for confirmed orders)
   */
  async sendServiceConfirmation(data: ServiceConfirmationData, recipientEmail: string, orderId?: number, customerId?: number): Promise<boolean> {
    try {
      if (!SENDGRID_ENABLED) {
        console.log('📧 Email service disabled - would send service confirmation to:', recipientEmail);
        return false;
      }

      const template = generateServiceConfirmationTemplate(data);
      
      const msg = {
        to: recipientEmail,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject: template.subject,
        text: template.text,
        html: template.html,
      };

      console.log('📧 Sending order confirmation email to:', recipientEmail);
      const response = await sgMail.send(msg);
      
      // Log success
      await this.logEmail({
        orderId,
        customerId,
        emailType: 'service_confirmation',
        recipientEmail,
        subject: template.subject,
        status: 'sent',
        sendgridMessageId: response[0].headers['x-message-id'] || undefined,
      });

      console.log('✅ Service confirmation email sent successfully');
      return true;
    } catch (error) {
      console.error('❌ Error sending order confirmation email:', error);
      
      // Log failure
      await this.logEmail({
        orderId,
        customerId,
        emailType: 'service_confirmation',
        recipientEmail,
        subject: `Pedido ${data.orderNumber} confirmado - KitRunner`,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      return false;
    }
  }

  /**
   * Send kit en route email (when status = 'em_transito')
   */
  async sendKitEnRoute(data: KitEnRouteData, recipientEmail: string, orderId?: number, customerId?: number): Promise<boolean> {
    try {
      if (!SENDGRID_ENABLED) {
        console.log('📧 Email service disabled - would send kit en route to:', recipientEmail);
        return false;
      }

      const template = generateKitEnRouteTemplate(data);
      
      const msg = {
        to: recipientEmail,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject: template.subject,
        text: template.text,
        html: template.html,
      };

      console.log('📧 Sending kit en route email to:', recipientEmail);
      const response = await sgMail.send(msg);
      
      // Log success
      await this.logEmail({
        orderId,
        customerId,
        emailType: 'kit_en_route',
        recipientEmail,
        subject: template.subject,
        status: 'sent',
        sendgridMessageId: response[0].headers['x-message-id'] || undefined,
      });

      console.log('✅ Kit en route email sent successfully');
      return true;
    } catch (error) {
      console.error('❌ Error sending kit en route email:', error);
      
      // Log failure
      await this.logEmail({
        orderId,
        customerId,
        emailType: 'kit_en_route',
        recipientEmail,
        subject: `Seu kit está a caminho! - ${data.orderNumber}`,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      return false;
    }
  }

  /**
   * Send delivery confirmation email (when status = 'entregue')
   */
  async sendDeliveryConfirmation(data: DeliveryConfirmationData, recipientEmail: string, orderId?: number, customerId?: number): Promise<boolean> {
    try {
      if (!SENDGRID_ENABLED) {
        console.log('📧 Email service disabled - would send delivery confirmation to:', recipientEmail);
        return false;
      }

      const template = generateDeliveryConfirmationTemplate(data);
      
      const msg = {
        to: recipientEmail,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject: template.subject,
        text: template.text,
        html: template.html,
      };

      console.log('📧 Sending delivery confirmation email to:', recipientEmail);
      const response = await sgMail.send(msg);
      
      // Log success
      await this.logEmail({
        orderId,
        customerId,
        emailType: 'delivery_confirmation',
        recipientEmail,
        subject: template.subject,
        status: 'sent',
        sendgridMessageId: response[0].headers['x-message-id'] || undefined,
      });

      console.log('✅ Delivery confirmation email sent successfully');
      return true;
    } catch (error) {
      console.error('❌ Error sending delivery confirmation email:', error);
      
      // Log failure
      await this.logEmail({
        orderId,
        customerId,
        emailType: 'delivery_confirmation',
        recipientEmail,
        subject: `Seu kit chegou direitinho em sua casa! 🎉`,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      return false;
    }
  }

  /**
   * Send status update email
   */
  async sendStatusUpdateEmail(data: StatusUpdateData, recipientEmail: string, orderId?: number, customerId?: number): Promise<boolean> {
    try {
      if (!SENDGRID_ENABLED) {
        console.log('📧 Email service disabled - would send status update to:', recipientEmail);
        return false;
      }

      const template = generateStatusUpdateTemplate(data);
      
      const msg = {
        to: recipientEmail,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject: template.subject,
        text: template.text,
        html: template.html,
      };

      console.log('📧 Sending status update email to:', recipientEmail);
      const response = await sgMail.send(msg);
      
      // Log success
      await this.logEmail({
        orderId,
        customerId,
        emailType: 'status_update',
        recipientEmail,
        subject: template.subject,
        status: 'sent',
        sendgridMessageId: response[0].headers['x-message-id'] || undefined,
      });

      console.log('✅ Status update email sent successfully');
      return true;
    } catch (error) {
      console.error('❌ Error sending status update email:', error);
      
      // Log failure
      await this.logEmail({
        orderId,
        customerId,
        emailType: 'status_update',
        recipientEmail,
        subject: `Atualização do pedido ${data.orderNumber} - KitRunner`,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      return false;
    }
  }

  /**
   * Send payment pending email (for payment reminders)
   */
  async sendPaymentPending(data: PaymentPendingData, recipientEmail: string, orderId?: number, customerId?: number): Promise<boolean> {
    try {
      if (!SENDGRID_ENABLED) {
        console.log('📧 Email service disabled - would send payment pending to:', recipientEmail);
        return false;
      }

      const template = generatePaymentPendingTemplate(data);
      
      const msg = {
        to: recipientEmail,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject: template.subject,
        text: template.text,
        html: template.html,
      };

      console.log('📧 Sending payment pending email to:', recipientEmail);
      const response = await sgMail.send(msg);
      
      // Log success
      await this.logEmail({
        orderId,
        customerId,
        emailType: 'payment_pending',
        recipientEmail,
        subject: template.subject,
        status: 'sent',
        sendgridMessageId: response[0].headers['x-message-id'] || undefined,
      });

      console.log('✅ Payment pending email sent successfully');
      return true;
    } catch (error) {
      console.error('❌ Error sending payment pending email:', error);
      
      // Log failure
      await this.logEmail({
        orderId,
        customerId,
        emailType: 'payment_pending',
        recipientEmail,
        subject: `⏳ Aguardando Pagamento - Finalize seu pedido!`,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      return false;
    }
  }

  /**
   * Send test email
   */
  async sendTestEmail(recipientEmail: string): Promise<boolean> {
    try {
      if (!SENDGRID_ENABLED) {
        console.log('📧 Email service disabled - would send test email to:', recipientEmail);
        return false;
      }
      const msg = {
        to: recipientEmail,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject: 'Teste de Integração SendGrid - KitRunner',
        text: `
Teste de Integração SendGrid - KitRunner

Este é um email de teste para verificar a integração com o SendGrid.

Se você recebeu este email, a configuração está funcionando corretamente!

Data/Hora: ${new Date().toLocaleString('pt-BR')}
Sistema: KitRunner Email Notification System
        `,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Teste SendGrid - KitRunner</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden;">
    
    <!-- Header -->
    <div style="background-color: #3B82F6; color: white; padding: 20px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">🧪 Teste de Integração</h1>
      <p style="margin: 10px 0 0 0;">KitRunner Email System</p>
    </div>

    <!-- Content -->
    <div style="padding: 30px;">
      <h2 style="color: #1e40af; margin: 0 0 20px 0;">✅ Configuração Bem-Sucedida!</h2>
      
      <p>Este é um email de teste para verificar a integração com o SendGrid.</p>
      
      <p>Se você recebeu este email, significa que:</p>
      <ul>
        <li>A chave da API SendGrid está configurada corretamente</li>
        <li>O serviço de email está funcionando</li>
        <li>Os templates HTML estão sendo renderizados</li>
        <li>O sistema está pronto para enviar notificações reais</li>
      </ul>

      <div style="background-color: #f0fdf4; border: 2px solid #10B981; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #16a34a;">Sistema Operacional</h3>
        <p style="margin: 0;"><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
        <p style="margin: 5px 0 0 0;"><strong>Status:</strong> Integração SendGrid ativa</p>
      </div>

      <p><strong>Próximos passos:</strong></p>
      <ol>
        <li>Integrar com criação de pedidos</li>
        <li>Integrar com atualizações de status</li>
        <li>Implementar logs de email no admin</li>
      </ol>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
      <p><strong>KitRunner</strong> - Sistema de Gerenciamento de Kits para Eventos</p>
      <p>Este é um email automático de teste.</p>
    </div>
  </div>
</body>
</html>
        `,
      };

      console.log('📧 Sending test email to:', recipientEmail);
      const response = await sgMail.send(msg);
      
      // Log test email
      await this.logEmail({
        emailType: 'service_confirmation', // Use existing type for test
        recipientEmail,
        subject: msg.subject,
        status: 'sent',
        sendgridMessageId: response[0].headers['x-message-id'] || undefined,
      });

      console.log('✅ Test email sent successfully');
      return true;
    } catch (error) {
      console.error('❌ Error sending test email:', error);
      
      // Log failure
      await this.logEmail({
        emailType: 'service_confirmation',
        recipientEmail,
        subject: 'Teste de Integração SendGrid - KitRunner',
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      return false;
    }
  }

  /**
   * Log email to database
   */
  private async logEmail(emailData: {
    orderId?: number;
    customerId?: number;
    emailType: EmailType;
    recipientEmail: string;
    subject: string;
    status: 'sent' | 'failed' | 'delivered' | 'bounced';
    sendgridMessageId?: string;
    errorMessage?: string;
  }): Promise<void> {
    try {
      await this.storage.createEmailLog(emailData);
    } catch (error) {
      console.error('❌ Error logging email:', error);
    }
  }

  /**
   * Get email logs for admin panel
   */
  async getEmailLogs(filters?: {
    orderId?: number;
    customerId?: number;
    emailType?: EmailType;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    return this.storage.getEmailLogs(filters);
  }

  /**
   * Send order status update email (alias for sendStatusUpdateEmail)
   */
  async sendOrderStatusUpdate(data: StatusUpdateData, recipientEmail: string, orderId?: number, customerId?: number): Promise<boolean> {
    return this.sendStatusUpdateEmail(data, recipientEmail, orderId, customerId);
  }

  /**
   * Send payment confirmation email (alias for sendServiceConfirmation)
   */
  async sendPaymentConfirmation(data: ServiceConfirmationData, recipientEmail: string, orderId?: number, customerId?: number): Promise<boolean> {
    return this.sendServiceConfirmation(data, recipientEmail, orderId, customerId);
  }

  /**
   * Send order timeout notification email
   */
  static async sendOrderTimeoutNotification(data: any): Promise<boolean> {
    try {
      if (!SENDGRID_ENABLED) {
        console.log('📧 Email service disabled - would send timeout notification to:', data.customerEmail);
        return false;
      }

      const msg = {
        to: data.customerEmail,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || 'contato@kitrunner.com.br',
          name: process.env.SENDGRID_FROM_NAME || 'KitRunner'
        },
        subject: data.subject || `Pedido ${data.orderNumber} foi cancelado`,
        text: `Olá ${data.customerName}, seu pedido ${data.orderNumber} para o evento ${data.eventName} foi cancelado automaticamente após ${data.timeoutHours} horas sem pagamento.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Pedido Cancelado Automaticamente</h2>
            <p>Olá <strong>${data.customerName}</strong>,</p>
            <p>Seu pedido <strong>${data.orderNumber}</strong> para o evento <strong>${data.eventName}</strong> foi cancelado automaticamente após ${data.timeoutHours} horas sem confirmação de pagamento.</p>
            <p>Se ainda tiver interesse no kit, você pode fazer um novo pedido através do nosso site.</p>
            <p>Atenciosamente,<br>Equipe KitRunner</p>
          </div>
        `
      };

      console.log('📧 Sending timeout notification email to:', data.customerEmail);
      await sgMail.send(msg);
      
      console.log(`⏰ Timeout notification sent successfully to ${data.customerEmail} for order ${data.orderNumber}`);
      return true;
    } catch (error) {
      console.error(`⏰ Error sending timeout notification for order ${data.orderNumber}:`, error);
      return false;
    }
  }

  /**
   * Send admin order confirmation email
   */
  async sendAdminOrderConfirmation(data: AdminOrderConfirmationData, recipientEmail: string, orderId?: number): Promise<boolean> {
    try {
      if (!SENDGRID_ENABLED) {
        console.log('📧 Email service disabled - would send admin order confirmation to:', recipientEmail);
        return false;
      }

      const template = generateAdminOrderConfirmationTemplate(data);
      
      const msg = {
        to: recipientEmail,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject: template.subject,
        text: template.text,
        html: template.html,
      };

      console.log('📧 Sending admin order confirmation email to:', recipientEmail);
      const response = await sgMail.send(msg);
      
      // Log success
      await this.logEmail({
        orderId,
        emailType: 'admin_order_confirmation',
        recipientEmail,
        subject: template.subject,
        status: 'sent',
        sendgridMessageId: response[0].headers['x-message-id'] || undefined,
      });

      console.log('✅ Admin order confirmation email sent successfully');
      return true;
    } catch (error) {
      console.error('❌ Error sending admin order confirmation email:', error);
      
      // Log failure
      await this.logEmail({
        orderId,
        emailType: 'admin_order_confirmation',
        recipientEmail,
        subject: `Novo Pedido Confirmado - ${data.orderNumber}`,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      return false;
    }
  }

  /**
   * Send admin order confirmations to all admins with receiveOrderEmails = true
   */
  async sendAdminOrderConfirmations(data: AdminOrderConfirmationData, orderId?: number): Promise<boolean> {
    try {
      // Get all admins who want to receive order emails
      const admins = await db
        .select({
          id: adminUsers.id,
          email: adminUsers.email,
          fullName: adminUsers.fullName
        })
        .from(adminUsers)
        .where(eq(adminUsers.receiveOrderEmails, true));
      
      if (admins.length === 0) {
        console.log('📧 No administrators configured to receive order emails');
        return true;
      }

      console.log(`📧 Sending admin order confirmation to ${admins.length} administrator(s)`);
      
      // Send emails in parallel to all admin recipients
      const emailPromises = admins.map((admin: { id: number; email: string; fullName: string }) => 
        this.sendAdminOrderConfirmation(data, admin.email, orderId)
      );
      
      const results = await Promise.allSettled(emailPromises);
      
      // Count successful sends
      const successful = results.filter((result: PromiseSettledResult<boolean>) => 
        result.status === 'fulfilled' && result.value === true
      ).length;
      
      const failed = results.length - successful;
      
      if (successful > 0) {
        console.log(`✅ Admin order confirmation sent to ${successful} administrator(s)`);
      }
      
      if (failed > 0) {
        console.log(`❌ Failed to send admin order confirmation to ${failed} administrator(s)`);
      }
      
      return successful > 0; // Return true if at least one email was sent successfully
    } catch (error) {
      console.error('❌ Error sending admin order confirmations:', error);
      return false;
    }
  }
}
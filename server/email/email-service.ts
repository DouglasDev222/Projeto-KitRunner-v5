import sgMail from '@sendgrid/mail';
import { Resend } from 'resend';
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

// Configure Resend (primary) and SendGrid (fallback)
const resend = new Resend(process.env.RESEND_API_KEY);
const RESEND_ENABLED = !!process.env.RESEND_API_KEY;
const SENDGRID_ENABLED = !!process.env.SENDGRID_API_KEY;

if (RESEND_ENABLED) {
  console.log('📧 Resend configured successfully (primary provider)');
} else {
  console.log('⚠️ Resend not configured');
}

if (SENDGRID_ENABLED) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
  console.log('📧 SendGrid configured successfully (fallback provider)');
} else {
  console.log('⚠️ SendGrid not configured');
}

if (!RESEND_ENABLED && !SENDGRID_ENABLED) {
  console.log('❌ No email providers configured - email notifications disabled');
}

export class EmailService {
  private storage: DatabaseStorage;
  private fromEmail: string;
  private fromName: string;
  private static lastResendCall: number = 0;
  private static readonly RESEND_RATE_LIMIT_MS = 600; // 600ms between calls (1.67 calls/sec, under 2/sec limit)

  constructor(storage: DatabaseStorage) {
    this.storage = storage;
    this.fromEmail = process.env.RESEND_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || 'contato@kitrunner.com.br';
    this.fromName = process.env.RESEND_FROM_NAME || process.env.SENDGRID_FROM_NAME || 'KitRunner';
  }

  /**
   * Wait for Resend rate limit (max 2 calls per second)
   */
  private async waitForResendRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - EmailService.lastResendCall;
    
    if (timeSinceLastCall < EmailService.RESEND_RATE_LIMIT_MS) {
      const waitTime = EmailService.RESEND_RATE_LIMIT_MS - timeSinceLastCall;
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms before Resend call`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    EmailService.lastResendCall = Date.now();
  }

  /**
   * Send email with Resend (primary) and SendGrid fallback
   */
  private async sendEmailWithFallback(emailData: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<{ success: boolean; messageId?: string; error?: any; provider?: string }> {
    
    // Try Resend first
    if (RESEND_ENABLED) {
      try {
        // Rate limiting: ensure we don't exceed 2 calls per second
        await this.waitForResendRateLimit();
        
        console.log('📧 Attempting to send email via Resend...');
        const { data, error } = await resend.emails.send({
          from: `${this.fromName} <${this.fromEmail}>`,
          to: emailData.to,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
        });

        if (error) {
          console.error('❌ Resend error:', error);
          throw new Error(error.message || 'Resend send failed');
        }

        console.log('✅ Email sent successfully via Resend');
        return {
          success: true,
          messageId: data?.id,
          provider: 'resend'
        };
      } catch (error) {
        console.error('❌ Resend failed, trying SendGrid fallback...');
      }
    }

    // Fallback to SendGrid
    if (SENDGRID_ENABLED) {
      try {
        console.log('📧 Attempting to send email via SendGrid (fallback)...');
        const msg = {
          to: emailData.to,
          from: {
            email: this.fromEmail,
            name: this.fromName
          },
          subject: emailData.subject,
          text: emailData.text,
          html: emailData.html,
        };

        const response = await sgMail.send(msg);
        console.log('✅ Email sent successfully via SendGrid (fallback)');
        
        return {
          success: true,
          messageId: response[0].headers['x-message-id'] || undefined,
          provider: 'sendgrid'
        };
      } catch (error) {
        console.error('❌ SendGrid also failed:', error);
        return {
          success: false,
          error,
          provider: 'sendgrid'
        };
      }
    }

    // No providers available
    console.log('📧 No email providers available - would send email to:', emailData.to);
    return {
      success: false,
      error: 'No email providers configured',
      provider: 'none'
    };
  }

  /**
   * Send service confirmation email (for confirmed orders)
   */
  async sendServiceConfirmation(data: ServiceConfirmationData, recipientEmail: string, orderId?: number, customerId?: number): Promise<boolean> {
    try {
      if (!RESEND_ENABLED && !SENDGRID_ENABLED) {
        console.log('📧 No email providers available - would send service confirmation to:', recipientEmail);
        return false;
      }

      const template = generateServiceConfirmationTemplate(data);
      
      console.log('📧 Sending order confirmation email to:', recipientEmail);
      const result = await this.sendEmailWithFallback({
        to: recipientEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
      
      if (result.success) {
        // Log success
        await this.logEmail({
          orderId,
          customerId,
          emailType: 'service_confirmation',
          recipientEmail,
          subject: template.subject,
          status: 'sent',
          messageId: result.messageId,
          provider: result.provider,
        });

        console.log('✅ Service confirmation email sent successfully');
        return true;
      } else {
        throw new Error(result.error);
      }
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
      if (!RESEND_ENABLED && !SENDGRID_ENABLED) {
        console.log('📧 No email providers available - would send kit en route to:', recipientEmail);
        return false;
      }

      const template = generateKitEnRouteTemplate(data);
      
      console.log('📧 Sending kit en route email to:', recipientEmail);
      const result = await this.sendEmailWithFallback({
        to: recipientEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
      
      if (result.success) {
        // Log success
        await this.logEmail({
          orderId,
          customerId,
          emailType: 'kit_en_route',
          recipientEmail,
          subject: template.subject,
          status: 'sent',
          messageId: result.messageId,
          provider: result.provider,
        });

        console.log('✅ Kit en route email sent successfully');
        return true;
      } else {
        throw new Error(result.error);
      }
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
      if (!RESEND_ENABLED && !SENDGRID_ENABLED) {
        console.log('📧 No email providers available - would send delivery confirmation to:', recipientEmail);
        return false;
      }

      const template = generateDeliveryConfirmationTemplate(data);
      
      console.log('📧 Sending delivery confirmation email to:', recipientEmail);
      const result = await this.sendEmailWithFallback({
        to: recipientEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
      
      if (result.success) {
        // Log success
        await this.logEmail({
          orderId,
          customerId,
          emailType: 'delivery_confirmation',
          recipientEmail,
          subject: template.subject,
          status: 'sent',
          messageId: result.messageId,
          provider: result.provider,
        });

        console.log('✅ Delivery confirmation email sent successfully');
        return true;
      } else {
        throw new Error(result.error);
      }
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
      if (!RESEND_ENABLED && !SENDGRID_ENABLED) {
        console.log('📧 No email providers available - would send status update to:', recipientEmail);
        return false;
      }

      const template = generateStatusUpdateTemplate(data);
      
      console.log('📧 Sending status update email to:', recipientEmail);
      const result = await this.sendEmailWithFallback({
        to: recipientEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
      
      if (result.success) {
        // Log success
        await this.logEmail({
          orderId,
          customerId,
          emailType: 'status_update',
          recipientEmail,
          subject: template.subject,
          status: 'sent',
          messageId: result.messageId,
          provider: result.provider,
        });

        console.log('✅ Status update email sent successfully');
        return true;
      } else {
        throw new Error(result.error);
      }
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
      if (!RESEND_ENABLED && !SENDGRID_ENABLED) {
        console.log('📧 No email providers available - would send payment pending to:', recipientEmail);
        return false;
      }

      const template = generatePaymentPendingTemplate(data);
      
      console.log('📧 Sending payment pending email to:', recipientEmail);
      const result = await this.sendEmailWithFallback({
        to: recipientEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
      
      if (result.success) {
        // Log success
        await this.logEmail({
          orderId,
          customerId,
          emailType: 'payment_pending',
          recipientEmail,
          subject: template.subject,
          status: 'sent',
          messageId: result.messageId,
          provider: result.provider,
        });

        console.log('✅ Payment pending email sent successfully');
        return true;
      } else {
        throw new Error(result.error);
      }
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
      if (!RESEND_ENABLED && !SENDGRID_ENABLED) {
        console.log('📧 No email providers available - would send test email to:', recipientEmail);
        return false;
      }

      const providerText = RESEND_ENABLED ? 'Resend' : 'SendGrid';
      
      const emailData = {
        to: recipientEmail,
        subject: `Teste de Integração ${providerText} - KitRunner`,
        text: `
Teste de Integração ${providerText} - KitRunner

Este é um email de teste para verificar a integração com o ${providerText}.

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
  <title>Teste ${providerText} - KitRunner</title>
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
      
      <p>Este é um email de teste para verificar a integração com o <strong>${providerText}</strong>.</p>
      
      <p>Se você recebeu este email, significa que:</p>
      <ul>
        <li>A chave da API ${providerText} está configurada corretamente</li>
        <li>O serviço de email está funcionando</li>
        <li>Os templates HTML estão sendo renderizados</li>
        <li>O sistema está pronto para enviar notificações reais</li>
      </ul>

      <div style="background-color: #f0fdf4; border: 2px solid #10B981; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #16a34a;">Sistema Operacional</h3>
        <p style="margin: 0;"><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
        <p style="margin: 5px 0 0 0;"><strong>Status:</strong> Integração ${providerText} ativa</p>
        <p style="margin: 5px 0 0 0;"><strong>Provedor:</strong> ${RESEND_ENABLED ? 'Resend (principal)' : 'SendGrid (fallback)'}</p>
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
      const result = await this.sendEmailWithFallback(emailData);
      
      if (result.success) {
        // Log test email
        await this.logEmail({
          emailType: 'service_confirmation', // Use existing type for test
          recipientEmail,
          subject: emailData.subject,
          status: 'sent',
          messageId: result.messageId,
          provider: result.provider,
        });

        console.log('✅ Test email sent successfully');
        return true;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ Error sending test email:', error);
      
      // Log failure
      await this.logEmail({
        emailType: 'service_confirmation',
        recipientEmail,
        subject: `Teste de Integração ${RESEND_ENABLED ? 'Resend' : 'SendGrid'} - KitRunner`,
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
    messageId?: string;
    provider?: string;
    sendgridMessageId?: string;
    errorMessage?: string;
  }): Promise<void> {
    try {
      // Map the messageId to sendgridMessageId for database compatibility
      const dbEmailData = {
        ...emailData,
        sendgridMessageId: emailData.messageId || emailData.sendgridMessageId,
      };
      
      // Remove temporary fields not in database schema
      delete (dbEmailData as any).messageId;
      delete (dbEmailData as any).provider;
      
      await this.storage.createEmailLog(dbEmailData);
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
   * FIXED: Use shared rate limiting by using a singleton instance
   */
  static async sendOrderTimeoutNotification(data: any): Promise<boolean> {
    try {
      if (!RESEND_ENABLED && !SENDGRID_ENABLED) {
        console.log('📧 Email service disabled - would send timeout notification to:', data.customerEmail);
        return false;
      }

      // Use shared instance to respect rate limiting
      const { DatabaseStorage } = await import('../storage');
      const storage = new DatabaseStorage();
      const emailService = new EmailService(storage);
      
      const emailData = {
        to: data.customerEmail,
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
      const result = await emailService.sendEmailWithFallback(emailData);
      
      if (result.success) {
        console.log(`⏰ Timeout notification sent successfully to ${data.customerEmail} for order ${data.orderNumber}`);
        return true;
      } else {
        throw new Error(result.error);
      }
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
      if (!RESEND_ENABLED && !SENDGRID_ENABLED) {
        console.log('📧 Email service disabled - would send admin order confirmation to:', recipientEmail);
        return false;
      }

      const template = generateAdminOrderConfirmationTemplate(data);
      
      const emailData = {
        to: recipientEmail,
        subject: template.subject,
        text: template.text,
        html: template.html,
      };

      console.log('📧 Sending admin order confirmation email to:', recipientEmail);
      const result = await this.sendEmailWithFallback(emailData);
      
      if (result.success) {
        // Log success
        await this.logEmail({
          orderId,
          emailType: 'admin_order_confirmation',
          recipientEmail,
          subject: template.subject,
          status: 'sent',
          messageId: result.messageId,
          provider: result.provider,
        });

        console.log('✅ Admin order confirmation email sent successfully');
        return true;
      } else {
        throw new Error(result.error);
      }
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
   * FIXED: Send emails sequentially to respect Resend rate limiting
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

      console.log(`📧 Sending admin order confirmation to ${admins.length} administrator(s) sequentially`);
      
      // Send emails SEQUENTIALLY to respect rate limiting
      let successful = 0;
      let failed = 0;
      
      for (const admin of admins) {
        try {
          const result = await this.sendAdminOrderConfirmation(data, admin.email, orderId);
          if (result) {
            successful++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error(`❌ Failed to send admin email to ${admin.email}:`, error);
          failed++;
        }
      }
      
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
import sgMail from '@sendgrid/mail';
import { DatabaseStorage } from '../storage';
import { 
  generateServiceConfirmationTemplate, 
  generateStatusUpdateTemplate,
  generateDeliveryConfirmationTemplate,
  generateKitEnRouteTemplate,
  EmailUtils
} from './email-templates';
import { 
  ServiceConfirmationData, 
  StatusUpdateData, 
  DeliveryConfirmationData,
  KitEnRouteData,
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
}
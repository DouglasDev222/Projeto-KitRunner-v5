import axios, { AxiosResponse } from 'axios';
import { DatabaseStorage } from './storage';
import { InsertWhatsappMessage, WhatsappSettings } from '@shared/schema';

// API Configuration
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'http://91.108.126.63:5000';
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN || '12345678';

// WhatsApp API Response Types - Updated for new API format
export interface WhatsAppMessageResponse {
  success: boolean;
  message?: string;
  data?: {
    number: string;
    message: string;
  };
  error?: string;
}

export interface WhatsAppQRResponse {
  success: boolean;
  data?: {
    qrcode: string | null; // Base64 encoded PNG
    qrcode_text: string | null;
    status: 'disconnected' | 'connecting' | 'connected';
  };
  message?: string;
  error?: string;
}

export interface WhatsAppStatusResponse {
  success: boolean;
  data?: {
    status: 'disconnected' | 'connecting' | 'connected';
    connected: boolean;
    timestamp: string;
  };
  error?: string;
}

export interface WhatsAppConnectResponse {
  success: boolean;
  message?: string;
  data?: {
    status: string;
  };
  error?: string;
}

// Template placeholder interface
export interface TemplatePlaceholders {
  cliente: string;
  evento: string;
  qtd_kits: string;
  lista_kits: string;
  data_entrega: string;
  numero_pedido: string;
}

export class WhatsAppService {
  private storage: DatabaseStorage;
  private apiUrl: string;
  private apiToken: string;

  constructor(storage: DatabaseStorage) {
    this.storage = storage;
    this.apiUrl = WHATSAPP_API_URL;
    this.apiToken = WHATSAPP_API_TOKEN;
  }

  /**
   * Normalize phone number according to Brazilian format
   * Rules: +55 (country) + 83 (state) + 8 digits (remove 9 if present before 8 digits)
   */
  private normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-numeric characters
    const numbersOnly = phoneNumber.replace(/\D/g, '');
    
    // Get the last 8 digits
    const last8Digits = numbersOnly.slice(-8);
    
    // If we have exactly 8 digits, format as +55 83 XXXXXXXX
    if (last8Digits.length === 8) {
      return `+5583${last8Digits}`;
    }
    
    // If we have 9 digits, check if the 9th digit (from right) is 9
    if (numbersOnly.length >= 9) {
      const last9Digits = numbersOnly.slice(-9);
      if (last9Digits.charAt(0) === '9') {
        // Remove the 9 and take the next 8 digits
        const corrected8Digits = last9Digits.slice(1);
        return `+5583${corrected8Digits}`;
      } else {
        // Take the last 8 digits
        return `+5583${last8Digits}`;
      }
    }
    
    // If we have less than 8 digits, pad with zeros (fallback)
    const paddedDigits = last8Digits.padStart(8, '0');
    return `+5583${paddedDigits}`;
  }

  /**
   * Send WhatsApp message - Updated for new API format
   */
  async sendMessage(phoneNumber: string, message: string): Promise<WhatsAppMessageResponse> {
    try {
      // Normalize the phone number first
      const normalizedPhoneNumber = this.normalizePhoneNumber(phoneNumber);
      console.log(`📱 Sending WhatsApp message - Original: ${phoneNumber} → Normalized: ${normalizedPhoneNumber}`);
      
      const response: AxiosResponse<WhatsAppMessageResponse> = await axios.post(
        `${this.apiUrl}/api/send-message`,
        {
          number: normalizedPhoneNumber,
          message: message
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      console.log('📱 WhatsApp API Response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ WhatsApp send message error:', error.message);
      
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Erro ao enviar mensagem'
      };
    }
  }

  /**
   * Connect to WhatsApp - Updated for new API format
   */
  async connect(): Promise<WhatsAppConnectResponse> {
    try {
      console.log('📱 Initiating WhatsApp connection...');
      
      const response: AxiosResponse<WhatsAppConnectResponse> = await axios.post(
        `${this.apiUrl}/api/connect`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      console.log('📱 Connect Response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ WhatsApp connect error:', error.message);
      
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Erro ao iniciar conexão'
      };
    }
  }
  /**
   * Check WhatsApp connection status - Updated for new API format
   */
  async getConnectionStatus(): Promise<WhatsAppStatusResponse> {
    try {
      console.log('📱 Checking WhatsApp connection status...');
      
      const response: AxiosResponse<WhatsAppStatusResponse> = await axios.get(
        `${this.apiUrl}/api/status`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`
          },
          timeout: 30000
        }
      );

      console.log('📱 Status Response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ WhatsApp status error:', error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Erro ao verificar status'
      };
    }
  }

  /**
   * Get WhatsApp QR Code - Updated for new API format
   */
  async getQRCode(): Promise<WhatsAppQRResponse> {
    try {
      console.log('📱 Getting WhatsApp QR Code...');
      
      const response: AxiosResponse<WhatsAppQRResponse> = await axios.get(
        `${this.apiUrl}/api/qrcode`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`
          },
          timeout: 30000
        }
      );

      console.log('📱 QR Code Response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ WhatsApp QR Code error:', error.message);
      
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Erro ao obter QR Code'
      };
    }
  }

  /**
   * Save WhatsApp message to database
   */
  async saveMessage(messageData: InsertWhatsappMessage): Promise<void> {
    try {
      // Direct database access
      const { db } = await import('./db');
      const { whatsappMessages } = await import('@shared/schema');
      
      await db
        .insert(whatsappMessages)
        .values(messageData);
      
      console.log('💾 WhatsApp message saved to database:', messageData.orderId);
    } catch (error: any) {
      console.error('❌ Error saving WhatsApp message:', error.message);
      throw error;
    }
  }

  /**
   * Update message status
   */
  async updateMessageStatus(messageId: number, status: 'sent' | 'error', jobId?: string, errorMessage?: string): Promise<void> {
    try {
      // Direct database access
      const { db } = await import('./db');
      const { whatsappMessages } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      await db
        .update(whatsappMessages)
        .set({
          status,
          jobId,
          errorMessage,
          sentAt: status === 'sent' ? new Date() : undefined
        })
        .where(eq(whatsappMessages.id, messageId));
      
      console.log('📱 WhatsApp message status updated:', messageId, status);
    } catch (error: any) {
      console.error('❌ Error updating WhatsApp message status:', error.message);
      throw error;
    }
  }

  /**
   * Get template for order confirmation (status = 'confirmado')
   */
  async getActiveTemplate(): Promise<{ templateContent: string } | null> {
    return this.getTemplateByStatus('confirmado');
  }

  /**
   * Get template by status
   */
  async getTemplateByStatus(status: string): Promise<{ templateContent: string } | null> {
    try {
      // Use the new whatsappTemplates table to get template for 'confirmado' status
      const { db } = await import('./db');
      const { whatsappTemplates } = await import('@shared/schema');
      const { eq, and, desc } = await import('drizzle-orm');
      
      console.log(`📱 WhatsApp: Searching for template with status "${status}"`);
      
      const [template] = await db
        .select()
        .from(whatsappTemplates)
        .where(
          and(
            eq(whatsappTemplates.status, status),
            eq(whatsappTemplates.isActive, true)
          )
        )
        .orderBy(desc(whatsappTemplates.createdAt))
        .limit(1);
      
      if (!template) {
        console.log(`❌ WhatsApp: No template found for status "${status}"`);
        
        // Create default templates based on status
        let defaultTemplate = '';
        let templateName = '';
        let description = '';

        switch (status) {
          case 'confirmado':
            defaultTemplate = `Olá, *{{cliente}}*! 
Confirmamos sua solicitação de *[Retirada do Kit] {{evento}}*.

Você solicitou a retirada de *{{qtd_kits}}* kits para os seguintes atletas:

{{lista_kits}}

Vamos retirar seu kit, previsão de entrega é para amanhã dia {{data_entrega}}.
Logo mais entraremos em contato e faremos a entrega no endereço informado no pedido.

Qualquer dúvida, estamos à disposição.`;
            templateName = 'Confirmação de Pedido';
            description = 'Template padrão para confirmação de pedido após pagamento aprovado';
            break;

          case 'em_transito':
            defaultTemplate = `🚚 *Kit em Trânsito!*

Olá {{cliente}}!

Seu kit do evento *{{evento}}* foi retirado e está a caminho da entrega.

📦 Pedido: {{numero_pedido}}
📍 Endereço: {{endereco}}

Em breve chegará até você! 🏃‍♂️`;
            templateName = 'Kit em Trânsito';
            description = 'Template padrão para notificação de kit em trânsito';
            break;

          case 'entregue':
            defaultTemplate = `✅ *Kit Entregue!*

Olá {{cliente}}!

Seu kit do evento *{{evento}}* foi entregue com sucesso! 🎉

📦 Pedido: {{numero_pedido}}
📅 Entregue em: {{data_entrega}}

Bora correr! 🏃‍♂️💪`;
            templateName = 'Kit Entregue';
            description = 'Template padrão para confirmação de entrega';
            break;

          default:
            return null; // Don't create templates for unknown statuses
        }

        const [newTemplate] = await db
          .insert(whatsappTemplates)
          .values({
            name: templateName,
            type: 'order_status',
            status: status,
            content: defaultTemplate,
            description: description,
            isActive: true,
            isDefault: true
          })
          .returning();

        console.log(`✅ WhatsApp: Created default template for status "${status}"`);
        return { templateContent: newTemplate.content };
      }

      console.log(`✅ WhatsApp: Found template for status "${status}"`);
      return { templateContent: template.content };
    } catch (error: any) {
      console.error(`❌ Error getting WhatsApp template for status "${status}":`, error.message);
      throw error;
    }
  }

  /**
   * Replace template placeholders with actual data
   */
  replacePlaceholders(template: string, placeholders: TemplatePlaceholders): string {
    let message = template;
    
    Object.entries(placeholders).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      message = message.replace(new RegExp(placeholder, 'g'), value);
    });

    return message;
  }

  /**
   * Format phone number for WhatsApp API - Brazilian format (DEPRECATED)
   * Use normalizePhoneNumber instead
   */
  formatPhoneNumber(phone: string): string {
    return this.normalizePhoneNumber(phone);
  }

  /**
   * Send order confirmation message - accepts order with full details from database
   */
  async sendOrderConfirmation(fullOrder: any): Promise<{ success: boolean; messageId?: number; error?: string }> {
    try {
      // Get active template
      const template = await this.getActiveTemplate();
      if (!template) {
        throw new Error('Nenhum template ativo encontrado');
      }

      // Extract data from fullOrder object
      const customerPhone = fullOrder.customer.phone;
      const customerName = fullOrder.customer.name;
      const eventName = fullOrder.event.name;
      const kitQuantity = fullOrder.kitQuantity;
      const orderNumber = fullOrder.orderNumber;
      const orderId = fullOrder.id;
      
      if (!customerPhone) {
        throw new Error('Número de telefone do cliente não encontrado');
      }

      // Format kits list from order kits
      const kitsList = fullOrder.kits && fullOrder.kits.length > 0 
        ? fullOrder.kits.map((kit: any, index: number) => 
            `${index + 1}. ${kit.name}`
          ).join('\n') 
        : `${kitQuantity} kit(s) para o evento`;

      // Format delivery date
      const deliveryDate = fullOrder.event.date ? 
        new Date(fullOrder.event.date).toLocaleDateString('pt-BR') : 
        'em breve';

      // Replace placeholders in template - using direct string replacement like in routes
      let finalMessage = template.templateContent;
      finalMessage = finalMessage.replace(/\{\{cliente\}\}/g, customerName);
      finalMessage = finalMessage.replace(/\{\{evento\}\}/g, eventName);
      finalMessage = finalMessage.replace(/\{\{qtd_kits\}\}/g, kitQuantity.toString());
      finalMessage = finalMessage.replace(/\{\{numero_pedido\}\}/g, orderNumber);
      finalMessage = finalMessage.replace(/\{\{data_entrega\}\}/g, deliveryDate);
      finalMessage = finalMessage.replace(/\{\{lista_kits\}\}/g, kitsList);

      // Format phone number with Brazilian formatting
      const formattedPhone = this.formatPhoneNumber(customerPhone);

      // Save message to database first
      const messageData: InsertWhatsappMessage = {
        orderId: orderId,
        customerName: customerName,
        phoneNumber: formattedPhone,
        messageContent: finalMessage,
        status: 'pending'
      };

      await this.saveMessage(messageData);
      
      // Get last message ID directly from database
      const { db } = await import('./db');
      const { whatsappMessages } = await import('@shared/schema');
      const { desc } = await import('drizzle-orm');
      
      const [lastMessage] = await db
        .select({ id: whatsappMessages.id })
        .from(whatsappMessages)
        .orderBy(desc(whatsappMessages.id))
        .limit(1);
      
      const messageId = lastMessage?.id || 0;

      // Send message via API
      const apiResponse = await this.sendMessage(formattedPhone, finalMessage);

      if (apiResponse.success) {
        // Update status to sent
        await this.updateMessageStatus(messageId, 'sent');
        
        console.log('✅ WhatsApp message sent successfully:', orderNumber);
        return { success: true, messageId };
      } else {
        // Update status to error
        await this.updateMessageStatus(messageId, 'error', undefined, apiResponse.error);
        
        console.error('❌ WhatsApp API error:', apiResponse.error);
        return { success: false, error: apiResponse.error };
      }
    } catch (error: any) {
      console.error('❌ Error sending WhatsApp order confirmation:', error.message);
      return { success: false, error: error.message };
    }
  }



  /**
   * Get message history with pagination
   */
  async getMessageHistory(page: number = 1, limit: number = 20): Promise<{
    messages: any[];
    total: number;
    pages: number;
  }> {
    try {
      const offset = (page - 1) * limit;
      // Direct database access for message history
      const { db } = await import('./db');
      const { whatsappMessages } = await import('@shared/schema');
      const { desc, count } = await import('drizzle-orm');
      
      const messages = await db
        .select()
        .from(whatsappMessages)
        .orderBy(desc(whatsappMessages.createdAt))
        .limit(limit)
        .offset(offset);

      const [totalResult] = await db
        .select({ count: count() })
        .from(whatsappMessages);

      const total = totalResult.count;
      const pages = Math.ceil(total / limit);

      return { messages, total, pages };
    } catch (error: any) {
      console.error('❌ Error getting WhatsApp message history:', error.message);
      throw error;
    }
  }

  /**
   * Test connection with WhatsApp API
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const statusResponse = await this.getConnectionStatus();
      
      if (statusResponse.success && statusResponse.data?.status === 'connected') {
        return { success: true, message: 'WhatsApp conectado com sucesso' };
      } else {
        const qrResponse = await this.getQRCode();
        
        if (qrResponse.success) {
          return { success: true, message: 'API WhatsApp funcionando - aguardando conexão' };
        } else {
          return { success: false, message: qrResponse.error || 'Erro na API do WhatsApp' };
        }
      }
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Simple ping to check if WhatsApp API is responding
   */
  async pingAPI(): Promise<{ success: boolean; message?: string }> {
    try {
      console.log('📱 Pinging WhatsApp API...');
      
      // Just try to reach the API base URL to see if it's responding
      const response = await axios.get(
        `${this.apiUrl}/api/status`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`
          },
          timeout: 10000
        }
      );

      // If we get any response (even error), the API is working
      return { 
        success: true, 
        message: 'WhatsApp API está funcionando' 
      };
    } catch (error: any) {
      console.error('❌ WhatsApp API ping failed:', error.message);
      return { 
        success: false, 
        message: 'WhatsApp API não está respondendo' 
      };
    }
  }
}

export default WhatsAppService;
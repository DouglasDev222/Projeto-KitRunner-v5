import axios, { AxiosResponse } from 'axios';
import { DatabaseStorage } from './storage';
import { InsertWhatsappMessage, WhatsappSettings } from '@shared/schema';

// API Configuration
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'http://91.108.126.63:5000';
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN || '12345678';

// WhatsApp API Response Types
export interface WhatsAppMessageResponse {
  status: 'success' | 'error';
  jobId?: string;
  description: string;
}

export interface WhatsAppQRResponse {
  status: 'success' | 'error';
  description: string;
  qrCode?: string; // Base64 encoded PNG
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
   * Send WhatsApp message
   */
  async sendMessage(phoneNumber: string, message: string): Promise<WhatsAppMessageResponse> {
    try {
      console.log('📱 Sending WhatsApp message to:', phoneNumber);
      
      const response: AxiosResponse<WhatsAppMessageResponse> = await axios.post(
        `${this.apiUrl}/send-message`,
        {
          number: phoneNumber,
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
        status: 'error',
        description: error.response?.data?.description || error.message || 'Erro ao enviar mensagem'
      };
    }
  }

  /**
   * Get WhatsApp QR Code for connection
   */
  async getQRCode(): Promise<WhatsAppQRResponse> {
    try {
      console.log('📱 Getting WhatsApp QR Code...');
      
      const response: AxiosResponse<WhatsAppQRResponse> = await axios.get(
        `${this.apiUrl}/qrcode`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`
          },
          timeout: 30000
        }
      );

      console.log('📱 QR Code Response:', response.data.status);
      return response.data;
    } catch (error: any) {
      console.error('❌ WhatsApp QR Code error:', error.message);
      
      return {
        status: 'error',
        description: error.response?.data?.description || error.message || 'Erro ao obter QR Code'
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
   * Get or create default template
   */
  async getActiveTemplate(): Promise<WhatsappSettings | null> {
    try {
      // Direct database access since storage methods are not working
      const { db } = await import('./db');
      const { whatsappSettings } = await import('@shared/schema');
      const { eq, desc } = await import('drizzle-orm');
      
      const [template] = await db
        .select()
        .from(whatsappSettings)
        .where(eq(whatsappSettings.isActive, true))
        .orderBy(desc(whatsappSettings.createdAt))
        .limit(1);
      
      if (!template) {
        // Create default template
        const defaultTemplate = `Olá, *{{cliente}}*! 
Confirmamos sua solicitação de *[Retirada do Kit] {{evento}}*.

Você solicitou a retirada de *{{qtd_kits}}* kits para os seguintes atletas:

{{lista_kits}}

Vamos retirar seu kit, previsão de entrega é para amanhã dia {{data_entrega}}.
Logo mais entraremos em contato e faremos a entrega no endereço informado no pedido.

Qualquer dúvida, estamos à disposição.`;

        // Deactivate existing templates
        await db
          .update(whatsappSettings)
          .set({ isActive: false });

        const [newTemplate] = await db
          .insert(whatsappSettings)
          .values({
            templateContent: defaultTemplate,
            isActive: true
          })
          .returning();

        return newTemplate;
      }

      return template;
    } catch (error: any) {
      console.error('❌ Error getting WhatsApp template:', error.message);
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
   * Format phone number for WhatsApp API
   */
  formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    
    // If it doesn't start with 55 (Brazil country code), add it
    if (!cleaned.startsWith('55')) {
      return '55' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Send order confirmation message
   */
  async sendOrderConfirmation(orderData: {
    orderId: number;
    customerName: string;
    customerPhone: string;
    eventName: string;
    kitQuantity: number;
    kits: Array<{ name: string; cpf: string; shirtSize: string }>;
    deliveryDate: string;
    orderNumber: string;
  }): Promise<{ success: boolean; messageId?: number; error?: string }> {
    try {
      // Get active template
      const template = await this.getActiveTemplate();
      if (!template) {
        throw new Error('Nenhum template ativo encontrado');
      }

      // Format kits list
      const kitsList = orderData.kits.map((kit, index) => 
        `${index + 1}. ${kit.name} - Tamanho: ${kit.shirtSize}`
      ).join('\n');

      // Prepare placeholders
      const placeholders: TemplatePlaceholders = {
        cliente: orderData.customerName,
        evento: orderData.eventName,
        qtd_kits: orderData.kitQuantity.toString(),
        lista_kits: kitsList,
        data_entrega: orderData.deliveryDate,
        numero_pedido: orderData.orderNumber
      };

      // Replace placeholders in template
      const finalMessage = this.replacePlaceholders(template.templateContent, placeholders);

      // Format phone number
      const formattedPhone = this.formatPhoneNumber(orderData.customerPhone);

      // Save message to database first
      const messageData: InsertWhatsappMessage = {
        orderId: orderData.orderId,
        customerName: orderData.customerName,
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

      if (apiResponse.status === 'success') {
        // Update status to sent
        await this.updateMessageStatus(messageId, 'sent', apiResponse.jobId);
        
        console.log('✅ WhatsApp message sent successfully:', orderData.orderNumber);
        return { success: true, messageId };
      } else {
        // Update status to error
        await this.updateMessageStatus(messageId, 'error', undefined, apiResponse.description);
        
        console.error('❌ WhatsApp API error:', apiResponse.description);
        return { success: false, error: apiResponse.description };
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
      const { messages, total } = await this.storage.getWhatsappMessages(limit, offset);
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
      const qrResponse = await this.getQRCode();
      
      if (qrResponse.status === 'error' && qrResponse.description.includes('conectado')) {
        return { success: true, message: 'WhatsApp conectado com sucesso' };
      } else if (qrResponse.status === 'success' || qrResponse.qrCode) {
        return { success: true, message: 'API WhatsApp funcionando - aguardando conexão' };
      } else {
        return { success: false, message: qrResponse.description };
      }
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}

export default WhatsAppService;
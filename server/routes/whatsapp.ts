import { Router, Request, Response } from 'express';
import WhatsAppService from '../whatsapp-service';
import { storage } from '../storage';
import { requireAdminAuth } from '../middleware/auth';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';

const router = Router();
const whatsAppService = new WhatsAppService(storage);

// Middleware para autenticação admin em todas as rotas
router.use(requireAdminAuth);

/**
 * GET /api/admin/whatsapp/connection
 * Get current WhatsApp connection status only
 */
router.get('/connection', async (req: Request, res: Response) => {
  try {
    console.log('📱 Getting WhatsApp connection status...');
    
    // Check connection status using WhatsApp service
    const statusResult = await whatsAppService.getConnectionStatus();
    
    if (statusResult.success && statusResult.data) {
      const { status, connected } = statusResult.data;
      
      if (status === 'connected') {
        return res.json({
          success: true,
          connected: true,
          connectionStatus: 'connected',
          message: 'WhatsApp conectado com sucesso'
        });
      } else if (status === 'connecting') {
        // If connecting, also try to get QR code for display
        const qrResult = await whatsAppService.getQRCode();
        
        if (qrResult.success && qrResult.data?.qrcode) {
          const qrCodeData = qrResult.data.qrcode.startsWith('data:') 
            ? qrResult.data.qrcode 
            : `data:image/png;base64,${qrResult.data.qrcode}`;
            
          return res.json({
            success: true,
            connected: false,
            connectionStatus: 'connecting',
            qrCode: qrCodeData,
            qrCodeType: 'png',
            message: 'Conectando... Escaneie o QR Code se disponível'
          });
        } else {
          return res.json({
            success: true,
            connected: false,
            connectionStatus: 'connecting',
            message: 'Conectando ao WhatsApp...'
          });
        }
      } else {
        return res.json({
          success: true,
          connected: false,
          connectionStatus: 'disconnected',
          message: 'WhatsApp desconectado'
        });
      }
    } else {
      return res.json({
        success: false,
        connected: false,
        error: statusResult.error || 'Erro na API do WhatsApp',
        message: 'Erro ao verificar status do WhatsApp'
      });
    }
  } catch (error: any) {
    console.error('❌ Error getting WhatsApp connection:', error.message);
    res.status(500).json({
      success: false,
      connected: false,
      error: 'Erro interno do servidor',
      message: 'Não foi possível conectar com a API do WhatsApp'
    });
  }
});

/**
 * POST /api/admin/whatsapp/connect
 * Initiate WhatsApp connection and get QR code
 */
router.post('/connect', async (req: Request, res: Response) => {
  try {
    console.log('📱 Initiating WhatsApp connection and QR code generation...');
    
    // First check current status
    const statusResult = await whatsAppService.getConnectionStatus();
    
    if (statusResult.success && statusResult.data?.status === 'connected') {
      return res.json({
        success: true,
        connected: true,
        message: 'WhatsApp já está conectado'
      });
    }
    
    // Initiate connection
    const connectResult = await whatsAppService.connect();
    
    if (connectResult.success) {
      // Try to get QR code after connecting
      const qrResult = await whatsAppService.getQRCode();
      
      if (qrResult.success && qrResult.data?.qrcode) {
        const qrCodeData = qrResult.data.qrcode.startsWith('data:') 
          ? qrResult.data.qrcode 
          : `data:image/png;base64,${qrResult.data.qrcode}`;
          
        return res.json({
          success: true,
          connected: false,
          connectionStatus: 'connecting',
          qrCode: qrCodeData,
          qrCodeType: 'png',
          message: 'Conexão iniciada. Escaneie o QR Code para conectar o WhatsApp'
        });
      } else {
        return res.json({
          success: true,
          connected: false,
          connectionStatus: 'connecting',
          message: 'Conexão iniciada, aguarde o QR Code...'
        });
      }
    } else {
      return res.json({
        success: false,
        error: connectResult.error || 'Erro ao iniciar conexão',
        message: 'Não foi possível iniciar a conexão WhatsApp'
      });
    }
  } catch (error: any) {
    console.error('❌ Error initiating WhatsApp connection:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Não foi possível iniciar a conexão WhatsApp'
    });
  }
});

/**
 * POST /api/admin/whatsapp/test
 * Test WhatsApp connection
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    console.log('📱 Testing WhatsApp connection...');
    
    const testResult = await whatsAppService.testConnection();
    
    res.json({
      success: testResult.success,
      message: testResult.message
    });
  } catch (error: any) {
    console.error('❌ Error testing WhatsApp connection:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/admin/whatsapp/ping
 * Simple API health check - just test if API is responding
 */
router.get('/ping', async (req: Request, res: Response) => {
  try {
    console.log('📱 Pinging WhatsApp API...');
    
    // Simple ping test - just check if API responds
    const pingResult = await whatsAppService.pingAPI();
    
    res.json({
      success: pingResult.success,
      message: pingResult.success ? 'WhatsApp API está funcionando' : 'WhatsApp API não está respondendo'
    });
  } catch (error: any) {
    console.error('❌ Error pinging WhatsApp API:', error.message);
    res.status(500).json({
      success: false,
      message: 'WhatsApp API não está respondendo'
    });
  }
});

/**
 * GET /api/admin/whatsapp/template
 * Get active WhatsApp template
 */
router.get('/template', async (req: Request, res: Response) => {
  try {
    console.log('📱 Getting active WhatsApp template...');
    
    // Direct database access
    const { db } = await import('../db');
    const { whatsappSettings } = await import('@shared/schema');
    const { eq, desc } = await import('drizzle-orm');
    
    const [template] = await db
      .select()
      .from(whatsappSettings)
      .where(eq(whatsappSettings.isActive, true))
      .orderBy(desc(whatsappSettings.createdAt))
      .limit(1);
    
    res.json({
      success: true,
      template: template ? {
        id: template.id,
        content: template.templateContent,
        isActive: template.isActive,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      } : null
    });
  } catch (error: any) {
    console.error('❌ Error getting WhatsApp template:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/admin/whatsapp/template
 * Create or update WhatsApp template
 */
const templateSchema = z.object({
  content: z.string().min(1, 'Conteúdo do template é obrigatório')
});

router.post('/template', async (req: Request, res: Response) => {
  try {
    console.log('📱 Updating WhatsApp template...');
    
    const validation = templateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: validation.error.errors
      });
    }

    const { content } = validation.data;
    
    // Direct database access
    const { db } = await import('../db');
    const { whatsappSettings } = await import('@shared/schema');
    
    // Deactivate existing templates
    await db
      .update(whatsappSettings)
      .set({ isActive: false });

    const [template] = await db
      .insert(whatsappSettings)
      .values({
        templateContent: content,
        isActive: true
      })
      .returning();
    
    res.json({
      success: true,
      template: {
        id: template.id,
        content: template.templateContent,
        isActive: template.isActive,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      },
      message: 'Template atualizado com sucesso'
    });
  } catch (error: any) {
    console.error('❌ Error updating WhatsApp template:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * PUT /api/admin/whatsapp/template/:id
 * Update specific WhatsApp template
 */
router.put('/template/:id', async (req: Request, res: Response) => {
  try {
    console.log('📱 Updating specific WhatsApp template...');
    
    const templateId = parseInt(req.params.id);
    if (isNaN(templateId)) {
      return res.status(400).json({
        success: false,
        error: 'ID do template inválido'
      });
    }

    const validation = templateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: validation.error.errors
      });
    }

    const { content } = validation.data;
    
    // Direct database access
    const { db } = await import('../db');
    const { whatsappSettings } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');
    
    const [template] = await db
      .update(whatsappSettings)
      .set({
        templateContent: content,
        isActive: true,
        updatedAt: new Date()
      })
      .where(eq(whatsappSettings.id, templateId))
      .returning();
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template não encontrado'
      });
    }
    
    res.json({
      success: true,
      template: {
        id: template.id,
        content: template.templateContent,
        isActive: template.isActive,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      },
      message: 'Template atualizado com sucesso'
    });
  } catch (error: any) {
    console.error('❌ Error updating specific WhatsApp template:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/admin/whatsapp/messages
 * Get WhatsApp message history with pagination
 */
router.get('/messages', async (req: Request, res: Response) => {
  try {
    console.log('📱 Getting WhatsApp message history...');
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    // Direct database access
    const { db } = await import('../db');
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
    
    res.json({
      success: true,
      messages,
      total,
      pages
    });
  } catch (error: any) {
    console.error('❌ Error getting WhatsApp message history:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/admin/whatsapp/send-test
 * Send test WhatsApp message
 */
const testMessageSchema = z.object({
  phoneNumber: z.string().min(10, 'Número de telefone é obrigatório'),
  message: z.string().min(1, 'Mensagem é obrigatória')
});

router.post('/send-test', async (req: Request, res: Response) => {
  try {
    console.log('📱 Sending test WhatsApp message...');
    
    const validation = testMessageSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: validation.error.errors
      });
    }

    const { phoneNumber, message } = validation.data;
    
    // A normalização será feita pelo WhatsApp Service
    console.log(`📱 Test message - Phone: ${phoneNumber}`);
    
    const result = await whatsAppService.sendMessage(phoneNumber, message);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message || 'Mensagem de teste enviada com sucesso'
      });
    } else {
      res.json({
        success: false,
        error: result.error || 'Erro ao enviar mensagem'
      });
    }
  } catch (error: any) {
    console.error('❌ Error sending test WhatsApp message:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/admin/whatsapp/placeholders
 * Get available template placeholders
 */
router.get('/placeholders', async (req: Request, res: Response) => {
  try {
    const placeholders = [
      {
        key: '{{cliente}}',
        description: 'Nome do cliente'
      },
      {
        key: '{{evento}}',
        description: 'Nome do evento'
      },
      {
        key: '{{qtd_kits}}',
        description: 'Quantidade de kits'
      },
      {
        key: '{{lista_kits}}',
        description: 'Lista dos nomes dos atletas'
      },
      {
        key: '{{data_entrega}}',
        description: 'Data prevista de entrega'
      },
      {
        key: '{{numero_pedido}}',
        description: 'Número do pedido'
      }
    ];

    res.json({
      success: true,
      placeholders
    });
  } catch (error: any) {
    console.error('❌ Error getting placeholders:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// NOVO SISTEMA DE TEMPLATES AVANÇADO

/**
 * GET /api/admin/whatsapp/templates
 * Listar todos os templates de WhatsApp
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    console.log('📱 Getting all WhatsApp templates...');
    
    const { db } = await import('../db');
    const { whatsappTemplates } = await import('@shared/schema');
    
    const templates = await db
      .select()
      .from(whatsappTemplates)
      .orderBy(desc(whatsappTemplates.createdAt));
    
    res.json({
      success: true,
      templates: templates.map(template => ({
        id: template.id,
        name: template.name,
        type: template.type,
        status: template.status,
        content: template.content,
        description: template.description,
        isActive: template.isActive,
        isDefault: template.isDefault,
        quickSend: template.quickSend,
        placeholders: template.placeholders ? JSON.parse(template.placeholders) : null,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      }))
    });
  } catch (error: any) {
    console.error('❌ Error getting WhatsApp templates:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/admin/whatsapp/templates
 * Criar novo template
 */
const newTemplateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  type: z.enum(['order_status', 'custom', 'notification']),
  status: z.string().optional(),
  content: z.string().min(1, 'Conteúdo é obrigatório'),
  description: z.string().optional(),
  placeholders: z.array(z.string()).optional()
});

router.post('/templates', async (req: Request, res: Response) => {
  try {
    console.log('📱 Creating new WhatsApp template...');
    
    const validation = newTemplateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: validation.error.errors
      });
    }

    const { name, type, status, content, description, placeholders } = validation.data;
    
    const { db } = await import('../db');
    const { whatsappTemplates } = await import('@shared/schema');
    
    const [template] = await db
      .insert(whatsappTemplates)
      .values({
        name,
        type,
        status: status || null,
        content,
        description: description || null,
        placeholders: placeholders ? JSON.stringify(placeholders) : null,
        isActive: true,
        isDefault: false
      })
      .returning();
    
    res.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        type: template.type,
        status: template.status,
        content: template.content,
        description: template.description,
        isActive: template.isActive,
        isDefault: template.isDefault,
        placeholders: template.placeholders ? JSON.parse(template.placeholders) : null,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      },
      message: 'Template criado com sucesso'
    });
  } catch (error: any) {
    console.error('❌ Error creating WhatsApp template:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * PUT /api/admin/whatsapp/templates/:id
 * Editar template existente
 */
router.put('/templates/:id', async (req: Request, res: Response) => {
  try {
    console.log('📱 Updating WhatsApp template...');
    
    const templateId = parseInt(req.params.id);
    if (isNaN(templateId)) {
      return res.status(400).json({
        success: false,
        error: 'ID do template inválido'
      });
    }
    
    const validation = newTemplateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: validation.error.errors
      });
    }

    const { name, type, status, content, description, placeholders } = validation.data;
    
    const { db } = await import('../db');
    const { whatsappTemplates } = await import('@shared/schema');
    
    const [template] = await db
      .update(whatsappTemplates)
      .set({
        name,
        type,
        status: status || null,
        content,
        description: description || null,
        placeholders: placeholders ? JSON.stringify(placeholders) : null,
        updatedAt: new Date()
      })
      .where(eq(whatsappTemplates.id, templateId))
      .returning();
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template não encontrado'
      });
    }
    
    res.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        type: template.type,
        status: template.status,
        content: template.content,
        description: template.description,
        isActive: template.isActive,
        isDefault: template.isDefault,
        placeholders: template.placeholders ? JSON.parse(template.placeholders) : null,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      },
      message: 'Template atualizado com sucesso'
    });
  } catch (error: any) {
    console.error('❌ Error updating WhatsApp template:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/admin/whatsapp/templates/:id/activate
 * Ativar template como padrão para um status
 */
router.post('/templates/:id/activate', async (req: Request, res: Response) => {
  try {
    console.log('📱 Activating WhatsApp template as default...');
    
    const templateId = parseInt(req.params.id);
    if (isNaN(templateId)) {
      return res.status(400).json({
        success: false,
        error: 'ID do template inválido'
      });
    }
    
    const { db } = await import('../db');
    const { whatsappTemplates } = await import('@shared/schema');
    
    // Primeiro busca o template para obter o status/tipo
    const [currentTemplate] = await db
      .select()
      .from(whatsappTemplates)
      .where(eq(whatsappTemplates.id, templateId))
      .limit(1);
    
    if (!currentTemplate) {
      return res.status(404).json({
        success: false,
        error: 'Template não encontrado'
      });
    }
    
    // Validar se o tipo pode ser padrão
    if (currentTemplate.type !== 'order_status') {
      return res.status(400).json({
        success: false,
        error: 'Apenas templates de status de pedido podem ser marcados como padrão'
      });
    }
    
    // Validar se tem status definido
    if (!currentTemplate.status) {
      return res.status(400).json({
        success: false,
        error: 'Template deve ter um status definido para ser marcado como padrão'
      });
    }
    
    // Desativa outros templates do mesmo status (garantir apenas um padrão por status)
    await db
      .update(whatsappTemplates)
      .set({ isDefault: false })
      .where(eq(whatsappTemplates.status, currentTemplate.status));
    
    // Ativa o template atual
    const [template] = await db
      .update(whatsappTemplates)
      .set({ 
        isDefault: true,
        isActive: true,
        updatedAt: new Date()
      })
      .where(eq(whatsappTemplates.id, templateId))
      .returning();
    
    res.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        type: template.type,
        status: template.status,
        content: template.content,
        description: template.description,
        isActive: template.isActive,
        isDefault: template.isDefault,
        placeholders: template.placeholders ? JSON.parse(template.placeholders) : null,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      },
      message: 'Template ativado como padrão'
    });
  } catch (error: any) {
    console.error('❌ Error activating WhatsApp template:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/admin/whatsapp/templates/:id/deactivate
 * Desativar template como padrão
 */
router.post('/templates/:id/deactivate', async (req: Request, res: Response) => {
  try {
    console.log('📱 Deactivating WhatsApp template...');
    
    const templateId = parseInt(req.params.id);
    if (isNaN(templateId)) {
      return res.status(400).json({
        success: false,
        error: 'ID do template inválido'
      });
    }
    
    const { db } = await import('../db');
    const { whatsappTemplates } = await import('@shared/schema');
    
    // Desativa o template
    const [template] = await db
      .update(whatsappTemplates)
      .set({ 
        isDefault: false,
        updatedAt: new Date()
      })
      .where(eq(whatsappTemplates.id, templateId))
      .returning();
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template não encontrado'
      });
    }
    
    res.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        type: template.type,
        status: template.status,
        content: template.content,
        description: template.description,
        isActive: template.isActive,
        isDefault: template.isDefault,
        placeholders: template.placeholders ? JSON.parse(template.placeholders) : null,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      },
      message: 'Template desativado como padrão com sucesso'
    });
  } catch (error: any) {
    console.error('❌ Error deactivating WhatsApp template:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * DELETE /api/admin/whatsapp/templates/:id
 * Deletar template
 */
router.delete('/templates/:id', async (req: Request, res: Response) => {
  try {
    console.log('📱 Deleting WhatsApp template...');
    
    const templateId = parseInt(req.params.id);
    if (isNaN(templateId)) {
      return res.status(400).json({
        success: false,
        error: 'ID do template inválido'
      });
    }
    
    const { db } = await import('../db');
    const { whatsappTemplates } = await import('@shared/schema');
    
    // Verifica se o template existe antes de deletar
    const [existingTemplate] = await db
      .select()
      .from(whatsappTemplates)
      .where(eq(whatsappTemplates.id, templateId))
      .limit(1);
    
    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        error: 'Template não encontrado'
      });
    }
    
    // Não permite deletar templates padrão
    if (existingTemplate.isDefault) {
      return res.status(400).json({
        success: false,
        error: 'Não é possível deletar template padrão. Defina outro template como padrão primeiro.'
      });
    }
    
    await db
      .delete(whatsappTemplates)
      .where(eq(whatsappTemplates.id, templateId));
    
    res.json({
      success: true,
      message: 'Template deletado com sucesso'
    });
  } catch (error: any) {
    console.error('❌ Error deleting WhatsApp template:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/admin/whatsapp/templates/seed
 * Criar templates padrões para status de pedidos
 */
router.post('/templates/seed', async (req: Request, res: Response) => {
  try {
    console.log('📱 Creating default WhatsApp templates...');
    
    const { db } = await import('../db');
    const { whatsappTemplates } = await import('@shared/schema');
    
    // Definir templates padrão para cada status
    const defaultTemplates = [
      {
        name: 'Confirmação de Pedido',
        type: 'order_status',
        status: 'confirmado',
        content: `Olá, *{{cliente}}*! 🎽\n\nConfirmamos sua solicitação de *[Retirada do Kit] {{evento}}*.\n\nVocê solicitou a retirada de *{{qtd_kits}}* kits para os seguintes atletas:\n\n{{lista_kits}}\n\nVamos retirar seu kit, previsão de entrega é para amanhã dia {{data_entrega}}.\nLogo mais entraremos em contato e faremos a entrega no endereço informado no pedido.\n\nPedido: #{{numero_pedido}}\n\nQualquer dúvida, estamos à disposição.`,
        description: 'Template padrão para confirmação de pedidos',
        placeholders: ['cliente', 'evento', 'qtd_kits', 'lista_kits', 'data_entrega', 'numero_pedido'],
        isDefault: true
      },
      {
        name: 'Kits Sendo Retirados',
        type: 'order_status',
        status: 'kits_sendo_retirados',
        content: `Oi {{cliente}}! 🚗\n\nSeus kits do evento *{{evento}}* estão sendo retirados agora!\n\nPedido: #{{numero_pedido}}\nQuantidade: {{qtd_kits}} kits\n\nEm breve estaremos a caminho do seu endereço para entrega.\n\nObrigado pela preferência! 🏃‍♂️`,
        description: 'Template para quando os kits estão sendo retirados',
        placeholders: ['cliente', 'evento', 'qtd_kits', 'numero_pedido'],
        isDefault: true
      },
      {
        name: 'Em Trânsito',
        type: 'order_status',
        status: 'em_transito',
        content: `{{cliente}}, seus kits estão a caminho! 🚗💨\n\nEvento: *{{evento}}*\nPedido: #{{numero_pedido}}\nKits: {{qtd_kits}}\n\nEstamos nos dirigindo ao seu endereço. Em breve chegamos!\n\nAcompanhe a entrega e se prepare para receber seus kits! 📦✨`,
        description: 'Template para pedidos em trânsito',
        placeholders: ['cliente', 'evento', 'qtd_kits', 'numero_pedido'],
        isDefault: true
      },
      {
        name: 'Entregue',
        type: 'order_status',
        status: 'entregue',
        content: `Perfeito, {{cliente}}! ✅\n\nSeus kits do *{{evento}}* foram entregues com sucesso!\n\nPedido: #{{numero_pedido}}\nKits entregues: {{qtd_kits}}\n\nDesejamos uma excelente corrida! 🏃‍♂️🏃‍♀️\n\nObrigado por escolher nossos serviços! 🙏`,
        description: 'Template para pedidos entregues',
        placeholders: ['cliente', 'evento', 'qtd_kits', 'numero_pedido'],
        isDefault: true
      },
      {
        name: 'Pedido Cancelado',
        type: 'order_status',
        status: 'cancelado',
        content: `{{cliente}}, informamos que seu pedido foi cancelado. ❌\n\nEvento: *{{evento}}*\nPedido: #{{numero_pedido}}\n\nSe você cancelou, tudo certo! Se não foi você que cancelou, entre em contato conosco imediatamente.\n\nQualquer dúvida, estamos à disposição.`,
        description: 'Template para pedidos cancelados',
        placeholders: ['cliente', 'evento', 'numero_pedido'],
        isDefault: true
      },
      {
        name: 'Aguardando Pagamento',
        type: 'order_status',
        status: 'aguardando_pagamento',
        content: `{{cliente}}, seu pedido está aguardando pagamento! ⏳\n\nEvento: *{{evento}}*\nPedido: #{{numero_pedido}}\nKits: {{qtd_kits}}\n\nPor favor, realize o pagamento para confirmarmos sua entrega.\n\nCaso já tenha pago, aguarde alguns minutos para a confirmação automática.`,
        description: 'Template para pedidos aguardando pagamento',
        placeholders: ['cliente', 'evento', 'qtd_kits', 'numero_pedido'],
        isDefault: true
      }
    ];
    
    // Limpa templates existentes do sistema (apenas os de order_status)
    await db
      .delete(whatsappTemplates)
      .where(eq(whatsappTemplates.type, 'order_status'));
    
    // Insere novos templates
    const createdTemplates = [];
    for (const templateData of defaultTemplates) {
      const [template] = await db
        .insert(whatsappTemplates)
        .values({
          name: templateData.name,
          type: templateData.type as 'order_status' | 'custom' | 'notification',
          status: templateData.status,
          content: templateData.content,
          description: templateData.description,
          placeholders: JSON.stringify(templateData.placeholders),
          isActive: true,
          isDefault: templateData.isDefault
        })
        .returning();
      
      createdTemplates.push(template);
    }
    
    res.json({
      success: true,
      message: `${createdTemplates.length} templates padrões criados com sucesso`,
      templates: createdTemplates.map(template => ({
        id: template.id,
        name: template.name,
        type: template.type,
        status: template.status,
        isDefault: template.isDefault
      }))
    });
  } catch (error: any) {
    console.error('❌ Error creating default WhatsApp templates:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/admin/whatsapp/templates/:id/test
 * Testar um template específico enviando para um número
 */
const testTemplateSchema = z.object({
  phoneNumber: z.string().min(10, 'Número de telefone é obrigatório'),
  testData: z.object({
    cliente: z.string().optional().default('João Silva'),
    evento: z.string().optional().default('Maratona de João Pessoa'),
    qtd_kits: z.string().optional().default('2'),
    lista_kits: z.string().optional().default('1. João Silva - Tamanho: M\n2. Maria Silva - Tamanho: P'),
    data_entrega: z.string().optional().default('15/12/2024'),
    numero_pedido: z.string().optional().default('KR2024123456')
  }).optional().default({})
});

router.post('/templates/:id/test', async (req: Request, res: Response) => {
  try {
    console.log('📱 Testing WhatsApp template...');
    
    const templateId = parseInt(req.params.id);
    if (isNaN(templateId)) {
      return res.status(400).json({
        success: false,
        error: 'ID do template inválido'
      });
    }
    
    const validation = testTemplateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: validation.error.errors
      });
    }

    const { phoneNumber, testData } = validation.data;
    
    // A normalização será feita pelo WhatsApp Service
    console.log(`📱 Template test - Phone: ${phoneNumber}`);
    
    const { db } = await import('../db');
    const { whatsappTemplates } = await import('@shared/schema');
    
    // Buscar o template
    const [template] = await db
      .select()
      .from(whatsappTemplates)
      .where(eq(whatsappTemplates.id, templateId))
      .limit(1);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template não encontrado'
      });
    }
    
    // Substituir placeholders no conteúdo
    let message = template.content;
    Object.entries(testData).forEach(([key, value]) => {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      message = message.replace(placeholder, value);
    });
    
    // Enviar mensagem usando o serviço WhatsApp
    const result = await whatsAppService.sendMessage(phoneNumber, message);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Template testado com sucesso!',
        templateName: template.name,
        sentMessage: message
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Erro ao enviar mensagem de teste'
      });
    }
  } catch (error: any) {
    console.error('❌ Error testing WhatsApp template:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/admin/whatsapp/send-message
 * Send WhatsApp message to customer from order
 */
const sendMessageSchema = z.object({
  orderId: z.number(),
  templateId: z.number().optional(),
  customMessage: z.string().optional()
}).refine(data => data.templateId || data.customMessage, {
  message: "Deve fornecer templateId ou customMessage"
});

router.post('/send-message', async (req: Request, res: Response) => {
  try {
    console.log('📱 Sending WhatsApp message from admin...');
    
    const validation = sendMessageSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: validation.error.errors
      });
    }

    const { orderId, templateId, customMessage } = validation.data;
    
    const { db } = await import('../db');
    const { orders, customers, events, addresses, kits, whatsappTemplates, whatsappMessages } = await import('@shared/schema');
    
    // Buscar dados do pedido
    const [order] = await db
      .select({
        order: orders,
        customer: customers,
        event: events,
        address: addresses
      })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .innerJoin(events, eq(orders.eventId, events.id))
      .innerJoin(addresses, eq(orders.addressId, addresses.id))
      .where(eq(orders.id, orderId))
      .limit(1);
    
    // Buscar kits do pedido
    const orderKits = await db
      .select()
      .from(kits)
      .where(eq(kits.orderId, orderId));
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Pedido não encontrado'
      });
    }

    let messageContent = '';

    if (templateId) {
      // Usar template
      const [template] = await db
        .select()
        .from(whatsappTemplates)
        .where(eq(whatsappTemplates.id, templateId))
        .limit(1);
      
      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template não encontrado'
        });
      }

      // Substituir placeholders
      messageContent = template.content;
      messageContent = messageContent.replace(/\{customerName\}/g, order.customer.name);
      messageContent = messageContent.replace(/\{orderNumber\}/g, order.order.orderNumber);
      messageContent = messageContent.replace(/\{eventName\}/g, order.event.name);
      messageContent = messageContent.replace(/\{eventDate\}/g, order.event.date);
      messageContent = messageContent.replace(/\{eventLocation\}/g, order.event.location);
      messageContent = messageContent.replace(/\{kitQuantity\}/g, order.order.kitQuantity.toString());
      messageContent = messageContent.replace(/\{totalCost\}/g, `R$ ${Number(order.order.totalCost).toFixed(2).replace('.', ',')}`);
      messageContent = messageContent.replace(/\{deliveryAddress\}/g, 
        `${order.address.street}, ${order.address.number} - ${order.address.neighborhood}, ${order.address.city}/${order.address.state}`
      );
      
      // Preparar lista de kits formatada
      const kitsList = orderKits && orderKits.length > 0 
        ? orderKits.map((kit: any, index: number) => 
            `${index + 1}. ${kit.name}`
          ).join('\n')
        : `${order.order.kitQuantity} kit(s) solicitado(s)`;
      
      // Placeholders do sistema antigo
      messageContent = messageContent.replace(/\{\{cliente\}\}/g, order.customer.name);
      messageContent = messageContent.replace(/\{\{evento\}\}/g, order.event.name);
      messageContent = messageContent.replace(/\{\{qtd_kits\}\}/g, order.order.kitQuantity.toString());
      messageContent = messageContent.replace(/\{\{numero_pedido\}\}/g, order.order.orderNumber);
      messageContent = messageContent.replace(/\{\{data_entrega\}\}/g, 'em breve');
      messageContent = messageContent.replace(/\{\{lista_kits\}\}/g, kitsList);
    } else if (customMessage) {
      messageContent = customMessage;
    }

    // Usar telefone do cliente (normalização será feita pelo WhatsApp Service)
    const phoneNumber = order.customer.phone;

    // Enviar mensagem via WhatsApp Service
    const result = await whatsAppService.sendMessage(phoneNumber, messageContent);
    
    // Salvar no histórico
    await db.insert(whatsappMessages).values({
      orderId: order.order.id,
      customerName: order.customer.name,
      phoneNumber: phoneNumber,
      messageContent: messageContent,
      status: result.success ? 'sent' : 'error',
      jobId: null,
      errorMessage: result.success ? null : (result.error || 'Erro desconhecido'),
      sentAt: result.success ? new Date() : null
    });

    if (result.success) {
      res.json({
        success: true,
        message: 'Mensagem enviada com sucesso!'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Erro ao enviar mensagem'
      });
    }
  } catch (error: any) {
    console.error('❌ Error sending WhatsApp message:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/admin/whatsapp/messages/:orderId
 * Get WhatsApp message history for specific order
 */
router.get('/messages/:orderId', async (req: Request, res: Response) => {
  try {
    console.log('📱 Getting WhatsApp message history for order...');
    
    const orderId = parseInt(req.params.orderId);
    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        error: 'ID do pedido inválido'
      });
    }
    
    const { db } = await import('../db');
    const { whatsappMessages } = await import('@shared/schema');
    
    const messages = await db
      .select()
      .from(whatsappMessages)
      .where(eq(whatsappMessages.orderId, orderId))
      .orderBy(desc(whatsappMessages.createdAt));
    
    res.json({
      success: true,
      messages
    });
  } catch (error: any) {
    console.error('❌ Error getting WhatsApp message history for order:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

export default router;
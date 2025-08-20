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
 * Get WhatsApp connection status and QR code if needed
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
        // Try to get QR code
        const qrResult = await whatsAppService.getQRCode();
        
        if (qrResult.success && qrResult.data?.qrcode) {
          // Ensure the qrcode includes the data URI prefix if it doesn't already have it
          const qrCodeData = qrResult.data.qrcode.startsWith('data:') 
            ? qrResult.data.qrcode 
            : `data:image/png;base64,${qrResult.data.qrcode}`;
            
          return res.json({
            success: true,
            connected: false,
            connectionStatus: 'connecting',
            qrCode: qrCodeData,
            qrCodeType: 'png',
            message: 'Escaneie o QR Code para conectar o WhatsApp'
          });
        } else {
          return res.json({
            success: true,
            connected: false,
            connectionStatus: 'connecting',
            message: qrResult.message || 'Conectando ao WhatsApp...'
          });
        }
      } else {
        // Disconnected - try to initiate connection
        const connectResult = await whatsAppService.connect();
        
        if (connectResult.success) {
          // After connecting, try to get QR code
          const qrResult = await whatsAppService.getQRCode();
          
          if (qrResult.success && qrResult.data?.qrcode) {
            // Ensure the qrcode includes the data URI prefix if it doesn't already have it
            const qrCodeData = qrResult.data.qrcode.startsWith('data:') 
              ? qrResult.data.qrcode 
              : `data:image/png;base64,${qrResult.data.qrcode}`;
              
            return res.json({
              success: true,
              connected: false,
              connectionStatus: 'connecting',
              qrCode: qrCodeData,
              qrCodeType: 'png',
              message: 'Escaneie o QR Code para conectar o WhatsApp'
            });
          }
        }
        
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
    
    // Para mensagens de teste, enviar número sem formatação se desejado
    console.log(`📱 Sending test message to raw number: ${phoneNumber}`);
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
    
    // Desativa outros templates do mesmo tipo/status
    await db
      .update(whatsappTemplates)
      .set({ isDefault: false })
      .where(eq(whatsappTemplates.type, currentTemplate.type));
    
    if (currentTemplate.status) {
      await db
        .update(whatsappTemplates)
        .set({ isDefault: false })
        .where(eq(whatsappTemplates.status, currentTemplate.status));
    }
    
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
    
    // Enviar mensagem usando o serviço WhatsApp (número sem formatação para teste)
    console.log(`📱 Sending to raw number: ${phoneNumber}`);
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

export default router;
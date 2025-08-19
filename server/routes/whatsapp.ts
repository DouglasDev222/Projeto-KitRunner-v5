import { Router, Request, Response } from 'express';
import WhatsAppService from '../whatsapp-service';
import { storage } from '../storage';
import { requireAdminAuth } from '../middleware/auth';
import { z } from 'zod';

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
    
    const qrResponse = await whatsAppService.getQRCode();
    
    if (qrResponse.status === 'error' && qrResponse.description.includes('conectado')) {
      // Already connected
      return res.json({
        success: true,
        connected: true,
        message: 'WhatsApp conectado com sucesso'
      });
    } else if (qrResponse.status === 'success' || qrResponse.qrCode) {
      // Need to connect - return QR code
      return res.json({
        success: true,
        connected: false,
        qrCode: qrResponse.qrCode,
        message: 'Escaneie o QR Code para conectar'
      });
    } else {
      // Error
      return res.json({
        success: false,
        connected: false,
        error: qrResponse.description
      });
    }
  } catch (error: any) {
    console.error('❌ Error getting WhatsApp connection:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
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
    
    const template = await whatsAppService.getActiveTemplate();
    
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
    
    const template = await storage.createWhatsappTemplate({
      templateContent: content,
      isActive: true
    });
    
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
    
    const template = await storage.updateWhatsappTemplate(templateId, {
      templateContent: content,
      isActive: true
    });
    
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
    
    const history = await whatsAppService.getMessageHistory(page, limit);
    
    res.json({
      success: true,
      ...history
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
    
    const formattedPhone = whatsAppService.formatPhoneNumber(phoneNumber);
    const result = await whatsAppService.sendMessage(formattedPhone, message);
    
    if (result.status === 'success') {
      res.json({
        success: true,
        jobId: result.jobId,
        message: 'Mensagem de teste enviada com sucesso'
      });
    } else {
      res.json({
        success: false,
        error: result.description
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

export default router;
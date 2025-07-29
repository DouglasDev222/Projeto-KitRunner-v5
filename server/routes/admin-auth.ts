import { Router } from 'express';
import { AdminAuthService } from '../auth/admin-auth';
import { requireAdminAuth, requireSuperAdmin, type AuthenticatedRequest } from '../middleware/auth';
import { 
  adminLoginSchema, 
  adminUserCreationSchema, 
  adminUserUpdateSchema, 
  auditLogFiltersSchema 
} from '@shared/schema';
import { z } from 'zod';

const router = Router();
const adminAuthService = new AdminAuthService();

// Login de administrador
router.post('/login', async (req, res) => {
  try {
    const body = adminLoginSchema.parse(req.body);
    
    const result = await adminAuthService.login(
      body.username, 
      body.password,
      req.ip,
      req.get('User-Agent')
    );
    
    if (result.success) {
      res.json({
        success: true,
        token: result.token,
        user: result.user,
      });
    } else {
      res.status(401).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: error.errors,
      });
    }
    
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

// Logout de administrador
router.post('/logout', requireAdminAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      await adminAuthService.logout(token, req.ip, req.get('User-Agent'));
    }
    
    res.json({ success: true, message: 'Logout realizado com sucesso' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

// Verificar token atual
router.get('/me', requireAdminAuth, async (req: AuthenticatedRequest, res) => {
  try {
    res.json({
      success: true,
      user: req.admin,
    });
  } catch (error) {
    console.error('Get current admin error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

// Atualizar token (refresh)
router.post('/refresh', requireAdminAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const admin = req.admin!;
    
    // Gerar novo token
    const { JWTUtils } = await import('../auth/jwt-utils');
    const newToken = JWTUtils.generateToken(admin.id, admin.username, admin.role);
    
    res.json({
      success: true,
      token: newToken,
      user: admin,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

// Gestão de usuários administrativos

// Listar todos os administradores
router.get('/users', requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const users = await adminAuthService.getAllAdminUsers();
    
    res.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

// Criar novo administrador
router.post('/users', requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const body = adminUserCreationSchema.parse(req.body);
    
    const newUser = await adminAuthService.createAdminUser(body, req.admin!.id);
    
    res.status(201).json({
      success: true,
      user: newUser,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: error.errors,
      });
    }
    
    console.error('Create admin user error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor',
    });
  }
});

// Atualizar administrador
router.put('/users/:id', requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = adminUserUpdateSchema.parse(req.body);
    
    const updatedUser = await adminAuthService.updateAdminUser(id, body, req.admin!.id);
    
    res.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: error.errors,
      });
    }
    
    console.error('Update admin user error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor',
    });
  }
});

// Desativar administrador
router.delete('/users/:id', requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    
    await adminAuthService.deleteAdminUser(id, req.admin!.id);
    
    res.json({
      success: true,
      message: 'Usuário desativado com sucesso',
    });
  } catch (error) {
    console.error('Delete admin user error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor',
    });
  }
});

// Auditoria

// Buscar logs de auditoria
router.get('/audit', requireAdminAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const filters = auditLogFiltersSchema.parse(req.query);
    
    // Administradores regulares só podem ver seus próprios logs
    if (req.admin!.role !== 'super_admin') {
      filters.adminUserId = req.admin!.id;
    }
    
    const result = await adminAuthService.getAuditLog(filters);
    
    res.json({
      success: true,
      logs: result.logs,
      total: result.total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(result.total / filters.limit),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros inválidos',
        details: error.errors,
      });
    }
    
    console.error('Get audit log error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

// Limpar sessões expiradas (endpoint de manutenção)
router.post('/cleanup', requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    await adminAuthService.cleanupExpiredSessions();
    
    res.json({
      success: true,
      message: 'Sessões expiradas removidas com sucesso',
    });
  } catch (error) {
    console.error('Cleanup sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

export default router;
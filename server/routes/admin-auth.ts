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
router.get('/verify', requireAdminAuth, async (req: AuthenticatedRequest, res) => {
  try {
    // Se chegou até aqui, o token é válido (middleware verificou)
    res.json({
      success: true,
      user: req.admin,
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

// Criar usuário admin (apenas super_admin)
router.post('/users', requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const body = adminUserCreationSchema.parse(req.body);
    
    const user = await adminAuthService.createAdminUser(body, req.admin!.id);
    
    res.json({
      success: true,
      user,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: error.errors,
      });
    }
    
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

// Listar usuários admin (apenas super_admin)
router.get('/users', requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const users = await adminAuthService.getAllAdminUsers();
    
    res.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

// Atualizar usuário admin (apenas super_admin)
router.put('/users/:id', requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = parseInt(req.params.id);
    const body = adminUserUpdateSchema.parse(req.body);
    
    const user = await adminAuthService.updateAdminUser(userId, body);
    
    res.json({
      success: true,
      user,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: error.errors,
      });
    }
    
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

// Deletar usuário admin (apenas super_admin)
router.delete('/users/:id', requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Não permitir deletar próprio usuário
    if (userId === req.admin!.id) {
      return res.status(400).json({
        success: false,
        error: 'Não é possível deletar seu próprio usuário',
      });
    }
    
    await adminAuthService.deleteAdminUser(userId);
    
    res.json({
      success: true,
      message: 'Usuário deletado com sucesso',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

// Logs de auditoria
router.get('/audit-logs', requireAdminAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const filters = auditLogFiltersSchema.parse(req.query);
    
    // Se não for super_admin, só pode ver próprios logs
    if (req.admin!.role !== 'super_admin') {
      filters.adminUserId = req.admin!.id;
    }
    
    const result = await adminAuthService.getAuditLog(filters);
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Filtros inválidos',
        details: error.errors,
      });
    }
    
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

export default router;
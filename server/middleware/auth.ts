import { Request, Response, NextFunction } from 'express';
import { AdminAuthService } from '../auth/admin-auth';

// Interface para estender o Request com dados do usuário
export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    cpf: string;
    name: string;
    isAdmin?: boolean;
  };
  admin?: {
    id: number;
    username: string;
    fullName: string;
    role: string;
    email: string;
    isActive: boolean;
  };
}

const adminAuthService = new AdminAuthService();

// Middleware para verificar se usuário está autenticado
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  console.log(`🔍 DEBUG AUTH: Request to ${req.path}, Auth header:`, authHeader ? 'Present' : 'Missing');
  
  if (!authHeader) {
    console.warn(`🔒 SECURITY: Unauthorized access attempt to ${req.path} from IP: ${req.ip}`);
    return res.status(401).json({ 
      error: 'Token de acesso requerido',
      message: 'Você precisa estar logado para acessar este recurso'
    });
  }
  
  try {
    // Extrair dados do token (formato: "Bearer base64_encoded_user_data")
    const token = authHeader.replace('Bearer ', '');
    console.log(`🔍 DEBUG AUTH: Extracted token:`, token.substring(0, 50) + '...');
    
    // Check if it's a JWT token (admin) - JWT has 3 parts separated by dots
    if (token.includes('.') && token.split('.').length === 3) {
      console.log(`🔍 DEBUG AUTH: Token appears to be JWT (admin token), skipping user auth`);
      return res.status(401).json({ 
        error: 'Token inválido',
        message: 'Token de administrador não pode ser usado em endpoints de usuário'
      });
    }
    
    const decodedData = Buffer.from(token, 'base64').toString('utf-8');
    console.log(`🔍 DEBUG AUTH: Decoded data:`, decodedData);
    
    const userData = JSON.parse(decodedData);
    console.log(`🔍 DEBUG AUTH: Parsed user data:`, userData);
    
    // Validar estrutura dos dados
    if (!userData.id || !userData.cpf || !userData.name) {
      console.error(`🔍 DEBUG AUTH: Missing required fields - ID: ${userData.id}, CPF: ${userData.cpf}, Name: ${userData.name}`);
      throw new Error('Token inválido');
    }
    
    // Anexar dados do usuário à requisição
    req.user = userData;
    
    console.log(`🔓 Authenticated user: ${userData.name} (ID: ${userData.id})`);
    next();
  } catch (error) {
    console.warn(`🔒 SECURITY: Invalid token attempt to ${req.path} from IP: ${req.ip}`, error);
    return res.status(401).json({ 
      error: 'Token inválido',
      message: 'Token de acesso inválido ou expirado'
    });
  }
}

// Middleware para verificar autenticação de administrador com JWT
export async function requireAdminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    // Removido sistema antigo - apenas JWT
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn(`🔒 SECURITY: Missing admin token for ${req.path} from IP: ${req.ip}`);
      return res.status(401).json({ 
        error: 'Token de administrador requerido',
        message: 'Acesso restrito a administradores autenticados'
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer '
    const admin = await adminAuthService.verifyToken(token);
    
    if (!admin) {
      console.warn(`🔒 SECURITY: Invalid admin token for ${req.path} from IP: ${req.ip}`);
      return res.status(401).json({ 
        error: 'Token de administrador inválido',
        message: 'Token expirado ou inválido'
      });
    }
    
    // Anexar dados do admin à requisição
    req.admin = admin;
    
    // Log da ação automaticamente
    await adminAuthService.logAction(
      admin.id, 
      `access_${req.method.toLowerCase()}`, 
      'api_endpoint', 
      req.path,
      { method: req.method, params: req.params, query: req.query },
      req.ip,
      req.get('User-Agent')
    );
    
    console.log(`🔑 Admin authenticated: ${admin.fullName} (${admin.role}) for ${req.path}`);
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    return res.status(500).json({ 
      error: 'Erro de autenticação',
      message: 'Erro interno do servidor'
    });
  }
}

// Middleware para verificar papel de super administrador
export function requireSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  requireAdminAuth(req, res, () => {
    if (req.admin?.role !== 'super_admin') {
      console.warn(`🔒 SECURITY: Non-super-admin access attempt to ${req.path} by ${req.admin?.username} from IP: ${req.ip}`);
      return res.status(403).json({ 
        error: 'Acesso negado',
        message: 'Apenas super administradores podem acessar este recurso'
      });
    }
    
    console.log(`🔑 Super admin access granted to ${req.admin.fullName} for ${req.path}`);
    next();
  });
}

// Middleware para verificar se usuário é administrador (usando apenas novo sistema JWT)
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Usar apenas novo sistema JWT
  requireAdminAuth(req, res, next);
}

// Middleware para verificar se usuário pode acessar recurso específico
export function requireOwnership(resourceIdParam: string = 'id', resourceType: 'order' | 'address' | 'customer' = 'order') {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Primeiro verificar autenticação
    requireAuth(req, res, async () => {
      try {
        const resourceId = parseInt(req.params[resourceIdParam]);
        const userId = req.user!.id;
        
        // Se é admin, permite acesso a qualquer recurso
        if (req.user!.isAdmin) {
          console.log(`🔑 Admin override: ${req.user!.name} accessing ${resourceType} ${resourceId}`);
          return next();
        }
        
        // Verificar propriedade do recurso
        const { DatabaseStorage } = await import('../storage');
        const storage = new DatabaseStorage();
        
        let isOwner = false;
        
        switch (resourceType) {
          case 'order':
            // First try to get order by number (most common case), then by ID
            const resourceIdStr = req.params[resourceIdParam];
            let order;
            
            if (isNaN(parseInt(resourceIdStr))) {
              // It's likely an order number (KR2025xxxxx)
              order = await storage.getOrderByNumber(resourceIdStr) || await storage.getOrderByIdempotencyKey(resourceIdStr);
            } else {
              // It's likely an order ID
              order = await storage.getOrderById(parseInt(resourceIdStr));
            }
            
            isOwner = order?.customerId === userId;
            break;
          case 'address':
            const address = await storage.getAddress(resourceId);
            isOwner = address?.customerId === userId;
            break;
          case 'customer':
            isOwner = resourceId === userId;
            break;
        }
        
        if (!isOwner) {
          console.warn(`🔒 SECURITY: User ${userId} attempted to access ${resourceType} ${resourceId} without ownership from IP: ${req.ip}`);
          return res.status(403).json({ 
            error: 'Acesso negado',
            message: 'Você só pode acessar seus próprios dados'
          });
        }
        
        console.log(`✅ Ownership verified: User ${userId} accessing own ${resourceType} ${resourceId}`);
        next();
      } catch (error) {
        console.error('Error in ownership verification:', error);
        return res.status(500).json({ 
          error: 'Erro interno',
          message: 'Erro ao verificar permissões'
        });
      }
    });
  };
}
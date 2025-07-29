import { Request, Response, NextFunction } from 'express';

// Interface para estender o Request com dados do usuário
export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    cpf: string;
    name: string;
    isAdmin?: boolean;
  };
}

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

// Middleware para verificar se usuário é administrador
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Método 1: Header X-Admin-Auth para autenticação direta admin
  const adminHeader = req.headers['x-admin-auth'];
  if (adminHeader === 'true') {
    req.user = { id: 0, cpf: '', name: 'Admin', isAdmin: true };
    console.log(`🔑 Admin access granted via header for ${req.path}`);
    return next();
  }
  
  // Método 2: Token com isAdmin flag
  requireAuth(req, res, () => {
    if (!req.user?.isAdmin) {
      console.warn(`🔒 SECURITY: Non-admin access attempt to ${req.path} by user ${req.user?.id} from IP: ${req.ip}`);
      return res.status(403).json({ 
        error: 'Acesso negado',
        message: 'Apenas administradores podem acessar este recurso'
      });
    }
    
    console.log(`🔑 Admin access granted to ${req.user.name} for ${req.path}`);
    next();
  });
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
            // Try to get order by ID first, then by number if resourceId is not a number
            let order = await storage.getOrderById(resourceId);
            if (!order && isNaN(resourceId)) {
              order = await storage.getOrderByNumber(resourceId.toString()) || await storage.getOrderByIdempotencyKey(resourceId.toString());
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
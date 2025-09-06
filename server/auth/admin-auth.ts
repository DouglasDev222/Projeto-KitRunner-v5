import { db } from '../db';
import { adminUsers, adminSessions, adminAuditLog, passwordResetTokens } from '@shared/schema';
import type { 
  AdminUser, 
  CreateAdminUser, 
  UpdateAdminUser, 
  AuthResult, 
  InsertAdminSession, 
  InsertAdminAuditLog,
  InsertPasswordResetToken,
  AuditLogFilters 
} from '@shared/schema';
import { eq, and, sql, desc, ilike, gte, lte } from 'drizzle-orm';
import { JWTUtils } from './jwt-utils';
import { PasswordUtils } from './password-utils';

export class AdminAuthService {
  // Autenticação
  async login(username: string, password: string, ipAddress?: string, userAgent?: string): Promise<AuthResult> {
    try {
      // 🔐 CASE-INSENSITIVE FIX: Convert username to lowercase
      const normalizedUsername = username.toLowerCase();
      
      // Buscar usuário
      const [user] = await db
        .select()
        .from(adminUsers)
        .where(
          and(
            eq(adminUsers.username, normalizedUsername),
            eq(adminUsers.isActive, true)
          )
        );

      if (!user) {
        await this.logAction(null, 'login_failed', 'admin_user', undefined, 
          { reason: 'user_not_found', username }, ipAddress, userAgent);
        return { success: false, error: 'Credenciais inválidas' };
      }

      // Verificar senha
      const isPasswordValid = await PasswordUtils.verifyPassword(password, user.passwordHash);
      if (!isPasswordValid) {
        await this.logAction(user.id, 'login_failed', 'admin_user', user.id.toString(), 
          { reason: 'invalid_password' }, ipAddress, userAgent);
        return { success: false, error: 'Credenciais inválidas' };
      }

      // Gerar token JWT
      const token = JWTUtils.generateToken(user.id, user.username, user.role);
      const tokenHash = JWTUtils.generateTokenHash(token);

      // Criar sessão
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 horas

      await db.insert(adminSessions).values({
        adminUserId: user.id,
        tokenHash,
        expiresAt,
        ipAddress,
        userAgent,
      });

      // Atualizar último login
      await db
        .update(adminUsers)
        .set({ lastLogin: new Date() })
        .where(eq(adminUsers.id, user.id));

      // Log da ação
      await this.logAction(user.id, 'login_success', 'admin_user', user.id.toString(), 
        { username: user.username }, ipAddress, userAgent);

      // Remover senha do retorno
      const { passwordHash, ...userWithoutPassword } = user;
      
      return { 
        success: true, 
        token, 
        user: userWithoutPassword as AdminUser 
      };

    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Erro interno do servidor' };
    }
  }

  async logout(token: string, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      const tokenHash = JWTUtils.generateTokenHash(token);
      
      // Buscar sessão
      const [session] = await db
        .select()
        .from(adminSessions)
        .where(eq(adminSessions.tokenHash, tokenHash));

      if (session) {
        // Remover sessão
        await db
          .delete(adminSessions)
          .where(eq(adminSessions.tokenHash, tokenHash));

        // Log da ação
        await this.logAction(session.adminUserId, 'logout', 'admin_user', 
          session.adminUserId.toString(), {}, ipAddress, userAgent);
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async verifyToken(token: string): Promise<AdminUser | null> {
    try {
      const payload = JWTUtils.verifyToken(token);
      if (!payload) return null;

      const tokenHash = JWTUtils.generateTokenHash(token);

      // Verificar se a sessão existe e não expirou
      const [session] = await db
        .select()
        .from(adminSessions)
        .where(
          and(
            eq(adminSessions.tokenHash, tokenHash),
            gte(adminSessions.expiresAt, new Date())
          )
        );

      if (!session) return null;

      // Buscar usuário
      const [user] = await db
        .select()
        .from(adminUsers)
        .where(
          and(
            eq(adminUsers.id, payload.adminUserId),
            eq(adminUsers.isActive, true)
          )
        );

      if (!user) return null;

      // Remover senha do retorno
      const { passwordHash, ...userWithoutPassword } = user;
      return userWithoutPassword as AdminUser;

    } catch (error) {
      console.error('Token verification error:', error);
      return null;
    }
  }

  // Gestão de usuários
  async createAdminUser(userData: CreateAdminUser, createdBy: number): Promise<AdminUser> {
    try {
      // 🔐 CASE-INSENSITIVE FIX: Convert username to lowercase
      const normalizedUsername = userData.username.toLowerCase();
      
      // Verificar se username já existe
      const [existingUsername] = await db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.username, normalizedUsername));

      if (existingUsername) {
        throw new Error('Nome de usuário já existe');
      }

      // Verificar se email já existe
      const [existingEmail] = await db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.email, userData.email));

      if (existingEmail) {
        throw new Error('Email já está em uso');
      }

      // Validar força da senha
      const passwordValidation = PasswordUtils.validatePasswordStrength(userData.password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join(', '));
      }

      // Hash da senha
      const passwordHash = await PasswordUtils.hashPassword(userData.password);

      // Criar usuário
      const [newUser] = await db
        .insert(adminUsers)
        .values({
          username: normalizedUsername,
          email: userData.email,
          passwordHash,
          fullName: userData.fullName,
          role: userData.role,
          createdBy,
        })
        .returning();

      // Log da ação
      await this.logAction(createdBy, 'create_admin_user', 'admin_user', newUser.id.toString(), 
        { created_username: normalizedUsername, role: userData.role });

      // Remover senha do retorno
      const { passwordHash: _, ...userWithoutPassword } = newUser;
      return userWithoutPassword as AdminUser;

    } catch (error) {
      console.error('Create admin user error:', error);
      throw error;
    }
  }

  async updateAdminUser(id: number, updates: UpdateAdminUser, updatedBy: number): Promise<AdminUser> {
    try {
      // Verificar se usuário existe
      const [existingUser] = await db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.id, id));

      if (!existingUser) {
        throw new Error('Usuário não encontrado');
      }

      // 🔐 CASE-INSENSITIVE FIX: Declare normalized username outside scope
      let normalizedUsername: string | undefined;

      // Verificar conflitos de username
      if (updates.username) {
        normalizedUsername = updates.username.toLowerCase();
        
        const [conflictUsername] = await db
          .select()
          .from(adminUsers)
          .where(
            and(
              eq(adminUsers.username, normalizedUsername),
              sql`id != ${id}`
            )
          );

        if (conflictUsername) {
          throw new Error('Nome de usuário já existe');
        }
      }

      // Verificar conflitos de email
      if (updates.email) {
        const [conflictEmail] = await db
          .select()
          .from(adminUsers)
          .where(
            and(
              eq(adminUsers.email, updates.email),
              sql`id != ${id}`
            )
          );

        if (conflictEmail) {
          throw new Error('Email já está em uso');
        }
      }

      // Atualizar usuário - 🔐 CASE-INSENSITIVE FIX: Use normalized username if available
      const updateData = { ...updates, updatedAt: new Date() };
      if (normalizedUsername) {
        updateData.username = normalizedUsername;
      }
      
      const [updatedUser] = await db
        .update(adminUsers)
        .set(updateData)
        .where(eq(adminUsers.id, id))
        .returning();

      // Log da ação
      await this.logAction(updatedBy, 'update_admin_user', 'admin_user', id.toString(), 
        { updated_fields: Object.keys(updates) });

      // Remover senha do retorno
      const { passwordHash, ...userWithoutPassword } = updatedUser;
      return userWithoutPassword as AdminUser;

    } catch (error) {
      console.error('Update admin user error:', error);
      throw error;
    }
  }

  async deleteAdminUser(id: number, deletedBy: number): Promise<void> {
    try {
      // Verificar se usuário existe
      const [existingUser] = await db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.id, id));

      if (!existingUser) {
        throw new Error('Usuário não encontrado');
      }

      // Não permitir deletar o próprio usuário
      if (id === deletedBy) {
        throw new Error('Não é possível deletar seu próprio usuário');
      }

      // Desativar ao invés de deletar
      await db
        .update(adminUsers)
        .set({ 
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(adminUsers.id, id));

      // Log da ação
      await this.logAction(deletedBy, 'delete_admin_user', 'admin_user', id.toString(), 
        { deleted_username: existingUser.username });

    } catch (error) {
      console.error('Delete admin user error:', error);
      throw error;
    }
  }

  async getAllAdminUsers(): Promise<AdminUser[]> {
    try {
      const users = await db
        .select()
        .from(adminUsers)
        .orderBy(desc(adminUsers.createdAt));

      // Remover senhas do retorno
      return users.map(({ passwordHash, ...user }) => user) as AdminUser[];

    } catch (error) {
      console.error('Get all admin users error:', error);
      throw error;
    }
  }

  // Auditoria
  async logAction(
    adminUserId: number | null, 
    action: string, 
    resourceType?: string, 
    resourceId?: string, 
    details?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await db.insert(adminAuditLog).values({
        adminUserId,
        action,
        resourceType,
        resourceId,
        details: details ? JSON.stringify(details) : null,
        ipAddress,
        userAgent,
      });
    } catch (error) {
      console.error('Log action error:', error);
      // Não lançar erro para não interromper fluxo principal
    }
  }

  async getAuditLog(filters: AuditLogFilters): Promise<{ logs: any[], total: number }> {
    try {
      const conditions = [];

      if (filters.adminUserId) {
        conditions.push(eq(adminAuditLog.adminUserId, filters.adminUserId));
      }

      if (filters.action) {
        conditions.push(ilike(adminAuditLog.action, `%${filters.action}%`));
      }

      if (filters.resourceType) {
        conditions.push(eq(adminAuditLog.resourceType, filters.resourceType));
      }

      if (filters.startDate) {
        conditions.push(gte(adminAuditLog.createdAt, new Date(filters.startDate)));
      }

      if (filters.endDate) {
        conditions.push(lte(adminAuditLog.createdAt, new Date(filters.endDate)));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Contar total
      const countResult = await db
        .select({ count: sql<number>`count(*)::integer` })
        .from(adminAuditLog)
        .where(whereClause);
      
      const count = countResult[0]?.count || 0;

      // Buscar logs com paginação
      const logs = await db
        .select({
          id: adminAuditLog.id,
          adminUserId: adminAuditLog.adminUserId,
          action: adminAuditLog.action,
          resourceType: adminAuditLog.resourceType,
          resourceId: adminAuditLog.resourceId,
          details: adminAuditLog.details,
          ipAddress: adminAuditLog.ipAddress,
          userAgent: adminAuditLog.userAgent,
          createdAt: adminAuditLog.createdAt,
          adminUser: {
            username: adminUsers.username,
            fullName: adminUsers.fullName,
          }
        })
        .from(adminAuditLog)
        .leftJoin(adminUsers, eq(adminAuditLog.adminUserId, adminUsers.id))
        .where(whereClause)
        .orderBy(desc(adminAuditLog.createdAt))
        .limit(filters.limit || 50)
        .offset(((filters.page || 1) - 1) * (filters.limit || 50));

      return { logs, total: count };

    } catch (error) {
      console.error('Get audit log error:', error);
      throw error;
    }
  }

  // Limpeza de sessões expiradas
  async cleanupExpiredSessions(): Promise<void> {
    try {
      await db
        .delete(adminSessions)
        .where(sql`expires_at < NOW()`);
    } catch (error) {
      console.error('Cleanup expired sessions error:', error);
    }
  }
}
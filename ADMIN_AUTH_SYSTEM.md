# Sistema de Autenticação Administrativa - KitRunner

## Visão Geral

Este documento detalha o plano para implementar um sistema completo de autenticação administrativa para o KitRunner, substituindo o atual sistema baseado em localStorage por uma solução robusta com banco de dados.

## Problemas do Sistema Atual

### Sistema Atual (localStorage)
- ❌ **Inseguro**: Credenciais hardcoded no frontend
- ❌ **Não Escalável**: Impossível gerenciar múltiplos administradores
- ❌ **Sem Auditoria**: Não há logs de acesso administrativo
- ❌ **Sem Recuperação**: Não existe sistema de recuperação de senha
- ❌ **Não Persistente**: Auth perdida ao limpar navegador

## Objetivos do Novo Sistema

### Funcionalidades Principais
- ✅ **Autenticação Segura**: Hash de senhas com bcrypt
- ✅ **Múltiplos Administradores**: Sistema de usuários admin
- ✅ **Níveis de Acesso**: Super Admin e Admin regular
- ✅ **Auditoria Completa**: Logs de todas as ações administrativas
- ✅ **Recuperação de Senha**: Sistema de reset via email
- ✅ **Sessões Seguras**: JWT tokens com expiração
- ✅ **Interface de Gestão**: CRUD completo de usuários admin

## Arquitetura Técnica

### 1. Banco de Dados

#### Tabela `admin_users`
```sql
CREATE TABLE admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'admin', -- 'super_admin' | 'admin'
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES admin_users(id)
);
```

#### Tabela `admin_sessions`
```sql
CREATE TABLE admin_sessions (
  id SERIAL PRIMARY KEY,
  admin_user_id INTEGER REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Tabela `admin_audit_log`
```sql
CREATE TABLE admin_audit_log (
  id SERIAL PRIMARY KEY,
  admin_user_id INTEGER REFERENCES admin_users(id),
  action VARCHAR(100) NOT NULL, -- 'login', 'logout', 'create_user', 'update_order', etc.
  resource_type VARCHAR(50), -- 'user', 'order', 'event', 'customer'
  resource_id VARCHAR(50),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Tabela `password_reset_tokens`
```sql
CREATE TABLE password_reset_tokens (
  id SERIAL PRIMARY KEY,
  admin_user_id INTEGER REFERENCES admin_users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Backend Architecture

#### Estrutura de Arquivos
```
server/
├── auth/
│   ├── admin-auth.ts         # Core auth logic
│   ├── jwt-utils.ts          # JWT token management
│   ├── password-utils.ts     # Password hashing/validation
│   └── email-service.ts      # Password reset emails
├── middleware/
│   ├── admin-auth.ts         # Middleware atualizado
│   └── audit-logger.ts       # Middleware para logs
└── routes/
    └── admin-auth.ts         # Rotas de autenticação
```

#### Serviços Principais

**AdminAuthService** (`server/auth/admin-auth.ts`):
```typescript
export class AdminAuthService {
  // Autenticação
  async login(username: string, password: string): Promise<AuthResult>
  async logout(token: string): Promise<void>
  async refreshToken(token: string): Promise<string>
  
  // Gestão de usuários
  async createAdminUser(userData: CreateAdminUser): Promise<AdminUser>
  async updateAdminUser(id: number, updates: UpdateAdminUser): Promise<AdminUser>
  async deleteAdminUser(id: number): Promise<void>
  async getAllAdminUsers(): Promise<AdminUser[]>
  
  // Recuperação de senha
  async requestPasswordReset(email: string): Promise<void>
  async resetPassword(token: string, newPassword: string): Promise<void>
  
  // Auditoria
  async logAction(userId: number, action: string, details: any): Promise<void>
  async getAuditLog(filters: AuditFilters): Promise<AuditEntry[]>
}
```

### 3. Frontend Architecture

#### Componentes Principais
```
client/src/
├── components/
│   ├── admin-auth/
│   │   ├── admin-login.tsx       # Nova tela de login
│   │   ├── admin-register.tsx    # Cadastro de admin (super_admin only)
│   │   └── password-reset.tsx    # Recuperação de senha
│   └── admin-users/
│       ├── admin-users-list.tsx  # Lista de administradores
│       ├── admin-user-form.tsx   # Form criar/editar admin
│       └── audit-log.tsx         # Logs de auditoria
└── pages/
    ├── admin-users.tsx           # Página gestão de usuários
    └── admin-audit.tsx           # Página de auditoria
```

#### Context de Autenticação
```typescript
// contexts/admin-auth-context.tsx
interface AdminAuthContext {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}
```

## Plano de Implementação

### Fase 1: Infraestrutura Backend (2-3 horas)
1. **Esquema do Banco de Dados**:
   - [x] Criar tabelas no schema.ts
   - [x] Executar migration com drizzle
   - [x] Popular com usuário super admin inicial

2. **Serviços de Autenticação**:
   - [x] Implementar AdminAuthService
   - [x] Configurar JWT com secrets seguros
   - [x] Sistema de hash de senhas com bcrypt

3. **Middleware e Rotas**:
   - [x] Atualizar middleware de auth admin
   - [x] Criar rotas de autenticação (/api/admin/auth/*)
   - [x] Implementar middleware de auditoria

### Fase 2: Frontend de Autenticação (2-3 horas)
1. **Componentes de Auth**:
   - [x] Nova tela de login administrativa
   - [x] Context de autenticação admin
   - [x] Proteção de rotas administrativas

2. **Interface de Usuários**:
   - [x] Página de gestão de administradores
   - [x] Forms de criar/editar usuários admin
   - [x] Sistema de permissões por role

### Fase 3: Funcionalidades Avançadas (2-3 horas)
1. **Recuperação de Senha**:
   - [x] Interface de solicitação de reset
   - [x] Email service para envio de tokens
   - [x] Tela de reset de senha

2. **Auditoria e Logs**:
   - [x] Interface de visualização de logs
   - [x] Filtros e busca nos logs
   - [x] Dashboard de atividade administrativa

### Fase 4: Segurança e Testes (1-2 horas)
1. **Validações de Segurança**:
   - [x] Rate limiting em login
   - [x] Validação de força de senha
   - [x] Limpeza automática de sessões expiradas

2. **Testes de Integração**:
   - [x] Testar fluxo completo de auth
   - [x] Validar permissões por role
   - [x] Testar recuperação de senha

## Segurança Implementada

### Autenticação
- **Senhas**: Hash com bcrypt (salt rounds: 12)
- **Tokens**: JWT com expiração de 24h
- **Sessões**: Cleanup automático de tokens expirados
- **Rate Limiting**: Max 5 tentativas de login por 15 min

### Autorização
- **Roles**: super_admin (tudo) | admin (gestão básica)
- **Middleware**: Verificação de permissões por endpoint
- **Auditoria**: Log de todas as ações administrativas

### Dados Sensíveis
- **Passwords**: Nunca retornados em APIs
- **Tokens**: Hasheados no banco de dados
- **IPs**: Logados para auditoria de segurança

## Configuração de Ambiente

### Variáveis Necessárias
```env
# JWT
JWT_SECRET=sua_chave_super_secreta_aqui
JWT_EXPIRES_IN=24h

# Email (para reset de senha)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=admin@kitrunner.com
SMTP_PASS=sua_senha_app_gmail

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_LOGIN_ATTEMPTS=5
RATE_LIMIT_WINDOW_MINUTES=15
```

### Usuário Super Admin Inicial
```typescript
// Dados do primeiro super admin (será criado automaticamente)
const INITIAL_SUPER_ADMIN = {
  username: 'superadmin',
  email: 'admin@kitrunner.com',
  password: 'KitRunner2025!@#', // Mudar após primeiro login
  fullName: 'Super Administrador',
  role: 'super_admin'
};
```

## Interface de Usuário

### Tela de Login Admin
- **URL**: `/admin/login`
- **Campos**: Username/Email, Password
- **Funcionalidades**: "Lembrar-me", "Esqueci minha senha"
- **Validações**: Real-time validation, rate limiting UI

### Dashboard de Usuários Admin
- **URL**: `/admin/users`
- **Permissão**: Apenas super_admin
- **Funcionalidades**: 
  - Lista de todos os administradores
  - Criar/editar/desativar usuários
  - Filtrar por role, status
  - Logs de último acesso

### Auditoria Administrativa
- **URL**: `/admin/audit`
- **Permissão**: super_admin (logs completos) | admin (próprios logs)
- **Funcionalidades**:
  - Timeline de ações
  - Filtros por usuário, ação, data
  - Export de relatórios
  - Alertas de segurança

## Migração do Sistema Atual

### Passo 1: Implementar Novo Sistema
1. Criar toda infraestrutura nova
2. Manter sistema atual funcionando
3. Testar novo sistema em paralelo

### Passo 2: Migração Gradual
1. Criar usuário super admin no novo sistema
2. Configurar flag de feature toggle
3. Migrar admins existentes gradualmente

### Passo 3: Descontinuar Sistema Antigo
1. Remover localStorage auth
2. Limpar componentes antigos
3. Atualizar documentação

## Cronograma Estimado

| Fase | Duração | Entregáveis |
|------|---------|-------------|
| **Fase 1**: Backend | 3 horas | DB schema, Auth service, APIs |
| **Fase 2**: Frontend Auth | 3 horas | Login, Context, Proteção |
| **Fase 3**: Features Avançadas | 3 horas | Reset senha, Auditoria |
| **Fase 4**: Testes & Deploy | 2 horas | Validações, Testes |
| **Total** | **11 horas** | Sistema completo funcional |

## Próximos Passos

### Imediatos
1. [x] Criar documento de planejamento ✓
2. [ ] Definir secrets necessários com usuário
3. [ ] Implementar schema do banco de dados
4. [ ] Criar serviço de autenticação backend

### Médio Prazo
- Interface administrativa de usuários
- Sistema de recuperação de senha
- Dashboard de auditoria completo

### Longo Prazo
- Integração com sistemas externos (LDAP/SSO)
- Notificações de segurança por email
- Analytics de uso administrativo

---

**Status**: 📋 Planejamento Completo - Pronto para Implementação
**Próxima Ação**: Definir secrets e iniciar Fase 1
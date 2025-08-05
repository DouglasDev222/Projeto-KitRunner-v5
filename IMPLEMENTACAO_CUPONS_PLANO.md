# Plano de Implementação - Sistema de Cupons de Desconto

## 📋 Visão Geral
Implementar sistema completo de cupons de desconto no KitRunner, permitindo aplicar descontos fixos ou percentuais durante o processo de compra de eventos.

## 🎯 Objetivos
- [ ] Criar estrutura de banco de dados para cupons
- [ ] Implementar validação e aplicação de cupons no backend
- [ ] Adicionar interface de cupons na tela de pagamento
- [ ] Criar painel administrativo para gerenciar cupons
- [ ] Integrar cupons com sistema de pedidos existente

## 🗄️ Estrutura do Banco de Dados

### Tabela: `coupons`
```sql
CREATE TABLE coupons (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('fixed', 'percent')),
  value DECIMAL(10,2) NOT NULL,
  description TEXT,
  product_ids INTEGER[],  -- Array de IDs de eventos elegíveis (null = todos)
  max_uses INTEGER,       -- Limite total de uso (null = ilimitado)
  uses INTEGER DEFAULT 0, -- Contador de usos
  expires_at TIMESTAMP,   -- Data de validade
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

**Checklist Banco:**
- [ ] Adicionar tabela `coupons` ao schema Drizzle
- [ ] Criar tipos TypeScript para Insert/Select
- [ ] Executar migração do banco
- [ ] Adicionar índices para performance (code, active, expires_at)

## 🔧 Backend - API Endpoints

### 1. Validação de Cupom
**Endpoint:** `POST /api/coupons/validate`
```typescript
Request: {
  code: string,
  eventId: number,
  totalAmount: number
}

Response: {
  valid: boolean,
  coupon?: {
    id: number,
    code: string,
    type: 'fixed' | 'percent',
    value: number,
    description?: string
  },
  discount?: number,
  finalAmount?: number,
  message: string
}
```

**Validações:**
- [ ] Código existe (case-insensitive)
- [ ] Cupom está ativo (active = true)
- [ ] Não está expirado (expires_at > now)
- [ ] Ainda tem usos disponíveis (uses < max_uses)
- [ ] É válido para o evento (product_ids inclui eventId ou é null)
- [ ] Calcular desconto corretamente (fixo ou percentual)

### 2. CRUD Admin de Cupons
**Endpoints:**
- [ ] `GET /api/admin/coupons` - Listar cupons (com filtros)
- [ ] `POST /api/admin/coupons` - Criar cupom
- [ ] `PUT /api/admin/coupons/:id` - Atualizar cupom
- [ ] `DELETE /api/admin/coupons/:id` - Deletar cupom
- [ ] `GET /api/admin/coupons/:id` - Obter cupom específico

### 3. Incremento de Uso
- [ ] Atualizar contador `uses` quando pedido for confirmado
- [ ] Integrar com sistema de pagamento existente

**Checklist Backend:**
- [ ] Criar serviço de validação de cupons
- [ ] Implementar rotas da API
- [ ] Adicionar validações de entrada com Zod
- [ ] Integrar com storage existente
- [ ] Adicionar logs de uso de cupons
- [ ] Testes básicos de validação

## 🎨 Frontend - Interface do Cliente

### Tela de Pagamento (`/events/:id/payment`)
**Localização:** Logo abaixo do resumo do pedido

**Componentes a criar:**
- [ ] `CouponInput` - Campo de entrada do código
- [ ] `CouponSummary` - Exibição do desconto aplicado
- [ ] Integração com cálculo total existente

**Fluxo:**
1. [ ] Campo de input para código do cupom
2. [ ] Botão "Aplicar" ou validação automática
3. [ ] Chamada para API de validação
4. [ ] Atualização do resumo com desconto
5. [ ] Mensagens de sucesso/erro
6. [ ] Bloqueio de múltiplos cupons (apenas um por compra)

**Estados da Interface:**
- [ ] Estado inicial (sem cupom)
- [ ] Estado de carregamento (validando)
- [ ] Estado de sucesso (cupom aplicado)
- [ ] Estado de erro (cupom inválido)

**Checklist Frontend Cliente:**
- [ ] Criar componente CouponInput
- [ ] Integrar com React Query para validação
- [ ] Atualizar cálculo de totais
- [ ] Adicionar feedback visual (loading, success, error)
- [ ] Salvar cupom aplicado no estado da sessão
- [ ] Incluir cupom nos dados do pedido

## 🛠️ Frontend - Painel Administrativo

### Nova Seção "Cupons"
**Localização:** Menu lateral do admin

### Páginas a criar:
1. [ ] `/admin/coupons` - Lista de cupons
2. [ ] `/admin/coupons/new` - Criar cupom
3. [ ] `/admin/coupons/:id/edit` - Editar cupom

### Lista de Cupons
**Funcionalidades:**
- [ ] Tabela com cupons existentes
- [ ] Filtros: ativo/inativo, expirado/válido, por evento
- [ ] Ordenação por data, uso, etc.
- [ ] Ações: editar, deletar, ativar/desativar

### Formulário de Cupom
**Campos:**
- [ ] Código (obrigatório, único)
- [ ] Tipo (fixed/percent)
- [ ] Valor (R$ ou %)
- [ ] Descrição (opcional)
- [ ] Eventos aplicáveis (select múltiplo ou "todos")
- [ ] Data de validade
- [ ] Limite de uso (opcional)
- [ ] Status ativo/inativo

**Checklist Frontend Admin:**
- [ ] Criar páginas de listagem e formulário
- [ ] Integrar com React Query para CRUD
- [ ] Validação de formulário com Zod
- [ ] Interface responsiva
- [ ] Confirmações para ações destrutivas

## 📊 Integração com Sistema Existente

### Atualização da Tabela de Pedidos
- [ ] Adicionar campos `couponCode` e `discountAmount` na tabela orders
- [ ] Atualizar schema Drizzle
- [ ] Migrar dados existentes

### Exibição nos Pedidos
**Cliente:**
- [ ] Mostrar cupom aplicado na confirmação do pedido
- [ ] Incluir desconto no histórico de pedidos

**Admin:**
- [ ] Mostrar cupom usado nos detalhes do pedido
- [ ] Incluir em relatórios de vendas

### Sistema de Emails
- [ ] Incluir informações do cupom nos emails de confirmação
- [ ] Mostrar desconto aplicado

**Checklist Integração:**
- [ ] Atualizar schema de pedidos
- [ ] Modificar processo de criação de pedidos
- [ ] Atualizar interfaces de exibição
- [ ] Integrar com sistema de emails existente

## 🧪 Testes e Validação

### Casos de Teste
- [ ] Cupom válido com desconto fixo
- [ ] Cupom válido com desconto percentual
- [ ] Cupom expirado
- [ ] Cupom inativo
- [ ] Cupom sem usos restantes
- [ ] Cupom não válido para o evento
- [ ] Aplicação de múltiplos cupons (deve falhar)
- [ ] Cupom com valor maior que o total

### Validações de Segurança
- [ ] Sanitização de entrada do código
- [ ] Validação de permissões admin
- [ ] Rate limiting na validação
- [ ] Logs de tentativas de uso

## 📋 Checklist Final de Entrega

### Banco de Dados
- [ ] Tabela coupons criada e migrada
- [ ] Campos de cupom adicionados aos pedidos
- [ ] Índices de performance criados

### Backend
- [ ] API de validação funcionando
- [ ] CRUD admin implementado
- [ ] Integração com processo de pedidos
- [ ] Logs e monitoramento

### Frontend Cliente
- [ ] Campo de cupom na tela de pagamento
- [ ] Validação em tempo real
- [ ] Feedback visual adequado
- [ ] Integração com cálculo de totais

### Frontend Admin
- [ ] Lista de cupons com filtros
- [ ] Formulário de criação/edição
- [ ] Ações de gerenciamento

### Integração
- [ ] Cupons salvos nos pedidos
- [ ] Exibição em histórico e detalhes
- [ ] Emails atualizados com informações do cupom

### Documentação
- [ ] Atualizar replit.md com nova funcionalidade
- [ ] Documentar novos endpoints da API
- [ ] Guia de uso para administradores

## 🚀 Plano de Execução

### Fase 1: Estrutura Base (30min)
1. Criar schema da tabela coupons
2. Implementar tipos TypeScript
3. Executar migração

### Fase 2: Backend (40min)
1. Implementar serviço de validação
2. Criar endpoints da API
3. Integrar com storage existente

### Fase 3: Frontend Cliente (30min)
1. Criar componente de cupom
2. Integrar com tela de pagamento
3. Implementar validação e feedback

### Fase 4: Frontend Admin (40min)
1. Criar páginas de gerenciamento
2. Implementar CRUD completo
3. Adicionar filtros e validações

### Fase 5: Integração e Testes (20min)
1. Integrar com sistema de pedidos
2. Atualizar emails e relatórios
3. Testes funcionais
4. Documentação

---

**Tempo Total Estimado:** 2h 40min
**Prioridade:** Alta - Funcionalidade crítica para vendas
**Complexidade:** Média - Integração com sistema existente
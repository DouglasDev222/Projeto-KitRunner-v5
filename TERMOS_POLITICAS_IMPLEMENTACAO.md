# Implementação de Termos, Políticas e Aceite de Usuário

## 🎯 Objetivo
Adicionar funcionalidade essencial para garantir boas práticas legais e de consentimento, exibindo e registrando o aceite de termos e políticas em:
- Tela de cadastro (`/register`)
- Tela de pagamento do evento (`/events/:id/payment`)

O conteúdo das políticas deve ser editável via painel administrativo e o aceite registrado em banco de dados.

## 🗄️ Estrutura de Banco de Dados

### 1. Tabela `policy_documents`
```sql
CREATE TABLE policy_documents (
  id SERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL CHECK (type IN ('register', 'order')),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 2. Tabela `policy_acceptances`
```sql
CREATE TABLE policy_acceptances (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES customers(id),
  policy_id INTEGER NOT NULL REFERENCES policy_documents(id),
  accepted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  context VARCHAR(20) NOT NULL CHECK (context IN ('register', 'order')),
  order_id INTEGER REFERENCES orders(id)
);
```

## 🏗️ Implementação Backend

### 1. Schema Drizzle (`shared/schema.ts`)
- Adicionar tabelas `policyDocuments` e `policyAcceptances`
- Definir tipos TypeScript correspondentes
- Criar schemas de validação Zod

### 2. Rotas da API (`server/routes/policies.ts`)
- `GET /api/policies?type=register|order` - Buscar política ativa por tipo
- `POST /api/policies/accept` - Registrar aceite de política
- `GET /api/admin/policies` - Listar todas as políticas (admin)
- `POST /api/admin/policies` - Criar nova política (admin)
- `PUT /api/admin/policies/:id` - Atualizar política (admin)
- `DELETE /api/admin/policies/:id` - Desativar política (admin)

### 3. Service Layer (`server/policy-service.ts`)
- `getActivePolicyByType(type: 'register' | 'order')`
- `createPolicyAcceptance(userId, policyId, context, orderId?)`
- `createPolicy(data)`
- `updatePolicy(id, data)`
- `getAllPolicies()`

### 4. Middleware de Validação
- Verificar aceite obrigatório antes de cadastrar usuário
- Verificar aceite obrigatório antes de concluir pedido

## 🖥️ Implementação Frontend - Cliente

### 1. Modal de Políticas (`client/src/components/policy-modal.tsx`)
- Modal responsivo com rolagem
- Carrega conteúdo da política via API
- Botão de aceite/fechar
- Suporte a HTML no conteúdo

### 2. Hook de Políticas (`client/src/hooks/use-policy.ts`)
- `usePolicyByType(type)` - Buscar política ativa
- `useAcceptPolicy()` - Registrar aceite

### 3. Componente de Aceite (`client/src/components/policy-acceptance.tsx`)
- Checkbox obrigatório
- Link para abrir modal
- Validação de aceite obrigatório

### 4. Integração nas Telas

#### Tela de Cadastro (`/register`)
- Adicionar componente de aceite antes do botão de cadastro
- Validar aceite antes de enviar formulário
- Registrar aceite após cadastro bem-sucedido

#### Tela de Pagamento (`/events/:id/payment`)
- Adicionar componente de aceite antes de finalizar pedido
- Validar aceite antes de processar pagamento
- Registrar aceite com referência ao pedido

## 🔧 Implementação Frontend - Admin

### 1. Página de Políticas (`client/src/pages/admin/policies.tsx`)
- Listagem de políticas por tipo
- Botões para criar/editar/desativar
- Filtros por tipo e status

### 2. Modal de Edição (`client/src/components/admin/policy-editor-modal.tsx`)
- Formulário com campos: tipo, título, conteúdo
- Editor de texto rico (HTML)
- Validação de dados

### 3. Navegação Admin
- Adicionar "Termos e Políticas" ao menu admin
- Rota `/admin/policies`

## ✅ Regras de Negócio

### Política Única Ativa
- Apenas uma política ativa por tipo (`register`, `order`)
- Ao ativar nova política, desativar a anterior automaticamente

### Versionamento
- Manter histórico de políticas (não deletar, apenas desativar)
- Mostrar data de última modificação no admin

### Aceite Obrigatório
- Cadastro: não permitir sem aceite dos termos de cadastro
- Pedido: não permitir finalização sem aceite dos termos do pedido

### Rastreabilidade
- Registrar timestamp preciso do aceite
- Associar aceite ao usuário e contexto
- Para pedidos, também associar ao order_id

## 🚀 Plano de Implementação

### Fase 1: Backend Foundation
1. Criar tabelas no schema Drizzle
2. Implementar service layer
3. Criar rotas da API
4. Executar migração do banco

### Fase 2: Admin Interface
1. Criar página de administração de políticas
2. Implementar CRUD de políticas
3. Adicionar ao menu admin

### Fase 3: Client Integration
1. Criar componentes de aceite e modal
2. Integrar na tela de cadastro
3. Integrar na tela de pagamento
4. Implementar validações

### Fase 4: Testing & Polish
1. Testar fluxos completos
2. Validar armazenamento correto
3. Verificar responsividade
4. Documentar funcionalidade

## 📝 Considerações Técnicas

### Segurança
- Validar aceite no backend (não confiar apenas no frontend)
- Sanitizar conteúdo HTML das políticas
- Validar permissões de admin para edição

### Performance
- Cache de políticas ativas
- Paginação na listagem admin se necessário

### UX/UI
- Modal com boa rolagem e legibilidade
- Checkbox claramente visível
- Loading states apropriados
- Mensagens de erro claras

### Compliance
- Timestamps precisos para auditoria
- Rastreabilidade completa dos aceites
- Versionamento de políticas para histórico legal
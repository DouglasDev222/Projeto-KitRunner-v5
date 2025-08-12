# Sistema de Email de Confirmação de Pedidos para Administradores

## Objetivo
Implementar um sistema que envia emails de confirmação de pedidos para administradores quando um pagamento é confirmado (PIX ou cartão), com opção de ativar/desativar individualmente para cada administrador.

## Funcionalidades a Implementar

### 1. Esquema de Banco de Dados
- **Adicionar campo `receiveOrderEmails`** na tabela `users` (administradores)
  - Tipo: `boolean`
  - Valor padrão: `false`
  - Permite ativar/desativar emails por administrador

### 2. API Backend
- **Endpoint para atualizar preferências de email**
  - `PATCH /api/admin/auth/users/:id/email-preferences`
  - Permite super_admin alterar configuração de email dos usuários
  - Validação de permissões (apenas super_admin)

### 3. Template de Email para Administradores
- **Novo template HTML responsivo**: `admin-order-confirmation.html`
- **Baseado no template do cliente** mas adaptado para administradores
- **Conteúdo específico**:
  - Dados do pedido (número, cliente, itens)
  - Informações de entrega
  - Valor total pago
  - Status de pagamento
  - Links para o painel admin

### 4. Serviço de Email
- **Nova função**: `sendAdminOrderConfirmation()`
- **Integração com SendGrid**
- **Busca automática** de administradores com `receiveOrderEmails = true`
- **Envio em paralelo** para todos os administradores configurados

### 5. Integração com Webhooks
- **PIX**: Integrar no webhook do Mercado Pago (`/api/webhooks/mercadopago`)
- **Cartão**: Integrar no processamento de pagamento por cartão
- **Timing**: Enviar junto com o email de confirmação do cliente
- **Condições**: Apenas quando pagamento for confirmado/aprovado

### 6. Interface do Usuário (Admin)
- **Tela `/admin/users`**: Adicionar toggle para "Receber emails de pedidos"
- **Permissão**: Apenas super_admin pode alterar
- **Feedback visual**: Indicador claro do status atual
- **Responsivo**: Funciona em mobile e desktop

## Arquivos que Serão Modificados/Criados

### Banco de Dados
- `shared/schema.ts` - Adicionar campo `receiveOrderEmails`
- Migração automática via `npm run db:push`

### Backend
- `server/routes.ts` - Novo endpoint para preferências de email
- `server/email.ts` - Nova função `sendAdminOrderConfirmation()`
- `server/templates/admin-order-confirmation.html` - Novo template
- `server/webhooks.ts` - Integração nos webhooks PIX
- `server/payment.ts` - Integração nos pagamentos por cartão

### Frontend
- `client/src/pages/admin/users.tsx` - Adicionar toggle de email
- `client/src/components/ui/switch.tsx` - Componente switch (se não existir)

## Fluxo de Funcionamento

### 1. Configuração Inicial
1. Super admin acessa `/admin/users`
2. Ativa "Receber emails de pedidos" para administradores desejados
3. Sistema salva preferência no banco de dados

### 2. Processamento de Pagamento
1. Cliente finaliza pagamento (PIX ou cartão)
2. Webhook/API confirma pagamento aprovado
3. Sistema envia email de confirmação para cliente
4. **NOVO**: Sistema busca admins com `receiveOrderEmails = true`
5. **NOVO**: Sistema envia email para cada admin configurado
6. Log de emails enviados é registrado

### 3. Template de Email Admin
- **Assunto**: "Novo Pedido Confirmado - [Número do Pedido]"
- **Conteúdo**:
  - Dados do cliente e pedido
  - Itens do kit e quantidades
  - Endereço de entrega
  - Valor pago e método de pagamento
  - Link direto para o pedido no admin
  - Footer com informações da empresa

## Benefícios
- **Notificação imediata** de novos pedidos pagos
- **Controle granular** por administrador
- **Integração transparente** com sistema existente
- **Consistência** com templates de email atuais
- **Escalabilidade** para múltiplos administradores

## Critérios de Teste
- [ ] Campo `receiveOrderEmails` criado no banco
- [ ] Interface admin permite ativar/desativar emails
- [ ] Email é enviado quando PIX é confirmado
- [ ] Email é enviado quando cartão é aprovado
- [ ] Template está formatado corretamente
- [ ] Apenas super_admin pode alterar configurações
- [ ] Sistema funciona com múltiplos admins
- [ ] Logs de email são registrados corretamente

## Implementação Estimada
- **Tempo**: 30-45 minutos
- **Complexidade**: Média
- **Impacto**: Baixo (não afeta funcionalidades existentes)
- **Compatibilidade**: Total com sistema atual
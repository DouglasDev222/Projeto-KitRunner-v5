# Plano de Melhorias no Painel Administrativo - KitRunner

## 📋 Visão Geral
Este documento detalha as melhorias solicitadas para o painel administrativo do KitRunner, focando na tela `/admin/orders` e funcionalidades relacionadas ao gerenciamento de pedidos e comunicação com clientes.

## 🎯 Objetivos Principais
1. Melhorar a experiência do administrador ao alterar status de pedidos
2. Implementar funcionalidade de alteração em massa de status por evento
3. Integrar histórico de emails enviados com o histórico de status dos pedidos
4. Limpar opções desnecessárias do sistema

---

## 📝 Detalhamento das Implementações

### 1. Modal de Confirmação para Envio de Email
**Localização**: `client/src/pages/admin/AdminOrderDetail.tsx`
**Objetivo**: Dar controle ao admin sobre quando enviar emails de notificação

#### Implementação:
- [ ] Criar componente `EmailConfirmationModal`
- [ ] Integrar modal ao botão de alteração de status
- [ ] Adicionar parâmetros `sendEmail` na API de atualização de status
- [ ] Modificar endpoint `/api/admin/orders/:id/status` para aceitar parâmetro opcional `sendEmail`

#### Fluxo:
1. Admin clica para alterar status
2. Modal aparece com pergunta: "Deseja enviar o email de notificação ao cliente?"
3. Opções: "Sim, enviar email" | "Não, apenas mudar status"
4. API processa alteração de status com ou sem envio de email

### 2. Limpeza do Dropdown de Status
**Localização**: `client/src/pages/admin/AdminOrders.tsx` e `AdminOrderDetail.tsx`
**Objetivo**: Remover opção obsoleta "Processando Pagamento"

#### Implementação:
- [ ] Identificar todas as referências ao status "processando_pagamento"
- [ ] Remover do array de status disponíveis nos componentes
- [ ] Verificar se há pedidos existentes com esse status (migração se necessário)
- [ ] Atualizar tipos TypeScript relacionados

### 3. Funcionalidade de Troca em Massa de Status por Evento
**Localização**: Nova tela(modal) `client/src/pages/admin/BulkStatusUpdate.tsx`
**Objetivo**: Permitir alteração de status de todos os pedidos de um evento específico

#### Implementação:
- [ ] Criar nova modal para troca em massa
- [ ] Adicionar rota `/admin/bulk-status-update`
- [ ] Criar endpoint API `POST /api/admin/orders/bulk-status-update`
- [ ] Implementar seletores para:
  - Evento (dropdown com eventos ativos)
  - Novo Status (dropdown com status válidos)
  - Checkbox "Enviar email aos clientes"
- [ ] Adicionar confirmação antes de aplicar alterações
- [ ] Implementar feedback de progresso (loading, sucesso/erro)

#### Campos do Formulário:
```typescript
interface BulkStatusUpdateForm {
  eventId: number;
  newStatus: OrderStatus;
  sendEmails: boolean;
  confirmation: boolean;
}
```

### 4. Integração de Logs de Email no Histórico
**Localização**: modal de detalhes do pedido localizado na tela de pedidos do admin
**Objetivo**: Mostrar histórico completo de comunicações com o cliente

#### Implementação:
- [ ] Criar tabela `email_logs` no banco de dados (Já existe e é usado na tela /admin/email-logs)
- [ ] Modificar serviço de email para registrar logs
- [ ] Criar endpoint `GET /api/admin/orders/:id/email-history`
- [ ] Integrar logs de email na timeline do histórico do pedido
- [ ] Mostrar data/hora, tipo de email e status de envio


---

## 🔧 Arquivos a Serem Modificados

### Frontend (Client)
- `client/src/pages/admin/AdminOrders.tsx` - Remover status obsoleto
- `client/src/pages/admin/AdminOrderDetail.tsx` - Modal confirmação + histórico emails
- `client/src/pages/admin/BulkStatusUpdate.tsx` - Nova página (criar)
- `client/src/components/admin/EmailConfirmationModal.tsx` - Novo componente (criar)
- `client/src/App.tsx` - Adicionar rota para bulk update

### Backend (Server)
- `server/routes.ts` - Modificar endpoint de status + novo endpoint bulk
- `server/email/email-service.ts` - Adicionar logging de emails
- `shared/schema.ts` - Adicionar tabela email_logs + tipos
- `server/storage.ts` - Métodos para email logs e bulk update

### Database
- Nova migration para tabela `email_logs`
- Verificação de dados existentes com status "processando_pagamento"

---

## 📊 Cronograma de Implementação

### Fase 1: Preparação (1-2 horas)
- [x] Análise do código atual
- [x] Criação da tabela email_logs (já existia)
- [x] Limpeza do status "processando_pagamento"

### Fase 2: Modal de Confirmação (2-3 horas)
- [x] Criar componente EmailConfirmationModal
- [x] Integrar no AdminOrders (modal de confirmação ao alterar status)
- [x] Modificar API para aceitar parâmetro sendEmail
- [x] Corrigir acessibilidade do modal (DialogDescription)
- [x] Corrigir problema de frontend travando após alteração de status
- [x] **CORREÇÃO CRÍTICA**: Corrigir envio duplo de emails quando sendEmail=false
- [x] **RESTAURAR**: Email de confirmação de pagamento (status="confirmado") sempre enviado
- [x] **LÓGICA**: Emails específicos (confirmado/em_transito/entregue) sempre enviados, genéricos apenas quando solicitado

### Fase 3: Logs de Email (2-3 horas)
- [ ] Implementar logging no email service
- [ ] Criar endpoint para histórico de emails
- [ ] Integrar na interface do admin

### Fase 4: Troca em Massa (3-4 horas)
- [ ] Criar página BulkStatusUpdate
- [ ] Implementar endpoint de bulk update
- [ ] Testes e validações

### Fase 5: Testes e Ajustes (1-2 horas)
- [ ] Testes completos das funcionalidades
- [ ] Ajustes de UX/UI
- [ ] Validação com dados reais

---

## 🧪 Casos de Teste

### Modal de Confirmação
- [x] Alterar status com envio de email
- [x] Alterar status sem envio de email (CORRIGIDO - não envia mais email duplo)
- [x] Cancelar alteração de status

### Troca em Massa
- [ ] Alterar status de todos os pedidos de um evento
- [ ] Alterar status com envio de emails em massa
- [ ] Validar que apenas pedidos do evento selecionado são afetados

### Histórico de Emails
- [ ] Verificar que emails aparecem no histórico
- [ ] Verificar ordem cronológica correta
- [ ] Verificar informações de erro quando aplicável

---

## 📋 Checklist Final

- [ ] ✅ Modal de confirmação implementado e funcionando
- [ ] ✅ Status "Processando Pagamento" removido completamente
- [ ] ✅ Funcionalidade de troca em massa implementada
- [ ] ✅ Logs de email integrados ao histórico
- [ ] ✅ Testes realizados em ambiente de desenvolvimento
- [ ] ✅ Documentação atualizada
- [ ] ✅ Deploy realizado com sucesso

---

## 🔍 Observações Técnicas

1. **Compatibilidade**: Manter compatibilidade com dados existentes
2. **Performance**: Otimizar queries para troca em massa
3. **Segurança**: Validar permissões de admin em todos os endpoints
4. **UX**: Fornecer feedback claro em todas as operações
5. **Logging**: Registrar todas as ações administrativas importantes

---

## 📞 Pontos de Atenção

- Verificar se existem pedidos com status "processando_pagamento" antes de remover
- Garantir que emails em massa não sobrecarreguem o serviço SendGrid
- Implementar rate limiting para operações em massa
- Manter logs de auditoria para ações administrativas
- Testar com volumes realistas de dados

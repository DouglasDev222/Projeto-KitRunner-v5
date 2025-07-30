# Plano de Implementação: Sistema de Notificações por Email

## Visão Geral

Este documento define o plano completo para implementar um sistema robusto de notificações por email no KitRunner, incluindo confirmações de pedidos, atualizações de status e outras comunicações importantes com os clientes.

## Objetivos

- ✅ Enviar emails automáticos de confirmação quando pedidos são criados
- ✅ Notificar clientes sobre mudanças de status dos pedidos
- ✅ Criar templates profissionais e responsivos para emails
- ✅ Implementar sistema de logs e rastreamento de emails enviados
- ✅ Garantir entregabilidade e conformidade com boas práticas
- ✅ Adicionar funcionalidade de reenvio de emails para administradores

## Stack Tecnológico

### SendGrid (Provedor de Email)
- **Justificativa**: Serviço confiável, alta entregabilidade, APIs robustas
- **Recursos**: Templates, analytics, webhook notifications
- **Integração**: Pacote `@sendgrid/mail` já instalado

### Templates de Email
- **HTML**: Templates responsivos com design profissional
- **Personalização**: Dados dinâmicos do pedido e cliente
- **Branding**: Logo e cores da marca KitRunner

## Arquitetura do Sistema

### 1. Estrutura de Arquivos
```
server/
├── email/
│   ├── email-service.ts         # Serviço principal de email
│   ├── email-templates.ts       # Templates HTML
│   ├── email-types.ts          # Tipos TypeScript
│   └── email-logger.ts         # Sistema de logs
shared/
└── schema.ts                   # Tabelas de logs de email
```

### 2. Banco de Dados - Novas Tabelas

#### email_logs
```sql
CREATE TABLE email_logs (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  customer_id INTEGER REFERENCES customers(id),
  email_type VARCHAR(50) NOT NULL, -- 'order_confirmation', 'status_update', etc.
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'sent', 'failed', 'delivered', 'bounced'
  sendgrid_message_id VARCHAR(255),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE
);
```

#### email_preferences (futuro)
```sql
CREATE TABLE email_preferences (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) UNIQUE,
  order_confirmations BOOLEAN DEFAULT true,
  status_updates BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Implementação Detalhada

### Fase 1: Configuração Base e Serviço de Email

#### 1.1. Configuração de Ambiente
- [ ] Solicitar SENDGRID_API_KEY do usuário
- [ ] Configurar variável SENDGRID_FROM_EMAIL (ex: "noreply@kitrunner.com")
- [ ] Configurar SENDGRID_FROM_NAME (ex: "KitRunner")

#### 1.2. Criação do EmailService
```typescript
// server/email/email-service.ts
export class EmailService {
  // Configuração inicial
  // Métodos para envio de diferentes tipos de email
  // Sistema de retry automático
  // Logging e tratamento de erros
  // Integração com webhook do SendGrid
}
```

**Funcionalidades do EmailService:**
- `sendOrderConfirmation(order, customer, kits, address)`
- `sendStatusUpdateEmail(order, customer, oldStatus, newStatus)`
- `sendPaymentConfirmation(order, customer, paymentDetails)`
- `sendDeliveryNotification(order, customer, trackingInfo)`
- `resendEmail(emailLogId)` (para administradores)

#### 1.3. Sistema de Templates
```typescript
// server/email/email-templates.ts
export const emailTemplates = {
  orderConfirmation: (data) => ({
    subject: `Pedido ${data.orderNumber} confirmado - KitRunner`,
    html: generateOrderConfirmationHTML(data),
    text: generateOrderConfirmationText(data)
  }),
  statusUpdate: (data) => ({
    subject: `Atualização do pedido ${data.orderNumber} - KitRunner`,
    html: generateStatusUpdateHTML(data),
    text: generateStatusUpdateText(data)
  })
  // ... outros templates
}
```

### Fase 2: Templates HTML Profissionais

#### 2.1. Design dos Templates
**Elementos visuais:**
- Header com logo KitRunner
- Cores da marca (azul #3B82F6, verde #10B981)
- Layout responsivo para mobile/desktop
- Footer com informações de contato

#### 2.2. Template de Confirmação de Pedido
**Conteúdo inclui:**
- Dados do cliente (nome, CPF mascarado)
- Número do pedido e data
- Detalhes do evento
- Lista de kits (nomes, tamanhos)
- Endereço de entrega
- Resumo de custos
- Status atual e próximos passos
- Links para acompanhar pedido

#### 2.3. Template de Atualização de Status
**Conteúdo inclui:**
- Status anterior vs novo status
- Explicação do que significa cada status
- Estimativa de tempo para próxima etapa
- Informações de contato para dúvidas

### Fase 3: Integração com Sistema Existente

#### 3.1. Hooks de Envio Automático
**Pontos de integração:**
- `routes.ts` - Após criação de pedido
- `routes.ts` - Após confirmação de pagamento
- `admin-auth.ts` - Após mudança de status por admin
- `mercadopago-service.ts` - Após processamento de pagamento

#### 3.2. Modificações no Backend
```typescript
// Em routes.ts - após criar pedido
const order = await storage.createOrder(orderData);
await emailService.sendOrderConfirmation(order, customer, kits, address);

// Em admin-auth.ts - após atualizar status
const updatedOrder = await storage.updateOrderStatus(orderId, newStatus);
await emailService.sendStatusUpdateEmail(updatedOrder, customer, oldStatus, newStatus);
```

#### 3.3. Sistema de Logs
- Registrar todos os emails enviados
- Status de entrega via webhooks SendGrid
- Dashboard admin para visualizar logs
- Possibilidade de reenvio de emails

### Fase 4: Interface Administrativa

#### 4.1. Painel de Email Analytics
**Nova página: `/admin/emails`**
- Lista de emails enviados
- Filtros por tipo, status, data
- Métricas de entregabilidade
- Taxa de abertura e cliques

#### 4.2. Funcionalidades Admin
- Reenviar emails específicos
- Enviar emails manuais para clientes
- Visualizar preview dos templates
- Configurar preferências globais

#### 4.3. Logs no Painel de Pedidos
- Histórico de emails na página de detalhes do pedido
- Botão "Reenviar confirmação" 
- Status de entrega de cada email

### Fase 5: Recursos Avançados

#### 5.1. Personalização de Templates
- Editor básico para modificar templates
- Variáveis dinâmicas personalizáveis
- Preview em tempo real

#### 5.2. Automatizações
- Email de lembrete se pagamento pendente por 24h
- Email de feedback pós-entrega
- Email de follow-up para eventos futuros

#### 5.3. Segmentação e Preferências
- Permitir clientes optarem por tipos de email
- Segmentação por região/evento
- Frequência controlada de emails

## Cronograma de Implementação

### Sprint 1 (Estimativa: 4-6 horas)
- [x] Solicitar chave da API SendGrid
- [ ] Criar schema de banco (email_logs)
- [ ] Implementar EmailService básico
- [ ] Template simples de confirmação
- [ ] Integração com criação de pedidos

### Sprint 2 (Estimativa: 4-6 horas)
- [ ] Templates HTML profissionais
- [ ] Sistema de atualização de status por email
- [ ] Logs de email no admin
- [ ] Tratamento de erros robusto

### Sprint 3 (Estimativa: 3-4 horas)
- [ ] Painel administrativo de emails
- [ ] Funcionalidade de reenvio
- [ ] Webhooks SendGrid para tracking
- [ ] Métricas e analytics

### Sprint 4 (Estimativa: 2-3 horas)
- [ ] Recursos avançados (preferências, segmentação)
- [ ] Automatizações adicionais
- [ ] Testes finais e otimizações

## Considerações Técnicas

### Segurança
- Validação de emails antes do envio
- Rate limiting para prevenir spam
- Logs de segurança para tentativas suspeitas
- Criptografia de dados sensíveis em logs

### Performance
- Queue system para emails (implementação futura)
- Retry automático para falhas temporárias
- Batch sending para múltiplos emails
- Cache de templates renderizados

### Conformidade
- Compliance com LGPD (dados brasileiros)
- Headers anti-spam adequados
- Link de descadastro em emails
- Política de retenção de logs

### Monitoramento
- Logs estruturados para debugging
- Alertas para alta taxa de falha
- Métricas de entregabilidade
- Dashboard de saúde do sistema

## Testes e Validação

### Testes Unitários
- EmailService methods
- Template rendering
- Error handling

### Testes de Integração
- Fluxo completo de envio
- Webhook processing
- Database logging

### Testes de Usuário
- Templates em diferentes clientes de email
- Responsividade mobile
- Accessibility compliance

## Documentação

### Para Desenvolvedores
- API documentation
- Template customization guide
- Webhook setup guide

### Para Administradores
- Email management guide
- Analytics interpretation
- Troubleshooting guide

### Para Usuários Finais
- Email preferences guide
- Privacy policy update
- FAQ sobre emails

## Entregáveis Finais

1. **Sistema de Email Completo**
   - Envio automático de confirmações
   - Notificações de status
   - Templates responsivos

2. **Painel Administrativo**
   - Analytics de email
   - Gestão de logs
   - Funcionalidades de reenvio

3. **Documentação Técnica**
   - Guias de implementação
   - Troubleshooting
   - Best practices

4. **Testes e Validação**
   - Suite de testes completa
   - Validação de entregabilidade
   - Performance benchmarks

## Próximos Passos

1. **Obter aprovação do plano**
2. **Solicitar credenciais SendGrid**
3. **Iniciar implementação Sprint 1**
4. **Configurar ambiente de desenvolvimento**
5. **Criar primeiro template e teste**

---

*Este documento serve como roadmap completo para implementação do sistema de emails. Cada seção deve ser revisada e aprovada antes do início da implementação.*
# Plano de Implementação: Sistema de Pagamento Pendente

## Objetivo
Implementar funcionalidade na tela de detalhes do pedido (`/orders/{id}`) para permitir que usuários paguem pedidos com status "aguardando pagamento", principalmente PIX, incluindo renovação de QR codes expirados e cancelamento automático após 24 horas.

## Análise da Situação Atual

### Status de Pedidos
- **aguardando_pagamento**: Pedidos PIX criados mas não pagos
- **confirmado**: Pagamentos aprovados via webhook
- **cancelado**: Pedidos cancelados pelo sistema ou usuário

### Fluxo Atual de Pagamento PIX
1. Usuário cria pedido na página de pagamento
2. Sistema gera QR code PIX com validade de 30 minutos
3. Webhook confirma pagamento quando efetuado
4. Status muda para "confirmado"

## Funcionalidades a Implementar

### 1. Detecção de Status "Aguardando Pagamento"
- **Arquivo**: `client/src/pages/order-details.tsx`
- **Ação**: Adicionar verificação de status do pedido
- **Componente**: Seção específica para pagamentos pendentes

### 2. Sistema de Exibição de QR Code Ativo
- **Funcionalidade**: Mostrar QR code atual se ainda válido
- **Dados necessários**: `paymentId`, `qrCodeBase64`, `pixCopyPaste`, `expirationDate`
- **Validação**: Verificar se QR code não expirou (30 minutos)

### 3. Sistema de Renovação de QR Code
- **Endpoint**: `POST /api/mercadopago/renew-pix-payment`
- **Parâmetros**: `orderId`, `amount`
- **Ação**: Gerar novo QR code para pedido existente
- **Validação**: Verificar se pedido ainda pode ser pago

### 4. Opção de Mudança de Método de Pagamento
- **Funcionalidade**: Permitir trocar PIX para cartão
- **Endpoint**: `PUT /api/orders/{id}/payment-method`
- **Redirecionamento**: Para página de pagamento com dados pré-carregados

### 5. Sistema de Cancelamento Automático (24 horas)
- **Implementação**: Scheduled job ou verificação periódica
- **Arquivo**: `server/payment-timeout-scheduler.ts`
- **Ação**: Cancelar pedidos "aguardando_pagamento" após 24h
- **Frequência**: Execução a cada hora

## Estrutura de Implementação

### Backend Changes

#### 1. Novos Endpoints
```typescript
// server/routes.ts
POST /api/orders/{id}/renew-pix          // Renovar QR code
PUT /api/orders/{id}/payment-method      // Trocar método de pagamento
GET /api/orders/{id}/payment-status      // Status detalhado do pagamento
```

#### 2. Serviço de Renovação PIX
```typescript
// server/mercadopago-service.ts
export async function renewPIXPayment(orderId: string, amount: number): Promise<PIXResponse>
```

#### 3. Sistema de Timeout
```typescript
// server/payment-timeout-scheduler.ts
class PaymentTimeoutScheduler {
  scheduleTimeoutCheck(): void
  cancelExpiredOrders(): Promise<void>
}
```

#### 4. Atualização do Schema
```typescript
// shared/schema.ts
// Adicionar campos para tracking de pagamento PIX:
// - paymentId (MercadoPago payment ID)
// - pixQrCode (base64)
// - pixCopyPaste (código)
// - pixExpirationDate (timestamp)
// - paymentCreatedAt (para cálculo de 24h)
```

### Frontend Changes

#### 1. Componente de Pagamento Pendente
```typescript
// client/src/components/pending-payment.tsx
interface PendingPaymentProps {
  order: Order;
  onPaymentSuccess: () => void;
  onPaymentError: (error: string) => void;
}
```

#### 2. Hook para Status de Pagamento
```typescript
// client/src/hooks/use-payment-status.ts
export function usePaymentStatus(orderId: string)
```

#### 3. Atualização da Página de Detalhes
```typescript
// client/src/pages/order-details.tsx
// Adicionar seção condicional para status "aguardando_pagamento"
```

## Fluxo de Trabalho Detalhado

### Cenário 1: QR Code Ainda Válido
1. Usuário acessa `/orders/{id}`
2. Sistema verifica status = "aguardando_pagamento"
3. Busca dados do pagamento PIX ativo
4. Verifica se não expirou (< 30 min)
5. Exibe QR code e código para copiar
6. Inicia polling de status (3 em 3 segundos)

### Cenário 2: QR Code Expirado
1. Usuário acessa pedido com PIX expirado
2. Sistema detecta expiração
3. Exibe opções:
   - "Gerar novo PIX"
   - "Trocar para cartão"
4. Se "novo PIX": gera novo QR code
5. Se "trocar cartão": redireciona para pagamento

### Cenário 3: Cancelamento Automático
1. Scheduler roda a cada hora
2. Busca pedidos "aguardando_pagamento" > 24h
3. Atualiza status para "cancelado"
4. Opcionalmente envia email de notificação

## Validações e Regras de Negócio

### Validações Backend
- Verificar se pedido pertence ao usuário autenticado
- Validar se status permite renovação de pagamento
- Verificar se valor não foi alterado
- Limitar tentativas de renovação (máx. 5 por dia)

### Regras de Tempo
- **QR Code PIX**: 30 minutos de validade
- **Timeout de pedido**: 24 horas
- **Polling**: 3 segundos (para dentro da página)
- **Verificação de timeout**: A cada 1 hora

### Estados de Interface
- Loading ao gerar novo PIX
- Desabilitar botões durante processamento
- Feedback visual para QR expirado
- Contador regressivo para timeout de 24h

## Arquivos a Modificar/Criar

### Backend
- `server/routes.ts` - Novos endpoints
- `server/mercadopago-service.ts` - Renovação PIX
- `server/payment-timeout-scheduler.ts` - NOVO arquivo
- `server/index.ts` - Inicializar scheduler
- `shared/schema.ts` - Novos campos para PIX tracking

### Frontend
- `client/src/pages/order-details.tsx` - Seção pagamento pendente
- `client/src/components/pending-payment.tsx` - NOVO componente
- `client/src/hooks/use-payment-status.ts` - NOVO hook
- `client/src/lib/payment-utils.ts` - NOVO arquivo de utilities

### Database Migration
- Adicionar campos para tracking de PIX:
  - `payment_id` (varchar)
  - `pix_qr_code` (text)
  - `pix_copy_paste` (text) 
  - `pix_expiration_date` (timestamp)
  - `payment_created_at` (timestamp)

## Testes Necessários

### Cenários de Teste
1. **QR Code Válido**: Exibir corretamente
2. **QR Code Expirado**: Mostrar opções de renovação
3. **Renovação Bem-sucedida**: Novo QR funcional
4. **Troca de Método**: Redirecionamento correto
5. **Timeout 24h**: Cancelamento automático
6. **Polling**: Atualização automática do status
7. **Validação de Ownership**: Segurança de acesso

### Testes de Edge Cases
- Múltiplas renovações seguidas
- Rede instável durante polling
- Expiração durante visualização
- Pagamento simultâneo em outra aba

## Considerações de Segurança

### Autenticação
- Verificar ownership do pedido em todos endpoints
- Validar JWT em requests de renovação
- Rate limiting para renovações

### Dados Sensíveis
- Não expor payment tokens no frontend
- Mascarar dados sensíveis em logs
- Validar integridade dos dados PIX

## Métricas e Monitoramento

### Métricas a Implementar
- Taxa de renovação de PIX por pedido
- Tempo médio para pagamento após renovação
- Taxa de timeout (24h) vs pagamentos
- Conversão PIX → Cartão

### Logs Importantes
- Renovações de PIX realizadas
- Pedidos cancelados por timeout
- Erros na geração de novos QR codes
- Tentativas de acesso não autorizado

## Cronograma Sugerido

### Fase 1 (Backend Core) - 2-3 horas
- Endpoints de renovação e status
- Scheduler de timeout
- Testes de API

### Fase 2 (Frontend Core) - 2-3 horas  
- Componente de pagamento pendente
- Integração na página de detalhes
- Estados de loading/erro

### Fase 3 (Polimento) - 1-2 horas
- Validações finais
- Testes de integração
- Ajustes de UX

### Fase 4 (Deploy e Monitoramento) - 1 hora
- Deploy em produção
- Verificação de métricas
- Ajustes finais

## Observações Importantes

1. **Compatibilidade**: Manter backward compatibility com pedidos existentes
2. **Performance**: Otimizar queries para pedidos com timeout
3. **UX**: Interface clara sobre tempo restante e opções
4. **Reliability**: Redundância no sistema de polling e timeout
5. **Rollback**: Plano para reverter em caso de problemas

## Próximos Passos

Após aprovação do plano:
1. Confirmar arquitetura com stakeholders
2. Implementar em ordem de prioridade (Backend → Frontend)
3. Testes em ambiente de desenvolvimento
4. Deploy gradual em produção
5. Monitoramento e ajustes baseados em métricas
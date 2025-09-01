# Plano de Implementação: Pedidos Gratuitos com Cupons

## Visão Geral
Implementação de funcionalidade para aceitar pedidos gratuitos (R$ 0,00) apenas quando o valor total for zerado através do uso de cupons válidos. Esta medida visa prevenir vulnerabilidades de manipulação de preços mantendo a segurança do sistema.

## Condições e Regras de Negócio

### Condições para Pedido Gratuito
1. **Requisito obrigatório**: O pedido só pode ser gratuito se usar um cupom válido
2. **Valor zerado**: O `finalAmount` após aplicação do cupom deve ser exatamente R$ 0,00
3. **Validação de cupom**: Cupom deve estar ativo, dentro do prazo e aplicável ao evento
4. **Segurança**: Sem cupom aplicado, o valor mínimo é sempre > R$ 0,00

### Fluxo do Usuário
1. Cliente adiciona itens ao carrinho (valor > R$ 0,00)
2. Cliente aplica cupom que zera o valor total
3. Interface de pagamento é ocultada automaticamente
4. Aparece botão "Confirmar Pedido" com checkbox "Li e aceito os termos"
5. Pedido é confirmado automaticamente ao clicar
6. Email de confirmação e WhatsApp são enviados imediatamente

## Análise do Sistema Atual

### Sistema de Cupons (✅ Já Implementado)
- **Backend**: `server/coupon-service.ts` - Validação e cálculo de desconto
- **API**: `POST /api/coupons/validate` - Validação de cupons
- **Funcionalidades existentes**:
  - Validação de cupom (ativo, prazo, limites)
  - Cálculo de desconto (fixo ou percentual)
  - Retorna `finalAmount` após desconto
  - Incremento de uso após pagamento confirmado

### Sistema de Pedidos
- **Backend**: `POST /api/orders` - Criação de pedidos
- **Frontend**: `client/src/pages/payment.tsx` - Interface de pagamento
- **Componentes**: `CardPayment` e `PIXPayment` para processamento

### Sistema de Emails e WhatsApp
- **Email**: `EmailService` com templates de confirmação
- **WhatsApp**: Integração completa com notificações automáticas

## Implementação Técnica

### 1. Backend - Lógica de Pedidos Gratuitos

#### A. Modificar `/api/orders` (server/routes.ts)
```typescript
// Adicionar validação para pedidos gratuitos
if (totalCost === 0) {
  // Verificar se foi usado cupom válido
  if (!couponCode) {
    return res.status(400).json({
      message: "Pedidos gratuitos só são permitidos com cupom válido"
    });
  }
  
  // Validar cupom novamente no servidor
  const couponValidation = await CouponService.validateCoupon({
    code: couponCode,
    eventId,
    totalAmount: originalTotal, // Valor antes do desconto
    customerZipCode: address.zipCode
  });
  
  if (!couponValidation.valid || couponValidation.finalAmount !== 0) {
    return res.status(400).json({
      message: "Cupom inválido para pedido gratuito"
    });
  }
}
```

#### B. Novo status de pedido
- Pedidos gratuitos vão direto para status `'confirmado'`
- Pular status `'aguardando_pagamento'`

#### C. Modificar criação de pedido
```typescript
// Para pedidos gratuitos, definir como confirmado
const orderStatus = totalCost === 0 ? 'confirmado' : 'aguardando_pagamento';
const paymentMethodFinal = totalCost === 0 ? 'gratuito' : paymentMethod;
```

### 2. Frontend - Interface de Pedidos Gratuitos

#### A. Modificar `client/src/pages/payment.tsx`

##### Estado para pedidos gratuitos
```typescript
const [isFreeOrder, setIsFreeOrder] = useState(false);

// Atualizar quando cupom for aplicado
useEffect(() => {
  const finalTotal = pricing.totalCost - couponDiscount;
  setIsFreeOrder(finalTotal === 0 && appliedCoupon);
}, [pricing.totalCost, couponDiscount, appliedCoupon]);
```

##### Interface condicional
```typescript
{isFreeOrder ? (
  // Interface para pedido gratuito
  <FreeOrderConfirmation 
    onConfirm={handleFreeOrderConfirmation}
    orderSummary={orderSummary}
    policyAccepted={policyAccepted}
    setPolicyAccepted={setPolicyAccepted}
  />
) : (
  // Interface normal de pagamento
  <PaymentMethods />
)}
```

#### B. Novo componente `FreeOrderConfirmation`
```typescript
const FreeOrderConfirmation = ({ onConfirm, orderSummary, policyAccepted, setPolicyAccepted }) => {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
      <div className="flex items-center mb-4">
        <Gift className="w-6 h-6 text-green-600 mr-3" />
        <h3 className="text-lg font-semibold text-green-800">
          Pedido Gratuito - Cupom Aplicado!
        </h3>
      </div>
      
      <div className="mb-6">
        <p className="text-green-700 mb-2">
          Seu cupom zerou o valor total do pedido!
        </p>
        <div className="text-2xl font-bold text-green-800">
          Total: R$ 0,00
        </div>
      </div>

      <div className="mb-6">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={policyAccepted}
            onChange={(e) => setPolicyAccepted(e.target.checked)}
            className="mr-3"
          />
          <span className="text-sm text-gray-700">
            Li e aceito os termos e condições
          </span>
        </label>
      </div>

      <Button
        onClick={onConfirm}
        disabled={!policyAccepted}
        className="w-full bg-green-600 hover:bg-green-700"
      >
        Confirmar Pedido Gratuito
      </Button>
    </div>
  );
};
```

#### C. Handler para pedidos gratuitos
```typescript
const handleFreeOrderConfirmation = async () => {
  if (!policyAccepted) {
    setPaymentError("É necessário aceitar os termos para prosseguir");
    return;
  }

  setIsProcessing(true);
  
  try {
    const orderData = createOrderData(`free-${Date.now()}-${Math.random()}`);
    orderData.paymentMethod = 'gratuito' as any;
    
    const response = await apiRequest("POST", "/api/orders", orderData);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || "Erro ao confirmar pedido");
    }
    
    // Registrar aceitação da política
    await recordPolicyAcceptance(data.order.id);
    
    // Redirecionar para confirmação
    setOrderNumber(data.order.orderNumber);
    setPaymentCompleted(true);
    sessionStorage.setItem("orderConfirmation", JSON.stringify(data));
    
    setTimeout(() => {
      setLocation(`/order/${data.order.orderNumber}/confirmation`);
    }, 1500);
    
  } catch (error: any) {
    setPaymentError(error.message || "Erro ao confirmar pedido gratuito");
  } finally {
    setIsProcessing(false);
  }
};
```

### 3. Emails e Notificações

#### A. Email de confirmação
- Usar template existente de confirmação
- Modificar para indicar "Pedido Gratuito - Cupom Aplicado"
- Valor total: R$ 0,00

#### B. WhatsApp
- Modificar template para pedidos gratuitos
- Indicar que foi usado cupom promocional

### 4. Validações de Segurança

#### A. Prevenção de Vulnerabilidades
1. **Validação dupla**: Frontend e backend validam cupom
2. **Preço sempre do servidor**: Cálculos de preço sempre server-side
3. **Obrigatoriedade de cupom**: Sem cupom = sem gratuidade
4. **Log de auditoria**: Registrar todos pedidos gratuitos

#### B. Logs de Segurança
```typescript
console.log(`🎁 SECURITY: Free order created with coupon`, {
  orderId: order.id,
  couponCode: couponCode,
  originalTotal: originalTotal,
  finalTotal: 0,
  customerId: customerId,
  eventId: eventId
});
```

## Fluxo de Implementação

### Etapa 1: Backend
1. Modificar rota `/api/orders` para suportar pedidos gratuitos
2. Adicionar validações de segurança
3. Implementar status direto para `confirmado`
4. Adicionar logs de auditoria

### Etapa 2: Frontend
1. Criar componente `FreeOrderConfirmation`
2. Modificar lógica de exibição em `payment.tsx`
3. Implementar handler para confirmação gratuita
4. Atualizar estados e validações

### Etapa 3: Templates
1. Modificar templates de email para pedidos gratuitos
2. Atualizar mensagens WhatsApp
3. Ajustar textos de confirmação

### Etapa 4: Testes
1. Criar cupom de teste 100% de desconto
2. Testar fluxo completo de pedido gratuito
3. Validar emails e WhatsApp
4. Testar tentativas de burlar sistema

## Considerações de Segurança

### Potenciais Vulnerabilidades
1. **Manipulação de valor**: Prevenido com validação server-side
2. **Cupom fake**: Prevenido com validação de cupom existente
3. **Reutilização de cupom**: Limitado por sistema de uso

### Medidas de Proteção
1. **Validação dupla**: Frontend + Backend
2. **Cálculo server-side**: Preços sempre do servidor
3. **Auditoria completa**: Logs detalhados
4. **Rate limiting**: Limitação de tentativas

## Cronograma de Implementação

- **Dia 1**: Backend - Lógica de pedidos gratuitos
- **Dia 2**: Frontend - Interface e componentes  
- **Dia 3**: Templates - Emails e WhatsApp
- **Dia 4**: Testes - Validação completa
- **Dia 5**: Deploy - Colocar em produção

## Arquivos a Modificar

### Backend
- `server/routes.ts` - Rota `/api/orders`
- `server/coupon-service.ts` - Se necessário para logs
- `server/email/templates/` - Templates de email

### Frontend
- `client/src/pages/payment.tsx` - Interface principal
- `client/src/components/` - Novo componente FreeOrderConfirmation
- `client/src/types/` - Tipos TypeScript se necessário

### Schemas
- `shared/schema.ts` - Adicionar 'gratuito' como payment method se necessário

Este plano garante implementação segura e completa da funcionalidade de pedidos gratuitos, mantendo todas as validações necessárias para prevenir vulnerabilidades.
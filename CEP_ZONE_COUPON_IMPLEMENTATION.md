# Implementação de Cupons com Restrições por Zona de CEP

## Objetivo
Implementar sistema de cupons que funcionam apenas em zonas de CEP específicas, respeitando a lógica de prioridade onde zonas com menor prioridade (1, 2, 3) têm precedência sobre maiores (4, 5, etc.).

## ✅ Implementações Concluídas

### 1. Database Schema
- ✅ Adicionado campo `cepZoneIds` na tabela `coupons` para armazenar IDs das zonas selecionadas
- ✅ Campo do tipo `integer[]` (array de inteiros) para múltiplas zonas

### 2. Backend - Validação de Cupom
- ✅ Atualizado `server/coupon-service.ts` com lógica de validação por zona
- ✅ Implementada função `findActiveZoneForCep()` que respeita prioridade
- ✅ Adicionada validação que verifica se cupom é válido para zona do cliente
- ✅ Schema de validação atualizado para aceitar `customerZipCode`

### 3. Backend - API Routes
- ✅ Rota `/api/coupons/validate` atualizada para aceitar CEP do cliente
- ✅ Logs de debug implementados para rastreamento

### 4. Frontend - Admin Interface
- ✅ Modal de cupom atualizado com interface de seleção de zonas CEP
- ✅ Checkboxes para seleção múltipla de zonas
- ✅ Formulário salvando corretamente os IDs das zonas selecionadas

### 5. Frontend - Validação de Cupom
- ✅ Componente `CouponInput` atualizado para aceitar `customerZipCode`
- ✅ Query key atualizada para incluir CEP na cache
- ✅ Logs de debug implementados

## ❌ Problema Identificado e Solução Implementada

### Problema Original: CEP não chegando na validação
**Status**: ✅ **RESOLVIDO** - Implementada nova arquitetura baseada em addressId

**Evidência do problema**:
```
🎫 Coupon validation request: {
  code: 'KITRUNNER15',
  eventId: 12,
  totalAmount: 0.02,
  customerZipCode: undefined,
  addressId: undefined
}
```

### 💡 Solução Implementada: Busca de CEP via addressId

**Nova arquitetura similar ao sistema de pedidos**:
1. **Frontend**: Envia `addressId` do endereço selecionado
2. **Backend**: Busca endereço completo via `storage.getAddress(addressId)`
3. **Extração**: CEP é extraído diretamente do banco de dados
4. **Validação**: Cupom validado com CEP correto

**Vantagens da nova solução**:
- ✅ Usa mesma estratégia que sistema de pedidos (comprovadamente funcional)
- ✅ Dados vêm diretamente do banco de dados (mais confiável)
- ✅ Não depende de sessionStorage ou timing de carregamento
- ✅ Mantém fallback para CEP direto se necessário

### 🔧 Implementações da Nova Solução

#### Backend (server/routes/coupons.ts)
```typescript
// Adicionado addressId ao schema
addressId: z.number().optional()

// Lógica de busca do CEP via addressId
if (addressId && !customerZipCode) {
  const address = await storage.getAddress(addressId);
  if (address) {
    finalCustomerZipCode = address.zipCode;
  }
}
```

#### Frontend (CouponInput.tsx)
```typescript
// Nova prop addressId
addressId?: number;

// Enviado na requisição
body: JSON.stringify({
  code: couponCode,
  eventId,
  totalAmount,
  customerZipCode,
  addressId  // Novo campo
})

// Query habilitada apenas quando tem addressId ou CEP
enabled: shouldValidate && couponCode.length > 0 && !appliedCoupon && (addressId || customerZipCode)
```

#### Payment Page
```typescript
// Passagem do addressId
<CouponInput
  addressId={selectedAddress?.id}  // Novo prop
  customerZipCode={selectedAddress?.zipCode?.replace(/\D/g, '') || undefined}
  // ... outras props
/>
```

## 🔍 Status Atual - Debugging Final

**Último problema detectado**: `addressId` ainda chega como `undefined`
- Necessário verificar timing de carregamento do `selectedAddress`
- Componente pode estar renderizando antes do endereço carregar

**Próximo passo**: Verificar se query só executa quando `selectedAddress` está disponível

## 📝 Arquivos Modificados

### Backend
- `shared/schema.ts` - Schema do cupom
- `server/coupon-service.ts` - Lógica de validação
- `server/routes/coupons.ts` - API de validação

### Frontend
- `client/src/components/CouponInput.tsx` - Componente de validação
- `client/src/components/admin/coupon-modal.tsx` - Interface admin
- `client/src/pages/payment.tsx` - Página de pagamento
- `client/src/pages/admin/coupons.tsx` - Listagem admin

## 🎯 Resultado Esperado

Após correção, o sistema deve:
1. Detectar automaticamente a zona do CEP do cliente baseado na prioridade
2. Validar se o cupom é válido para aquela zona específica
3. Permitir/rejeitar o cupom baseado na configuração das zonas
4. Manter toda funcionalidade existente para cupons sem restrições de zona

# VULNERABILIDADE CRÍTICA: Manipulação de Preços via SessionStorage

## ⚠️ GRAVIDADE: CRÍTICA
**Data de Identificação:** 2025-01-14  
**Status:** DESCOBERTA - CORREÇÃO URGENTE NECESSÁRIA

---

## 📋 RESUMO DA VULNERABILIDADE

### Problema Identificado:
- **O que:** Sistema aceita valores de preços manipulados pelo cliente via `sessionStorage`
- **Onde:** Chave `calculatedCosts` no `sessionStorage` do navegador
- **Impacto:** Cliente pode alterar preços de entrega e pagar valores incorretos
- **Risco:** CRÍTICO - Perda financeira direta

### Dados Sensíveis Expostos no SessionStorage:
```json
{
  "deliveryPrice": 18.50,    // ⚠️ MANIPULÁVEL
  "distance": 12.5,          // ⚠️ MANIPULÁVEL  
  "cepZoneName": "Zona A",   // ⚠️ MANIPULÁVEL
  "pricingType": "cep_zones", // ⚠️ MANIPULÁVEL
  "validated": true          // ⚠️ MANIPULÁVEL
}
```

---

## 🔍 ANÁLISE TÉCNICA

### Arquivos Afetados:
1. **`client/src/pages/address-confirmation.tsx`** - Armazena preços no sessionStorage
2. **`client/src/pages/kit-information.tsx`** - Lê preços do sessionStorage
3. **`client/src/pages/payment.tsx`** - Usa preços do sessionStorage para cálculos
4. **`server/routes.ts`** - Backend aceita dados do cliente sem validação adequada

### Fluxo da Vulnerabilidade:

#### 1. Address Confirmation (Armazena no SessionStorage):
```typescript
// VULNERÁVEL: Preços salvos no cliente
const calculatedCosts = {
  deliveryPrice: data.deliveryCost, // Vem do servidor
  // ... outros dados
};
sessionStorage.setItem('calculatedCosts', JSON.stringify(calculatedCosts));
```

#### 2. Kit Information (Lê do SessionStorage):
```typescript
// VULNERÁVEL: Usa dados do sessionStorage sem validação
const deliveryPrice = calculatedCosts.deliveryPrice || 18.50;
const pricing = calculatePricing({
  event,
  kitQuantity: selectedQuantity,
  deliveryPrice, // ⚠️ Valor manipulável
  cepZonePrice
});
```

#### 3. Payment (Calcula com dados manipuláveis):
```typescript
// VULNERÁVEL: Preços finais baseados em dados do cliente
const calculatedCosts = JSON.parse(sessionStorage.getItem('calculatedCosts') || '{}');
const pricing = calculatePricing({
  event,
  kitQuantity: kitData.kitQuantity,
  deliveryPrice, // ⚠️ Pode ter sido alterado pelo cliente
  cepZonePrice   // ⚠️ Pode ter sido alterado pelo cliente
});
```

#### 4. Backend aceita sem validação adequada:
```typescript
// VULNERÁVEL: PIX tem verificação, mas cartão não tem
if (selectedEvent.pricingType === 'cep_zones') {
  // PIX: Recalcula no servidor ✅
  const calculatedPrice = await calculateCepZonePrice(customerAddress?.zipCode || '', selectedEvent.id);
} else {
  // CARTÃO: Usa valor do cliente ❌
  const deliveryCalculation = calculateDeliveryPrice(/* dados do cliente */);
}
```

---

## 🎯 CENÁRIOS DE EXPLOIT

### Cenário 1: Alteração de Preço de Entrega
1. Cliente acessa página de endereços
2. Sistema calcula frete de R$ 25,00 e armazena no sessionStorage
3. **Cliente manipula:** `sessionStorage.setItem('calculatedCosts', '{"deliveryPrice": 1.00, "validated": true}')`
4. Cliente prossegue para pagamento
5. Sistema cobra R$ 1,00 ao invés de R$ 25,00

### Cenário 2: Alteração de Zona CEP
1. Cliente em zona cara (R$ 30,00)
2. **Cliente manipula:** Altera `cepZoneName` e `deliveryPrice` para zona barata (R$ 5,00)
3. Sistema aceita e cobra valor manipulado

### Cenário 3: Falsificação de Validação
1. Cliente em CEP não atendido
2. **Cliente manipula:** `{"validated": true, "deliveryPrice": 0.01}`
3. Sistema aceita CEP "validado" incorretamente

---

## 🔧 PLANO DE CORREÇÃO

### FASE 1: CORREÇÃO IMEDIATA (CRÍTICA)

#### 1.1. Servidor: Validação Obrigatória de Preços
```typescript
// EM: server/routes.ts - Função processCardPayment
// ADICIONAR validação igual ao PIX para todos os pagamentos

if (selectedEvent.pricingType === 'cep_zones') {
  // Sempre recalcular no servidor
  const calculatedPrice = await calculateCepZonePrice(customerAddress?.zipCode || '', selectedEvent.id);
  if (calculatedPrice === null) {
    return res.status(400).json({ 
      success: false,
      message: "CEP não atendido",
      code: "CEP_ZONE_NOT_FOUND"
    });
  }
  deliveryCost = calculatedPrice; // Usar APENAS valor calculado no servidor
} else {
  // Recalcular distância no servidor
  const serverCalculation = calculateDeliveryPrice(customerAddress, /* config do evento */);
  deliveryCost = serverCalculation.price; // Usar APENAS valor calculado no servidor
}
```

#### 1.2. Cliente: Remover Dependência de SessionStorage para Preços
```typescript
// EM: client/src/pages/payment.tsx
// REMOVER uso de calculatedCosts do sessionStorage
// ADICIONAR chamada API para recalcular preços no servidor

useEffect(() => {
  const recalculatePricing = async () => {
    if (selectedAddress && event) {
      const response = await apiRequest("POST", "/api/calculate-delivery", {
        eventId: event.id,
        addressId: selectedAddress.id,
        kitQuantity: kitData.kitQuantity
      });
      const serverPricing = await response.json();
      setPricing(serverPricing); // Usar APENAS dados do servidor
    }
  };
  recalculatePricing();
}, [selectedAddress, event, kitData]);
```

#### 1.3. Nova API: Endpoint de Recálculo Seguro
```typescript
// CRIAR: server/routes.ts - Endpoint /api/calculate-delivery
app.post("/api/calculate-delivery", requireAuth, async (req, res) => {
  const { eventId, addressId, kitQuantity } = req.body;
  
  // Buscar dados NO SERVIDOR (não confiar no cliente)
  const event = await storage.getEvent(eventId);
  const address = await storage.getAddress(addressId);
  
  // Calcular preços NO SERVIDOR
  let deliveryCost = 0;
  if (event.pricingType === 'cep_zones') {
    deliveryCost = await calculateCepZonePrice(address.zipCode, eventId);
  } else {
    deliveryCost = calculateDistanceDelivery(address);
  }
  
  const pricing = calculatePricing({
    event,
    kitQuantity,
    deliveryPrice: deliveryCost // Valor calculado no servidor
  });
  
  res.json(pricing);
});
```

### FASE 2: HARDENING DE SEGURANÇA

#### 2.1. Validação de Integridade
- Implementar checksums para detectar manipulação
- Adicionar timestamps para expiração de dados
- Validar consistência entre sessões

#### 2.2. Auditoria e Logs
- Logar todas as tentativas de pagamento com valores discrepantes
- Monitorar alterações suspeitas em sessionStorage
- Alertas para diferenças entre cliente e servidor

#### 2.3. Sanitização do SessionStorage
```typescript
// Manter apenas dados não-sensíveis no sessionStorage:
const safeSessionData = {
  customerData: { /* dados do usuário */ },
  selectedAddress: { /* endereço selecionado */ },
  kitData: { /* informações dos kits */ }
  // REMOVER: calculatedCosts, deliveryPrice, pricingData
};
```

---

## 📊 CRONOGRAMA DE IMPLEMENTAÇÃO

| Fase | Atividade | Prazo | Prioridade |
|------|-----------|-------|------------|
| 1.1 | Validação servidor cartão | **IMEDIATO** | CRÍTICA |
| 1.2 | Remover dependência sessionStorage | **24h** | CRÍTICA |
| 1.3 | Nova API recálculo | **24h** | CRÍTICA |
| 2.1 | Validação integridade | 48h | ALTA |
| 2.2 | Sistema auditoria | 72h | ALTA |
| 2.3 | Sanitização completa | 96h | MÉDIA |

---

## 🧪 PLANO DE TESTES

### Testes de Segurança:
1. **Teste de Manipulação Direta:**
   - Alterar `sessionStorage.calculatedCosts`
   - Verificar se sistema rejeita valores alterados

2. **Teste de Valores Extremos:**
   - Definir `deliveryPrice: 0.01`
   - Verificar se servidor recalcula corretamente

3. **Teste de CEP Inválido:**
   - Marcar CEP não-atendido como "validated"
   - Verificar se servidor rejeita

### Testes de Regressão:
1. Fluxo normal de pagamento continua funcionando
2. Preços corretos são calculados e cobrados
3. Performance não é afetada significativamente

---

## 🚨 AÇÕES IMEDIATAS RECOMENDADAS

1. **PARAR novos pagamentos** até correção (se possível)
2. **AUDITAR** pagamentos recentes para identificar possíveis manipulações
3. **IMPLEMENTAR** correções na ordem de prioridade crítica
4. **TESTAR** thoroughly antes de reativar pagamentos
5. **MONITORAR** de perto após deploy das correções

---

## 📞 RESPONSABILIDADES

- **Desenvolvedor:** Implementar correções técnicas
- **QA:** Validar testes de segurança  
- **DevOps:** Deploy urgente das correções
- **Negócio:** Revisar impacto financeiro de possíveis explorações

---

**⚠️ ESTA VULNERABILIDADE REPRESENTA RISCO FINANCEIRO DIRETO E DEVE SER CORRIGIDA IMEDIATAMENTE**

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

## ❌ Problema Identificado

### CEP não chegando na validação
**Status**: O `customerZipCode` continua chegando como `undefined` no backend

**Evidência nos logs**:
```
🎫 Coupon validation request: {
  code: 'KITRUNNER15',
  eventId: 12,
  totalAmount: 0.02,
  customerZipCode: undefined
}
```

**Mas o CEP está disponível**:
- ✅ CEP é processado corretamente na validação de preços: `58013420`
- ✅ Endereço é salvo no sessionStorage corretamente
- ✅ Componente CouponInput recebe prop `customerZipCode`

## 🔍 Checklist de Correções Necessárias

### 1. Verificar estrutura do endereço no sessionStorage
- [ ] Confirmar se campo `zipCode` existe no objeto salvo
- [ ] Verificar se não há diferença entre `zipCode`, `cep`, ou outro nome de campo

### 2. Verificar timing de carregamento
- [ ] Confirmar se `selectedAddress` está carregado antes do componente CouponInput renderizar
- [ ] Verificar se React Query não está sendo executada antes do endereço carregar

### 3. Verificar formatação do CEP
- [ ] Confirmar se a limpeza `replace(/\D/g, '')` está funcionando
- [ ] Verificar se CEP não está vazio após formatação

### 4. Debug detalhado
- [ ] Adicionar logs no console do navegador para ver estrutura completa do endereço
- [ ] Verificar se props estão sendo passadas corretamente entre componentes

## 🛠️ Próximos Passos

1. **Investigar estrutura do endereço**: Verificar exatamente como o endereço está sendo salvo e carregado
2. **Corrigir passagem do CEP**: Garantir que o CEP chegue corretamente no componente de validação
3. **Testar validação completa**: Confirmar que cupons com restrições de zona funcionam
4. **Limpar logs de debug**: Remover console.logs após correção

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

# Mercado Pago - Cartões de Teste

## Cartões para Testes de Pagamento

### ✅ Pagamentos Aprovados
| Cartão | Número | CVV | Validade | Nome | Resultado |
|--------|--------|-----|----------|------|-----------|
| Visa | 4013 4013 4013 4013 | 123 | 11/25 | APRO | Aprovado |
| Mastercard | 5031 4332 1540 6351 | 123 | 11/25 | APRO | Aprovado |
| American Express | 3711 803032 57522 | 1234 | 11/25 | APRO | Aprovado |

### ❌ Pagamentos Recusados
| Cartão | Número | CVV | Validade | Nome | Resultado |
|--------|--------|-----|----------|------|-----------|
| Visa | 4013 5406 8274 6260 | 123 | 11/25 | OTHE | Recusado genérico |
| Mastercard | 5031 4332 1540 6365 | 123 | 11/25 | OTHE | Fundos insuficientes |
| Visa | 4509 9535 6623 3704 | 123 | 11/25 | OTHE | Cartão expirado |
| Mastercard | 5031 4332 1540 6357 | 123 | 11/25 | OTHE | Forma de pagamento rejeitada |

### ⏳ Pagamentos Pendentes
| Cartão | Número | CVV | Validade | Nome | Resultado |
|--------|--------|-----|----------|------|-----------|
| Visa | 4009 1757 0100 8020 | 123 | 11/25 | CONT | Aguardando pagamento |
| Mastercard | 5031 4332 1540 6384 | 123 | 11/25 | CALL | Revisão manual |

## 🔑 Cartões Corretos Validados

### Para Aprovação (APRO):
- **Mastercard**: `5031 4332 1540 6351` ✅
- **Visa**: `4013 4013 4013 4013` ✅

### Para Rejeição (OTHE):
- **Visa**: `4013 5406 8274 6260` ✅ (rejeição genérica)
- **Mastercard**: `5031 4332 1540 6365` ⚠️ (pode dar erro de validação)

## Status de Pagamento Mapeados

### Status do Mercado Pago → Status do Sistema
- `approved` → `confirmado`
- `rejected` → `cancelado`
- `pending` → `aguardando_pagamento`
- `cancelled` → `cancelado`
- `refunded` → `cancelado`

## Como Testar

1. **Pagamento Aprovado**: Use cartão 5031 4332 1540 6351 com nome "APRO"
2. **Pagamento Recusado**: Use cartão 4013 5406 8274 6260 com nome "OTHE"
3. **Pagamento Pendente**: Use cartão 4009 1757 0100 8020 com nome "CONT"

## Validação no Sistema

O sistema KitRunner:
- ✅ Captura status `approved` e atualiza pedido para `confirmado`
- ✅ Captura status `rejected` e atualiza pedido para `cancelado`
- ✅ Mantém status `aguardando_pagamento` para pagamentos pendentes
- ✅ Registra histórico completo de mudanças de status
- ✅ Processa webhook de notificação do Mercado Pago

## Logs de Teste

Monitore os logs do servidor para verificar:
```
✅ Payment approved for order KR2025XXXXXX - updating to confirmado
❌ Payment rejected for order KR2025XXXXXX - updating to cancelado
⏳ Payment pending for order KR2025XXXXXX - keeping aguardando_pagamento
```

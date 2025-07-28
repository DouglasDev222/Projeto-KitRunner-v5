# Cartões de Teste Exatos do Mercado Pago Brasil

## ✅ Cartões de Aprovação
| Bandeira | Número | CVV | Validade | Nome | Status |
|----------|--------|-----|----------|------|--------|
| Visa | 4235 6477 2802 5682 | 123 | 11/25 | APRO | approved |
| Mastercard | 5031 4332 1540 6351 | 123 | 11/25 | APRO | approved |
| Elo | 5067 2686 5178 2334 | 123 | 11/25 | APRO | approved |

## ❌ Cartões de Rejeição
| Bandeira | Número | CVV | Validade | Nome | Status | Motivo |
|----------|--------|-----|----------|------|--------|---------|
| Visa | 4013 5406 8274 6260 | 123 | 11/25 | OTHE | rejected | cc_rejected_other_reason |
| Mastercard | 5031 4332 1540 6365 | 123 | 11/25 | OTHE | rejected | cc_rejected_insufficient_amount |
| Visa | 4509 9535 6623 3704 | 123 | 11/25 | OTHE | rejected | cc_rejected_card_disabled |
| Mastercard | 5031 4332 1540 6357 | 123 | 11/25 | OTHE | rejected | cc_rejected_bad_filled_card_number |

## ⏳ Cartões de Pendência
| Bandeira | Número | CVV | Validade | Nome | Status |
|----------|--------|-----|----------|------|--------|
| Visa | 4009 1757 0100 8020 | 123 | 11/25 | CONT | pending |
| Mastercard | 5031 4332 1540 6384 | 123 | 11/25 | CALL | pending |

## 🔍 Importante
- Use exatamente estes números sem espaços na API
- Sempre use ambiente de TEST (TEST-xxxx nas chaves)
- Nome do portador é crucial para o resultado
- CVV pode ser qualquer 3 dígitos para cartões de teste

## 🧪 Como Testar
1. Acesse `/test-rejected-payment.html`
2. Use cartão **5031433215406365** com nome **OTHE**
3. Deve retornar status `rejected` com motivo `insufficient_amount`

## Debug
Se ainda estiver aprovando com OTHE:
- Verifique se está usando ambiente TEST
- Confirme se o número está exato (sem espaços)
- Verifique logs do servidor para status_detail
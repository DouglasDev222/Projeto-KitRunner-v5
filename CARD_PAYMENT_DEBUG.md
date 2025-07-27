# 🔧 Debug - Pagamento com Cartão

## ❌ Problema Identificado
O processamento de pagamento com cartão está retornando erro 400.

## 🔍 Diagnóstico

### Logs Observados
```
POST /api/mercadopago/process-card-payment 400 in 193ms
```

### Possíveis Causas
1. **Token inválido**: O token do cartão não está sendo gerado corretamente
2. **Dados ausentes**: Algum campo obrigatório não está sendo enviado
3. **Chaves de teste**: Problema com as credenciais do MercadoPago
4. **Formato de dados**: Estrutura do payload incorreta

## 📋 Checklist de Correções

### ✅ Implementado
- [x] Logs detalhados no backend
- [x] Validação de token obrigatório
- [x] Melhoria no tratamento de erros
- [x] Logs no frontend para tokenização

### 🔄 Em Andamento
- [ ] Verificar se token está sendo gerado
- [ ] Validar estrutura do payload
- [ ] Testar com dados mínimos

## 🧪 Teste Rápido
```bash
# Teste direto da API
curl -X POST http://localhost:5000/api/mercadopago/process-card-payment \
  -H "Content-Type: application/json" \
  -d '{
    "token": "test_token_123",
    "paymentMethodId": "visa", 
    "orderId": "KR2025123456",
    "amount": 23.5,
    "email": "test@example.com",
    "customerName": "João Silva",
    "cpf": "11144477735"
  }'
```

## 📝 Próximos Passos
1. Verificar logs detalhados do token
2. Corrigir estrutura de dados se necessário  
3. Implementar fallback para casos de erro
4. Testar com cartões de teste válidos do MercadoPago
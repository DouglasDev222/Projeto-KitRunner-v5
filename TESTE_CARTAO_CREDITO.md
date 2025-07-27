# 💳 Como Testar Cartão de Crédito - MercadoPago

## ✅ Correção Aplicada
Removido parâmetro inválido `auto_return` que estava causando erro 400.

## 🧪 Como Testar Cartão de Crédito

### 1. Via Aplicação (Recomendado)
1. Acesse o app: http://localhost:5000
2. Faça um pedido normal até chegar na página de pagamento
3. Selecione "Cartão de Crédito"
4. Use os dados de teste abaixo

### 2. Via Página de Teste
1. Acesse: http://localhost:5000/test-payment.html
2. Selecione "Cartão de Crédito"
3. Preencha com dados de teste

## 🔧 Cartões de Teste MercadoPago (2025)

### ✅ Visa - Pagamento Aprovado
- **Número**: 4013 4013 4013 4013
- **Validade**: 11/25
- **CVV**: 123
- **Nome**: APRO (nome que força aprovação)

### ✅ Mastercard - Pagamento Aprovado  
- **Número**: 5416 7526 0258 2580
- **Validade**: 11/25
- **CVV**: 123
- **Nome**: APRO

### ❌ Visa - Pagamento Rejeitado (para teste)
- **Número**: 4000 0000 0000 0002
- **Validade**: 11/25
- **CVV**: 123
- **Nome**: OTHE

### ⏳ Mastercard - Pagamento Pendente
- **Número**: 5031 7557 3453 0604
- **Validade**: 11/25
- **CVV**: 123
- **Nome**: CONT

## 📋 Dados Pessoais de Teste
- **Email**: test@example.com
- **CPF**: 111.444.777-35 (ou qualquer CPF válido)
- **Nome**: João Silva

## 🎯 Resultado Esperado
- Token será criado com sucesso
- Pagamento será processado pelo MercadoPago
- Status será retornado (approved/rejected/pending)
- Pedido mudará de status conforme resultado

## 🔍 Debug
Se der erro, verifique os logs no console do navegador e no terminal do servidor.
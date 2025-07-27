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

## 🔧 Cartões de Teste MercadoPago

### Mastercard (Aprovado)
- **Número**: 5031 4332 1540 6351
- **Validade**: 11/25 (ou qualquer data futura)
- **CVV**: 123
- **Nome**: Qualquer nome

### Visa (Aprovado)  
- **Número**: 4509 9535 6623 3704
- **Validade**: 11/25
- **CVV**: 123
- **Nome**: Qualquer nome

### Visa (Rejeitado - para testar erro)
- **Número**: 4000 0000 0000 0002
- **Validade**: 11/25
- **CVV**: 123

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
# 🎯 Guia de Configuração do Webhook MercadoPago

## 📋 O que fazer após o deploy

### 1. URL do Webhook
Após fazer o deploy no Replit, sua URL será algo como:
```
https://seu-projeto.replit.app/api/mercadopago/webhook
```

### 2. Configurar no Painel MercadoPago

1. **Acesse**: https://www.mercadopago.com.br/developers/panel
2. **Vá em**: Suas integrações → Notificações → Webhooks
3. **URL do Webhook**: `https://seu-projeto.replit.app/api/mercadopago/webhook`
4. **Eventos para configurar**:
   - ✅ `payment` - Notificações de pagamento
   - ✅ `merchant_order` - Notificações de pedidos (opcional)

### 3. Obter a Chave Secreta do Webhook

1. Após criar o webhook, copie a **Chave Secreta**
2. No painel do Replit, vá em **Secrets** (cadeado na sidebar)
3. Adicione a secret:
   - **Nome**: `MERCADOPAGO_WEBHOOK_SECRET`
   - **Valor**: Cole a chave secreta copiada do MercadoPago

### 4. Testar o Webhook

1. Faça um pagamento de teste na aplicação
2. Verifique os logs do Replit para confirmar que o webhook está funcionando
3. Deve aparecer logs como:
   ```
   🔒 SECURITY: Webhook signature validated successfully
   💳 Payment 123456 status: approved
   📋 Order KR2025123456 status updated: aguardando_pagamento → confirmado
   ```

## 🔒 Recursos de Segurança Implementados

### ✅ Validação de Assinatura
- Verifica se a requisição realmente vem do MercadoPago
- Usa HMAC-SHA256 com a chave secreta
- Rejeita tentativas de manipulação maliciosa

### ✅ Logs de Segurança
- IP de origem das requisições
- Tentativas de webhook não autorizadas
- Status de validação de assinatura

### ✅ Atualizações Automáticas
- Status do pedido atualizado automaticamente
- Suporte para todos os status: approved, rejected, cancelled, pending
- Mapeamento correto para os status em português

## 🚨 Importante

⚠️ **Sem a chave secreta configurada**, o webhook funcionará em modo de desenvolvimento (com warnings de segurança), mas **não será seguro em produção**.

✅ **Com a chave secreta configurada**, todas as notificações serão validadas e o sistema ficará totalmente seguro.

## 🎯 Status da Implementação

- ✅ Endpoint do webhook criado: `/api/mercadopago/webhook`
- ✅ Validação de assinatura implementada
- ✅ Atualização automática de status de pedidos
- ✅ Logs de segurança completos
- ✅ Rate limiting aplicado
- ⏳ **Aguardando**: Configuração da URL após deploy
- ⏳ **Aguardando**: Configuração da chave secreta

## 📞 URL de Teste

Para testar webhook localmente (desenvolvimento):
```
http://localhost:5000/api/mercadopago/webhook
```

Para produção (após deploy):
```
https://seu-projeto.replit.app/api/mercadopago/webhook
```
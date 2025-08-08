# KitRunner - Lista de Verificação para Deploy em Produção

## 1. Variáveis de Ambiente Obrigatórias

Configurar no seu hosting (Vercel, Netlify, Railway, etc.):

```bash
# Banco de Dados
DATABASE_URL="postgresql://user:pass@host:port/database"

# MercadoPago (Chaves de PRODUÇÃO)
MERCADO_PAGO_ACCESS_TOKEN="APP_USR-xxxxxxx" # Chave PRODUÇÃO
MERCADO_PAGO_PUBLIC_KEY="APP_USR-xxxxxxx"   # Chave PRODUÇÃO
MERCADOPAGO_WEBHOOK_SECRET="seu_webhook_secret_de_producao"

# Email (SendGrid)
SENDGRID_API_KEY="SG.xxxxxxx"

# Ambiente
NODE_ENV="production"
```

## 2. Configuração MercadoPago

No painel MercadoPago (https://mercadopago.com.br/developers):

1. **Criar Aplicação de PRODUÇÃO**
2. **Configurar Webhook:**
   - URL: `https://seu-dominio.com/api/mercadopago/webhook`
   - Eventos: `payment.updated` (obrigatório para PIX)
   - Secret: Copiar para `MERCADOPAGO_WEBHOOK_SECRET`

## 3. Configuração do Banco

Se usando Supabase:
1. Criar projeto de produção
2. Executar: `npm run db:push` para migrar schema
3. Configurar `DATABASE_URL` com string de produção

## 4. Testes Obrigatórios

Antes de ir ao ar:
- [ ] Teste completo de PIX (QR code + pagamento offline)
- [ ] Teste webhook no painel MercadoPago
- [ ] Verificar emails de confirmação
- [ ] Testar fluxo completo de pedido

## 5. Segurança de Produção

✅ **Automaticamente Ativadas:**
- Validação obrigatória de webhook signature
- Rate limiting em todas as APIs
- Headers de segurança (CSP, XSS protection)
- Validação de ownership em endpoints privados
- Logs de auditoria completos

## 6. Portabilidade Garantida

✅ **Funciona em Qualquer Domínio:**
- Nenhuma URL hardcoded
- CSP com 'self' (se adapta ao domínio)
- Configuração 100% via environment variables
- Frontend e backend totalmente portáveis

## 7. Checklist Final

- [ ] `NODE_ENV=production` configurado
- [ ] Todas as variáveis de ambiente definidas
- [ ] Webhook MercadoPago testado e funcionando
- [ ] Banco de produção configurado e migrado
- [ ] SendGrid configurado para emails
- [ ] Testes de pagamento PIX realizados
- [ ] Logs de aplicação monitorados

## 8. Suporte Pós-Deploy

Para debug em produção:
- Logs do webhook ficam no console da aplicação
- Endpoint de teste: `GET /api/admin/test-stats` (admin only)
- Status de pedidos: Painel administrativo
- Relatórios: `/admin/reports` para auditoria

---

**A aplicação está 100% pronta para produção em qualquer domínio!**
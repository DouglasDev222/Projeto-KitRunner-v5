# Plano de Migração: SendGrid → Resend

## 📋 Objetivo
Substituir a integração atual do SendGrid pelo Resend como provedor padrão de email para o sistema KitRunner, mantendo todas as funcionalidades existentes.

## 🔍 Análise do Sistema Atual

### Arquivos Identificados
- **`server/email/email-service.ts`** - Serviço principal de email (SendGrid)
- **`client/src/pages/admin-email-test.tsx`** - Página de teste de email no admin
- **`client/src/pages/admin-email-logs.tsx`** - Página de logs de email no admin
- **`test-email-simple.js`** - Teste simples de integração
- **`server/email/email-templates.ts`** - Templates de email (reutilizável)
- **`server/email/email-types.ts`** - Tipos de dados (reutilizável)
- **`server/email/email-data-mapper.ts`** - Mapeador de dados (reutilizável)

### Funcionalidades Atuais
- ✅ Confirmação de pedidos
- ✅ Kit em trânsito
- ✅ Confirmação de entrega
- ✅ Atualização de status
- ✅ Lembrete de pagamento
- ✅ Notificação de timeout de pagamento
- ✅ Notificações administrativas
- ✅ Email de teste
- ✅ Sistema de logs
- ✅ Painel de administração

## 📦 Etapas da Migração

### 1. **Instalação do Resend**
```bash
npm install resend
```

### 2. **Configuração de Variável de Ambiente**
- Adicionar `RESEND_API_KEY` aos Secrets do Replit
- Manter temporariamente `SENDGRID_API_KEY` para fallback

### 3. **Modificação do EmailService**
#### **Arquivo: `server/email/email-service.ts`**

**3.1 Imports e Configuração**
```typescript
// Substituir
import sgMail from '@sendgrid/mail';

// Por
import { Resend } from 'resend';

// Configuração
const resend = new Resend(process.env.RESEND_API_KEY);
const RESEND_ENABLED = !!process.env.RESEND_API_KEY;
```

**3.2 Método de Envio**
```typescript
// Substituir chamadas sgMail.send(msg) por:
const { data, error } = await resend.emails.send({
  from: `${this.fromName} <${this.fromEmail}>`,
  to: recipientEmail,
  subject: template.subject,
  html: template.html,
  text: template.text,
});
```

**3.3 Tratamento de Response**
- Resend retorna `{ data, error }` ao invés de headers
- Atualizar logs para usar `data.id` ao invés de `sendgridMessageId`

### 4. **Atualização dos Métodos**
Modificar todos os métodos:
- `sendServiceConfirmation()`
- `sendKitEnRoute()`
- `sendDeliveryConfirmation()`
- `sendStatusUpdateEmail()`
- `sendPaymentPending()`
- `sendTestEmail()`
- `sendOrderTimeoutNotification()`
- `sendAdminOrderConfirmation()`

### 5. **Atualização da Página de Teste**
#### **Arquivo: `client/src/pages/admin-email-test.tsx`**
- Modificar título de "Teste SendGrid" para "Teste Resend"
- Atualizar mensagens de sucesso/erro
- Manter funcionalidade idêntica

### 6. **Atualização do Sistema de Logs**
#### **Arquivo: `server/storage/index.ts`** (se necessário)
- Renomear campo `sendgridMessageId` para `resendMessageId`
- Ou manter genérico como `messageId`

### 7. **Criação de Script de Teste**
#### **Novo Arquivo: `test-resend-integration.js`**
```javascript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const testEmail = async () => {
  const { data, error } = await resend.emails.send({
    from: 'KitRunner <contato@kitrunner.com.br>',
    to: ['test@example.com'], // Substituir por email real
    subject: '🧪 Teste Resend - KitRunner',
    html: '<strong>Integração Resend funcionando!</strong>',
  });

  if (error) {
    console.error('❌ Erro:', error);
  } else {
    console.log('✅ Sucesso:', data);
  }
};

testEmail();
```

### 8. **Configuração de Domínio**
- Verificar domínio `kitrunner.com.br` no painel do Resend
- Configurar registros DNS necessários
- Testar autenticação de domínio

### 9. **Fallback Strategy (Opcional)**
Implementar sistema que tenta Resend primeiro, depois SendGrid:
```typescript
async sendEmail(data) {
  try {
    // Tentar Resend primeiro
    if (RESEND_ENABLED) {
      return await this.sendWithResend(data);
    }
  } catch (error) {
    console.log('Resend falhou, tentando SendGrid...');
  }
  
  // Fallback para SendGrid
  if (SENDGRID_ENABLED) {
    return await this.sendWithSendGrid(data);
  }
  
  throw new Error('Nenhum provedor de email disponível');
}
```

## 🔧 Configurações Necessárias

### Variáveis de Ambiente
```env
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=contato@kitrunner.com.br  
RESEND_FROM_NAME=KitRunner
```

### DNS (Domínio)
No painel do Resend, configurar:
- Verificação de domínio
- Registros DKIM
- Registros SPF
- Registro DMARC

## 📊 Diferenças Principais

| Aspecto | SendGrid | Resend |
|---------|----------|--------|
| **Instalação** | `@sendgrid/mail` | `resend` |
| **Configuração** | `sgMail.setApiKey()` | `new Resend(key)` |
| **Envio** | `sgMail.send(msg)` | `resend.emails.send()` |
| **Response** | Headers com `x-message-id` | `{ data: { id }, error }` |
| **Estrutura** | `{ to, from, subject, html }` | Idêntica |
| **Preço** | Mais caro | Mais barato |
| **Performance** | Boa | Excelente |

## 🧪 Testes Necessários

### 1. **Teste de Configuração**
- Verificar API key válida
- Testar conexão básica

### 2. **Teste de Templates**
- Confirmar renderização HTML/texto
- Verificar encoding de caracteres especiais

### 3. **Teste de Funcionalidades**
- Email de confirmação de pedido
- Email de status em trânsito
- Email de entrega confirmada
- Email de lembrete de pagamento
- Email administrativo
- Email de teste do painel

### 4. **Teste de Logs**
- Verificar gravação de logs
- Confirmar IDs de mensagem
- Testar filtros no painel admin

### 5. **Teste de Delivery**
- Inbox principais (Gmail, Outlook, Yahoo)
- Verificar pasta spam
- Testar diferentes domínios de destino

## 🚀 Cronograma Sugerido

| Etapa | Duração | Descrição |
|-------|---------|-----------|
| **1-2** | 30min | Instalar dependência e configurar API key |
| **3** | 2h | Modificar EmailService para usar Resend |
| **4** | 1h | Atualizar todos os métodos de envio |
| **5-6** | 30min | Ajustar páginas admin e logs |
| **7** | 20min | Criar script de teste |
| **8** | 1h | Configurar domínio no Resend |
| **9** | 1h | Implementar fallback (opcional) |
| **🧪** | 2h | Testes completos |

**Total Estimado: 8 horas**

## ✅ Checklist de Validação

- [ ] Resend instalado e configurado
- [ ] API key funcionando
- [ ] Domínio verificado no Resend
- [ ] EmailService modificado
- [ ] Todos os métodos atualizados
- [ ] Logs funcionando corretamente
- [ ] Página de teste admin atualizada
- [ ] Script de teste criado
- [ ] Emails sendo entregues corretamente
- [ ] Templates renderizando bem
- [ ] Fallback funcionando (se implementado)
- [ ] Documentação atualizada

## 🔄 Rollback Plan

Se houver problemas:
1. **Imediato**: Reverter para SendGrid temporariamente
2. **Configurar**: `RESEND_ENABLED=false` nas variáveis
3. **Verificar**: SendGrid ainda funcional
4. **Investigar**: Logs de erro do Resend
5. **Corrigir**: Problema identificado
6. **Testar**: Nova tentativa com Resend

## 📈 Benefícios Esperados

### Técnicos
- ✅ API mais moderna e simples
- ✅ Melhor documentação
- ✅ Response mais limpo
- ✅ Menos configuração necessária

### Financeiros
- ✅ Custo reduzido (~60% economia)
- ✅ Plano gratuito generoso
- ✅ Preços transparentes

### Operacionais
- ✅ Interface mais intuitiva
- ✅ Analytics melhorados
- ✅ Deliverability otimizada

---

**Status**: 📋 Plano criado - Pronto para implementação
**Responsável**: Desenvolvedor/DevOps
**Revisão**: Necessária antes da execução
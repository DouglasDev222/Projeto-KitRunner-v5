# Plano de Implementação - Integração WhatsApp

## Objetivo
Adicionar funcionalidade completa de integração com WhatsApp para envio automático de mensagens de confirmação de pedidos após pagamento aprovado.

## Fases de Implementação

### **FASE 1: Estrutura de Banco de Dados**
- [x] 1.1 Adicionar tabela `whatsapp_messages` no schema
- [x] 1.2 Adicionar tabela `whatsapp_settings` para configurações
- [x] 1.3 Executar migração para criar as tabelas

### **FASE 2: Serviço de WhatsApp**
- [x] 2.1 Criar serviço WhatsApp (`server/whatsapp-service.ts`)
- [x] 2.2 Implementar função para enviar mensagens
- [x] 2.3 Implementar função para obter QR Code
- [x] 2.4 Implementar sistema de templates com placeholders

### **FASE 3: Rotas da API**
- [x] 3.1 Criar rotas para conexão WhatsApp (`/api/admin/whatsapp/connection`)
- [x] 3.2 Criar rotas para templates (`/api/admin/whatsapp/template`)
- [x] 3.3 Criar rotas para histórico (`/api/admin/whatsapp/messages`)
- [x] 3.4 Criar middleware de autenticação admin para rotas

### **FASE 4: Interface Admin - Frontend**
- [x] 4.1 Criar componente de Conexão WhatsApp
- [x] 4.2 Criar componente de Editor de Template
- [x] 4.3 Criar componente de Histórico de Mensagens
- [x] 4.4 Adicionar navegação no menu admin
- [x] 4.5 Criar página principal do WhatsApp no admin

### **FASE 5: Integração com Webhook de Pagamento**
- [x] 5.1 Modificar webhook do MercadoPago para incluir WhatsApp
- [x] 5.2 Implementar lógica de montagem de mensagem
- [x] 5.3 Implementar substituição de placeholders
- [x] 5.4 Adicionar logs de debug para acompanhamento

### **FASE 6: Testes e Validação**
- [ ] 6.1 Testar conexão com API externa
- [ ] 6.2 Testar criação e edição de templates
- [ ] 6.3 Testar envio automático via webhook
- [ ] 6.4 Validar interface do admin
- [ ] 6.5 Verificar logs e histórico

## Especificações Técnicas

### API Externa WhatsApp
- **URL Base**: `http://91.108.126.63:5000`
- **Auth**: `Bearer 12345678`
- **Endpoints**:
  - `POST /send-message` - Enviar mensagem
  - `GET /qrcode` - Obter QR Code de conexão

### Estrutura do Banco de Dados

#### Tabela `whatsapp_messages`
```sql
id (serial, pk)
order_id (integer, fk -> orders.id)
customer_name (varchar)
phone_number (varchar)
message_content (text)
status (varchar) - 'pending', 'sent', 'error'
job_id (varchar) - ID retornado pela API
error_message (text) - opcional
created_at (timestamp)
sent_at (timestamp) - opcional
```

#### Tabela `whatsapp_settings`
```sql
id (serial, pk)
template_content (text)
is_active (boolean)
created_at (timestamp)
updated_at (timestamp)
```

### Template de Mensagem (Padrão)
```
Olá, *{{cliente}}*! 
Confirmamos sua solicitação de *[Retirada do Kit] {{evento}}*.

Você solicitou a retirada de *{{qtd_kits}}* kits para os seguintes atletas:

{{lista_kits}}

Vamos retirar seu kit, previsão de entrega é para amanhã dia {{data_entrega}}.
Logo mais entraremos em contato e faremos a entrega no endereço informado no pedido.

Qualquer dúvida, estamos à disposição.
```

### Placeholders Disponíveis
- `{{cliente}}` - Nome do cliente
- `{{evento}}` - Nome do evento
- `{{qtd_kits}}` - Quantidade de kits
- `{{lista_kits}}` - Lista dos nomes dos atletas
- `{{data_entrega}}` - Data prevista de entrega formatada
- `{{numero_pedido}}` - Número do pedido

## Variáveis de Ambiente Necessárias
- `WHATSAPP_API_URL=http://91.108.126.63:5000`
- `WHATSAPP_API_TOKEN=12345678`

## Pontos de Integração
1. **Webhook MercadoPago**: Adicionar chamada para WhatsApp após confirmação
2. **Menu Admin**: Nova seção "WhatsApp" 
3. **Storage**: Adicionar métodos para WhatsApp no storage.ts
4. **Rotas**: Registrar novas rotas no routes.ts

## Considerações de Segurança
- Validar número de telefone antes do envio
- Log completo de todas as tentativas de envio
- Rate limiting para evitar spam
- Validação de admin para todas as rotas
- Não expor tokens no frontend

## Tratamento de Erros
- Retry automático em caso de falha
- Log detalhado de erros
- Fallback para email caso WhatsApp falhe
- Interface admin para reenvio manual
# Sistema de Status de Eventos e Controle de Estoque - Implementação Concluída

## ✅ Funcionalidades Implementadas

### 1. Novos Status de Eventos
- **ativo**: Evento disponível para pedidos (padrão)
- **inativo**: Evento temporariamente indisponível 
- **fechado_pedidos**: Evento fechado para novos pedidos (útil quando próximo ao limite ou data)

### 2. Sistema de Controle de Estoque
- **stockEnabled**: Controla se o evento usa controle de estoque
- **maxOrders**: Limite máximo de pedidos/kits para o evento
- **currentOrders**: Contador atual de pedidos confirmados
- Validação automática antes de criar novos pedidos

## 📊 Mudanças no Backend

### Schema (shared/schema.ts)
```typescript
// Novos campos adicionados na tabela events:
status: varchar("status", { length: 50 }).default("ativo"),
stockEnabled: boolean("stock_enabled").default(false),
maxOrders: integer("max_orders"),
currentOrders: integer("current_orders").default(0),
```

### Novos Métodos de Storage
- `updateEventStock(eventId, increment)`: Atualiza contador de pedidos
- `checkEventAvailability(eventId, quantity)`: Verifica disponibilidade
- `updateEventStatus(eventId, status)`: Atualiza status do evento

### Validação na Criação de Pedidos
- Verifica status do evento antes de criar pedido
- Valida disponibilidade de estoque se habilitado
- Atualiza contador automaticamente após pedido criado
- Retorna erros específicos (evento inativo, sem estoque, etc.)

## 🔗 Novos Endpoints Administrativos

### 1. Atualizar Status do Evento
```http
PATCH /api/admin/events/:id/status
Content-Type: application/json

{
  "status": "ativo" | "inativo" | "fechado_pedidos"
}
```

### 2. Gerenciar Controle de Estoque
```http
PATCH /api/admin/events/:id/stock
Content-Type: application/json

{
  "stockEnabled": true,
  "maxOrders": 100,
  "currentOrders": 25
}
```

### 3. Verificar Disponibilidade
```http
GET /api/admin/events/:id/availability?quantity=5
```

Retorna:
```json
{
  "eventId": 1,
  "requestedQuantity": 5,
  "available": true,
  "remainingStock": 75,
  "status": "ativo"
}
```

## 🔄 Fluxo de Validação

### Criação de Pedidos
1. **Verificar evento existe**
2. **NEW: Validar disponibilidade** (status + estoque)
3. Validar CEP/pricing
4. Criar pedido
5. **NEW: Atualizar contador de estoque**
6. Enviar emails

### Mensagens de Erro
- "Este evento não está disponível no momento" (inativo)
- "Este evento está fechado para novos pedidos" (fechado_pedidos)
- "Este evento não possui mais kits disponíveis" (sem estoque)

## 📁 Arquivos Modificados

### Backend Core
- ✅ `shared/schema.ts` - Schema atualizado
- ✅ `server/storage.ts` - Interface e métodos novos
- ✅ `server/routes.ts` - Validação + endpoints admin
- ✅ `migrations/add_event_status_stock.sql` - Migration aplicada

### Próximos Passos (Frontend)
- [ ] Interface admin para gerenciar status/estoque
- [ ] Filtros no cliente por disponibilidade
- [ ] Indicadores visuais de estoque baixo

## 🧪 Testes Básicos

### Verificar Evento Atual
```bash
curl "http://localhost:5000/api/events" | jq '.[0] | {id, name, status, stockEnabled, maxOrders, currentOrders}'
```

### Testar Atualização de Status
```bash
curl -X PATCH "http://localhost:5000/api/admin/events/1/status" \
  -H "Content-Type: application/json" \
  -d '{"status": "fechado_pedidos"}'
```

### Testar Controle de Estoque
```bash
curl -X PATCH "http://localhost:5000/api/admin/events/1/stock" \
  -H "Content-Type: application/json" \
  -d '{"stockEnabled": true, "maxOrders": 50}'
```

## 💡 Benefícios da Implementação

1. **Controle Granular**: Admins podem gerenciar eventos individualmente
2. **Prevenção de Overselling**: Limite automático de pedidos
3. **Flexibilidade**: Sistema pode ser ligado/desligado por evento
4. **UX Melhorada**: Mensagens claras sobre disponibilidade
5. **Auditoria**: Tracking automático de uso de estoque

## 🔐 Segurança

- Todos endpoints admin requerem autenticação
- Validação de dados de entrada
- Transações atômicas para updates de estoque
- Logs detalhados de mudanças de status

A implementação está **completa e funcional** no backend. O sistema validará automaticamente a disponibilidade em todas as novas criações de pedidos.
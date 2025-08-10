# Implementação de Status de Eventos e Controle de Estoque

## Visão Geral
Implementar melhorias no sistema de gerenciamento de eventos com:
1. **Status expandidos para eventos** (Ativo, Inativo, Fechado para Pedidos)
2. **Controle de estoque** com limite de pedidos por evento
3. **Atualização automática do estoque** ao criar pedidos
4. **Interface administrativa** para gerenciar status e estoque

## Estado Atual
- Tabela `events` possui apenas coluna `available` (boolean)
- Não há controle de estoque/limite de pedidos
- Interface admin permite apenas ativar/desativar eventos

## Implementação Passo a Passo

### 1. Modificações no Schema (Database)

#### 1.1 Adicionar colunas na tabela events
```sql
-- Adicionar nova coluna de status (substitui available)
ALTER TABLE events ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ativo';

-- Adicionar colunas de controle de estoque
ALTER TABLE events ADD COLUMN max_orders INTEGER; -- null = ilimitado
ALTER TABLE events ADD COLUMN current_orders INTEGER NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN stock_enabled BOOLEAN NOT NULL DEFAULT false;

-- Migrar dados existentes
UPDATE events SET status = CASE 
  WHEN available = true THEN 'ativo' 
  ELSE 'inativo' 
END;

-- Remover coluna antiga (opcional - pode manter para compatibilidade)
-- ALTER TABLE events DROP COLUMN available;
```

#### 1.2 Atualizar shared/schema.ts
```typescript
export const events = pgTable("events", {
  // ... campos existentes ...
  
  // Novo sistema de status (substitui available)
  status: varchar("status", { length: 20 }).notNull().default("ativo"), // 'ativo', 'inativo', 'fechado_pedidos'
  
  // Controle de estoque
  stockEnabled: boolean("stock_enabled").notNull().default(false), // Se o controle de estoque está habilitado
  maxOrders: integer("max_orders"), // Limite máximo de pedidos (null = ilimitado)
  currentOrders: integer("current_orders").notNull().default(0), // Quantidade atual de pedidos
  
  // Manter available por compatibilidade (deprecated)
  available: boolean("available").notNull().default(true),
  
  // ... outros campos ...
});
```

### 2. Tipos e Validações

#### 2.1 Definir tipos de status
```typescript
// Em shared/schema.ts
export const eventStatusEnum = z.enum(['ativo', 'inativo', 'fechado_pedidos']);
export type EventStatus = z.infer<typeof eventStatusEnum>;

// Esquema para atualização de eventos
export const eventUpdateSchema = createInsertSchema(events).extend({
  status: eventStatusEnum,
  stockEnabled: z.boolean(),
  maxOrders: z.number().int().min(1).nullable(),
}).partial();
```

### 3. Modificações no Backend

#### 3.1 Atualizar storage interface
```typescript
// Em server/storage.ts
interface IStorage {
  // ... métodos existentes ...
  
  // Novos métodos para controle de estoque
  updateEventStock(eventId: number, increment: number): Promise<Event>;
  checkEventAvailability(eventId: number, requestedQuantity: number): Promise<{
    available: boolean;
    remainingStock: number | null;
    status: EventStatus;
  }>;
  updateEventStatus(eventId: number, status: EventStatus): Promise<Event>;
}
```

#### 3.2 Implementar controle de estoque na criação de pedidos
```typescript
// Em server/routes.ts - endpoint POST /api/orders
app.post("/api/orders", paymentRateLimit, async (req, res) => {
  try {
    // ... validações existentes ...
    
    // NOVO: Verificar disponibilidade do evento
    const eventAvailability = await storage.checkEventAvailability(
      validData.eventId, 
      validData.kitQuantity
    );
    
    if (!eventAvailability.available) {
      return res.status(400).json({
        success: false,
        error: eventAvailability.status === 'fechado_pedidos' 
          ? 'Este evento está fechado para novos pedidos'
          : eventAvailability.remainingStock === 0
          ? 'Este evento não possui mais kits disponíveis'
          : 'Este evento não está disponível para pedidos',
        remainingStock: eventAvailability.remainingStock
      });
    }
    
    // ... lógica de criação do pedido ...
    
    // NOVO: Atualizar estoque após criação bem-sucedida
    if (event.stockEnabled) {
      await storage.updateEventStock(validData.eventId, validData.kitQuantity);
    }
    
    // ... resto da implementação ...
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ success: false, error: "Erro interno do servidor" });
  }
});
```

### 4. Modificações no Frontend

#### 4.1 Atualizar interface de eventos no admin
```typescript
// Em client/src/pages/admin/events.tsx
interface Event {
  // ... propriedades existentes ...
  status: 'ativo' | 'inativo' | 'fechado_pedidos';
  stockEnabled: boolean;
  maxOrders: number | null;
  currentOrders: number;
}

// Componente para seleção de status
const EventStatusSelect = ({ value, onChange }: {
  value: string;
  onChange: (value: string) => void;
}) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="ativo">🟢 Ativo</SelectItem>
      <SelectItem value="inativo">🔴 Inativo</SelectItem>
      <SelectItem value="fechado_pedidos">🚫 Fechado para Pedidos</SelectItem>
    </SelectContent>
  </Select>
);

// Badge de status para visualização
const EventStatusBadge = ({ status }: { status: string }) => {
  const variants = {
    ativo: "bg-green-500 text-white",
    inativo: "bg-red-500 text-white", 
    fechado_pedidos: "bg-orange-500 text-white"
  };
  
  const labels = {
    ativo: "Ativo",
    inativo: "Inativo",
    fechado_pedidos: "Fechado"
  };
  
  return (
    <span className={`px-2 py-1 rounded text-xs ${variants[status as keyof typeof variants]}`}>
      {labels[status as keyof typeof labels]}
    </span>
  );
};
```

#### 4.2 Componente de controle de estoque
```typescript
// Componente para gerenciar estoque
const StockControl = ({ event, onUpdate }: {
  event: Event;
  onUpdate: (data: Partial<Event>) => void;
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Checkbox 
          checked={event.stockEnabled}
          onCheckedChange={(checked) => onUpdate({ stockEnabled: checked })}
        />
        <Label>Controle de estoque habilitado</Label>
      </div>
      
      {event.stockEnabled && (
        <div className="space-y-2">
          <Label>Limite máximo de pedidos</Label>
          <Input
            type="number"
            value={event.maxOrders || ''}
            onChange={(e) => onUpdate({ 
              maxOrders: e.target.value ? parseInt(e.target.value) : null 
            })}
            placeholder="Deixe vazio para ilimitado"
          />
          <div className="text-sm text-gray-600">
            Pedidos atuais: {event.currentOrders}
            {event.maxOrders && (
              <> / {event.maxOrders} 
                ({event.maxOrders - event.currentOrders} restantes)
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
```

### 5. Validações de Negócio

#### 5.1 Regras de status
- **Ativo**: Evento disponível para novos pedidos
- **Inativo**: Evento não visível para clientes (oculto)
- **Fechado para Pedidos**: Evento visível mas não aceita novos pedidos

#### 5.2 Regras de estoque
- Se `stockEnabled = false`: não há limite de pedidos
- Se `stockEnabled = true` e `maxOrders = null`: ilimitado (apenas contagem)
- Se `stockEnabled = true` e `maxOrders > 0`: limite definido
- `currentOrders` é incrementado automaticamente ao criar pedidos
- Pedidos cancelados devem decrementar o `currentOrders`

### 6. Endpoints da API

#### 6.1 Novos endpoints admin
```typescript
// PUT /api/admin/events/:id/status
app.put("/api/admin/events/:id/status", requireAdmin, async (req, res) => {
  const { status } = req.body;
  const eventId = parseInt(req.params.id);
  
  const updatedEvent = await storage.updateEventStatus(eventId, status);
  res.json(updatedEvent);
});

// PUT /api/admin/events/:id/stock
app.put("/api/admin/events/:id/stock", requireAdmin, async (req, res) => {
  const { stockEnabled, maxOrders } = req.body;
  const eventId = parseInt(req.params.id);
  
  const updatedEvent = await storage.updateEventStock(eventId, {
    stockEnabled,
    maxOrders
  });
  res.json(updatedEvent);
});

// GET /api/admin/events/:id/stock-info
app.get("/api/admin/events/:id/stock-info", requireAdmin, async (req, res) => {
  const eventId = parseInt(req.params.id);
  const stockInfo = await storage.getEventStockInfo(eventId);
  res.json(stockInfo);
});
```

### 7. Filtros no Frontend Cliente

#### 7.1 Atualizar listagem de eventos para clientes
```typescript
// Filtrar eventos disponíveis para clientes
const availableEvents = events.filter(event => 
  event.status === 'ativo' && 
  (!event.stockEnabled || !event.maxOrders || event.currentOrders < event.maxOrders)
);
```

### 8. Migrações e Deploy

#### 8.1 Script de migração
```sql
-- migration-event-status-stock.sql
BEGIN;

-- Adicionar novas colunas
ALTER TABLE events ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ativo';
ALTER TABLE events ADD COLUMN IF NOT EXISTS stock_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS max_orders INTEGER;
ALTER TABLE events ADD COLUMN IF NOT EXISTS current_orders INTEGER NOT NULL DEFAULT 0;

-- Migrar dados existentes
UPDATE events SET status = CASE 
  WHEN available = true THEN 'ativo' 
  ELSE 'inativo' 
END WHERE status = 'ativo'; -- Evitar sobrescrever se já foi migrado

-- Calcular current_orders baseado nos pedidos existentes
UPDATE events SET current_orders = (
  SELECT COUNT(*)
  FROM orders 
  WHERE orders."eventId" = events.id 
  AND orders.status NOT IN ('cancelado')
);

COMMIT;
```

### 9. Testes e Validação

#### 9.1 Checklist de testes
- [ ] Criação de eventos com diferentes status
- [ ] Tentativa de pedido em evento inativo (deve falhar)
- [ ] Tentativa de pedido em evento fechado (deve falhar)
- [ ] Criação de pedido quando estoque esgotado (deve falhar)
- [ ] Atualização correta do `current_orders` após pedido
- [ ] Interface admin para alterar status e estoque
- [ ] Filtros corretos na listagem para clientes

### 10. Cronograma de Implementação

#### Fase 1 - Backend (2-3 horas)
1. Atualizar schema e migrations
2. Implementar novos métodos no storage
3. Atualizar endpoints existentes
4. Criar novos endpoints admin

#### Fase 2 - Frontend Admin (2-3 horas)
1. Atualizar interface de eventos
2. Adicionar componentes de status e estoque
3. Integrar com novos endpoints

#### Fase 3 - Frontend Cliente (1 hora)
1. Atualizar filtros de eventos
2. Adicionar mensagens de indisponibilidade

#### Fase 4 - Testes e Ajustes (1 hora)
1. Testes de integração
2. Validações de negócio
3. Ajustes de UX

## Observações Importantes

### Compatibilidade
- Manter coluna `available` por enquanto para compatibilidade
- Implementar migração gradual dos dados
- Adicionar logs para monitorar o comportamento

### Performance
- Indexar coluna `status` para consultas rápidas
- Considerar cache para eventos ativos
- Otimizar consultas de contagem de pedidos

### Segurança
- Validar permissões admin para alterações de status
- Aplicar rate limiting nos endpoints críticos
- Logs de auditoria para mudanças de estoque

### UX/UI
- Indicadores visuais claros de status
- Mensagens explicativas quando eventos indisponíveis
- Feedback em tempo real sobre estoque restante
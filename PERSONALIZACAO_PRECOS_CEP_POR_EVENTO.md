# Personalização de Preços por Zona de CEP por Evento

## 📋 Objetivo
Implementar funcionalidade que permite ao administrador personalizar os preços das zonas de CEP para cada evento individualmente, mantendo o sistema atual de zonas globais como fallback.

## 🎯 Contexto Atual
- Sistema de CEP zones já funcional com preços globais na tabela `cep_zones`
- Eventos podem escolher entre 3 tipos de precificação: `distance`, `fixed`, `cep_zones`
- Necessário adicionar personalização por evento apenas quando tipo = `cep_zones`

## 📊 Implementação Detalhada

### 1. Backend - Nova Tabela

#### 1.1 Atualizar Schema (`shared/schema.ts`)
```typescript
export const eventCepZonePrices = pgTable("event_cep_zone_prices", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  cepZoneId: integer("cep_zone_id").notNull().references(() => cepZones.id, { onDelete: "cascade" }),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Schema de validação
export const insertEventCepZonePriceSchema = createInsertSchema(eventCepZonePrices).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
```

#### 1.2 Executar Migração
```bash
npm run db:push
```

### 2. Backend - API Routes

#### 2.1 Atualizar `server/routes.ts` - CRUD para Eventos

**Buscar preços personalizados para um evento:**
```typescript
// GET /api/events/:id/cep-zone-prices
app.get("/api/events/:id/cep-zone-prices", async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    
    // Buscar zonas ativas
    const zones = await db.select().from(cepZones).where(eq(cepZones.active, true));
    
    // Buscar preços personalizados para este evento
    const customPrices = await db
      .select()
      .from(eventCepZonePrices)
      .where(eq(eventCepZonePrices.eventId, eventId));
    
    // Combinar dados: preço personalizado ou preço padrão da zona
    const result = zones.map(zone => {
      const customPrice = customPrices.find(cp => cp.cepZoneId === zone.id);
      return {
        ...zone,
        currentPrice: customPrice ? customPrice.price : zone.price,
        hasCustomPrice: !!customPrice
      };
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar preços das zonas CEP" });
  }
});
```

**Salvar preços personalizados:**
```typescript
// PUT /api/events/:id/cep-zone-prices
app.put("/api/events/:id/cep-zone-prices", async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const { zonePrices } = req.body; // Array: [{ cepZoneId: 1, price: "25.00" }]
    
    // Verificar se evento usa precificação por CEP zones
    const event = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (!event[0] || event[0].pricingType !== 'cep_zones') {
      return res.status(400).json({ error: "Evento não usa precificação por zonas CEP" });
    }
    
    // Remover preços anteriores
    await db.delete(eventCepZonePrices).where(eq(eventCepZonePrices.eventId, eventId));
    
    // Inserir novos preços
    if (zonePrices && zonePrices.length > 0) {
      await db.insert(eventCepZonePrices).values(
        zonePrices.map(zp => ({
          eventId,
          cepZoneId: zp.cepZoneId,
          price: zp.price
        }))
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Erro ao salvar preços personalizados" });
  }
});
```

#### 2.2 Atualizar Cálculo de Preço CEP

**Modificar `server/cep-zones-calculator.ts`:**
```typescript
export async function calculateCepZonePrice(cep: string, eventId?: number): Promise<number | null> {
  try {
    const cleanCep = cep.replace(/\D/g, '');
    
    // Se eventId fornecido, buscar preço personalizado primeiro
    if (eventId) {
      const customPrice = await db
        .select({
          price: eventCepZonePrices.price,
          zonePriority: cepZones.priority
        })
        .from(eventCepZonePrices)
        .innerJoin(cepZones, eq(cepZones.id, eventCepZonePrices.cepZoneId))
        .where(
          and(
            eq(eventCepZonePrices.eventId, eventId),
            eq(cepZones.active, true)
          )
        )
        .orderBy(cepZones.priority);
      
      for (const zone of customPrice) {
        const ranges = JSON.parse(zone.cepRanges || '[]');
        if (ranges.some(range => cleanCep >= range.start && cleanCep <= range.end)) {
          return parseFloat(zone.price);
        }
      }
    }
    
    // Fallback para preço global das zonas
    const zones = await db
      .select()
      .from(cepZones)
      .where(eq(cepZones.active, true))
      .orderBy(cepZones.priority);
    
    for (const zone of zones) {
      const ranges = JSON.parse(zone.cepRanges || '[]');
      if (ranges.some(range => cleanCep >= range.start && cleanCep <= range.end)) {
        return parseFloat(zone.price);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao calcular preço por CEP:', error);
    return null;
  }
}
```

### 3. Frontend - Interface Admin

#### 3.1 Componente de Preços CEP Personalizados

**Criar `client/src/components/admin/EventCepZonePrices.tsx`:**
```typescript
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';

interface CepZonePrice {
  id: number;
  name: string;
  description: string;
  cepRanges: string;
  currentPrice: string;
  hasCustomPrice: boolean;
}

interface EventCepZonePricesProps {
  eventId: number | null;
  isVisible: boolean;
}

export function EventCepZonePrices({ eventId, isVisible }: EventCepZonePricesProps) {
  const [zonePrices, setZonePrices] = useState<Record<number, string>>({});
  const queryClient = useQueryClient();
  
  const { data: zones, isLoading } = useQuery({
    queryKey: ['/api/events', eventId, 'cep-zone-prices'],
    enabled: isVisible && !!eventId,
  });
  
  const savePricesMutation = useMutation({
    mutationFn: async (prices: Array<{ cepZoneId: number; price: string }>) => {
      return apiRequest(`/api/events/${eventId}/cep-zone-prices`, {
        method: 'PUT',
        body: { zonePrices: prices }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'cep-zone-prices'] });
    }
  });
  
  useEffect(() => {
    if (zones) {
      const initialPrices: Record<number, string> = {};
      zones.forEach((zone: CepZonePrice) => {
        initialPrices[zone.id] = zone.currentPrice;
      });
      setZonePrices(initialPrices);
    }
  }, [zones]);
  
  if (!isVisible) return null;
  
  const handleSave = () => {
    const pricesArray = Object.entries(zonePrices).map(([cepZoneId, price]) => ({
      cepZoneId: parseInt(cepZoneId),
      price
    }));
    savePricesMutation.mutate(pricesArray);
  };
  
  if (isLoading) return <div>Carregando zonas CEP...</div>;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Preços Personalizados por Zona CEP</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {zones?.map((zone: CepZonePrice) => {
          const ranges = JSON.parse(zone.cepRanges || '[]');
          return (
            <div key={zone.id} className="flex items-center gap-4 p-3 border rounded">
              <div className="flex-1">
                <Label className="font-medium">{zone.name}</Label>
                <p className="text-sm text-muted-foreground">
                  {ranges.map((r: any, i: number) => 
                    `${r.start}-${r.end}`
                  ).join(', ')}
                </p>
              </div>
              <div className="w-32">
                <Label htmlFor={`price-${zone.id}`}>Preço (R$)</Label>
                <Input
                  id={`price-${zone.id}`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={zonePrices[zone.id] || ''}
                  onChange={(e) => setZonePrices(prev => ({
                    ...prev,
                    [zone.id]: e.target.value
                  }))}
                  placeholder="0.00"
                />
              </div>
            </div>
          );
        })}
        
        <Button 
          onClick={handleSave} 
          disabled={savePricesMutation.isPending}
          className="w-full"
        >
          {savePricesMutation.isPending ? 'Salvando...' : 'Salvar Preços Personalizados'}
        </Button>
      </CardContent>
    </Card>
  );
}
```

#### 3.2 Integrar no Formulário de Eventos

**Modificar `client/src/components/admin/EventForm.tsx`:**
```typescript
import { EventCepZonePrices } from './EventCepZonePrices';

// Dentro do componente EventForm, adicionar:
const [showCepZonePrices, setShowCepZonePrices] = useState(false);

// Observar mudanças no tipo de precificação
const pricingType = form.watch('pricingType');
useEffect(() => {
  setShowCepZonePrices(pricingType === 'cep_zones');
}, [pricingType]);

// Adicionar após os campos existentes:
<EventCepZonePrices 
  eventId={eventId} 
  isVisible={showCepZonePrices} 
/>
```

### 4. Frontend - Cliente (Cálculo de Preço)

#### 4.1 Atualizar Hook de Cálculo de Preço

**Modificar `client/src/hooks/usePriceCalculation.ts`:**
```typescript
// Atualizar a função que calcula preço por CEP para incluir eventId
const calculateCepZonePrice = async (cep: string, eventId: number) => {
  const response = await fetch(`/api/calculate-cep-price?cep=${cep}&eventId=${eventId}`);
  if (!response.ok) throw new Error('Erro ao calcular preço por CEP');
  return response.json();
};
```

#### 4.2 Atualizar Endpoint de Cálculo

**Adicionar em `server/routes.ts`:**
```typescript
// GET /api/calculate-cep-price?cep=58000000&eventId=1
app.get("/api/calculate-cep-price", async (req, res) => {
  try {
    const { cep, eventId } = req.query;
    
    if (!cep) {
      return res.status(400).json({ error: "CEP é obrigatório" });
    }
    
    const price = await calculateCepZonePrice(
      cep as string, 
      eventId ? parseInt(eventId as string) : undefined
    );
    
    if (price === null) {
      return res.status(404).json({ error: "CEP não atendido" });
    }
    
    res.json({ price: price.toFixed(2) });
  } catch (error) {
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});
```

### 5. Atualizar Storage Interface

**Modificar `server/storage.ts`:**
```typescript
// Adicionar métodos para event_cep_zone_prices
interface IStorage {
  // ... métodos existentes
  
  // Event CEP Zone Prices
  getEventCepZonePrices(eventId: number): Promise<any[]>;
  saveEventCepZonePrices(eventId: number, zonePrices: any[]): Promise<void>;
  deleteEventCepZonePrices(eventId: number): Promise<void>;
}
```

## 📝 Checklist de Implementação

### Backend
- [ ] Criar tabela `event_cep_zone_prices` no schema
- [ ] Executar `npm run db:push` para aplicar mudanças
- [ ] Implementar rota GET `/api/events/:id/cep-zone-prices`
- [ ] Implementar rota PUT `/api/events/:id/cep-zone-prices`
- [ ] Atualizar `calculateCepZonePrice()` para suportar eventId
- [ ] Adicionar rota `/api/calculate-cep-price` com suporte a eventId
- [ ] Atualizar interface de storage

### Frontend Admin
- [ ] Criar componente `EventCepZonePrices`
- [ ] Integrar componente no formulário de eventos
- [ ] Implementar lógica de exibição condicional (apenas para pricing_type = 'cep_zones')
- [ ] Adicionar validação de formulário
- [ ] Implementar feedback visual (loading, erro, sucesso)

### Frontend Cliente
- [ ] Atualizar hook de cálculo de preço para incluir eventId
- [ ] Atualizar chamadas API para incluir eventId quando disponível
- [ ] Testar fluxo completo de cálculo de preço

### Testes
- [ ] Testar criação de evento com preços personalizados
- [ ] Testar edição de evento com alteração de pricing_type
- [ ] Testar cálculo de preço no frontend com preços personalizados
- [ ] Testar fallback para preços globais quando não há personalização
- [ ] Testar exclusão de preços ao mudar tipo de precificação

## 🔍 Pontos de Atenção

1. **Cascata de Exclusão**: A tabela tem `onDelete: "cascade"` para limpar preços quando evento/zona for excluído
2. **Validação**: Sempre verificar se `pricingType === 'cep_zones'` antes de salvar/exibir preços personalizados
3. **Performance**: Considerar cache para consultas frequentes de preços
4. **UX**: Preços devem ser pré-preenchidos com valores das zonas globais
5. **Fallback**: Sistema deve funcionar normalmente mesmo sem preços personalizados

## 🚀 Próximos Passos

1. Implementar backend (schema + routes)
2. Executar migração do banco
3. Criar componente frontend
4. Integrar no formulário de eventos
5. Atualizar sistema de cálculo de preços
6. Testar fluxo completo
7. Documentar mudanças no `replit.md`
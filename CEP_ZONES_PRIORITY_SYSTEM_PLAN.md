# Sistema de Precificação CEP com Prioridades - Plano de Implementação

## 📋 Visão Geral
Implementar sistema de prioridades para zonas CEP permitindo sobreposições controladas, onde a primeira zona correspondente por ordem de prioridade será utilizada para precificação.

## 🎯 Objetivo
Permitir zonas com faixas de CEP sobrepostas usando sistema de prioridades, criando flexibilidade para:
- Zonas específicas (alta prioridade)
- Zonas gerais como fallback (baixa prioridade)
- Precificação escalonada por região

## 📊 Exemplo do Sistema
```
Zona 1 (prioridade 1) → CEPs 58000-000 a 58030-000 → R$12,00
Zona 2 (prioridade 2) → CEPs 58000-000 a 58099-999 → R$15,00

CEP 58020-000 → retorna Zona 1 (R$12,00)
CEP 58090-000 → retorna Zona 2 (R$15,00)
CEP fora de todas → erro
```

---

## 🗄️ 1. ALTERAÇÕES NO BANCO DE DADOS

### 1.1 Migração da Tabela `cep_zones`
```sql
-- Adicionar campo de prioridade
ALTER TABLE cep_zones ADD COLUMN priority INTEGER DEFAULT 1;

-- Criar índice para otimizar consultas por prioridade
CREATE INDEX idx_cep_zones_priority ON cep_zones(priority);

-- Atualizar zonas existentes com prioridades sequenciais
UPDATE cep_zones SET priority = id WHERE priority IS NULL;
```

### 1.2 Schema Drizzle Atualizado
**Arquivo: `shared/schema.ts`**
```typescript
export const cepZones = pgTable('cep_zones', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  ranges: json('ranges').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  priority: integer('priority').notNull().default(1), // NOVO CAMPO
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

---

## 🔧 2. ALTERAÇÕES NO BACKEND

### 2.1 Lógica de Busca de Preço Atualizada
**Arquivo: `server/routes.ts`**

#### Função de Busca por CEP com Prioridade
```typescript
async function findZoneByCep(cep: string): Promise<{ zone: CepZone; price: number } | null> {
  // Buscar todas as zonas ordenadas por prioridade (ASC = menor número = maior prioridade)
  const zones = await db
    .select()
    .from(cepZones)
    .orderBy(asc(cepZones.priority));

  // Percorrer zonas em ordem de prioridade
  for (const zone of zones) {
    const ranges = zone.ranges as Array<{ start: string; end: string }>;
    
    // Verificar se CEP está dentro de alguma faixa da zona
    for (const range of ranges) {
      if (isCepInRange(cep, range.start, range.end)) {
        return {
          zone,
          price: parseFloat(zone.price)
        };
      }
    }
  }
  
  return null; // Nenhuma zona encontrada
}
```

#### Endpoint de Precificação Atualizado
```typescript
// GET /api/pricing/cep/:cep
app.get('/api/pricing/cep/:cep', async (req, res) => {
  try {
    const { cep } = req.params;
    const cleanCep = cep.replace(/\D/g, '');
    
    const result = await findZoneByCep(cleanCep);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'CEP não encontrado em nenhuma zona de entrega'
      });
    }
    
    res.json({
      success: true,
      zone: result.zone.name,
      price: result.price,
      priority: result.zone.priority
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao consultar precificação'
    });
  }
});
```

### 2.2 CRUD de Zonas CEP Atualizado

#### Remover Validação de Sobreposição
```typescript
// POST /api/admin/cep-zones - ATUALIZADO
app.post('/api/admin/cep-zones', adminAuth, async (req, res) => {
  try {
    const { name, ranges, price, priority = 1 } = req.body;
    
    // Validações básicas (SEM verificação de sobreposição)
    if (!name || !ranges || !price) {
      return res.status(400).json({
        success: false,
        message: 'Nome, faixas de CEP e preço são obrigatórios'
      });
    }
    
    // Verificar se priority é válido
    if (priority < 1) {
      return res.status(400).json({
        success: false,
        message: 'Prioridade deve ser maior que 0'
      });
    }
    
    const [zone] = await db
      .insert(cepZones)
      .values({ name, ranges, price, priority })
      .returning();
    
    res.status(201).json({
      success: true,
      zone
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao criar zona CEP'
    });
  }
});
```

#### Endpoint para Reordenar Prioridades
```typescript
// PUT /api/admin/cep-zones/reorder - NOVO
app.put('/api/admin/cep-zones/reorder', adminAuth, async (req, res) => {
  try {
    const { zones } = req.body; // Array de { id, priority }
    
    // Atualizar prioridades em lote
    for (const zone of zones) {
      await db
        .update(cepZones)
        .set({ priority: zone.priority })
        .where(eq(cepZones.id, zone.id));
    }
    
    res.json({
      success: true,
      message: 'Prioridades atualizadas com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao reordenar zonas'
    });
  }
});
```

---

## 🎨 3. ALTERAÇÕES NO FRONTEND

### 3.1 Componente de Gerenciamento de Zonas
**Arquivo: `client/src/pages/admin/cep-zones.tsx`**

#### Interface Atualizada
```typescript
interface CepZone {
  id: number;
  name: string;
  ranges: Array<{ start: string; end: string }>;
  price: string;
  priority: number; // NOVO CAMPO
  createdAt: string;
}
```

#### Formulário com Campo de Prioridade
```tsx
function CepZoneForm() {
  const [formData, setFormData] = useState({
    name: '',
    ranges: [{ start: '', end: '' }],
    price: '',
    priority: 1 // NOVO CAMPO
  });

  return (
    <form>
      {/* Campos existentes... */}
      
      <div>
        <Label htmlFor="priority">Prioridade</Label>
        <Input
          id="priority"
          type="number"
          min="1"
          value={formData.priority}
          onChange={(e) => setFormData({
            ...formData,
            priority: parseInt(e.target.value) || 1
          })}
        />
        <p className="text-sm text-muted-foreground">
          Menor número = maior prioridade (1 = prioridade máxima)
        </p>
      </div>
    </form>
  );
}
```

#### Lista com Controles de Reordenação
```tsx
function CepZoneList() {
  const [zones, setZones] = useState<CepZone[]>([]);
  
  const moveZone = (fromIndex: number, toIndex: number) => {
    const newZones = [...zones];
    const [moved] = newZones.splice(fromIndex, 1);
    newZones.splice(toIndex, 0, moved);
    
    // Atualizar prioridades baseadas na nova ordem
    const updatedZones = newZones.map((zone, index) => ({
      ...zone,
      priority: index + 1
    }));
    
    setZones(updatedZones);
    updatePriorities(updatedZones);
  };
  
  const updatePriorities = async (zones: CepZone[]) => {
    const updates = zones.map(zone => ({
      id: zone.id,
      priority: zone.priority
    }));
    
    await fetch('/api/admin/cep-zones/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zones: updates })
    });
  };
  
  return (
    <div className="space-y-4">
      {zones
        .sort((a, b) => a.priority - b.priority)
        .map((zone, index) => (
          <Card key={zone.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{zone.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Prioridade: {zone.priority} | Preço: R$ {zone.price}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => moveZone(index, Math.max(0, index - 1))}
                  disabled={index === 0}
                >
                  ↑ Subir
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => moveZone(index, Math.min(zones.length - 1, index + 1))}
                  disabled={index === zones.length - 1}
                >
                  ↓ Descer
                </Button>
              </div>
            </div>
          </Card>
        ))}
    </div>
  );
}
```

### 3.2 Indicadores Visuais
```tsx
function PriorityIndicator({ priority }: { priority: number }) {
  const getPriorityColor = (p: number) => {
    if (p === 1) return 'bg-red-100 text-red-800'; // Alta prioridade
    if (p <= 3) return 'bg-yellow-100 text-yellow-800'; // Média prioridade
    return 'bg-green-100 text-green-800'; // Baixa prioridade
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(priority)}`}>
      Prioridade {priority}
    </span>
  );
}
```

---

## 🧪 4. TESTES E VALIDAÇÃO

### 4.1 Cenários de Teste
```typescript
// Teste da lógica de prioridades
describe('CEP Zones Priority System', () => {
  test('should return highest priority zone for overlapping ranges', async () => {
    // Zone 1: 58000-000 to 58099-999, priority 1, price 15.00
    // Zone 2: 58000-000 to 58030-000, priority 2, price 12.00
    
    const result = await findZoneByCep('58020000');
    expect(result?.zone.priority).toBe(1);
    expect(result?.price).toBe(15.00);
  });
  
  test('should fallback to lower priority zone', async () => {
    const result = await findZoneByCep('58090000');
    expect(result?.zone.priority).toBe(2);
    expect(result?.price).toBe(12.00);
  });
  
  test('should return null for unmatched CEP', async () => {
    const result = await findZoneByCep('59000000');
    expect(result).toBeNull();
  });
});
```

### 4.2 Dados de Teste
```sql
-- Inserir zonas de teste com sobreposições
INSERT INTO cep_zones (name, ranges, price, priority) VALUES
('João Pessoa Centro Específico', '[{"start": "58000-000", "end": "58030-000"}]', 12.00, 1),
('João Pessoa Geral', '[{"start": "58000-000", "end": "58099-999"}]', 15.00, 2),
('Paraíba Fallback', '[{"start": "58000-000", "end": "58999-999"}]', 25.00, 3);
```

---

## ⚠️ 5. ALERTAS E VALIDAÇÕES

### 5.1 Aviso de Ambiguidade
```tsx
function OverlapWarning({ zones }: { zones: CepZone[] }) {
  const conflictingZones = zones.filter((zone, index) => 
    zones.some((other, otherIndex) => 
      index !== otherIndex && 
      zone.priority === other.priority &&
      hasRangeOverlap(zone.ranges, other.ranges)
    )
  );
  
  if (conflictingZones.length === 0) return null;
  
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Conflito de Prioridades</AlertTitle>
      <AlertDescription>
        Algumas zonas têm a mesma prioridade e faixas sobrepostas. 
        Isso pode causar comportamento imprevisível.
      </AlertDescription>
    </Alert>
  );
}
```

---

## 📋 6. CHECKLIST DE IMPLEMENTAÇÃO

### 6.1 Banco de Dados
- [ ] Adicionar campo `priority` na tabela `cep_zones`
- [ ] Criar índice para otimização de consultas
- [ ] Atualizar zonas existentes com prioridades
- [ ] Atualizar schema Drizzle

### 6.2 Backend
- [ ] Remover validação de sobreposição no cadastro
- [ ] Implementar nova lógica de busca por prioridade
- [ ] Atualizar endpoints CRUD existentes
- [ ] Criar endpoint de reordenação de prioridades
- [ ] Atualizar endpoint de precificação

### 6.3 Frontend
- [ ] Adicionar campo de prioridade no formulário
- [ ] Implementar controles de reordenação (subir/descer)
- [ ] Adicionar indicadores visuais de prioridade
- [ ] Implementar avisos de conflito
- [ ] Atualizar listagem ordenada por prioridade

### 6.4 Testes
- [ ] Testes unitários da lógica de prioridades
- [ ] Testes de integração com dados sobrepostos
- [ ] Testes de performance com muitas zonas
- [ ] Validação da interface administrativa

### 6.5 Migração
- [ ] Script de migração para dados existentes
- [ ] Backup antes da implementação
- [ ] Validação pós-migração
- [ ] Documentação para usuários

---

## 🚀 7. CRONOGRAMA ESTIMADO

### Fase 1: Backend (2-3 horas)
1. Migração do banco de dados
2. Atualização da lógica de precificação
3. Novos endpoints de API

### Fase 2: Frontend (2-3 horas)
1. Atualização dos formulários
2. Controles de reordenação
3. Indicadores visuais

### Fase 3: Testes e Refinamentos (1-2 horas)
1. Testes funcionais
2. Ajustes de UX
3. Documentação

**Total Estimado: 5-8 horas**

---

## 📚 8. BENEFÍCIOS ESPERADOS

1. **Flexibilidade**: Zonas específicas com fallbacks gerais
2. **Escalabilidade**: Sistema suporta hierarquias complexas de preços
3. **Manutenibilidade**: Interface intuitiva para gerenciar prioridades
4. **Performance**: Busca otimizada por prioridade
5. **Compatibilidade**: Migração transparente dos dados existentes

---

## 🔄 9. COMPATIBILIDADE REVERSA

- Zonas existentes receberão prioridade baseada no ID (automático)
- API mantém endpoints existentes funcionando
- Interface administrativa preserva funcionalidades atuais
- Comportamento atual mantido para casos sem sobreposição
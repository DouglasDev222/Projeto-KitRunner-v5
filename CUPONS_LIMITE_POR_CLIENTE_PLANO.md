# Plano: Implementação de Limite de Uso Por Cliente nos Cupons

## Objetivo
Adicionar funcionalidade que permite limitar quantas vezes cada cliente específico pode usar um cupom, além do limite global já existente.

## Situação Atual
O sistema de cupons possui:
- ✅ Limite global de uso (`usageLimit` e `usageCount`)
- ✅ Validações por evento e zona de CEP
- ✅ Validações de período de validade
- ✅ Interface administrativa completa

## Nova Funcionalidade Requerida
- Permitir configurar limite por cliente (ex: cada cliente pode usar 3 vezes)
- Rastrear uso individual de cada cliente
- Validar na aplicação do cupom se cliente ainda pode usar
- Interface no modal admin para configurar esta opção

## Implementação Detalhada

### 1. Mudanças no Banco de Dados

#### 1.1. Nova Tabela: `coupon_usages`
```sql
CREATE TABLE coupon_usages (
  id SERIAL PRIMARY KEY,
  coupon_id INTEGER NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  used_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(coupon_id, order_id)
);

CREATE INDEX idx_coupon_usages_coupon_customer ON coupon_usages(coupon_id, customer_id);
```

#### 1.2. Novos Campos na Tabela `coupons`
```sql
ALTER TABLE coupons ADD COLUMN per_customer_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE coupons ADD COLUMN per_customer_limit INTEGER;
```

### 2. Mudanças no Schema (shared/schema.ts)

#### 2.1. Nova tabela couponUsages
```typescript
export const couponUsages = pgTable("coupon_usages", {
  id: serial("id").primaryKey(),
  couponId: integer("coupon_id").notNull().references(() => coupons.id, { onDelete: "cascade" }),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  usedAt: timestamp("used_at").notNull().defaultNow(),
});
```

#### 2.2. Campos adicionais em coupons
```typescript
export const coupons = pgTable("coupons", {
  // ... campos existentes
  perCustomerEnabled: boolean("per_customer_enabled").notNull().default(false),
  perCustomerLimit: integer("per_customer_limit"), // null = sem limite por cliente
  // ... outros campos
});
```

#### 2.3. Schemas de validação
```typescript
export const insertCouponUsageSchema = createInsertSchema(couponUsages).omit({ 
  id: true, 
  usedAt: true 
});

// Atualizar adminCouponSchema para incluir novos campos
export const adminCouponSchema = z.object({
  // ... campos existentes
  perCustomerEnabled: z.boolean().optional(),
  perCustomerLimit: z.number().int().min(1).nullable().optional(),
});
```

### 3. Mudanças no Backend

#### 3.1. CouponService - Nova validação de uso por cliente
```typescript
/**
 * Verifica quantas vezes um cliente usou um cupom específico
 */
static async getCustomerCouponUsageCount(couponId: number, customerId: number): Promise<number> {
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(couponUsages)
    .where(and(
      eq(couponUsages.couponId, couponId),
      eq(couponUsages.customerId, customerId)
    ));
  
  return result[0]?.count || 0;
}

/**
 * Registra uso de cupom por cliente
 */
static async recordCouponUsage(couponId: number, customerId: number, orderId: number): Promise<boolean> {
  try {
    await db.insert(couponUsages).values({
      couponId,
      customerId, 
      orderId
    });
    return true;
  } catch (error) {
    console.error("Erro ao registrar uso do cupom:", error);
    return false;
  }
}
```

#### 3.2. Modificar validateCoupon para incluir validação por cliente
```typescript
// Adicionar customerId no CouponValidationRequest
export interface CouponValidationRequest {
  code: string;
  eventId: number;
  totalAmount: number;
  customerId: number; // NOVO CAMPO
  customerZipCode?: string;
}

// Na função validateCoupon, após as validações existentes:
// Verificar limite por cliente se habilitado
if (couponData.perCustomerEnabled && couponData.perCustomerLimit) {
  const customerUsageCount = await this.getCustomerCouponUsageCount(couponData.id, customerId);
  if (customerUsageCount >= couponData.perCustomerLimit) {
    return {
      valid: false,
      message: `Você já utilizou este cupom ${couponData.perCustomerLimit} vez(es), que é o limite permitido`
    };
  }
}
```

#### 3.3. Modificar incrementUsage para registrar uso por cliente
```typescript
static async incrementUsage(couponCode: string, customerId: number, orderId: number): Promise<boolean> {
  try {
    // Buscar cupom para pegar ID
    const coupon = await db
      .select({ id: coupons.id, perCustomerEnabled: coupons.perCustomerEnabled })
      .from(coupons)
      .where(sql`LOWER(${coupons.code}) = LOWER(${couponCode})`)
      .limit(1);

    if (coupon.length === 0) return false;

    // Incrementar contador global
    await db
      .update(coupons)
      .set({ usageCount: sql`${coupons.usageCount} + 1` })
      .where(sql`LOWER(${coupons.code}) = LOWER(${couponCode})`);

    // Registrar uso por cliente se habilitado
    if (coupon[0].perCustomerEnabled) {
      await this.recordCouponUsage(coupon[0].id, customerId, orderId);
    }

    return true;
  } catch (error) {
    console.error("Erro ao incrementar uso do cupom:", error);
    return false;
  }
}
```

### 4. Mudanças no Frontend

#### 4.1. Atualizar Interface Coupon
```typescript
interface Coupon {
  // ... campos existentes
  perCustomerEnabled?: boolean;
  perCustomerLimit?: number;
}
```

#### 4.2. CouponModal - Adicionar campos para limite por cliente
```typescript
const [formData, setFormData] = useState({
  // ... campos existentes
  perCustomerEnabled: false,
  perCustomerLimit: ''
});

// No JSX, adicionar após o campo usageLimit:
<div className="space-y-2">
  <div className="flex items-center space-x-2">
    <Switch
      id="perCustomerEnabled"
      checked={formData.perCustomerEnabled}
      onCheckedChange={(checked) =>
        setFormData(prev => ({ ...prev, perCustomerEnabled: checked }))
      }
    />
    <Label htmlFor="perCustomerEnabled">Limitar uso por cliente</Label>
  </div>
  
  {formData.perCustomerEnabled && (
    <div className="space-y-2">
      <Label htmlFor="perCustomerLimit">Limite por cliente</Label>
      <Input
        id="perCustomerLimit"
        type="number"
        min="1"
        value={formData.perCustomerLimit}
        onChange={(e) =>
          setFormData(prev => ({ ...prev, perCustomerLimit: e.target.value }))
        }
        placeholder="Quantas vezes cada cliente pode usar"
      />
    </div>
  )}
</div>
```

#### 4.3. Atualizar CouponInput para passar customerId
```typescript
// Modificar chamada da API de validação para incluir customerId
const response = await apiRequest('POST', '/api/coupons/validate', {
  code: couponCode,
  eventId,
  totalAmount,
  customerId: currentUser?.id, // Assumindo que existe um contexto de usuário
  customerZipCode
});
```

### 5. Mudanças nas Rotas da API
Atualizar rotas de cupons para aceitar e processar novos campos:
- `POST /api/admin/coupons` - aceitar perCustomerEnabled e perCustomerLimit
- `PUT /api/admin/coupons/:id` - aceitar perCustomerEnabled e perCustomerLimit  
- `POST /api/coupons/validate` - aceitar customerId
- Chamar incrementUsage com customerId e orderId nos fluxos de pagamento

### 6. Exibição na Interface Admin
Na página de listagem de cupons (`client/src/pages/admin/coupons.tsx`), exibir informação sobre limite por cliente:

```typescript
{coupon.perCustomerEnabled && coupon.perCustomerLimit && (
  <div>
    <span className="text-muted-foreground">Limite por cliente: </span>
    <span className="font-medium">{coupon.perCustomerLimit}</span>
  </div>
)}
```

## Checklist de Implementação

### Database & Schema
- [ ] Criar nova tabela `coupon_usages`  
- [ ] Adicionar campos `per_customer_enabled` e `per_customer_limit` à tabela `coupons`
- [ ] Atualizar schema.ts com nova tabela e campos
- [ ] Atualizar schemas de validação Zod
- [ ] Executar migration no banco

### Backend (CouponService)
- [ ] Adicionar método `getCustomerCouponUsageCount`
- [ ] Adicionar método `recordCouponUsage`  
- [ ] Modificar interface `CouponValidationRequest` para incluir `customerId`
- [ ] Atualizar `validateCoupon` para validar limite por cliente
- [ ] Modificar `incrementUsage` para registrar uso por cliente
- [ ] Testar validações no backend

### Frontend (CouponModal)
- [ ] Atualizar interface `Coupon` com novos campos
- [ ] Adicionar campos no estado do formulário
- [ ] Adicionar Switch para habilitar limite por cliente
- [ ] Adicionar Input para definir quantidade limite
- [ ] Atualizar lógica de inicialização do formulário
- [ ] Atualizar validações do formulário

### Frontend (Outros Componentes)
- [ ] Atualizar `CouponInput` para passar `customerId`
- [ ] Exibir informação de limite por cliente na listagem admin
- [ ] Testar interface de criação/edição
- [ ] Testar aplicação de cupons com limite

### Integração & Testes
- [ ] Testar fluxo completo: criar cupom → aplicar → validar limite
- [ ] Testar edge cases (cliente sem cupons, limite zerado, etc.)
- [ ] Verificar se contador global ainda funciona
- [ ] Validar comportamento quando limite por cliente é desabilitado
- [ ] Testar diferentes cenários de uso simultâneo

### Finalizações
- [ ] Verificar se todas as funções estão funcionando
- [ ] Limpar código de debug/console.logs
- [ ] Documentar alterações no código
- [ ] Marcar tarefa como concluída

## Notas de Implementação

1. **Compatibilidade**: A implementação é totalmente compatível com cupons existentes (per_customer_enabled = false por padrão)

2. **Performance**: Índice criado em `coupon_usages(coupon_id, customer_id)` para consultas rápidas

3. **Integridade**: Uso de foreign keys e constraints para manter consistência dos dados

4. **UX**: Interface intuitiva com switch para habilitar/desabilitar e input condicional para quantidade

5. **Validação**: Múltiplas camadas de validação (frontend, backend, database)

## Estimativa de Tempo
- Database/Schema: 30 min
- Backend: 1h  
- Frontend: 1h
- Testes/Integração: 30 min
- **Total: ~3 horas**

Este plano garante uma implementação robusta, segura e user-friendly da funcionalidade de limite de uso por cliente nos cupons.
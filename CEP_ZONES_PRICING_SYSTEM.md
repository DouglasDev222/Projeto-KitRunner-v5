# Sistema de Precificação por Faixas de CEP - KitRunner

## 📋 Visão Geral

Este documento define a implementação de um novo sistema de precificação baseado em faixas de CEP para o KitRunner. O sistema permitirá que administradores configurem zonas de entrega com preços fixos por faixa de CEP, oferecendo maior controle e previsibilidade nos custos de entrega.

### 🎯 Objetivos
- **Flexibilidade**: Permitir precificação customizada por região geográfica
- **Simplicidade**: Interface amigável para configuração de zonas pelo admin
- **Transparência**: Cliente visualiza zona e preço claro antes de finalizar pedido
- **Compatibilidade**: Manter sistema atual funcionando, apenas adicionar nova opção

### 🔄 Integração com Sistema Atual
- ✅ **Manter**: Calculadora por distância (`distance-calculator.ts`)
- ✅ **Manter**: Preço fixo por evento
- ➕ **Adicionar**: Nova opção "Faixas de CEP" na criação de eventos

---

## 🏗️ Arquitetura do Sistema

### Tipos de Precificação Disponíveis:
1. **Por Distância** (atual) - Calcula baseado em coordenadas geográficas
2. **Preço Fixo** (atual) - Valor único para todo o evento
3. **Faixas de CEP** (novo) - Valor por zona configurável

### Fluxo de Funcionamento:
```
Admin cria evento → Escolhe "Faixas de CEP" → 
Cliente insere endereço → Sistema identifica zona → 
Aplica preço da zona → Exibe nome da zona + valor
```

---

## 🗄️ Estrutura de Dados

### Nova Tabela: `cep_zones`
```sql
CREATE TABLE cep_zones (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,              -- Ex: "João Pessoa Z1", "Bayeux Centro"
  description TEXT,                        -- Descrição opcional da zona
  cep_start VARCHAR(8) NOT NULL,           -- Ex: "58000000"
  cep_end VARCHAR(8) NOT NULL,             -- Ex: "58299999"
  price DECIMAL(10,2) NOT NULL,            -- Ex: 20.00
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Modificação Tabela: `events`
```sql
ALTER TABLE events ADD COLUMN pricing_type VARCHAR(20) DEFAULT 'distance';
-- Valores possíveis: 'distance', 'fixed', 'cep_zones'
```

### Índices para Performance:
```sql
CREATE INDEX idx_cep_zones_range ON cep_zones (cep_start, cep_end);
CREATE INDEX idx_cep_zones_active ON cep_zones (active);
CREATE INDEX idx_events_pricing_type ON events (pricing_type);
```

---

## 🔧 Componentes Backend

### 1. Novo Serviço: `cep-zones-calculator.ts`
```typescript
export interface CepZoneCalculation {
  zoneName: string;
  zoneId: number;
  deliveryCost: number;
  found: boolean;
}

export function findCepZone(zipCode: string): Promise<CepZoneCalculation>
export function calculateCepZoneDelivery(zipCode: string): Promise<CepZoneCalculation>
export function validateCepInZone(zipCode: string, zoneId: number): boolean
```

### 2. CRUD para Zonas CEP: `routes/cep-zones.ts`
- `GET /api/admin/cep-zones` - Listar zonas
- `POST /api/admin/cep-zones` - Criar zona
- `PUT /api/admin/cep-zones/:id` - Editar zona
- `DELETE /api/admin/cep-zones/:id` - Deletar zona
- `GET /api/cep-zones/check/:zipCode` - Verificar zona para CEP (público)

### 3. Modificações em `routes.ts`
- **Criação de Pedido**: Integrar lógica de faixas de CEP
- **Calculadora de Preço**: Adicionar novo tipo de cálculo
- **Validação**: Verificar se evento usa faixas e se CEP está coberto

### 4. Atualização `storage.ts`
```typescript
// Novos métodos para zona CEP
createCepZone(data: InsertCepZone): Promise<CepZone>
getCepZones(): Promise<CepZone[]>
getCepZoneById(id: number): Promise<CepZone | null>
updateCepZone(id: number, data: Partial<CepZone>): Promise<CepZone>
deleteCepZone(id: number): Promise<void>
findCepZoneByZipCode(zipCode: string): Promise<CepZone | null>
```

---

## 🎨 Componentes Frontend

### 1. Nova Página Admin: `admin-cep-zones.tsx`
**Localização**: `client/src/pages/admin-cep-zones.tsx`

**Funcionalidades**:
- ✅ Listar todas as zonas configuradas
- ✅ Formulário para criar nova zona
- ✅ Editar zona existente
- ✅ Desativar/reativar zonas
- ✅ Validação de sobreposição de faixas
- ✅ Preview de CEPs cobertos por zona

**Layout**:
```
[Cabeçalho] Configuração de Zonas de CEP
[Botão] + Nova Zona

[Tabela]
Nome         | Faixa CEP          | Preço   | Status | Ações
João Pessoa Z1| 58000-000 - 58099-999 | R$ 20,00| Ativo  | [Editar][Excluir]
Bayeux Centro | 58300-000 - 58399-999 | R$ 15,00| Ativo  | [Editar][Excluir]
```

### 2. Formulário Zona: `cep-zone-form.tsx`
**Componente reutilizável para criar/editar zonas**

**Campos**:
- Nome da zona (texto, obrigatório)
- Descrição (texto, opcional)
- CEP inicial (8 dígitos, obrigatório)
- CEP final (8 dígitos, obrigatório)
- Preço (decimal, obrigatório)
- Status ativo/inativo

**Validações**:
- CEP inicial menor que CEP final
- Faixa não sobrepõe outras zonas ativas
- Preço maior que zero
- Nome único por zona

### 3. Modificar: `admin-event-form.tsx` & `admin-event-edit.tsx`
**Adicionar nova opção de precificação**:
```tsx
<SelectContent>
  <SelectItem value="distance">Calculado por Distância</SelectItem>
  <SelectItem value="fixed">Preço Fixo</SelectItem>
  <SelectItem value="cep_zones">Faixas de CEP</SelectItem>
</SelectContent>
```

**Condicional para faixas de CEP**:
```tsx
{watchPricingType === "cep_zones" && (
  <div className="bg-blue-50 p-4 rounded-lg">
    <p className="text-sm text-blue-700">
      As zonas de CEP configuradas serão usadas para calcular o preço da entrega.
      <Link to="/admin/cep-zones" className="underline ml-1">
        Gerenciar zonas →
      </Link>
    </p>
  </div>
)}
```

### 4. Atualizar: `pricing-calculator.ts`
**Adicionar lógica para faixas de CEP**:
```typescript
export async function calculatePricingWithCepZones({
  event,
  kitQuantity,
  zipCode,
  discountAmount = 0
}: PricingCalculatorPropsWithCep): Promise<PricingBreakdown & { zoneName?: string }>
```

### 5. Menu Administrativo: `admin-layout.tsx`
**Adicionar submenu "Configurações"**:
```tsx
<div className="px-4 py-2">
  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
    Configurações
  </h3>
  <nav className="mt-2 space-y-1">
    <AdminNavLink href="/admin/cep-zones" icon={MapPin}>
      Zonas de Entrega
    </AdminNavLink>
    {/* Futuras configurações */}
  </nav>
</div>
```

---

## 🔄 Lógica de Negócio

### Algoritmo de Identificação de Zona
```typescript
function findCepZone(zipCode: string): CepZone | null {
  const cleanZip = zipCode.replace(/\D/g, '').padStart(8, '0');
  
  // Buscar zona onde cep_start <= zipCode <= cep_end
  const zone = await storage.findCepZoneByZipCode(cleanZip);
  
  return zone;
}
```

### Precificação Integrada
```typescript
function calculateDeliveryCostForEvent(event: Event, zipCode: string) {
  switch (event.pricingType) {
    case 'fixed':
      return { cost: Number(event.fixedPrice), type: 'fixed' };
    
    case 'distance':
      return calculateDeliveryCost(event.pickupZipCode, zipCode);
    
    case 'cep_zones':
      const zone = findCepZone(zipCode);
      if (!zone) {
        throw new Error('CEP não atendido para este evento');
      }
      return { 
        cost: zone.price, 
        type: 'cep_zone',
        zoneName: zone.name,
        zoneId: zone.id 
      };
    
    default:
      throw new Error('Tipo de precificação inválido');
  }
}
```

### Experiência do Cliente
1. **Seleção de Endereço**: Cliente escolhe/cadastra endereço
2. **Identificação Automática**: Sistema identifica zona baseada no CEP
3. **Exibição Clara**: Mostra "Entrega para João Pessoa Z1: R$ 20,00"
4. **Tratamento CEP Não Reconhecido**: 
   - Erro amigável após seleção de endereço
   - Mensagem: "CEP não reconhecido ou não atendemos essa área ainda"
   - Link direto para WhatsApp: (83) 8130-2961
   - URL: `https://wa.me/5583981302961?text=Olá! Meu CEP ${cep} não foi reconhecido no sistema. Vocês atendem essa região?`

#### Componente de Erro para CEP Não Atendido
```tsx
interface CepNotCoveredAlertProps {
  zipCode: string;
  eventName: string;
}

function CepNotCoveredAlert({ zipCode, eventName }: CepNotCoveredAlertProps) {
  const whatsappMessage = `Olá! Meu CEP ${zipCode} não foi reconhecido no sistema para o evento "${eventName}". Vocês atendem essa região?`;
  const whatsappUrl = `https://wa.me/5583981302961?text=${encodeURIComponent(whatsappMessage)}`;
  
  return (
    <Alert className="border-orange-200 bg-orange-50">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-800">CEP não reconhecido</AlertTitle>
      <AlertDescription className="text-orange-700">
        <p className="mb-3">
          Desculpe, o CEP <strong>{zipCode}</strong> não foi reconhecido ou ainda não atendemos essa área.
        </p>
        <Button asChild variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-100">
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="w-4 h-4 mr-2" />
            Falar no WhatsApp (83) 8130-2961
          </a>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
```

---

## 🧪 Casos de Teste

### Cenários de Teste
1. **✅ CEP Exato na Faixa**: 58050-000 → João Pessoa Z1 (R$ 20,00)
2. **✅ CEP Início da Faixa**: 58000-000 → João Pessoa Z1 (R$ 20,00)
3. **✅ CEP Final da Faixa**: 58099-999 → João Pessoa Z1 (R$ 20,00)
4. **❌ CEP Fora de Todas Faixas**: 59000-000 → Erro "CEP não atendido"
5. **❌ CEP Inválido**: abc123 → Erro "CEP inválido"
6. **⚠️ Múltiplas Zonas**: Validar não sobreposição

### Testes de Integração
- **Criação de Pedido**: Com cada tipo de precificação
- **Calculadora Frontend**: Todos os cenários de CEP
- **Admin CRUD**: Todas as operações de zona
- **Validações**: Sobreposição, CEPs inválidos, preços negativos

---

## 🚀 Plano de Implementação

### Fase 1: Backend Foundation (1-2 dias)
- [ ] Criar tabela `cep_zones` no banco
- [ ] Adicionar campo `pricing_type` na tabela `events`
- [ ] Implementar `cep-zones-calculator.ts`
- [ ] Criar rotas CRUD para zonas CEP
- [ ] Atualizar `storage.ts` com métodos para zonas
- [ ] Modificar lógica de cálculo em `routes.ts`

### Fase 2: Admin Interface (1-2 dias)
- [ ] Criar página `admin-cep-zones.tsx`
- [ ] Implementar componente `cep-zone-form.tsx`
- [ ] Adicionar opção "Faixas de CEP" nos formulários de evento
- [ ] Atualizar menu administrativo
- [ ] Implementar validações frontend

### Fase 3: Customer Experience (1 dia)
- [ ] Atualizar `pricing-calculator.ts`
- [ ] Modificar exibição de preços na seleção de endereço
- [ ] Atualizar página de detalhes do evento
- [ ] Implementar feedback para CEPs não cobertos

### Fase 4: Testing & Polish (1 dia)
- [ ] Testes automatizados para todas as funções
- [ ] Testes manuais de todos os fluxos
- [ ] Validação de performance
- [ ] Documentação final

---

## 🎯 Resultados Esperados

### Para Administradores:
- **Controle Granular**: Preços específicos por região
- **Facilidade**: Interface simples para gerenciar zonas
- **Flexibilidade**: Ativar/desativar zonas conforme necessário
- **Visibilidade**: Ver quais CEPs são cobertos por cada zona

### Para Clientes:
- **Transparência**: Saber exatamente a zona e preço antes de finalizar
- **Confiança**: Preços consistentes para sua região
- **Clareza**: Feedback claro se CEP não for atendido

### Para o Negócio:
- **Previsibilidade**: Custos de entrega mais controláveis
- **Expansão**: Facilidade para adicionar novas regiões
- **Otimização**: Preços competitivos por região específica

---

## 📊 Métricas de Sucesso

### Técnicas:
- [ ] 100% dos CEPs válidos identificam zona corretamente
- [ ] Tempo de resposta < 200ms para identificação de zona
- [ ] Zero sobreposições não intencionais de faixas
- [ ] Interface admin responsiva em dispositivos móveis

### Negócio:
- [ ] Feedback positivo de administradores sobre facilidade de uso
- [ ] Redução em pedidos com problemas de entrega
- [ ] Melhoria na conversão de pedidos (CEPs previamente não atendidos)

---

## 🔧 Considerações Técnicas

### Performance:
- **Índices**: CEP start/end indexados para busca rápida
- **Cache**: Zonas frequentes em cache para reduzir latência
- **Validação**: Frontend valida antes de enviar ao backend

### Segurança:
- **Validação**: Entrada sanitizada em todos os endpoints
- **Autorização**: Apenas admins podem gerenciar zonas
- **Auditoria**: Log de alterações em zonas

### Escalabilidade:
- **Paginação**: Lista de zonas paginada para muitas entradas
- **Busca**: Filtros por nome, status, faixa de preço
- **Backup**: Backup automático das configurações de zona

---

## 📝 Notas de Desenvolvimento

### Prioridades:
1. **Não quebrar funcionalidade atual** (crítico)
2. **Interface intuitiva para admin** (alta)
3. **Performance nas consultas** (alta)
4. **Experiência clara para cliente** (média)

### Decisões Arquiteturais:
- **CEP armazenado como string** para flexibilidade de formato
- **Faixas inclusivas** (start <= CEP <= end)
- **Zonas podem ser desabilitadas** mas não deletadas (auditoria)
- **Preços por zona independentes** de outros fatores
- **Erro amigável para CEP não coberto** com link direto para WhatsApp de suporte

### Extensões Futuras:
- **Horários específicos** por zona (delivery noturno)
- **Múltiplos preços** por zona (normal/expresso)
- **Zonas automáticas** baseadas em dados geográficos
- **Integração com APIs** de logística (Correios, transportadoras)

---

*Este documento será atualizado conforme o desenvolvimento progride e novos requisitos são identificados.*
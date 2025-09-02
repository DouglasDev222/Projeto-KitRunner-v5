# Plano de Implementação: Ativar/Desativar Zonas na Criação e Edição de Eventos

## 📋 Objetivo
Adicionar funcionalidade para que administradores possam ativar/desativar zonas específicas de CEP para cada evento, permitindo maior controle sobre as regiões atendidas por evento.

## 🎯 Funcionalidades Principais

### 1. Modificação da Tabela `event_cep_zone_prices`
- **Adicionar coluna `active`** (boolean) para indicar se a zona está ativa para o evento
- **Manter compatibilidade** com registros existentes

### 2. Interface de Administração
- **Listar todas as zonas ativas globalmente** na tela de criação/edição de evento
- **Permitir ativar/desativar zonas** específicas para cada evento
- **Mostrar preços personalizados** quando disponível

### 3. Lógica de Verificação do Cliente
- **Verificar ativação da zona no evento** antes de calcular preço
- **Mostrar mensagem clara** quando zona está desativada
- **Não aplicar fallback** para zonas desativadas

## 📝 Plano de Implementação

### Fase 1: Modificação do Schema da Base de Dados

#### 1.1 Atualizar Schema (`shared/schema.ts`)
- [ ] Adicionar coluna `active` na tabela `eventCepZonePrices`
- [ ] Definir valor padrão como `true` para compatibilidade

```typescript
export const eventCepZonePrices = pgTable("event_cep_zone_prices", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  cepZoneId: integer("cep_zone_id").notNull().references(() => cepZones.id, { onDelete: "cascade" }),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  active: boolean("active").notNull().default(true), // NOVA COLUNA
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

#### 1.2 Aplicar Migração
- [ ] Executar `npm run db:push` para aplicar mudança no schema
- [ ] Verificar se migração foi aplicada corretamente

### Fase 2: Atualização da API Backend

#### 2.1 Modificar Lógica de Cálculo de Preço (`server/cep-zones-calculator.ts`)
- [ ] Atualizar função `calculateCepZonePrice` para verificar se zona está ativa no evento
- [ ] Atualizar função `calculateCepZoneInfo` para verificar ativação
- [ ] Implementar verificação de zona ativa antes de retornar preço

```typescript
// Pseudo-código da nova lógica
const checkEventZoneStatus = async (cepZoneId: number, eventId: number) => {
  const eventZone = await db.select()
    .from(eventCepZonePrices)
    .where(and(
      eq(eventCepZonePrices.eventId, eventId),
      eq(eventCepZonePrices.cepZoneId, cepZoneId)
    ));
  
  // Se existe registro específico para o evento, usar o status dele
  if (eventZone.length > 0) {
    return eventZone[0].active;
  }
  
  // Se não existe registro, zona está ativa por padrão
  return true;
};
```

#### 2.2 Modificar Endpoints de CEP Zones (`server/routes.ts`)
- [ ] Atualizar endpoint `GET /api/admin/events/:id/cep-zone-prices` para retornar status de ativação
- [ ] Atualizar endpoint `PUT /api/admin/events/:id/cep-zone-prices` para aceitar status de ativação
- [ ] Atualizar endpoint `POST /api/cep-zones/check/:cep` para verificar ativação no evento

#### 2.3 Implementar Nova Lógica de Fallback
- [ ] Modificar lógica para NÃO aplicar fallback quando zona está desativada
- [ ] Retornar mensagem específica: "Este evento não está disponível para sua região"

### Fase 3: Atualização da Interface de Administração

#### 3.1 Modificar Componente `CepZonePricing.tsx`
- [ ] Adicionar checkboxes para ativar/desativar zonas
- [ ] Atualizar interface `CepZone` para incluir status de ativação no evento
- [ ] Modificar função `onPricesChange` para incluir status de ativação

```typescript
interface CepZone {
  id: number;
  name: string;
  description?: string;
  globalPrice: number;
  customPrice?: number | null;
  active: boolean; // Status global
  activeInEvent?: boolean; // NOVO: Status específico do evento
}

interface ZoneConfig {
  price?: string;
  active: boolean; // NOVO: Controle de ativação
}
```

#### 3.2 Atualizar Layout da Interface
- [ ] Adicionar coluna "Ativa no Evento" na tabela de zonas
- [ ] Adicionar toggle switches ou checkboxes para controle
- [ ] Implementar botões "Ativar Todas" e "Desativar Todas"
- [ ] Adicionar indicadores visuais para zonas ativas/inativas

#### 3.3 Modificar Formulário de Evento (`admin-event-form.tsx`)
- [ ] Atualizar função de salvamento para incluir status de ativação
- [ ] Modificar estado `cepZonePrices` para incluir informação de ativação

### Fase 4: Atualização da Interface do Cliente

#### 4.1 Modificar Verificação de CEP (`client/src/lib/cep-zones-client.ts`)
- [ ] Atualizar função `checkCepZone` para considerar ativação no evento
- [ ] Modificar resposta da API para incluir informação sobre zona desativada

#### 4.2 Atualizar Páginas do Cliente
- [ ] Modificar `address-confirmation.tsx` para tratar zonas desativadas
- [ ] Implementar mensagem específica: "Este evento não está disponível para sua região"
- [ ] Não mostrar botão WhatsApp para zonas desativadas (diferente de zonas não encontradas)

### Fase 5: Implementação das Regras de Negócio

#### 5.1 Fluxo de Decisão do CEP
- [ ] Implementar nova lógica de verificação:
  1. Procurar zona pela ordem de prioridade
  2. Verificar se zona está ativa globalmente
  3. Verificar se zona está ativa no evento específico
  4. Se ambas ativas → aplicar preço (personalizado ou padrão)
  5. Se zona ativa globalmente mas inativa no evento → mensagem de não atendimento
  6. Se zona inativa globalmente → mensagem de não atendimento
  7. Se não encontrar zona → aplicar fallback (se existir e ativo para o evento)

#### 5.2 Criação Automática de Registros
- [ ] Implementar lógica para criar registro em `event_cep_zone_prices` quando zona for desativada
- [ ] Preencher preço padrão da zona global
- [ ] Definir `active = false`

### Fase 6: Testes e Validação

#### 6.1 Testes de Backend
- [ ] Testar criação de evento com zonas desativadas
- [ ] Testar edição de evento alterando status de zonas
- [ ] Testar verificação de CEP com zonas ativas/inativas
- [ ] Testar fallback quando zona está desativada

#### 6.2 Testes de Frontend
- [ ] Testar interface de ativação/desativação de zonas
- [ ] Testar mensagens exibidas para cliente quando zona está desativada
- [ ] Testar fluxo completo de criação/edição de evento

#### 6.3 Testes de Integração
- [ ] Testar fluxo completo: criação de evento → desativação de zona → verificação por cliente
- [ ] Testar compatibilidade com eventos existentes
- [ ] Testar migração de dados existentes

## 🔄 Cronograma de Implementação

1. **Fase 1 - Schema**: 30 minutos
2. **Fase 2 - Backend**: 2 horas
3. **Fase 3 - Admin Interface**: 2 horas
4. **Fase 4 - Cliente Interface**: 1 hora
5. **Fase 5 - Regras de Negócio**: 1 hora
6. **Fase 6 - Testes**: 1 hora

**Total Estimado**: 7.5 horas

## ⚠️ Considerações Importantes

### Compatibilidade
- Manter compatibilidade com eventos existentes (zonas ativas por padrão)
- Não quebrar funcionalidade atual de preços personalizados

### Segurança
- Validar permissões de administrador para modificar status de zonas
- Validar dados de entrada nos endpoints da API

### Performance
- Otimizar consultas de banco para verificação de status de zona
- Implementar cache se necessário para verificações frequentes

### UX/UI
- Tornar interface intuitiva para administradores
- Mensagens claras para clientes quando zona está desativada
- Indicadores visuais distintivos entre zonas ativas/inativas

## 📋 Checklist de Entrega

- [ ] Schema atualizado e migração aplicada
- [ ] Backend modificado com nova lógica
- [ ] Interface de administração atualizada
- [ ] Interface do cliente atualizada
- [ ] Regras de negócio implementadas
- [ ] Testes realizados e aprovados
- [ ] Documentação atualizada
- [ ] Deploy realizado

## 🚀 Próximos Passos

Após criar este plano, iniciar a implementação seguindo rigorosamente a ordem das fases para garantir que cada componente funcione corretamente antes de passar para o próximo.
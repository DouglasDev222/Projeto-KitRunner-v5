# ✅ Checklist de Implementação - Sistema de Faixas de CEP

## 🗄️ Banco de Dados

### Estrutura
- [ ] Criar tabela `cep_zones`
  - [ ] Campo `id` (serial, primary key)
  - [ ] Campo `name` (varchar 100, not null) - Ex: "João Pessoa Z1"
  - [ ] Campo `description` (text, nullable) - Descrição opcional
  - [ ] Campo `cep_start` (varchar 8, not null) - Ex: "58000000"
  - [ ] Campo `cep_end` (varchar 8, not null) - Ex: "58299999"
  - [ ] Campo `price` (decimal 10,2, not null) - Ex: 20.00
  - [ ] Campo `active` (boolean, default true)
  - [ ] Campo `created_at` (timestamp, default now)
  - [ ] Campo `updated_at` (timestamp, default now)

### Modificações em Tabelas Existentes
- [ ] Adicionar campo `pricing_type` na tabela `events`
  - [ ] Tipo: VARCHAR(20) DEFAULT 'distance'
  - [ ] Valores: 'distance', 'fixed', 'cep_zones'

### Índices para Performance
- [ ] Índice `idx_cep_zones_range` em (cep_start, cep_end)
- [ ] Índice `idx_cep_zones_active` em (active)
- [ ] Índice `idx_events_pricing_type` em (pricing_type)

### Migração
- [ ] Script de migração para adicionar campos
- [ ] Seeds com zonas exemplo (João Pessoa, Bayeux, etc.)
- [ ] Backup antes da migração

---

## 🔧 Backend - Novos Componentes

### 1. Calculadora de Zonas CEP: `server/cep-zones-calculator.ts`
- [ ] Interface `CepZoneCalculation`
  - [ ] `zoneName: string`
  - [ ] `zoneId: number`
  - [ ] `deliveryCost: number`
  - [ ] `found: boolean`
- [ ] Função `findCepZone(zipCode: string): Promise<CepZoneCalculation>`
- [ ] Função `calculateCepZoneDelivery(zipCode: string): Promise<CepZoneCalculation>`
- [ ] Função `validateCepInZone(zipCode: string, zoneId: number): boolean`
- [ ] Validação e limpeza de CEP (remover formatação)
- [ ] Lógica de busca: cep_start <= zipCode <= cep_end
- [ ] Tratamento para CEP não encontrado

### 2. Rotas CRUD: `server/routes/cep-zones.ts`
- [ ] `GET /api/admin/cep-zones` - Listar todas as zonas
- [ ] `POST /api/admin/cep-zones` - Criar nova zona
- [ ] `GET /api/admin/cep-zones/:id` - Buscar zona por ID
- [ ] `PUT /api/admin/cep-zones/:id` - Atualizar zona
- [ ] `DELETE /api/admin/cep-zones/:id` - Deletar zona (soft delete)
- [ ] `GET /api/cep-zones/check/:zipCode` - Verificar zona para CEP (público)
- [ ] Validação de entrada (Zod schemas)
- [ ] Autenticação admin para rotas administrativas
- [ ] Tratamento de erros específicos

### 3. Schema e Tipos: `shared/schema.ts`
- [ ] Tabela `cepZones` no Drizzle schema
- [ ] `createInsertSchema` para `cepZones`
- [ ] Tipos TypeScript: `CepZone`, `InsertCepZone`
- [ ] Atualizar tipo `Event` com campo `pricingType`
- [ ] Validações Zod para faixas de CEP

### 4. Storage Layer: `server/storage.ts`
- [ ] `createCepZone(data: InsertCepZone): Promise<CepZone>`
- [ ] `getCepZones(active?: boolean): Promise<CepZone[]>`
- [ ] `getCepZoneById(id: number): Promise<CepZone | null>`
- [ ] `updateCepZone(id: number, data: Partial<CepZone>): Promise<CepZone>`
- [ ] `deleteCepZone(id: number): Promise<void>` (soft delete)
- [ ] `findCepZoneByZipCode(zipCode: string): Promise<CepZone | null>`
- [ ] `checkCepZoneOverlap(cepStart: string, cepEnd: string, excludeId?: number): Promise<boolean>`

### 5. Modificações em Rotas Existentes: `server/routes.ts`
- [ ] Atualizar lógica de criação de pedidos
- [ ] Integrar cálculo por faixas de CEP
- [ ] Atualizar endpoint de cálculo de preço
- [ ] Validar disponibilidade de CEP para eventos com faixas
- [ ] Tratamento de erro quando CEP não coberto

---

## 🎨 Frontend - Interface Administrativa

### 1. Página Principal: `client/src/pages/admin-cep-zones.tsx`
- [ ] Layout responsivo com cabeçalho "Configuração de Zonas de CEP"
- [ ] Botão "Nova Zona" no topo da página
- [ ] Tabela listando zonas existentes
  - [ ] Colunas: Nome, Faixa CEP, Preço, Status, Ações
  - [ ] Formatação de preço em BRL
  - [ ] Badge de status (Ativo/Inativo)
  - [ ] Ações: Editar, Excluir, Ativar/Desativar
- [ ] Paginação se necessário
- [ ] Filtros: Status, faixa de preço
- [ ] Loading states
- [ ] Empty state quando não há zonas

### 2. Formulário: `client/src/components/admin/cep-zone-form.tsx`
- [ ] Modal ou página dedicada para criar/editar
- [ ] Campos do formulário:
  - [ ] Nome da zona (obrigatório)
  - [ ] Descrição (opcional)
  - [ ] CEP inicial (8 dígitos, obrigatório)
  - [ ] CEP final (8 dígitos, obrigatório)
  - [ ] Preço (decimal, obrigatório)
  - [ ] Status ativo/inativo
- [ ] Validações frontend:
  - [ ] CEP inicial < CEP final
  - [ ] Preço > 0
  - [ ] CEPs válidos (8 dígitos)
  - [ ] Nome único
- [ ] Verificação de sobreposição de faixas
- [ ] Feedback visual de validação
- [ ] Submit e cancel handlers

### 3. Componentes de UI
- [ ] `CepZoneTable` - Tabela de zonas
- [ ] `CepZoneRow` - Linha da tabela
- [ ] `CepZoneStatusBadge` - Badge de status
- [ ] `CepRangeDisplay` - Exibição formatada de faixa
- [ ] `ConfirmDeleteModal` - Modal de confirmação

### 4. Modificar Formulários de Evento
- [ ] `admin-event-form.tsx`:
  - [ ] Adicionar opção "Faixas de CEP" no select de precificação
  - [ ] Condicional para mostrar info sobre zonas
  - [ ] Link para gerenciar zonas
- [ ] `admin-event-edit.tsx`:
  - [ ] Mesmas modificações do form de criação
- [ ] Validação: se não há zonas ativas, desabilitar opção

### 5. Menu de Navegação: `admin-layout.tsx`
- [ ] Adicionar seção "Configurações" no menu
- [ ] Item "Zonas de Entrega" com ícone MapPin
- [ ] Indicador visual quando página ativa
- [ ] Submenu expansível para futuras configurações

---

## 🎯 Frontend - Experiência do Cliente

### 1. Calculadora de Preços: `client/src/lib/pricing-calculator.ts`
- [ ] Nova interface `PricingCalculatorPropsWithCep`
- [ ] Função `calculatePricingWithCepZones()`
- [ ] Integração com API para verificar zona
- [ ] Retornar nome da zona junto com preço
- [ ] Tratamento para CEP não coberto
- [ ] Cache de zonas para performance

### 2. Páginas de Cliente Atualizadas
- [ ] **Detalhes do Evento**: Mostrar tipo de precificação
- [ ] **Seleção de Endereço**: 
  - [ ] Verificar zona automaticamente
  - [ ] Exibir "Entrega para [Nome da Zona]: R$ XX,XX"
  - [ ] Feedback claro se CEP não coberto
- [ ] **Checkout**: Confirmar zona e preço antes pagamento

### 3. Componentes de UI Cliente
- [ ] `ZonePriceDisplay` - Exibição da zona e preço
- [ ] `CepNotCoveredAlert` - Alerta para CEP não coberto
- [ ] `DeliveryZoneInfo` - Info sobre zona selecionada

---

## 🔧 Lógica de Negócio

### Algoritmos Principais
- [ ] **Identificação de Zona**:
  - [ ] Limpar CEP (remover formatação)
  - [ ] Padronizar para 8 dígitos
  - [ ] Buscar zona onde cep_start <= CEP <= cep_end
  - [ ] Retornar primeira zona encontrada
- [ ] **Validação de Sobreposição**:
  - [ ] Verificar se nova faixa sobrepõe existente
  - [ ] Permitir apenas se zona existente inativa
- [ ] **Cálculo Integrado**:
  - [ ] Switch case por tipo de precificação
  - [ ] Fallback para distância se CEP não coberto

### Regras de Negócio
- [ ] Apenas uma zona ativa por faixa de CEP
- [ ] Zonas podem ser desabilitadas mas não deletadas
- [ ] CEP deve ter exatamente 8 dígitos
- [ ] Preços devem ser positivos
- [ ] Nomes de zona devem ser únicos

---

## 🧪 Testes e Validação

### Testes Backend
- [ ] **CRUD Zonas**:
  - [ ] Criar zona válida
  - [ ] Editar zona existente
  - [ ] Deletar zona (soft delete)
  - [ ] Listar zonas com filtros
- [ ] **Algoritmo de Busca**:
  - [ ] CEP exato na faixa
  - [ ] CEP no início da faixa
  - [ ] CEP no final da faixa
  - [ ] CEP fora de todas as faixas
  - [ ] CEP inválido/malformado
- [ ] **Validações**:
  - [ ] Sobreposição de faixas
  - [ ] CEPs inválidos
  - [ ] Preços negativos

### Testes Frontend
- [ ] **Interface Admin**:
  - [ ] Carregar lista de zonas
  - [ ] Criar nova zona
  - [ ] Editar zona existente
  - [ ] Validações de formulário
  - [ ] Ações de ativar/desativar
- [ ] **Interface Cliente**:
  - [ ] Seleção de endereço identifica zona
  - [ ] Preço atualizado corretamente
  - [ ] Feedback para CEP não coberto

### Testes de Integração
- [ ] **Fluxo Completo Cliente**:
  - [ ] Evento com faixas → Seleção endereço → Checkout
- [ ] **Fluxo Completo Admin**:
  - [ ] Criar zonas → Criar evento → Testar precificação
- [ ] **Compatibilidade**:
  - [ ] Eventos existentes continuam funcionando
  - [ ] Migração entre tipos de precificação

---

## 📊 Performance e Monitoramento

### Otimizações
- [ ] Índices no banco de dados
- [ ] Cache de zonas frequentes
- [ ] Lazy loading na interface admin
- [ ] Debounce na busca de CEP

### Métricas
- [ ] Tempo de resposta da identificação de zona
- [ ] Taxa de CEPs cobertos vs não cobertos
- [ ] Uso de cada zona configurada
- [ ] Erros na criação/edição de zonas

---

## 🚀 Deploy e Rollout

### Preparação
- [ ] **Backup completo** do banco antes da migração
- [ ] **Testes em ambiente staging** com dados reais
- [ ] **Documentação** para equipe de suporte
- [ ] **Rollback plan** se houver problemas

### Fases de Deploy
- [ ] **Fase 1**: Deploy backend sem afetar frontend
- [ ] **Fase 2**: Deploy interface admin (apenas admins)
- [ ] **Fase 3**: Criar zonas de teste
- [ ] **Fase 4**: Habilitar para eventos teste
- [ ] **Fase 5**: Deploy completo para clientes

### Validação Pós-Deploy
- [ ] Funcionalidades existentes intactas
- [ ] Interface admin responsiva
- [ ] Cálculos de preço corretos
- [ ] Performance dentro do esperado

---

## 📋 Documentação Final

### Para Desenvolvedores
- [ ] Atualizar `replit.md` com nova funcionalidade
- [ ] Documentar APIs no código
- [ ] Exemplos de uso da calculadora de zonas
- [ ] Troubleshooting comum

### Para Usuários Finais
- [ ] Manual para admins criarem zonas
- [ ] FAQ sobre tipos de precificação
- [ ] Como cliente entende as zonas

---

## ✅ Critérios de Aceitação

### Funcional
- [ ] Admin pode criar, editar e gerenciar zonas
- [ ] Eventos podem usar faixas de CEP como precificação
- [ ] Clientes veem zona e preço corretos
- [ ] CEPs não cobertos são tratados adequadamente
- [ ] Sistema atual continua funcionando

### Técnico
- [ ] Performance < 200ms para identificação de zona
- [ ] Interface responsiva em mobile e desktop
- [ ] Zero quebras em funcionalidades existentes
- [ ] Validações robustas contra dados inválidos

### Negócio
- [ ] Facilita expansão para novas regiões
- [ ] Preços mais previsíveis e controláveis
- [ ] Melhora experiência do cliente
- [ ] Reduz suporte para dúvidas de preço

---

*Checklist criado em: Agosto 1, 2025*
*Última atualização: Agosto 1, 2025*

**Status**: 🔄 Planejamento Completo - Pronto para Implementação
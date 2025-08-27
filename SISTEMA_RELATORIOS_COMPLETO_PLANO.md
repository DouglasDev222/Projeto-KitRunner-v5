# PLANO COMPLETO: Sistema de Relatórios Avançado - KitRunner

## VISÃO GERAL
Este documento detalha o plano para expandir o sistema de relatórios atual, transformando-o em uma solução completa com múltiplos tipos de relatórios, configurações flexíveis e suporte a diferentes formatos de exportação.

## SISTEMA ATUAL (BASE)
- ✅ Relatório de Kits por Evento (Excel) 
- ✅ Interface básica em `/admin/reports`
- ✅ Gerador Excel com ExcelJS
- ✅ Sistema de zonas CEP implementado

## NOVOS RELATÓRIOS A IMPLEMENTAR

### 1. RELATÓRIO DE ENDEREÇOS PARA CIRCUIT 
**Finalidade**: Otimizar rotas de entrega para o sistema Circuit
**Formato**: Excel (.xlsx) personalizado para importação no Circuit
**Formato Específico Requerido pelo Circuit**:

| Address Line 1 | Address Line 2 | City | State | Postal Code | Extra info (Optional) | Add more columns if needed |
|---|---|---|---|---|---|---|
| {Nome da Rua}, {Número} |  | {Cidade} | {Estado} | {CEP} | Pedido - {Numero do Pedido (só números após o "-")} | {Complemento} |

**Mapeamento dos Dados**:
- **Address Line 1**: `{street}, {number}` (Ex: "Rua das Flores, 123")
- **Address Line 2**: (sempre vazio)
- **City**: `{city}` 
- **State**: `{state}`
- **Postal Code**: `{zipCode}` (formato: 12345-678)
- **Extra info (Optional)**: `Pedido - {orderNumber sem KR25-}` (Ex: "Pedido - 1074")
- **Add more columns if needed**: `{complement}` (complemento do endereço)

**Filtros Específicos do Relatório Circuit**:
- **Evento**: Seleção obrigatória do evento
- **Zonas CEP**: Filtro flexível por zona(s) CEP com múltiplas opções:
  - **Todas as Zonas**: Inclui todos os endereços (padrão)
  - **Zona Única**: Ex: Somente Zona 1
  - **Zonas Múltiplas**: Ex: Zonas 1 e 2, ou Zonas 2, 4, 5
  - **Seleção Personalizada**: Interface com checkboxes para escolher zonas específicas
- **Status dos Pedidos**: Confirmados, Em Trânsito (padrão)
- **Período**: Filtro opcional por data de criação/confirmação

**Exemplos de Uso do Filtro de Zonas**:
- **Rota Única**: "Zona 1" → Gera relatório apenas da Zona Centro
- **Rotas Combinadas**: "Zonas 1, 2" → Combina Centro e Bairro Sul em um relatório
- **Rotas Específicas**: "Zonas 2, 4, 5" → Múltiplas zonas para uma equipe específica
- **Todas as Zonas**: Sem filtro → Relatório completo do evento

**Benefícios do Filtro Múltiplo por Zona CEP**:
- **Flexibilidade Total**: Combinar zonas conforme necessidade operacional
- **Otimização de Rotas**: Agrupar zonas geograficamente próximas
- **Divisão por Equipes**: Relatórios específicos para cada equipe de entrega
- **Planejamento Logístico**: Rotas personalizadas por veículo/capacidade
- **Controle Granular**: Desde zona única até múltiplas combinações

### 2. RELATÓRIO GERAL DE PEDIDOS POR EVENTO
**Finalidade**: Análise completa de pedidos de um evento
**Formatos**: Excel, PDF, CSV
**Colunas Detalhadas**:
- **Informações do Pedido**: Número, Data, Status, Valor Total
- **Cliente**: Nome, CPF, Email, Telefone
- **Endereço Completo** (em colunas separadas):
  - Rua, Número, Complemento, Bairro, Cidade, Estado, CEP
- **Zona CEP**: Nome da zona (das zonas ativas)
- **Kits**: Array JSON formatado ou colunas separadas por kit (Maximo 5 colunas que o permitido por pedido)
- **Pagamento**: Método, Status, Data de Confirmação
- **Custos**: Entrega, Kits Extras, Doação, Desconto, Total
- **Cupom**: Código usado (se houver)

**Filtros Disponíveis**:
- Status: Todos, Confirmados, Aguardando Pagamento, Cancelados, etc.
- Período: Data de criação, Data de confirmação
- Zona CEP específica
- Método de pagamento

### 3. RELATÓRIOS DE FATURAMENTO
**3.1 Faturamento por Período**
- Diário, Semanal, Mensal, Anual
- Gráficos e tabelas
- Comparativos com períodos anteriores

**3.2 Faturamento por Evento**
- Receita total por evento
- Breakdown por tipo de cobrança (entrega, kits extras, doações)
- Análise de cupons utilizados
- Taxa de conversão (pedidos confirmados vs cancelados)

### 4. RELATÓRIO DE VENDAS E PERFORMANCE
- Top eventos por receita
- Top zonas CEP por volume
- Performance de cupons de desconto
- Análise sazonal de vendas
- Taxa de cancelamento por evento/período

### 5. RELATÓRIO DE CLIENTES
- Clientes mais ativos
- Análise geográfica (por cidade/bairro)
- Histórico de pedidos por cliente
- Segmentação por valor gasto

### 6. RELATÓRIO DE ENTREGAS E LOGÍSTICA
- Status de entregas por zona CEP
- Tempo médio de entrega
- Análise de custos de entrega
- Performance por transportadora/método

## ARQUITETURA TÉCNICA

### Frontend (`client/src/pages/admin-reports.tsx`)
**Interface Redesenhada**:
```typescript
interface ReportConfig {
  type: 'kits' | 'addresses' | 'orders' | 'billing' | 'sales' | 'customers' | 'deliveries';
  format: 'excel' | 'pdf' | 'csv';
  filters: {
    eventId?: number;
    dateRange?: { start: string; end: string };
    status?: string[];
    zipCodeZone?: number;
    // ... outros filtros
  };
  preview: boolean;
}
```

**Componentes Novos**:
- `ReportSelector`: Seleção de tipo de relatório
- `FilterPanel`: Painel de filtros dinâmicos por tipo
- `ReportPreview`: Preview dos dados antes de gerar
- `FormatSelector`: Escolha de formato de exportação
- `ScheduleReports`: Agendamento de relatórios recorrentes

### Backend (`server/report-generator.ts`)
**Estrutura Expandida**:
```typescript
// Tipos de relatório
export type ReportType = 'kits' | 'addresses' | 'orders' | 'billing' | 'sales' | 'customers' | 'deliveries';

// Interface unificada
export interface ReportGenerator {
  generateKitsReport(eventId: number): Promise<Buffer>;
  generateAddressesReport(eventId: number): Promise<Buffer>;
  generateOrdersReport(filters: OrdersReportFilters): Promise<Buffer>;
  generateBillingReport(filters: BillingReportFilters): Promise<Buffer>;
  // ... outros geradores
}

// Filtros específicos por tipo
export interface OrdersReportFilters {
  eventId?: number;
  status?: string[];
  dateRange?: { start: Date; end: Date };
  includeZipCodeZone: boolean;
  includeKitsArray: boolean;
  includePaymentDetails: boolean;
}
```

### Rotas API (`server/routes.ts`)
**Novos Endpoints**:
```typescript
// Relatórios configuráveis
GET    /api/admin/reports/config/:type     // Opções de configuração por tipo
POST   /api/admin/reports/generate         // Geração com configuração personalizada
GET    /api/admin/reports/preview/:type    // Preview dos dados
GET    /api/admin/reports/templates        // Templates disponíveis

// Relatórios específicos
GET    /api/admin/reports/addresses/:eventId
GET    /api/admin/reports/orders
GET    /api/admin/reports/billing
GET    /api/admin/reports/sales
GET    /api/admin/reports/customers
GET    /api/admin/reports/deliveries
```

## IMPLEMENTAÇÃO POR FASES

### FASE 1: Infraestrutura Base
- [ ] Redesenhar interface de relatórios
- [ ] Criar sistema de filtros dinâmicos
- [ ] Implementar preview de relatórios
- [ ] Sistema de templates de relatório

### FASE 2: Relatórios Essenciais
- [ ] Relatório de endereços para Circuit
- [ ] Relatório geral de pedidos por evento
- [ ] Implementar múltiplos formatos (Excel, PDF, CSV)

### FASE 3: Relatórios Analíticos
- [ ] Sistema de faturamento completo
- [ ] Relatórios de vendas e performance
- [ ] Relatórios de clientes

### FASE 4: Recursos Avançados
- [ ] Relatórios de logística
- [ ] Sistema de agendamento
- [ ] Cache de relatórios pesados
- [ ] Exportação em lote

## ESPECIFICAÇÕES TÉCNICAS DETALHADAS

### 1. RELATÓRIO DE ENDEREÇOS PARA CIRCUIT
**Query SQL Base (com filtro múltiplas Zonas CEP)**:
```sql
SELECT DISTINCT
  CONCAT(a.street, ', ', a.number) as address_line_1,
  '' as address_line_2,
  a.city,
  a.state,
  a.zip_code as postal_code,
  CONCAT('Pedido - ', SUBSTRING(o.order_number, POSITION('-' IN o.order_number) + 1)) as extra_info,
  COALESCE(a.complement, '') as add_more_columns,
  cz.name as zone_name,
  cz.priority as zone_priority
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN addresses a ON o.address_id = a.id
JOIN events e ON o.event_id = e.id
LEFT JOIN cep_zones cz ON (
  a.zip_code BETWEEN 
    SUBSTRING(JSON_UNQUOTE(JSON_EXTRACT(cz.cep_ranges, '$[*].start')), 1, 5) AND 
    SUBSTRING(JSON_UNQUOTE(JSON_EXTRACT(cz.cep_ranges, '$[*].end')), 1, 5)
  AND cz.active = true
)
WHERE o.event_id = ? 
  AND o.status IN ('confirmado', 'em_transito')
  AND (
    ? IS NULL OR -- Todas as zonas
    cz.id IN (?) -- Array de IDs das zonas selecionadas (Ex: [1,2] ou [2,4,5])
  )
ORDER BY cz.priority ASC, a.neighborhood, a.street, a.number;
```

**Parâmetros da Query**:
- `eventId`: ID do evento (obrigatório)
- `includeAllZones`: Boolean - NULL/true para todas as zonas
- `selectedZoneIds`: Array de IDs das zonas CEP (Ex: [1,2] ou [2,4,5])

**Interface TypeScript**:
```typescript
interface CircuitReportFilters {
  eventId: number;
  selectedZoneIds?: number[]; // [1,2] ou [2,4,5] ou null (todas)
  status?: string[];
  dateRange?: { start: Date; end: Date };
}

// Exemplos de uso:
const filters1: CircuitReportFilters = { eventId: 1, selectedZoneIds: [1] }; // Zona 1
const filters2: CircuitReportFilters = { eventId: 1, selectedZoneIds: [1,2] }; // Zonas 1 e 2  
const filters3: CircuitReportFilters = { eventId: 1, selectedZoneIds: [2,4,5] }; // Zonas 2,4,5
const filters4: CircuitReportFilters = { eventId: 1 }; // Todas as zonas
```

**Formato Excel Circuit**:
- Headers exatos conforme especificação Circuit
- Address Line 1: "Rua das Flores, 123"
- Address Line 2: sempre vazio
- Extra info: "Pedido - 1074" (sem o prefixo KR25-)
- Complemento na última coluna

**Nomenclatura dos Arquivos**:
- Todas as zonas: `circuit-{evento}-todas-zonas.xlsx`
- Zona única: `circuit-{evento}-zona-{id}.xlsx` (Ex: `circuit-corrida-zona-1.xlsx`)
- Múltiplas zonas: `circuit-{evento}-zonas-{ids}.xlsx` (Ex: `circuit-corrida-zonas-1-2.xlsx`)

**Interface de Usuário**:
- Dropdown para seleção do evento
- Checkboxes para seleção de zonas CEP:
  - ☑️ Todas as Zonas (padrão)
  - ☐ Zona 1 - Centro
  - ☐ Zona 2 - Bairro Sul  
  - ☐ Zona 3 - Zona Norte
- Preview das zonas selecionadas
- Contador de endereços por zona

### 2. SISTEMA DE ZONAS CEP PARA RELATÓRIOS
**Função de Busca Otimizada**:
```typescript
export async function getZoneByCep(zipCode: string): Promise<CepZone | null> {
  const zones = await db.select().from(cepZones).where(eq(cepZones.active, true));
  return findCepZoneFromList(zipCode, zones);
}

export async function enrichOrdersWithZones(orders: OrderData[]): Promise<OrderWithZone[]> {
  const enrichedOrders = [];
  for (const order of orders) {
    const zone = await getZoneByCep(order.zipCode);
    enrichedOrders.push({
      ...order,
      zoneName: zone?.name || 'Zona não encontrada',
      zonePrice: zone?.price || null
    });
  }
  return enrichedOrders;
}
```

### 3. SISTEMA DE MÚLTIPLOS FORMATOS

**Gerador PDF** (usando PDFKit):
```typescript
export async function generatePDFReport(data: any[], config: ReportConfig): Promise<Buffer> {
  const doc = new PDFDocument();
  const buffers: Buffer[] = [];
  
  doc.on('data', buffers.push.bind(buffers));
  
  // Header com logo e info
  // Tabela de dados
  // Footer com totais
  
  doc.end();
  return Buffer.concat(buffers);
}
```

**Gerador CSV**:
```typescript
export function generateCSVReport(data: any[], columns: string[]): string {
  const header = columns.join(',');
  const rows = data.map(row => 
    columns.map(col => `"${row[col] || ''}"`).join(',')
  );
  return [header, ...rows].join('\n');
}
```

## CONSIDERAÇÕES DE PERFORMANCE

### Cache de Dados
- Cache Redis para relatórios complexos (faturamento)
- Invalidação automática quando dados mudam
- Background jobs para relatórios pesados

### Otimizações de Query
- Índices otimizados para queries de relatório
- Paginação para dados grandes
- Queries agregadas para estatísticas

### Processamento Assíncrono
```typescript
// Para relatórios muito grandes
export async function generateLargeReport(config: ReportConfig): Promise<string> {
  const jobId = `report_${Date.now()}`;
  
  // Enfileirar job
  await reportQueue.add('generate-report', { jobId, config });
  
  return jobId; // Cliente consulta status depois
}
```

## SEGURANÇA E PERMISSÕES

### Controle de Acesso
- Apenas admins podem gerar relatórios
- Log de acesso a relatórios sensíveis
- Rate limiting para evitar abuso

### Proteção de Dados
- Sanitização de dados exportados
- Anonimização opcional para relatórios de teste
- Criptografia para relatórios em cache

## CRONOGRAMA ESTIMADO

**Fase 1**: 1 semana
**Fase 2**: 2 semanas  
**Fase 3**: 2 semanas
**Fase 4**: 1 semana

**Total**: 6 semanas

## TECNOLOGIAS UTILIZADAS

- **ExcelJS**: Para relatórios Excel avançados
- **PDFKit**: Para geração de PDFs
- **Papa Parse**: Para CSVs complexos
- **Chart.js**: Para gráficos em relatórios
- **Redis**: Para cache (se necessário)
- **Bull Queue**: Para processamento assíncrono (se necessário)

## VALIDAÇÃO ANTES DA IMPLEMENTAÇÃO

**Checklist de Aprovação**:
- [ ] Estrutura dos relatórios está adequada?
- [ ] Formatos de exportação atendem às necessidades?
- [ ] Sistema de filtros é suficientemente flexível?
- [ ] Performance estimada é aceitável?
- [ ] Cronograma é realista?

---

**Este plano está pronto para aprovação. Após confirmação, iniciará a implementação seguindo as fases definidas.**
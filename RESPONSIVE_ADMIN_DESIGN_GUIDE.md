# Guia de Design Responsivo Mobile-First para Admin

## Visão Geral
Este documento detalha as implementações responsivas feitas na tela `/admin/orders` e serve como guia para aplicar o mesmo padrão em outras telas administrativas do KitRunner.

## Princípios do Design Mobile-First

### 1. Hierarquia de Breakpoints
- **Mobile**: `< 640px` (sm) - Prioridade principal
- **Tablet**: `640px - 1024px` (sm-lg) - Adaptações médias
- **Desktop**: `> 1024px` (lg+) - Funcionalidades completas

### 2. Estratégia de Layout
- Mobile: Cards expansíveis com informações essenciais
- Desktop: Tabelas tradicionais com todas as colunas
- Transição suave entre layouts usando classes Tailwind

## Implementações Específicas

### A. Cards Expansíveis para Mobile

#### Header do Card (Sempre Visível)
```tsx
<div className="p-4 cursor-pointer select-none" onClick={() => toggleExpansion(id)}>
  <div className="flex items-start justify-between">
    <div className="flex-1 min-w-0">
      {/* Informações essenciais com truncate */}
      <div className="flex items-center gap-2 mb-2">
        <Checkbox />
        <span className="font-mono text-sm font-medium">{orderNumber}</span>
        {statusBadge}
      </div>
      <div className="space-y-1">
        <p className="font-medium text-gray-900 truncate">{customerName}</p>
        <p className="text-sm text-gray-600 truncate">{eventName}</p>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-green-600">{price}</span>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Package className="h-3 w-3" />
            {quantity} kits
            <Clock className="h-3 w-3 ml-2" />
            {date}
          </div>
        </div>
      </div>
    </div>
    <div className="ml-4 flex items-center">
      {expanded ? <ChevronUp /> : <ChevronDown />}
    </div>
  </div>
</div>
```

#### Área Expandida (Detalhes e Ações)
```tsx
{expanded && (
  <div className="border-t px-4 pb-4">
    <div className="mt-4 space-y-3">
      {/* Detalhes do cliente/evento */}
      <div className="grid grid-cols-1 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-gray-500 flex-shrink-0" />
          <span className="font-medium">{label}</span>
          <span className="text-gray-500">·</span>
          <span className="text-gray-600">{value}</span>
        </div>
      </div>
      
      {/* Botões de ação otimizados para mobile */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t">
        <Button variant="outline" size="sm" className="justify-start">
          <Icon className="h-4 w-4 mr-2" />
          {label}
        </Button>
      </div>
    </div>
  </div>
)}
```

### B. Dual Layout System

#### Estrutura de Visibilidade
```tsx
{/* Mobile Cards - Visível apenas em telas pequenas */}
<div className="block lg:hidden space-y-4">
  {items.map(item => <MobileCard key={item.id} />)}
</div>

{/* Desktop Table - Visível apenas em telas grandes */}
<div className="hidden lg:block">
  <Table>
    {/* Estrutura tradicional da tabela */}
  </Table>
</div>
```

### C. Modais Responsivos

#### Container do Modal
```tsx
<DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto mx-4 sm:mx-6">
  <DialogHeader className="pb-4">
    <DialogTitle className="flex items-center gap-2 text-lg">
      <Icon className="h-5 w-5" />
      <span className="truncate">{title}</span>
    </DialogTitle>
  </DialogHeader>
  
  {/* Grid responsivo para conteúdo */}
  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
    {/* Conteúdo adaptável */}
  </div>
</DialogContent>
```

#### Botões Otimizados para Touch
```tsx
{/* Mobile: Grid de 2 colunas com botões maiores */}
<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
  <Button 
    variant="outline" 
    size="sm" 
    className="text-xs justify-start h-10 px-3"
  >
    <Icon className="h-3 w-3 mr-2 flex-shrink-0" />
    <span className="truncate">{label}</span>
  </Button>
</div>

{/* Desktop: Botões menores em linha */}
<div className="flex items-center gap-1">
  <Button variant="outline" size="sm" title={tooltip}>
    <Icon className="h-4 w-4" />
  </Button>
</div>
```

### D. Filtros Responsivos

#### Layout Adaptável
```tsx
<CardContent className="space-y-4">
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Select>
        <SelectTrigger className="h-10">
          <SelectValue />
        </SelectTrigger>
      </Select>
    </div>
  </div>
</CardContent>
```

### E. Barra de Ações em Lote

#### Stack Vertical em Mobile
```tsx
<div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
    <div className="space-y-1">
      <span className="text-sm font-medium text-blue-700">
        {count} itens selecionados
      </span>
      <div className="text-sm text-blue-600 truncate">
        {contextInfo}
      </div>
    </div>
    <div className="flex flex-col sm:flex-row gap-2">
      <Select>
        <SelectTrigger className="w-full sm:w-48 h-10">
          <SelectValue />
        </SelectTrigger>
      </Select>
      <div className="flex gap-2">
        <Button className="flex-1 sm:flex-none">Aplicar</Button>
        <Button variant="outline" className="flex-1 sm:flex-none">Cancelar</Button>
      </div>
    </div>
  </div>
</div>
```

## Padrões de UX para Mobile

### 1. Touch Targets
- **Mínimo**: 44px (h-11) para botões principais
- **Recomendado**: 48px+ para ações críticas
- **Espaçamento**: Mínimo 8px entre elementos tocáveis

### 2. Hierarquia Visual
- **Títulos**: text-lg (18px) em mobile, text-xl+ em desktop
- **Subtítulos**: text-sm (14px) consistente
- **Corpo**: text-sm para informações secundárias
- **Labels**: text-xs (12px) para metadados

### 3. Cores e Estados
- **Primária**: Verde para ações positivas (#10b981)
- **Secundária**: Azul para informações (#3b82f6)
- **Alerta**: Amarelo para atenção (#f59e0b)
- **Erro**: Vermelho para problemas (#ef4444)

### 4. Animações e Transições
- **Expansão**: transition-all duration-200 ease-in-out
- **Hover**: hover:bg-gray-50 (desktop only)
- **Loading**: animate-spin para indicadores

## Classes Tailwind Essenciais

### Layout Responsivo
```css
/* Mobile First */
.mobile-first-grid {
  @apply grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4;
}

/* Visibilidade */
.mobile-only { @apply block lg:hidden; }
.desktop-only { @apply hidden lg:block; }

/* Flexbox Responsivo */
.responsive-flex { @apply flex flex-col sm:flex-row; }
.responsive-items { @apply items-start sm:items-center; }
```

### Touch Optimization
```css
/* Botões Touch-Friendly */
.touch-button { @apply h-10 sm:h-8 px-4 sm:px-3; }
.touch-target { @apply min-h-[44px] min-w-[44px]; }

/* Cards Mobile */
.mobile-card { @apply p-4 space-y-3 touch-manipulation; }
```

### Tipografia Responsiva
```css
/* Headings */
.responsive-title { @apply text-lg lg:text-xl; }
.responsive-subtitle { @apply text-sm lg:text-base; }

/* Truncate */
.smart-truncate { @apply truncate max-w-0 flex-1; }
```

## Implementação Step-by-Step

### Passo 1: Analisar a Tela Atual
1. Identificar elementos principais (tabelas, forms, modais)
2. Mapear ações críticas para mobile
3. Definir informações essenciais vs. secundárias

### Passo 2: Criar Cards Mobile
1. Implementar header com info essencial
2. Adicionar estado de expansão
3. Organizar ações em grid 2x2

### Passo 3: Otimizar Modais
1. Ajustar max-width e margins
2. Implementar grid responsivo
3. Aumentar touch targets

### Passo 4: Adaptar Filtros
1. Stack vertical em mobile
2. Labels claros e concisos
3. Heights consistentes (h-10)

### Passo 5: Testar e Refinar
1. Testar em dispositivos reais
2. Verificar acessibilidade
3. Otimizar performance

## Checklist de Implementação

### Mobile UX ✅
- [ ] Touch targets ≥ 44px
- [ ] Informações essenciais visíveis sem scroll
- [ ] Navegação thumb-friendly
- [ ] Loading states claros
- [ ] Feedback visual imediato

### Responsividade ✅
- [ ] Funciona em 320px - 2560px
- [ ] Layout adapta em todos breakpoints
- [ ] Imagens/ícones escaláveis
- [ ] Texto legível em todas as telas
- [ ] Performance otimizada

### Acessibilidade ✅
- [ ] Labels descritivos
- [ ] Contraste adequado
- [ ] Navegação por teclado
- [ ] Screen reader friendly
- [ ] Focus indicators visíveis

## Próximas Telas para Implementar

1. **Admin Events** - Cards para eventos com ações de edição
2. **Admin Customers** - Lista de clientes com detalhes expansíveis  
3. **Admin Reports** - Gráficos e tabelas responsivas
4. **Admin Settings** - Formulários adaptativos

Este guia deve ser seguido para manter consistência visual e de UX em todo o painel administrativo do KitRunner.
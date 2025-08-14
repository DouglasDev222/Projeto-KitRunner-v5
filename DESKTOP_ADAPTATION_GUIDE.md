# KitRunner - Guia de Adaptação Desktop

## Resumo das Implementações

Este documento registra as adaptações realizadas para criar versões desktop das telas do KitRunner, mantendo as versões mobile intactas e seguindo um padrão consistente de design profissional.

## Status das Implementações

### ✅ Telas Adaptadas para Desktop

#### 1. Tela de Login (`/login`)
- **Status**: ✅ Concluída
- **Implementação**: Header desktop padronizado
- **Características**:
  - Header com logo KitRunner
  - Navegação consistente (Início, Pedidos, Eventos, Perfil)
  - Layout responsivo que preserva a versão mobile
  - Design clean e profissional

#### 2. Tela de Cadastro (`/register`)
- **Status**: ✅ Concluída
- **Implementação**: Layout em duas colunas otimizado
- **Características**:
  - Header desktop padronizado
  - Coluna esquerda: Informações e benefícios (2/5 do espaço)
  - Coluna direita: Formulário expandido (3/5 do espaço)
  - Container `max-w-6xl` para melhor aproveitamento do espaço
  - Formulários com grids de 2 e 3 colunas
  - Gaps aumentados (gap-6) para melhor respiração visual
  - Cards com padding expandido (p-10)

#### 3. Tela de Perfil (`/profile`)
- **Status**: ✅ Concluída
- **Implementação**: Layout em duas colunas com cards organizados
- **Características**:
  - Header desktop padronizado (mesmo das outras páginas)
  - Coluna esquerda: Informações do usuário e ações rápidas (2/5)
  - Coluna direita: Dados pessoais e endereços (3/5)
  - Cards bem espaçados com shadow-lg
  - Grid de 2 colunas para dados pessoais
  - Endereços em cards individuais com hover effects

## Padrão de Design Estabelecido

### Header Desktop Padrão
```typescript
<nav className="bg-white border-b border-gray-200 shadow-sm">
  <div className="max-w-7xl mx-auto px-8">
    <div className="flex items-center justify-between h-16">
      {/* Logo */}
      <div className="flex items-center">
        <img src="/logo.webp" alt="KitRunner" className="h-10 w-auto" />
      </div>

      {/* Navigation Links */}
      <div className="flex items-center space-x-8">
        <Button variant="ghost" onClick={() => setLocation("/")}
          className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-lg transition-colors">
          <Home className="w-4 h-4" />
          <span>Início</span>
        </Button>
        
        <Button variant="ghost" onClick={() => setLocation("/my-orders")}
          className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-lg transition-colors">
          <Package className="w-4 h-4" />
          <span>Pedidos</span>
        </Button>
        
        <Button variant="ghost" onClick={() => setLocation("/eventos")}
          className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-lg transition-colors">
          <Package className="w-4 h-4" />
          <span>Eventos</span>
        </Button>
        
        <Button variant="ghost"
          className="flex items-center space-x-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-lg font-medium">
          <User className="w-4 h-4" />
          <span>Perfil</span>
        </Button>
      </div>
    </div>
  </div>
</nav>
```

### Layout Desktop Padrão
```typescript
{/* Estrutura responsiva com versões separadas */}
<>
  {/* Mobile Version */}
  <div className="lg:hidden max-w-md mx-auto bg-white min-h-screen">
    {/* Versão mobile original preservada */}
  </div>

  {/* Desktop Version */}
  <div className="hidden lg:block min-h-screen bg-gray-50">
    {/* Header Desktop */}
    <nav>...</nav>
    
    {/* Main Content */}
    <div className="max-w-6xl mx-auto pt-16 pb-8 px-8">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Coluna Esquerda - Informações (2/5) */}
        <div className="lg:col-span-2 lg:pr-8">
          {/* Conteúdo informativo */}
        </div>
        
        {/* Coluna Direita - Formulário/Cards (3/5) */}
        <div className="lg:col-span-3">
          {/* Formulários ou cards de conteúdo */}
        </div>
      </div>
    </div>
  </div>
</>
```

### Classes CSS Padronizadas

#### Containers
- `max-w-6xl mx-auto` - Container principal desktop
- `pt-16 pb-8 px-8` - Padding padrão do conteúdo
- `grid grid-cols-1 lg:grid-cols-5 gap-8` - Grid principal

#### Cards
- `shadow-lg` - Sombra padrão para cards importantes
- `p-8` ou `p-10` - Padding interno dos cards
- `space-y-8` - Espaçamento entre seções
- `gap-6` - Gap entre campos de formulário

#### Formulários
- `grid grid-cols-2 gap-6` - Grid de 2 colunas para campos
- `grid grid-cols-3 gap-6` - Grid de 3 colunas para endereços
- `h-12` ou `h-14` - Altura dos inputs e botões

## Próximas Telas para Adaptar

### 🔄 Em Desenvolvimento

#### 1. Tela de Pedidos (`/my-orders`)
- **Prioridade**: Alta
- **Implementação sugerida**:
  - Header desktop padrão
  - Layout em lista otimizado para desktop
  - Cards de pedidos em grid de 2-3 colunas
  - Filtros e busca na lateral

#### 2. Tela de Edição de Perfil (`/profile/edit`)
- **Prioridade**: Alta
- **Implementação sugerida**:
  - Seguir padrão da tela de cadastro
  - Formulário expandido em 3 colunas
  - Preview das alterações na coluna esquerda

#### 3. Tela de Endereços (`/profile/address/new`, `/profile/address/:id/edit`)
- **Prioridade**: Média
- **Implementação sugerida**:
  - Modal ou página completa
  - Formulário de endereço expandido
  - Validação de CEP integrada

#### 4. Tela de Detalhes do Evento (`/eventos/:id`)
- **Prioridade**: Alta
- **Implementação sugerida**:
  - Layout em 3 colunas (info, configuração, resumo)
  - Configurador de kit mais visual
  - Preview em tempo real do pedido

#### 5. Tela de Pagamento
- **Prioridade**: Alta
- **Implementação sugerida**:
  - Wizard de pagamento em steps
  - Resumo do pedido fixo na lateral
  - Formulários de pagamento expandidos

## Diretrizes de Implementação

### 1. Consistência Visual
- Sempre usar o header desktop padrão
- Manter a paleta de cores roxa (#purple-600)
- Preservar a versão mobile intacta
- Usar shadows e borders consistentes

### 2. Layout Responsivo
- Breakpoint principal: `lg:` (1024px+)
- Mobile: `lg:hidden`
- Desktop: `hidden lg:block`
- Container máximo: `max-w-6xl` ou `max-w-7xl`

### 3. Espaçamento e Tipografia
- Títulos principais: `text-3xl font-bold`
- Subtítulos: `text-xl font-semibold`
- Cards: `p-8` ou `p-10`
- Gaps: `gap-6` ou `gap-8`

### 4. Componentes Reutilizáveis
- Manter uso dos componentes shadcn/ui
- Padronizar classes de hover states
- Usar `transition-colors` para animações suaves

## Como Continuar

### Para implementar uma nova tela desktop:

1. **Copiar estrutura base**:
   ```typescript
   <>
     {/* Mobile Version - preservar original */}
     <div className="lg:hidden">
       {/* Código mobile existente */}
     </div>

     {/* Desktop Version - nova implementação */}
     <div className="hidden lg:block min-h-screen bg-gray-50">
       {/* Header padrão */}
       {/* Layout em colunas */}
     </div>
   </>
   ```

2. **Aplicar header padrão**: Copiar exatamente da tela de eventos

3. **Definir layout**: 
   - 2/5 + 3/5 para telas com formulários
   - 1/3 + 2/3 para telas com muito conteúdo
   - Full width para listas e grids

4. **Expandir componentes**:
   - Aumentar containers (`max-w-6xl`)
   - Usar grids para formulários
   - Adicionar espaçamento generoso

5. **Testar responsividade**: Verificar funcionamento em mobile e desktop

### Próximos passos recomendados:
1. Adaptar tela `/my-orders` (mais usada)
2. Adaptar fluxo de pedidos (`/eventos/:id`)
3. Adaptar telas de edição de perfil
4. Implementar dashboard administrativo desktop
5. Otimizar performance e carregamento

## Ferramentas e Dependências

- **Framework**: React 18 + TypeScript
- **Roteamento**: Wouter
- **UI Components**: Radix UI + shadcn/ui
- **Styling**: Tailwind CSS
- **Ícones**: Lucide React
- **Forms**: React Hook Form + Zod

## Observações Importantes

- **Sempre preservar a versão mobile** - nunca alterar o código mobile existente
- **Manter consistência** - usar exatamente o mesmo header em todas as páginas
- **Testar autenticação** - verificar se as rotas protegidas funcionam
- **Performance** - evitar carregar conteúdo desnecessário no mobile
- **Acessibilidade** - manter navegação por teclado funcionando

---

**Última atualização**: 14 de agosto de 2025
**Status do projeto**: Migração para Replit concluída, 3 telas desktop implementadas
**Próximo milestone**: Implementar tela de pedidos desktop
# Refatoração e Melhoria das Telas de Eventos do Admin

## 📋 Visão Geral
Refatoração completa das telas administrativas de eventos para melhorar a usabilidade, integrar adequadamente a funcionalidade de precificação por zonas de CEP e proporcionar uma experiência mais limpa e eficiente para o administrador.

## 🎯 Objetivos
- Simplificar a interface de criação/edição de eventos com precificação por zonas CEP
- Atualizar a lista de eventos com informações relevantes sobre precificação
- Criar modal de detalhes com informações completas dos eventos
- Melhorar o fluxo de trabalho do administrador

---

## 📄 1. Tela: /admin/events/new – Criação de Novo Evento

### 🔍 Problema Atual
- Interface poluída quando "zonas CEP" é selecionado
- Sessão longa com muitas informações desnecessárias
- Layout confuso e pouco intuitivo

### ✅ Solução Proposta
**Layout Compacto para Zonas CEP:**
- Sessão simplificada que aparece somente quando "zonas CEP" é selecionado
- Posicionamento: logo abaixo do select de tipo de precificação
- Espaçamento visual adequado e design limpo

**Estrutura de Cada Linha:**
```
[Nome da Zona]    [Preço Global: R$ XX.XX (somente leitura)]    [Input: Preço Personalizado]
```

### 🛠️ Implementação
**Frontend:**
- Detectar mudança no select de tipo de precificação
- Mostrar/ocultar sessão de zonas CEP dinamicamente
- Layout responsivo e compacto
- Validação de preços personalizados

**Backend:**
- Endpoint para buscar zonas CEP disponíveis
- Lógica para salvar preços personalizados na tabela `event_cep_zone_prices`

---

## 📋 2. Tela: /admin/events – Lista de Eventos

### 🔍 Problema Atual
- Informações limitadas sobre precificação
- Falta de ações para visualizar detalhes dos eventos
- Interface desatualizada

### ✅ Melhorias Propostas
**Cards/Linhas de Evento com:**
- Nome do evento
- Data e status (ativo/inativo)
- Tipo de precificação (destaque visual)
- Botão "Detalhes" proeminente

**Modal de Detalhes:**
- Informações completas do evento
- Dados básicos (nome, data, localização, etc.)
- Tipo de precificação com detalhamento
- Para eventos com "zonas CEP": lista completa das zonas e preços personalizados
- Botão "Editar Evento" redirecionando para `/admin/events/:id/edit`

### 🛠️ Implementação
**Frontend:**
- Redesign dos cards de evento
- Implementação de modal responsivo
- Sistema de navegação intuitivo
- Indicadores visuais para tipo de precificação

**Backend:**
- Endpoint para buscar detalhes completos do evento
- Incluir preços personalizados da tabela `event_cep_zone_prices`
- Otimização de queries para performance

---

## ✏️ 3. Tela: /admin/events/:id/edit – Edição de Evento

### 🔍 Problema Atual
- Não reflete adequadamente as funcionalidades de personalização por zona CEP
- Falta integração com preços personalizados existentes

### ✅ Ajustes Propostos
**Detecção Automática:**
- Identificar tipo de precificação atual do evento
- Carregar dados existentes da tabela `event_cep_zone_prices`

**Para Eventos com "Zonas CEP":**
- Exibir formulário compacto idêntico ao de criação
- Pré-popular campos com preços personalizados existentes
- Permitir edição direta dos preços
- Atualização automática na tabela ao salvar

### 🛠️ Implementação
**Frontend:**
- Reutilizar componente de zonas CEP da tela de criação
- Sistema de carregamento de dados existentes
- Validação e feedback visual
- Handling de estados de loading/error

**Backend:**
- Endpoint para carregar preços personalizados por evento
- Lógica de atualização (INSERT/UPDATE) para `event_cep_zone_prices`
- Validação de dados e tratamento de erros

---

## 🔧 Checklist de Implementação

### Backend
- [ ] **Endpoint GET `/api/admin/events/:id/cep-zone-prices`**
  - Buscar preços personalizados por evento
  - Retornar zonas com preços globais e personalizados
  
- [ ] **Endpoint PUT `/api/admin/events/:id/cep-zone-prices`**
  - Atualizar preços personalizados
  - Inserir novos ou atualizar existentes
  
- [ ] **Melhorar endpoint GET `/api/admin/events/:id`**
  - Incluir informações de precificação detalhadas
  - Otimizar queries com joins adequados
  
- [ ] **Atualizar lógica de salvamento em POST/PUT eventos**
  - Processar preços personalizados de zonas CEP
  - Transações para consistência de dados

### Frontend

#### /admin/events/new
- [ ] **Componente CepZonePricing**
  - Layout compacto e responsivo
  - Exibição condicional baseada no tipo de precificação
  - Validação de inputs de preços personalizados
  
- [ ] **Integração com formulário principal**
  - Detectar mudança no select de tipo de precificação
  - Coletar dados de preços personalizados no submit
  - Tratamento de erros e feedback visual

#### /admin/events (Lista)
- [ ] **Redesign dos cards de evento**
  - Informações essenciais: nome, data, status, tipo de precificação
  - Design limpo e moderno
  - Botão "Detalhes" bem posicionado
  
- [ ] **Modal de detalhes do evento**
  - Layout organizado com todas as informações
  - Seção específica para precificação
  - Lista de zonas CEP com preços (se aplicável)
  - Botão "Editar Evento" com navegação
  
- [ ] **Estados de loading e error**
  - Skeleton loading para cards
  - Tratamento de erros na busca de detalhes

#### /admin/events/:id/edit
- [ ] **Carregamento de dados existentes**
  - Buscar preços personalizados ao carregar a página
  - Pré-popular formulário com dados atuais
  
- [ ] **Reutilização do componente CepZonePricing**
  - Modo de edição com dados pré-carregados
  - Indicação visual de preços alterados
  
- [ ] **Atualização otimizada**
  - Enviar apenas preços modificados
  - Feedback visual de sucesso/erro

---

## 🎨 Considerações de Design

### Layout e Espaçamento
- Uso consistente do design system existente
- Espaçamento adequado entre seções
- Hierarquia visual clara

### Responsividade
- Layout adaptável para diferentes tamanhos de tela
- Modal responsivo para dispositivos móveis
- Tabelas/listas otimizadas para mobile

### Feedback Visual
- Estados de loading apropriados
- Mensagens de sucesso/erro claras
- Indicadores visuais para diferentes tipos de precificação

---

## 🚀 Ordem de Implementação

### Fase 1: Backend
1. Criar/melhorar endpoints necessários
2. Testar integração com tabela `event_cep_zone_prices`
3. Validar performance das queries

### Fase 2: Componentes Reutilizáveis
1. Criar componente `CepZonePricing`
2. Implementar modal de detalhes
3. Criar utilitários de formatação

### Fase 3: Telas Específicas
1. Atualizar `/admin/events/new`
2. Refatorar `/admin/events` (lista)
3. Melhorar `/admin/events/:id/edit`

### Fase 4: Testes e Polimento
1. Testes de fluxo completo
2. Ajustes de UX/UI
3. Validação com dados reais

---

## 📊 Critérios de Sucesso
- [ ] Interface limpa e intuitiva para configuração de zonas CEP
- [ ] Modal de detalhes fornece todas as informações necessárias
- [ ] Fluxo de edição preserva dados existentes corretamente
- [ ] Performance adequada em todas as operações
- [ ] Design responsivo e acessível
- [ ] Feedback visual claro para todas as ações

---

## 📝 Notas Técnicas
- Reutilizar componentes existentes sempre que possível
- Manter consistência com padrões de design atuais
- Implementar tratamento robusto de erros
- Considerar cache de dados para melhor performance
- Documentar componentes novos adequadamente

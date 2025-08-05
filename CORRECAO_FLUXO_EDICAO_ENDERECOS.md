# Correção do Fluxo de Edição de Endereços

## 🚨 Problema Identificado

### Erro na Rota `/events/5/address/new`
- **Comportamento errado**: Ao clicar em "Adicionar Endereço", a página mostrava formulário de edição em vez de criação
- **Causa raiz**: Lógica de detecção de modo de edição estava interpretando incorretamente o ID numérico da URL como ID de endereço para edição

### URL Problemática:
```
/events/5/address/new
       ↑
  Interpreado incorretamente como ID de endereço para editar
```

## ✅ Solução Implementada

### 1. **Detecção Correta de Modo de Edição**

**Arquivo:** `client/src/pages/new-address.tsx`  
**Localização:** Linha 61

**Antes:**
```typescript
// Interpretava qualquer ID numérico como edição
const { data: existingAddress } = useQuery({
  queryKey: ["/api/addresses", id],
  enabled: Boolean(id && id.match(/^\d+$/)),
});
```

**Depois:**
```typescript
// Verifica se a URL contém '/edit' para determinar modo de edição
const isEditRoute = window.location.pathname.includes('/edit');

const { data: existingAddress } = useQuery({
  queryKey: ["/api/addresses", id],
  enabled: Boolean(id && id.match(/^\d+$/) && isEditRoute),
});
```

### 2. **Lógica de Estado Aprimorada**

**Localização:** Linha 69-85

```typescript
useEffect(() => {
  if (existingAddress && isEditRoute) {
    setIsEditing(true);
    // Carrega dados do endereço existente
    form.reset({...});
  } else {
    // Garante modo de criação para rotas novas
    setIsEditing(false);
  }
}, [existingAddress, isEditRoute]);
```

### 3. **Diferenciação de Rotas**

| Rota | Propósito | Modo |
|------|-----------|------|
| `/events/:id/address/new` | Criar novo endereço no contexto de evento | Criação |
| `/profile/address/new` | Criar novo endereço no perfil | Criação |
| `/profile/address/:id/edit` | Editar endereço existente | Edição |

## 🎯 Resultados

### ✅ Comportamento Correto Agora:

1. **`/events/5/address/new`**:
   - ✅ Mostra "Novo Endereço" no título
   - ✅ Formulário limpo para criação
   - ✅ Submissão cria novo endereço

2. **`/profile/address/123/edit`**:
   - ✅ Mostra "Editar Endereço" no título
   - ✅ Formulário preenchido com dados existentes
   - ✅ Submissão atualiza endereço existente

### 🔄 Fluxo de Navegação Corrigido:

```
Eventos → Endereço → "Adicionar Endereço" → /events/5/address/new
                                             ↓
                                        Formulário de CRIAÇÃO ✅
                                             ↓
                                        Novo endereço salvo
                                             ↓
                                        Volta para /events/5/address
```

## 🛠️ Para Futuras Implementações

### Princípio para Detectar Modo de Edição:
1. **Use padrão de URL explícito**: `/edit` na rota = modo de edição
2. **Não dependa apenas de IDs**: IDs podem aparecer em contextos diferentes
3. **Validação dupla**: Verificar tanto rota quanto existência de dados

### Template para Componentes Similares:
```typescript
const isEditRoute = window.location.pathname.includes('/edit');
const isEditMode = Boolean(existingData && isEditRoute);

useEffect(() => {
  if (isEditMode) {
    // Modo edição
    setEditing(true);
    form.reset(existingData);
  } else {
    // Modo criação
    setEditing(false);
  }
}, [existingData, isEditRoute]);
```

## 📋 Status da Correção

- ✅ **Problema identificado**: Interpretação incorreta de ID na URL
- ✅ **Solução implementada**: Detecção baseada em padrão `/edit` na URL
- ✅ **Teste realizado**: Rota `/events/5/address/new` agora funciona corretamente
- ✅ **Documentação atualizada**: Este guia para referência futura

### Rotas Validadas:
- ✅ `/events/:id/address/new` - Criação ✅
- ✅ `/profile/address/new` - Criação ✅  
- ✅ `/profile/address/:id/edit` - Edição ✅

A correção garante que o formulário de endereços sempre opere no modo correto baseado na intenção da URL, eliminando confusão entre criação e edição de endereços.
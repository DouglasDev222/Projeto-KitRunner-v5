# Correção e melhoria no fluxo de edição de endereços do cliente

Queremos realizar ajustes no fluxo de edição de endereços do cliente, garantindo o correto carregamento dos dados e o redirecionamento adequado ao finalizar ou cancelar a edição.

## 🐞 1. Correção de erro 401 ao editar endereço

### Problema:
Ao acessar a página `/profile/address/:id/edit`, ocorre um erro 401 (Unauthorized).

Com isso, os dados do endereço não são carregados para edição, mesmo com o cliente autenticado.

### Solução:
Consultar e aplicar as instruções do arquivo `AUTHENTICATION_FIX_GUIDE.md`, que explica como corrigir esse tipo de erro.

Verificar se:
- O token está sendo enviado corretamente nas chamadas autenticadas.
- A rota está protegida da forma certa.
- O fetch está utilizando o contexto de sessão/logado do cliente.

## 🔄 2. Correção no redirecionamento após editar endereço ou sair

### Comportamento atual:
Após editar um endereço ou clicar em "voltar", o sistema redireciona automaticamente para `/events/:id/address`, mesmo que o usuário tenha vindo da área de perfil.

### Comportamento desejado:
- Se o usuário acessou a edição de endereço a partir da tela de um evento (ex: `/events/8/address` → editar endereço), ao concluir ou cancelar deve voltar para `/events/8/address`.
- Se o usuário acessou diretamente pela área de perfil (ex: `/profile/address/8/edit`), ao concluir ou cancelar deve voltar para `/profile`.

### Solução:
Utilizar um parâmetro de origem ou referrer, por exemplo:
- `/profile/address/8/edit?from=profile`
- `/profile/address/8/edit?from=event&eventId=8`

Armazenar esse parâmetro e utilizá-lo para definir o comportamento de redirecionamento ao:
- Clicar em "Voltar"
- Concluir a edição

## ✅ Checklist

### Correção do erro 401:
- [x] Revisar autenticação conforme `AUTHENTICATION_FIX_GUIDE.md`
- [x] Verificar headers/token nas chamadas da página `/profile/address/:id/edit`
- [x] Garantir que a API permite o acesso correto a endereços do cliente autenticado

### Redirecionamento:
- [x] Implementar controle de origem via query param (`from=profile` ou `from=event&eventId=X`)
- [x] Adaptar lógica de "voltar" e pós-edição para redirecionar corretamente
- [x] Atualizar links em `profile.tsx` para incluir `?from=profile`
- [ ] Testar os dois fluxos:
  - Acesso via `/profile`
  - Acesso via `/events/:id/address` → editar endereço

## ✅ Implementação Concluída

### Correções Realizadas:

1. **Erro 401 (Unauthorized) Corrigido:**
   - Substituído `fetch()` direto por React Query com autenticação automática
   - Query agora usa `queryKey: ["/api/addresses", id]` com headers de auth
   - Aplicado padrão do `AUTHENTICATION_FIX_GUIDE.md`

2. **Sistema de Redirecionamento Baseado em Origem:**
   - Implementado parser de query parameters usando `useSearch()` do wouter
   - Função `getNavigationTarget()` determina destino correto baseado em contexto
   - Suporte para `from=profile`, `from=event&eventId=X`, e comportamento legacy
   - Aplicado em `onSuccess`, `handleCancel`, e redirecionamento de autenticação

3. **Links Atualizados:**
   - `profile.tsx`: Adicionado `?from=profile` em todos os links de edição e criação de endereços
   - Mantém compatibilidade com fluxo legacy para eventos

### Fluxos de Navegação:

**Do Perfil:**
- `/profile` → editar endereço → `/profile/address/8/edit?from=profile` → volta para `/profile`

**Do Evento:**
- `/events/8/address` → editar endereço → `/profile/address/8/edit?from=event&eventId=8` → volta para `/events/8/address`

**Legacy (compatibilidade):**
- URLs sem parâmetros mantêm comportamento anterior
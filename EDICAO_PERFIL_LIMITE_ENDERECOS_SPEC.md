# Edição de Perfil e Limite de Endereços - Especificação Técnica

## Objetivo Geral
Implementar funcionalidade de edição de perfil do cliente com validações de segurança e estabelecer limite de 2 endereços por cliente em todo o sistema.

## 📋 Especificação Detalhada

### 1. Edição de Perfil do Cliente - Tela /profile

#### 1.1 Funcionalidade
- Permitir que o cliente edite suas próprias informações cadastrais
- Restringir edição do campo CPF
- Utilizar endpoint existente de edição de cliente com validações específicas

#### 1.2 Campos Editáveis
✅ **Permitidos:**
- Nome
- Telefone 
- Gênero
- Data de nascimento
- E-mail (opcional)

❌ **Não Permitidos:**
- CPF
- ID
- Dados de outro cliente

#### 1.3 Validações de Segurança
- Cliente deve estar autenticado
- Cliente só pode editar seu próprio perfil
- Tentativa de editar CPF → ignorar ou retornar erro
- Tentativa de editar outro cliente → retornar 403 Forbidden

### 2. Limite de 2 Endereços por Cliente

#### 2.1 Regra Geral
- Cada cliente pode ter no máximo 2 endereços cadastrados
- Regra aplicada em todo o sistema (frontend e backend)

#### 2.2 Implementação por Tela

##### 2.2.1 Tela /profile
- Se já houver 2 endereços → ocultar botão "Adicionar novo endereço"
- Permitir editar endereços existentes (já implementado)

##### 2.2.2 Tela /events/:id/address
- Se já houver 2 endereços → ocultar botão "Adicionar novo endereço"
- Permitir seleção e edição dos endereços existentes

##### 2.2.3 Tela /register
- Permitir adicionar até 2 blocos de endereço no cadastro inicial
- Ocultar botão para novo endereço após atingir o limite

#### 2.3 Validação Backend
- Validar que nenhum cliente poderá registrar mais de 2 endereços via API
- Retornar erro apropriado ao tentar exceder o limite

## 🛠️ Implementação Técnica

### 3. Backend - Validações e Endpoints

#### 3.1 Endpoint de Edição de Cliente
- **Rota:** `PUT /api/customers/:id`
- **Validações adicionais:**
  - Verificar se usuário autenticado é o mesmo do :id
  - Remover CPF dos dados enviados se presente
  - Validar campos permitidos

#### 3.2 Validação de Limite de Endereços
- **Rota:** `POST /api/customers/:id/addresses`
- **Validação:** Contar endereços existentes antes de criar novo
- **Erro:** `400 Bad Request` se limite excedido

#### 3.3 Endpoint para Contar Endereços
- **Rota:** `GET /api/customers/:id/addresses/count`
- **Retorno:** `{ count: number }`

### 4. Frontend - Componentes e Telas

#### 4.1 Tela de Perfil (/profile)
- Formulário com campos editáveis
- Validação client-side
- Integração com endpoint de edição
- Gerenciamento de endereços com limite

#### 4.2 Componente de Endereços
- Lógica para ocultar botão "Adicionar" quando limite atingido
- Aplicar em todas as telas que gerenciam endereços

#### 4.3 Tela de Registro (/register)
- Permitir até 2 endereços no cadastro inicial
- Controle dinâmico de botões

## ✅ Checklist de Implementação

### Backend
- [ ] Modificar endpoint PUT /api/customers/:id com validações de segurança
- [ ] Implementar validação de limite de endereços em POST /api/customers/:id/addresses
- [ ] Criar endpoint GET /api/customers/:id/addresses/count
- [ ] Adicionar middlewares de autenticação e autorização
- [ ] Testes de validação de segurança

### Frontend
- [ ] Implementar tela de edição de perfil (/profile)
- [ ] Criar formulário com campos permitidos
- [ ] Implementar lógica de limite de endereços em /profile
- [ ] Aplicar limite de endereços em /events/:id/address
- [ ] Aplicar limite de endereços em /register
- [ ] Componente reutilizável para gerenciamento de endereços
- [ ] Validações client-side
- [ ] Tratamento de erros e feedbacks

### Validações Gerais
- [ ] Testes de segurança (tentativa de editar outro cliente)
- [ ] Testes de limite de endereços
- [ ] Validação de campos não editáveis (CPF)
- [ ] Testes de integração frontend/backend

## 📱 Fluxos de Usuário

### Fluxo 1: Edição de Perfil
1. Cliente acessa /profile
2. Visualiza dados atuais (exceto CPF editável)
3. Edita campos permitidos
4. Salva alterações
5. Recebe confirmação de sucesso

### Fluxo 2: Gerenciamento de Endereços
1. Cliente acessa tela com endereços
2. Sistema verifica quantidade de endereços
3. Se < 2: mostra botão "Adicionar"
4. Se = 2: oculta botão "Adicionar"
5. Permite editar endereços existentes

### Fluxo 3: Tentativa de Violação de Segurança
1. Cliente tenta editar CPF ou outro cliente
2. Sistema bloqueia operação
3. Retorna erro apropriado
4. Log de tentativa de violação (opcional)

## 🔒 Considerações de Segurança

1. **Autenticação:** Verificar token JWT válido
2. **Autorização:** Validar que cliente só acessa próprios dados
3. **Sanitização:** Limpar dados de entrada
4. **Validação:** Campos obrigatórios e formatos
5. **Auditoria:** Log de alterações importantes

## 📊 Critérios de Aceitação

### Edição de Perfil
- ✅ Cliente consegue editar campos permitidos
- ✅ CPF não pode ser editado
- ✅ Cliente não pode editar outros perfis
- ✅ Validações frontend e backend funcionando
- ✅ Mensagens de erro apropriadas

### Limite de Endereços
- ✅ Máximo 2 endereços por cliente
- ✅ Botão "Adicionar" oculto quando limite atingido
- ✅ Regra aplicada em todas as telas relevantes
- ✅ Validação backend impedindo criação excessiva
- ✅ Mensagens informativas sobre o limite
# Ajustes de Envio e Templates de Email – KitRunner

## Objetivo
Melhorar os emails enviados ao cliente pela aplicação KitRunner, tornando-os mais profissionais, funcionais e corrigindo erros de status.

## Checklist de Ações

### 1. Lógica de Envio
- [ ] Verifique se há um email sendo enviado com status aguardando pagamento após o cliente finalizar o pedido. Esse deve ser o Email de Confirmação de Pedido.
- [ ] Crie um novo email de confirmação de pagamento que será enviado somente quando o status mudar para (status: confirmado)
- [ ] Confirme que os demais emails de atualização de status são enviados automaticamente quando o status do pedido for alterado pelo admin.

### 2. Templates HTML Profissionais

#### Templates envolvidos:
- [ ] Template de Confirmação de Pedido
- [ ] Novo Template de Confirmação de Pagamento
- [ ] Template de Atualização de Status

#### Design Visual
- [ ] Header com logo KitRunner
- [ ] Cores da marca:
  - Primária: #5e17eb
  - Secundária: #077d2e (Não use muito, só para detalhes)
  - Fundo: Branco
  - textos: pretos 
- [ ] Layout responsivo (mobile e desktop)
- [ ] Footer com informações de contato

#### Conteúdo dos Templates
- **Confirmação de Pedido:**
  - Nome e CPF mascarado (000.000.000-00)
  - Número do pedido e data
  - Evento + Kits (nome/tamanhos)
  - Endereço de entrega
  - Custos e status “Aguardando pagamento”
  - Instruções + Link de acompanhamento

- **Confirmação de Pagamento (Novo):**
  - Dados do cliente
  - Confirmação do pagamento
  - Endereço confirmado
  - Informação (Envie em nosso whatsapp seu comprovante de inscrição e documento com foto para a retirada do seu kit junto a organização)
  - Link de acompanhamento

- **Atualização de Status:**
  - Status anterior → novo
  - Significado do novo status
  - Estimativa de próxima etapa
  - Contato para suporte

### 3. Correção: status undefined
- [ ] Verificar se o valor do `status` está sendo corretamente passado ao template
- [ ]  Verificar se o campo status está sendo passado corretamente para o template.
- [ ] Validar se há algum erro de digitação, key incorreta, ou formatação do JSON.

### 4. Fluxo de Emails por Tipo de Pagamento

#### 💳 Pagamento com Cartão
- [ ] Garantir que, ao realizar o pedido com cartão, os emails sejam enviados corretamente.
- [ ] Mesmo que o pagamento seja aprovado de forma instantânea:
  - [ ] Enviar o email de confirmação de pedido (status: aguardando pagamento)
  - [ ] Em seguida, enviar o email de confirmação de pagamento (status: confirmado), se o pagamento já estiver aprovado
- [ ] Isso significa que dois emails devem ser enviados para pedidos com cartão, se o retorno do gateway já indicar aprovação.

#### 🧾 Pagamento com PIX
- [ ] Validar que o mesmo comportamento se aplica:
  - [ ] Enviar confirmação de pedido (status: aguardando pagamento)
  - [ ] Quando o PIX for compensado (status mudar para confirmado), enviar o email de confirmação de pagamento
- [ ] Se o PIX for aprovado imediatamente, ambos os emails devem ser enviados juntos

### 5. Email de Pedido Entregue (Status: "entregue")

#### Objetivo
Enviar uma mensagem especial de agradecimento ao cliente após o status do pedido mudar para `entregue`. Este email **não deve seguir o fluxo de atualização de status padrão**.

#### Título do Email
- "Seu kit foi entregue com sucesso! 🎉"
- Ou: "Agradecemos por correr com a gente, [NOME]! 💛"

#### Conteúdo
- Nome do cliente (ex: “Olá, Pablo Ferreira 😊”)
- Confirmação de entrega no endereço informado
- Mensagem calorosa de agradecimento
- Incentivo para marcar a marca no Instagram: `@kitrunner_`
- Reforço de contato aberto para dúvidas
- Hashtag final: `#BoraCorrer 💨`

## Entrega Final
- Todos os emails devem estar visualmente padronizados com a identidade visual KitRunner.
- Templates testados e funcionando
- Lógica de envio corrigida e sem `undefined`

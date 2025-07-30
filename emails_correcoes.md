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

## Entrega Final
- Todos os emails devem estar visualmente padronizados com a identidade visual KitRunner.
- Templates testados e funcionando
- Lógica de envio corrigida e sem `undefined`

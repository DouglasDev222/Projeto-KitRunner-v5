# Checklist - Customização dos Templates de Email

## 1. Email: "Seu kit está a caminho!" (Kit En Route)

### Status dos Ajustes:
- [x] ✅ **Previsão de Entrega**: Alterar para 1 dia antes da data do evento
- [x] ✅ **Botão "Rastreamento"**: Alterar para "Detalhes do Pedido" e redirecionar para `/orders/{orderNumber}`
- [x] ✅ **Remover menção a código de rastreamento/rastreio**
- [x] ✅ **Rodapé**: Telefone 83 98130-2961 + botão WhatsApp

## 2. Email: Status "Retirada Confirmada"

### Status dos Ajustes:
- [x] ✅ **Alterar texto**: "Retirada Confirmada" → "Retirada em Andamento"
- [x] ✅ **Remover seção de rastreamento**
- [x] ✅ **Botão "Detalhes"**: Redirecionar para `/orders/{orderNumber}`
- [x] ✅ **Rodapé**: Telefone 83 98130-2961 + botão WhatsApp

## 3. Email: "Seu pedido de retirada de kit foi confirmado!"

### Status dos Ajustes:
- [x] ✅ **Melhorar Resumo Financeiro**: Mostrar todos os itens detalhados
- [x] ✅ **Editar "Próximos Passos"**: 
  - ✅ Pedido Confirmado - Agora
  - 🏃‍♀️ Retirada do Kit - até 1 dia antes do evento
  - 🚚 A Caminho - Logo após retirada
  - 📦 Entrega - 1 dia antes da data do evento
- [x] ✅ **Rodapé**: Telefone 83 98130-2961 + botão WhatsApp
- [x] ✅ **Remover referências a rastreamento**

## 4. Padrões Aplicados em TODOS os Emails:

### Status dos Ajustes Globais:
- [x] ✅ **Rodapé padrão**: Telefone 83 98130-2961
- [x] ✅ **Link WhatsApp**: Botão direto para contato
- [x] ✅ **Remoção de rastreamento**: Excluir menções a códigos/rastreio
- [x] ✅ **Redirecionamento**: Usar `/orders/{orderNumber}` para acompanhamento

## Progresso Geral: 12/12 itens concluídos (100%)

---

**Próximos Passos:**
1. Atualizar função `generateTrackingUrl` para usar `/orders/`
2. Modificar status display para "Retirada em Andamento"  
3. Atualizar templates individuais
4. Implementar rodapé padrão com WhatsApp
5. Testar templates atualizados
# Templates de Email - KitRunner

Este projeto contém templates de email modernos e responsivos para o sistema KitRunner, desenvolvidos em TypeScript com HTML/CSS otimizado para compatibilidade com clientes de email.

## 📁 Arquivos Principais

- **`email-types.ts`** - Definições de tipos TypeScript para todos os dados e configurações
- **`email-templates.ts`** - Implementação dos templates de email com HTML/CSS moderno

## 🎨 Características dos Templates

### Design Moderno
- **Gradientes e Animações**: Efeitos visuais modernos com gradientes CSS e animações sutis
- **Responsivo**: Compatível com desktop, tablet e mobile
- **Tema Personalizável**: Sistema de temas com cores e estilos configuráveis
- **Tipografia Moderna**: Fontes system-ui para melhor legibilidade

### Compatibilidade
- **Clientes de Email**: Testado para Gmail, Outlook, Apple Mail, etc.
- **Modo Escuro**: Suporte opcional para preferências do usuário
- **Acessibilidade**: Estrutura semântica e contraste adequado

## 📧 Tipos de Email Disponíveis

### 1. Confirmação de Pedido (`order_confirmation`)
- Detalhes completos do pedido
- Informações do evento e kits
- Timeline de próximos passos
- Resumo financeiro

### 2. Atualização de Status (`status_update`)
- Mudanças no status do pedido
- Comparação visual antes/depois
- Próximos passos e estimativas
- Código de rastreamento

### 3. Confirmação de Pagamento (`payment_confirmation`)
- Comprovante de pagamento
- Detalhes da transação
- Timeline de processamento
- Informações de entrega

### 4. Notificação de Entrega (`delivery_notification`)
- Aviso de saída para entrega
- Instruções importantes
- Contato do entregador
- Endereço de entrega

### 5. Entrega Concluída (`delivery_completed`)
- Confirmação de entrega
- Solicitação de feedback
- Compartilhamento social
- Próximos passos

### 6. Boas-vindas (`welcome`)
- Mensagem de boas-vindas
- Apresentação da empresa
- Recursos úteis
- Informações de suporte

### 7. Reset de Senha (`password_reset`)
- Link seguro para redefinição
- Instruções passo a passo
- Dicas de segurança
- Informações de expiração

### 8. Promocional (`promotional`)
- Ofertas especiais
- Call-to-action destacado
- Prova social
- Urgência/escassez

## 🛠️ Como Usar

### Importação Básica
```typescript
import { 
  generateOrderConfirmationTemplate,
  generateStatusUpdateTemplate,
  OrderConfirmationData,
  StatusUpdateData 
} from './email-templates';
```

### Exemplo de Uso
```typescript
// Dados do pedido
const orderData: OrderConfirmationData = {
  customerName: "João Silva",
  customerEmail: "joao@email.com",
  orderNumber: "KR-2024-001",
  customerCPF: "12345678901",
  eventName: "Maratona de São Paulo 2024",
  eventDate: "2024-04-14",
  eventLocation: "Ibirapuera, São Paulo - SP",
  kits: [
    {
      name: "João Silva",
      cpf: "12345678901",
      shirtSize: "M",
      category: "42K"
    }
  ],
  address: {
    street: "Rua das Flores",
    number: "123",
    neighborhood: "Centro",
    city: "São Paulo",
    state: "SP",
    zipCode: "01234-567"
  },
  pricing: {
    deliveryCost: "15.00",
    extraKitsCost: "0",
    donationCost: "5.00",
    totalCost: "20.00"
  },
  paymentMethod: "pix",
  status: "aguardando_pagamento"
};

// Gerar template
const emailTemplate = generateOrderConfirmationTemplate(orderData);

// Usar o template
console.log(emailTemplate.subject); // Assunto do email
console.log(emailTemplate.html);    // HTML do email
console.log(emailTemplate.text);    // Versão texto do email
```

### Personalização de Tema
```typescript
import { DEFAULT_THEME, EmailTheme } from './email-types';

// Tema personalizado
const customTheme: Partial<EmailTheme> = {
  primaryColor: '#ff6b35',
  secondaryColor: '#f7931e',
  accentColor: '#2ecc71',
  companyName: 'Minha Empresa',
  logoUrl: 'https://exemplo.com/logo.png'
};

// Usar tema personalizado
const orderData: OrderConfirmationData = {
  // ... outros dados
  theme: customTheme
};
```

## 🎨 Sistema de Temas

### Cores Padrão (KitRunner)
- **Primary**: `#5e17eb` (Roxo)
- **Secondary**: `#7c3aed` (Roxo claro)
- **Accent**: `#10b981` (Verde)
- **Background**: `#f8fafc` (Cinza claro)
- **Text**: `#1f2937` (Cinza escuro)

### Personalização
Todos os aspectos visuais podem ser personalizados através da interface `EmailTheme`:
- Cores (primária, secundária, destaque)
- Tipografia (família de fontes)
- Logo e branding
- Informações de contato
- Links sociais

## 🔧 Utilitários Incluídos

### Formatação
```typescript
import { EmailUtils } from './email-templates';

EmailUtils.formatCPF('12345678901');           // '123.456.789-01'
EmailUtils.formatCurrency('1500');             // 'R$ 15,00'
EmailUtils.formatDate('2024-04-14');           // '14 de abril de 2024'
EmailUtils.formatPhone('11987654321');         // '(11) 98765-4321'
```

### Status de Pedidos
```typescript
const statusInfo = EmailUtils.getStatusDisplay('em_transito');
// { text: 'Em Trânsito', color: '#f97316', class: 'status-em-transito' }
```

## 📱 Responsividade

Os templates são totalmente responsivos e se adaptam automaticamente a:
- **Desktop**: Layout completo com sidebar e grid
- **Tablet**: Layout adaptado com elementos empilhados
- **Mobile**: Layout linear otimizado para toque

### Breakpoints
- **Mobile**: `max-width: 600px`
- **Tablet**: `601px - 1024px`
- **Desktop**: `1025px+`

## 🚀 Melhorias Implementadas

### Em relação à versão original:

1. **Design Moderno**
   - Gradientes e sombras
   - Animações CSS sutis
   - Tipografia melhorada
   - Espaçamento consistente

2. **Funcionalidades Expandidas**
   - Novos tipos de email
   - Sistema de temas
   - Utilitários de formatação
   - Melhor estrutura de dados

3. **Responsividade Aprimorada**
   - Grid CSS moderno
   - Flexbox para layouts
   - Media queries otimizadas
   - Suporte a touch

4. **Compatibilidade**
   - Fallbacks para clientes antigos
   - Suporte a modo escuro
   - Estrutura semântica
   - Acessibilidade melhorada

## 📋 Próximos Passos Sugeridos

1. **Testes**: Testar em diferentes clientes de email
2. **Integração**: Integrar com sistema de envio (SendGrid, SES, etc.)
3. **Analytics**: Adicionar tracking de abertura e cliques
4. **A/B Testing**: Implementar testes de diferentes versões
5. **Localização**: Suporte a múltiplos idiomas

## 🤝 Contribuição

Para ajustar ou expandir os templates:

1. Modifique os tipos em `email-types.ts`
2. Implemente novos templates em `email-templates.ts`
3. Teste a responsividade em diferentes dispositivos
4. Valide a compatibilidade com clientes de email

---

**Desenvolvido para KitRunner** - Sistema de Gerenciamento de Kits para Eventos Esportivos









# Templates de Emails – KitRunner (Serviço de Retirada e Entrega de Kits de Corrida)

## Objetivo
Criar templates de emails que transmitam de forma clara, profissional e acolhedora o serviço da KitRunner: **retiramos seu kit e entregamos na sua casa**, com toda praticidade e segurança. Nada de “inscrição feita” — é um serviço premium.

---

## 🎨 Identidade Visual & Estilo de Comunicação

- **Tom de voz:** profissional, acolhedor, focado no serviço contratado.
- **Terminologia:** usar “seu pedido de retirada de kit foi confirmado”, “seu kit está a caminho”, “em breve em sua casa”.
- **Cores da marca com aplicação correta:**
  - Primária: `#5e17eb` (roxo) em banners, botões ou destaques.
  - Secundária: `#077d2e` (verde) para confirmações e ações positivas.
  - Texto em fundo branco ou fundo neutro — evitar texto escuro sobre roxo.

---

## 📨 Tipos de Emails e Exemplos de Comunicação

### 1. Confirmação de Serviço – Retirada de Kit
**Disparado quando:** serviço contratado e confirmação recebida da equipe.

**Exemplo de assunto e mensagem:**

- **Assunto:** Seu pedido de retirada de kit foi confirmado!  
- **Mensagem:**  
Olá, [Nome do Cliente]!
Seu pedido de retirada de kit foi confirmado.
Em breve, nossa equipe irá buscar seu kit no local do evento e entregá-lo no endereço informado.
Acompanhe todos os passos com o botão abaixo!

markdown
Copiar
Editar

### 2. Kit a Caminho – Diálogo de Status
**Disparado quando:** a KitRunner já retirou o kit e está a caminho da entrega.

**Exemplo de assunto e mensagem:**

- **Assunto:** Seu kit está a caminho!  
- **Mensagem:**  
Olá, [Nome]!
Seu kit já foi retirado e está a caminho da sua casa ou local informado.
Em breve será entregue com todo cuidado e agilidade.
Enquanto isso, você pode acompanhar em tempo real pelo botão abaixo.

markdown
Copiar
Editar

### 3. Confirmação de Entrega – Agradecimento
**Disparado quando:** status muda para `entregue`.

**Exemplo de assunto e mensagem:**

- **Assunto:** Seu kit chegou direitinho em sua casa! 🎉  
- **Mensagem:**  
Olá, [Nome]!
Seu kit foi entregue com sucesso no endereço informado.

A equipe da KitRunner agradece imensamente pela sua confiança. 💛
Se puder, nos marque no Instagram (@kitrunner_) — ajuda muito nosso trabalho! #BoraCorrer
Estamos à disposição para o que precisar. 🚀

markdown
Copiar
Editar

### 4. Atualização de Status (se houver outras etapas)
**Disparado em transições intermediárias, exceto entrega.**

**Exemplo de assunto e mensagem:**

- **Assunto:** Atualização do seu serviço — Status alterado para [Novo Status]  
- **Mensagem:**  
Olá, [Nome]!
O status do seu serviço mudou de [Status Anterior] para [Novo Status].
Isso significa: [descrição amigável].
Estimativa da próxima etapa: [tempo/previsão], se aplicável.
Em caso de dúvidas, entre em contato conosco!

yaml
Copiar
Editar

---

## ✅ Regras de Disparo e Fluxo de Emails

| Etapa                            | Status do Pedido    | Ações de Envio                                               |
|----------------------------------|---------------------|--------------------------------------------------------------|
| Contratação do serviço          | retirada confirmada | Enviar **Confirmação de Serviço**                            |
| Kit retirado e a caminho        | a caminho           | Enviar **Kit a Caminho**                                     |
| Entrega finalizada              | entregue            | Enviar **Confirmação de Entrega / Agradecimento**            |
| Outras atualizações intermediárias | qualquer status     | Enviar **Email de Atualização de Status** (se não for `entregue`) |

- Quando o status é `entregue`, utilize **exclusivamente o template de entrega**, sem disparar emails de atualização padrão.
- Todos os emails devem incluir botões de ação (ex: *Acompanhar Serviço*, *Ver Detalhes*).

---

## 🧩 Exemplo de Estrutura HTML (resumida)

```html
<header style="background:#5e17eb; color:#fff;">
<img src="logo.png" alt="KitRunner">
</header>
<section style="padding:20px; background:#fff; color:#333;">
<h1 style="color:#5e17eb;">Assunto com destaque</h1>
<p>Corpo da mensagem com saudação e explicação clara.</p>
<a href="#" style="background:#077d2e;color:#fff;padding:10px;">Acompanhar Serviço</a>
</section>
<footer style="background:#f5f5f5;color:#333;padding:10px;">
Contato | Instagram: @kitrunner_
</footer>
📝 Instruções para Implementação Técnica
Confirme que o campo de status está sendo passado aos templates de forma correta (evite undefined).

Garanta fluxo dinâmico: conforme cada status mudado, dispare o template correto.

Teste todos os fluxos simulando:

Contratação do serviço

Retirada do kit

Entrega na casa do cliente

Qualquer mudança intermediária

💬 Tom de Comunicação da Marca
Use vocativo com nome do cliente: “Olá, Maria!”, “Olá, João!”

Reforce que o serviço foi contratado e será executado por equipe especializada

Mensagens claras e objetivas — evite jargões técnicos de eventos

Finalize com tom de agradecimento e incentivo ao engajamento (ex: marcar no Instagram)



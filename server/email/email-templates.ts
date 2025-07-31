// Email Templates - KitRunner
// Templates de email modernos e responsivos para o sistema KitRunner

import {
  EmailTemplate,
  EmailTheme,
  DEFAULT_THEME,
  OrderConfirmationData,
  StatusUpdateData,
  DeliveryConfirmationData,
  STATUS_MAPPINGS
} from './email-types';

// Utilitários para formatação
export class EmailUtils {
  static formatCPF(cpf: string): string {
    if (!cpf) return '';
    const cleaned = cpf.replace(/\D/g, '');
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  static formatCurrency(value: string | number): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num);
  }

  static formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  }

  static formatPhone(phone: string): string {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return phone;
  }

  static getStatusDisplay(status: string) {
    return STATUS_MAPPINGS[status] || {
      text: status,
      description: 'Status atualizado',
      color: '#6b7280',
      class: 'status-default'
    };
  }
}

// CSS base para todos os templates
const getBaseCSS = (theme: EmailTheme) => `
  <style>
    /* Reset e estilos base */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: system-ui, -apple-system, 'Segoe UI', 'Roboto', sans-serif;
      line-height: 1.6;
      color: ${theme.textColor};
      background-color: ${theme.backgroundColor};
    }
    
    /* Container principal */
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      overflow: hidden;
    }
    
    /* Header */
    .header {
      background: linear-gradient(135deg, ${theme.primaryColor} 0%, #7c3aed 100%);
      color: #ffffff;
      padding: 30px 20px;
      text-align: center;
    }
    
    .logo {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 10px;
      text-decoration: none;
      color: #ffffff;
    }
    
    .header-subtitle {
      font-size: 16px;
      opacity: 0.9;
      margin: 0;
    }
    
    /* Conteúdo principal */
    .content {
      padding: 40px 30px;
    }
    
    .greeting {
      font-size: 20px;
      font-weight: 600;
      color: ${theme.primaryColor};
      margin-bottom: 20px;
    }
    
    .message {
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 30px;
      color: ${theme.textColor};
    }
    
    /* Cards de informação */
    .info-card {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    
    .info-card h3 {
      color: ${theme.primaryColor};
      font-size: 18px;
      margin-bottom: 15px;
      font-weight: 600;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      margin: 8px 0;
      padding: 5px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .info-row:last-child {
      border-bottom: none;
      font-weight: 600;
      font-size: 16px;
    }
    
    .info-label {
      color: #64748b;
      font-weight: 500;
    }
    
    .info-value {
      color: ${theme.textColor};
      font-weight: 600;
    }
    
    /* Status badge */
    .status-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 10px 0;
    }
    
    /* Botões de ação */
    .action-button {
      display: inline-block;
      background: linear-gradient(135deg, ${theme.secondaryColor} 0%, #059669 100%);
      color: #ffffff !important;
      padding: 15px 30px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
      margin: 20px 0;
      transition: transform 0.2s ease;
    }
    
    .action-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }
    
    /* Lista de kits */
    .kit-list {
      background-color: #f8fafc;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    
    .kit-item {
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 15px;
      margin: 10px 0;
    }
    
    .kit-item h4 {
      color: ${theme.primaryColor};
      margin-bottom: 8px;
    }
    
    /* Endereço */
    .address-card {
      background-color: #fef7ff;
      border: 1px solid #e9d5ff;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    
    /* Footer */
    .footer {
      background-color: #f1f5f9;
      padding: 30px 20px;
      text-align: center;
      color: #64748b;
      font-size: 14px;
    }
    
    .social-links {
      margin: 20px 0;
    }
    
    .social-links a {
      color: ${theme.primaryColor};
      text-decoration: none;
      margin: 0 10px;
      font-weight: 600;
    }
    
    /* Responsividade */
    @media only screen and (max-width: 600px) {
      .email-container { margin: 10px; }
      .content { padding: 20px 15px; }
      .header { padding: 20px 15px; }
      .info-row { flex-direction: column; }
      .info-label, .info-value { margin: 2px 0; }
      .action-button { 
        display: block; 
        width: 100%; 
        text-align: center; 
      }
    }
  </style>
`;

// Template base para estrutura HTML
const getBaseHTML = (theme: EmailTheme, content: string) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${theme.companyName}</title>
  ${getBaseCSS(theme)}
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="logo">${theme.companyName}</div>
      <p class="header-subtitle">Retirada e Entrega de Kits Esportivos</p>
    </div>
    
    <div class="content">
      ${content}
    </div>
    
    <div class="footer">
      <p><strong>Precisa de ajuda?</strong></p>
      <p>Email: ${theme.supportEmail} | Telefone: ${theme.supportPhone}</p>
      
      <div class="social-links">
        <a href="https://instagram.com/${theme.instagramHandle.replace('@', '')}">Siga-nos no Instagram ${theme.instagramHandle}</a>
      </div>
      
      <p style="margin-top: 20px; font-size: 12px; color: #94a3b8;">
        ${theme.companyName} - Facilitando sua participação em eventos esportivos
      </p>
    </div>
  </div>
</body>
</html>
`;

// Template: Confirmação de Serviço/Pedido
export function generateOrderConfirmationTemplate(data: OrderConfirmationData): EmailTemplate {
  const theme = { ...DEFAULT_THEME, ...data.theme };
  const statusInfo = EmailUtils.getStatusDisplay(data.status);
  
  const content = `
    <h1 class="greeting">Olá, ${data.customerName}!</h1>
    
    <div class="message">
      <p><strong>Seu pedido de retirada de kit foi confirmado!</strong></p>
      <p>Em breve, nossa equipe irá buscar seu kit no local do evento e entregá-lo no endereço informado.</p>
      <p>Acompanhe todos os passos com o botão abaixo!</p>
    </div>
    
    <div style="text-align: center;">
      <span class="status-badge" style="background-color: ${statusInfo.color}; color: #ffffff;">
        ${statusInfo.text}
      </span>
    </div>
    
    <div class="info-card">
      <h3>📋 Detalhes do Serviço</h3>
      <div class="info-row">
        <span class="info-label">Pedido:</span>
        <span class="info-value">${data.orderNumber}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Evento:</span>
        <span class="info-value">${data.eventName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Data do Evento:</span>
        <span class="info-value">${EmailUtils.formatDate(data.eventDate)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Local:</span>
        <span class="info-value">${data.eventLocation}</span>
      </div>
    </div>
    
    <div class="kit-list">
      <h3>🎽 Kits a serem retirados</h3>
      ${data.kits.map(kit => `
        <div class="kit-item">
          <h4>${kit.name}</h4>
          <p><strong>CPF:</strong> ${EmailUtils.formatCPF(kit.cpf)}</p>
          <p><strong>Tamanho:</strong> ${kit.shirtSize}</p>
        </div>
      `).join('')}
    </div>
    
    <div class="address-card">
      <h3>🏠 Endereço de Entrega</h3>
      <p><strong>${data.address.street}, ${data.address.number}</strong></p>
      ${data.address.complement ? `<p>${data.address.complement}</p>` : ''}
      <p>${data.address.neighborhood} - ${data.address.city}/${data.address.state}</p>
      <p><strong>CEP:</strong> ${data.address.zipCode}</p>
    </div>
    
    <div class="info-card">
      <h3>💰 Resumo Financeiro</h3>
      <div class="info-row">
        <span class="info-label">Custo de Entrega:</span>
        <span class="info-value">${EmailUtils.formatCurrency(data.pricing.deliveryCost)}</span>
      </div>
      ${parseFloat(data.pricing.extraKitsCost) > 0 ? `
      <div class="info-row">
        <span class="info-label">Kits Extras:</span>
        <span class="info-value">${EmailUtils.formatCurrency(data.pricing.extraKitsCost)}</span>
      </div>
      ` : ''}
      ${parseFloat(data.pricing.donationCost) > 0 ? `
      <div class="info-row">
        <span class="info-label">Doação:</span>
        <span class="info-value">${EmailUtils.formatCurrency(data.pricing.donationCost)}</span>
      </div>
      ` : ''}
      <div class="info-row">
        <span class="info-label">Total:</span>
        <span class="info-value">${EmailUtils.formatCurrency(data.pricing.totalCost)}</span>
      </div>
    </div>
    
    <div style="text-align: center;">
      <a href="${theme.websiteUrl}/order/${data.orderNumber}" class="action-button">
        Acompanhar Serviço
      </a>
    </div>
  `;
  
  return {
    subject: 'Seu pedido de retirada de kit foi confirmado! 🎯',
    html: getBaseHTML(theme, content),
    text: `
Olá, ${data.customerName}!

Seu pedido de retirada de kit foi confirmado!

Pedido: ${data.orderNumber}
Evento: ${data.eventName}
Data: ${EmailUtils.formatDate(data.eventDate)}

Em breve, nossa equipe irá buscar seu kit no local do evento e entregá-lo no endereço informado.

Acompanhe em: ${theme.websiteUrl}/order/${data.orderNumber}

${theme.companyName}
${theme.supportEmail}
    `.trim()
  };
}

// Template: Atualização de Status
export function generateStatusUpdateTemplate(data: StatusUpdateData): EmailTemplate {
  const theme = { ...DEFAULT_THEME, ...data.theme };
  const newStatusInfo = EmailUtils.getStatusDisplay(data.newStatus);
  
  // Casos especiais baseados no status
  let subject = '';
  let message = '';
  
  if (data.newStatus === 'em_transito') {
    subject = 'Seu kit está a caminho! 🚚';
    message = `
      <p><strong>Seu kit já foi retirado e está a caminho da sua casa!</strong></p>
      <p>Em breve será entregue com todo cuidado e agilidade.</p>
      <p>Enquanto isso, você pode acompanhar em tempo real pelo botão abaixo.</p>
    `;
  } else if (data.newStatus === 'entregue') {
    subject = 'Seu kit chegou direitinho em sua casa! 🎉';
    message = `
      <p><strong>Seu kit foi entregue com sucesso no endereço informado.</strong></p>
      <p>A equipe da KitRunner agradece imensamente pela sua confiança. 💛</p>
      <p>Se puder, nos marque no Instagram (@kitrunner_) — ajuda muito nosso trabalho! #BoraCorrer</p>
      <p>Estamos à disposição para o que precisar. 🚀</p>
    `;
  } else {
    subject = `Atualização do seu serviço — Status alterado para ${newStatusInfo.text}`;
    message = `
      <p><strong>O status do seu serviço foi atualizado!</strong></p>
      <p>${data.statusDescription}</p>
      ${data.estimatedNextStep ? `<p><strong>Próxima etapa:</strong> ${data.estimatedNextStep}</p>` : ''}
      <p>Em caso de dúvidas, entre em contato conosco!</p>
    `;
  }
  
  const content = `
    <h1 class="greeting">Olá, ${data.customerName}!</h1>
    
    <div class="message">
      ${message}
    </div>
    
    <div style="text-align: center;">
      <span class="status-badge" style="background-color: ${newStatusInfo.color}; color: #ffffff;">
        ${newStatusInfo.text}
      </span>
    </div>
    
    <div class="info-card">
      <h3>📋 Informações do Pedido</h3>
      <div class="info-row">
        <span class="info-label">Pedido:</span>
        <span class="info-value">${data.orderNumber}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Evento:</span>
        <span class="info-value">${data.eventName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Status Atual:</span>
        <span class="info-value">${newStatusInfo.text}</span>
      </div>
    </div>
    
    ${data.newStatus === 'entregue' ? `
    <div class="info-card" style="background-color: #f0fdf4; border-color: #bbf7d0;">
      <h3 style="color: #059669;">🎉 Entrega Concluída!</h3>
      <p>Obrigado por escolher a KitRunner para seu serviço de retirada de kit!</p>
      <p>Compartilhe sua experiência nas redes sociais e nos marque!</p>
    </div>
    ` : ''}
    
    <div style="text-align: center;">
      <a href="${theme.websiteUrl}/order/${data.orderNumber}" class="action-button">
        ${data.newStatus === 'entregue' ? 'Ver Detalhes da Entrega' : 'Acompanhar Serviço'}
      </a>
    </div>
  `;
  
  return {
    subject,
    html: getBaseHTML(theme, content),
    text: `
Olá, ${data.customerName}!

${message.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim()}

Pedido: ${data.orderNumber}
Status Atual: ${newStatusInfo.text}

Acompanhe em: ${theme.websiteUrl}/order/${data.orderNumber}

${theme.companyName}
${theme.supportEmail}
    `.trim()
  };
}

// Template: Confirmação de Entrega (específico)
export function generateDeliveryConfirmationTemplate(data: DeliveryConfirmationData): EmailTemplate {
  const theme = { ...DEFAULT_THEME, ...data.theme };
  
  const content = `
    <h1 class="greeting">Olá, ${data.customerName}!</h1>
    
    <div class="message">
      <p><strong>Seu kit chegou direitinho em sua casa! 🎉</strong></p>
      <p>Seu kit foi entregue com sucesso no endereço informado.</p>
      <p>A equipe da KitRunner agradece imensamente pela sua confiança. 💛</p>
      <p>Se puder, nos marque no Instagram (@kitrunner_) — ajuda muito nosso trabalho! #BoraCorrer</p>
      <p>Estamos à disposição para o que precisar. 🚀</p>
    </div>
    
    <div style="text-align: center;">
      <span class="status-badge" style="background-color: #10b981; color: #ffffff;">
        Entregue com Sucesso
      </span>
    </div>
    
    <div class="info-card" style="background-color: #f0fdf4; border-color: #bbf7d0;">
      <h3 style="color: #059669;">📦 Detalhes da Entrega</h3>
      <div class="info-row">
        <span class="info-label">Pedido:</span>
        <span class="info-value">${data.orderNumber}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Evento:</span>
        <span class="info-value">${data.eventName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Data da Entrega:</span>
        <span class="info-value">${EmailUtils.formatDate(data.deliveryDate)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Horário:</span>
        <span class="info-value">${data.deliveryTime}</span>
      </div>
    </div>
    
    <div class="address-card">
      <h3>📍 Local de Entrega</h3>
      <p><strong>${data.address.street}, ${data.address.number}</strong></p>
      <p>${data.address.neighborhood} - ${data.address.city}/${data.address.state}</p>
    </div>
    
    <div class="info-card">
      <h3>🌟 Conte sua Experiência!</h3>
      <p>Compartilhe sua experiência nas redes sociais e nos marque no Instagram!</p>
      <p>Sua opinião é muito importante para nós e ajuda outros corredores!</p>
    </div>
    
    <div style="text-align: center;">
      <a href="${theme.websiteUrl}/order/${data.orderNumber}" class="action-button">
        Ver Detalhes Completos
      </a>
    </div>
  `;
  
  return {
    subject: 'Seu kit chegou direitinho em sua casa! 🎉',
    html: getBaseHTML(theme, content),
    text: `
Olá, ${data.customerName}!

Seu kit chegou direitinho em sua casa! 🎉

Seu kit foi entregue com sucesso no endereço informado.

Pedido: ${data.orderNumber}
Evento: ${data.eventName}
Data da Entrega: ${EmailUtils.formatDate(data.deliveryDate)}
Horário: ${data.deliveryTime}

A equipe da KitRunner agradece imensamente pela sua confiança.

Se puder, nos marque no Instagram (@kitrunner_) — ajuda muito nosso trabalho! #BoraCorrer

${theme.companyName}
${theme.supportEmail}
    `.trim()
  };
}
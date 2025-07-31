import { OrderConfirmationData, StatusUpdateData, PaymentConfirmationData, DeliveryCompletedData, EmailTemplate } from './email-types';

const KITRUNNER_LOGO = 'https://assets.replit.app/attached_assets/Orange-Blue-Express-Delivery-Logistic-Logo1-1%20(1)_1753898762911.webp';

const baseStyles = `
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: white; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; border: 1px solid #e5e7eb; }
    .header { background-color: #5e17eb; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; color: #000000; }
    .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #e5e7eb; }
    .status-badge { padding: 8px 16px; border-radius: 20px; font-weight: bold; text-transform: uppercase; font-size: 12px; }
    .status-aguardando { background-color: #f59e0b; color: white; }
    .status-confirmado { background-color: #077d2e; color: white; }
    .status-entregue { background-color: #077d2e; color: white; }
    .kit-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin: 10px 0; background-color: #f9fafb; }
    .info-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .info-card.primary { background-color: #f3f0ff; border-color: #5e17eb; }
    .info-card.success { background-color: #f0f9f0; border-color: #077d2e; }
    .pricing-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .pricing-table td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
    .total-row { font-weight: bold; background-color: #f3f4f6; }
    .button { display: inline-block; padding: 12px 24px; background-color: #5e17eb; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
    .button:hover { background-color: #4c0fb5; }
    .highlight { color: #5e17eb; font-weight: bold; }
    h1, h2, h3 { color: #000000; }
    .logo { max-height: 50px; width: auto; }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; margin: 0 !important; }
      .content { padding: 20px !important; }
      .info-card { margin: 15px 0 !important; padding: 15px !important; }
    }
  </style>
`;

// Function to format CPF with mask
function formatCPF(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// Function to get status display
function getStatusDisplay(status: string): { text: string, class: string } {
  switch (status) {
    case 'aguardando_pagamento':
      return { text: 'Aguardando Pagamento', class: 'status-aguardando' };
    case 'confirmado':
      return { text: 'Confirmado', class: 'status-confirmado' };
    case 'entregue':
      return { text: 'Entregue', class: 'status-entregue' };
    default:
      return { text: status || 'Aguardando Pagamento', class: 'status-aguardando' };
  }
}

export function generateOrderConfirmationTemplate(data: OrderConfirmationData): EmailTemplate {
  const subject = `Pedido ${data.orderNumber} confirmado - KitRunner`;
  const statusDisplay = getStatusDisplay(data.status);
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      ${baseStyles}
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <img src="${KITRUNNER_LOGO}" alt="KitRunner" class="logo">
          <h1 style="margin: 10px 0 0 0; font-size: 24px;">Pedido Confirmado!</h1>
        </div>

        <!-- Content -->
        <div class="content">
          <p>Olá <strong>${data.customerName}</strong>,</p>
          
          <p>Seu pedido foi confirmado com sucesso! Aqui estão os detalhes:</p>

          <!-- Order Info -->
          <div class="info-card primary">
            <h2 style="margin: 0 0 10px 0; color: #5e17eb;">Detalhes do Pedido</h2>
            <p><strong>Número do Pedido:</strong> <span class="highlight">${data.orderNumber}</span></p>
            <p><strong>CPF:</strong> ${formatCPF(data.customerCPF)}</p>
            <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
            <p><strong>Status:</strong> <span class="status-badge ${statusDisplay.class}">${statusDisplay.text}</span></p>
          </div>

          <!-- Event Info -->
          <div class="info-card">
            <h2 style="margin: 0 0 10px 0; color: #000000;">🏃‍♂️ Evento</h2>
            <p><strong>${data.eventName}</strong></p>
            <p>📅 ${data.eventDate}</p>
            <p>📍 ${data.eventLocation}</p>
          </div>

          <!-- Kits -->
          <h2>🎽 Kits Solicitados (${data.kits.length})</h2>
          ${data.kits.map((kit, index) => `
            <div class="kit-card">
              <h3 style="margin: 0 0 10px 0;">Kit ${index + 1}</h3>
              <p><strong>Nome:</strong> ${kit.name}</p>
              <p><strong>CPF:</strong> ${formatCPF(kit.cpf)}</p>
              <p><strong>Tamanho da Camisa:</strong> ${kit.shirtSize}</p>
            </div>
          `).join('')}

          <!-- Address -->
          <h2>Endereço de Entrega</h2>
          <div class="kit-card">
            <p>
              ${data.address.street}, ${data.address.number}
              ${data.address.complement ? `, ${data.address.complement}` : ''}
            </p>
            <p>${data.address.neighborhood} - ${data.address.city}/${data.address.state}</p>
            <p>CEP: ${data.address.zipCode}</p>
          </div>

          <!-- Pricing -->
          <h2>Resumo Financeiro</h2>
          <table class="pricing-table">
            <tr>
              <td>Taxa de Entrega</td>
              <td style="text-align: right;">R$ ${data.pricing.deliveryCost}</td>
            </tr>
            ${data.pricing.extraKitsCost !== '0' ? `
            <tr>
              <td>Kits Extras</td>
              <td style="text-align: right;">R$ ${data.pricing.extraKitsCost}</td>
            </tr>
            ` : ''}
            ${data.pricing.donationCost !== '0' ? `
            <tr>
              <td>Doação</td>
              <td style="text-align: right;">R$ ${data.pricing.donationCost}</td>
            </tr>
            ` : ''}
            <tr class="total-row">
              <td><strong>Total</strong></td>
              <td style="text-align: right;"><strong>R$ ${data.pricing.totalCost}</strong></td>
            </tr>
          </table>

          <p><strong>Método de Pagamento:</strong> ${data.paymentMethod === 'pix' ? 'PIX' : data.paymentMethod === 'credit' ? 'Cartão de Crédito' : 'Cartão de Débito'}</p>

          <!-- Next Steps -->
          <div class="info-card primary">
            <h3 style="margin: 0 0 15px 0; color: #5e17eb;">📋 Instruções Importantes</h3>
            <p><strong>Status atual:</strong> Aguardando pagamento - seu pedido foi registrado com sucesso!</p>
            <p><strong>Próximos passos:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Complete o pagamento conforme escolhido</li>
              <li>Aguarde a confirmação do pagamento</li>
              <li>Você receberá um email quando o pagamento for confirmado</li>
              <li>Os kits serão preparados para entrega</li>
            </ul>
            <p style="background-color: #f0f9f0; padding: 10px; border-radius: 5px; margin: 15px 0;">
              💡 <strong>Dica:</strong> Você pode acompanhar o status do seu pedido a qualquer momento através do link abaixo.
            </p>
          </div>

          <p style="text-align: center; margin: 30px 0;">
            <a href="${process.env.REPLIT_DOMAINS || 'http://localhost:5000'}/my-orders" class="button">
              Acompanhar Pedido
            </a>
          </p>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p><strong>KitRunner</strong> - Sistema de Gerenciamento de Kits para Eventos</p>
          <p>Em caso de dúvidas, entre em contato conosco.</p>
          <p>Este é um email automático, não responda.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Pedido ${data.orderNumber} confirmado - KitRunner

Olá ${data.customerName},

Seu pedido foi confirmado com sucesso!

DETALHES DO PEDIDO:
- Número: ${data.orderNumber}
- CPF: ${data.customerCPF}
- Status: ${data.status}

EVENTO:
- ${data.eventName}
- Data: ${data.eventDate}
- Local: ${data.eventLocation}

KITS SOLICITADOS (${data.kits.length}):
${data.kits.map((kit, index) => `
Kit ${index + 1}:
- Nome: ${kit.name}
- CPF: ${kit.cpf}
- Tamanho: ${kit.shirtSize}
`).join('')}

ENDEREÇO DE ENTREGA:
${data.address.street}, ${data.address.number}${data.address.complement ? `, ${data.address.complement}` : ''}
${data.address.neighborhood} - ${data.address.city}/${data.address.state}
CEP: ${data.address.zipCode}

RESUMO FINANCEIRO:
- Taxa de Entrega: R$ ${data.pricing.deliveryCost}
${data.pricing.extraKitsCost !== '0' ? `- Kits Extras: R$ ${data.pricing.extraKitsCost}` : ''}
${data.pricing.donationCost !== '0' ? `- Doação: R$ ${data.pricing.donationCost}` : ''}
- Total: R$ ${data.pricing.totalCost}

Método de Pagamento: ${data.paymentMethod === 'pix' ? 'PIX' : data.paymentMethod === 'credit' ? 'Cartão de Crédito' : 'Cartão de Débito'}

PRÓXIMOS PASSOS:
• Aguarde a confirmação do pagamento
• Os kits serão separados para entrega
• Você receberá atualizações por email sobre o status do seu pedido

Acompanhe seu pedido: ${process.env.REPLIT_DOMAINS || 'http://localhost:5000'}/my-orders

KitRunner - Sistema de Gerenciamento de Kits para Eventos
Em caso de dúvidas, entre em contato conosco.
Este é um email automático, não responda.
  `;

  return { subject, html, text };
}

export function generateStatusUpdateTemplate(data: StatusUpdateData): EmailTemplate {
  const subject = `Atualização do pedido ${data.orderNumber} - KitRunner`;
  
  const statusColors: Record<string, string> = {
    'confirmado': '#10B981',
    'aguardando_pagamento': '#F59E0B',
    'cancelado': '#EF4444',
    'kits_sendo_retirados': '#3B82F6',
    'em_transito': '#F97316',
    'entregue': '#10B981'
  };

  const statusColor = statusColors[data.newStatus] || '#6B7280';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      ${baseStyles}
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <img src="${KITRUNNER_LOGO}" alt="KitRunner" style="height: 40px;">
          <h1 style="margin: 10px 0 0 0; font-size: 24px;">Status Atualizado</h1>
        </div>

        <!-- Content -->
        <div class="content">
          <p>Olá <strong>${data.customerName}</strong>,</p>
          
          <p>O status do seu pedido foi atualizado:</p>

          <!-- Order Info -->
          <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin: 0 0 10px 0; color: #1e40af;">Pedido ${data.orderNumber}</h2>
            <p><strong>Evento:</strong> ${data.eventName}</p>
          </div>

          <!-- Status Update -->
          <div style="background-color: #f9fafb; border: 2px solid ${statusColor}; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin: 0 0 15px 0; color: ${statusColor};">Novo Status</h2>
            <p style="font-size: 18px; margin: 0;"><strong>${data.statusDescription}</strong></p>
            ${data.estimatedTime ? `<p style="margin: 10px 0 0 0; color: #6B7280;">Estimativa: ${data.estimatedTime}</p>` : ''}
          </div>

          <p style="text-align: center; margin: 30px 0;">
            <a href="${process.env.REPLIT_DOMAINS || 'http://localhost:5000'}/my-orders" class="button">
              Ver Detalhes do Pedido
            </a>
          </p>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p><strong>KitRunner</strong> - Sistema de Gerenciamento de Kits para Eventos</p>
          <p>Em caso de dúvidas, entre em contato conosco.</p>
          <p>Este é um email automático, não responda.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Atualização do pedido ${data.orderNumber} - KitRunner

Olá ${data.customerName},

O status do seu pedido foi atualizado:

PEDIDO: ${data.orderNumber}
EVENTO: ${data.eventName}

NOVO STATUS: ${data.statusDescription}
${data.estimatedTime ? `Estimativa: ${data.estimatedTime}` : ''}

Acompanhe seu pedido: ${process.env.REPLIT_DOMAINS || 'http://localhost:5000'}/my-orders

KitRunner - Sistema de Gerenciamento de Kits para Eventos
Em caso de dúvidas, entre em contato conosco.
Este é um email automático, não responda.
  `;

  return { subject, html, text };
}

export function generatePaymentConfirmationTemplate(data: PaymentConfirmationData): EmailTemplate {
  const subject = `🎉 Pagamento confirmado - Pedido ${data.orderNumber} - KitRunner`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      ${baseStyles}
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <img src="${KITRUNNER_LOGO}" alt="KitRunner" class="logo">
          <h1 style="margin: 10px 0 0 0; font-size: 24px;">🎉 Pagamento Confirmado!</h1>
        </div>

        <!-- Content -->
        <div class="content">
          <p>Olá <strong>${data.customerName}</strong>,</p>
          
          <p>Excelente notícia! Seu pagamento foi confirmado com sucesso e seu pedido está sendo processado.</p>

          <!-- Payment Confirmation -->
          <div class="info-card success">
            <h2 style="margin: 0 0 10px 0; color: #077d2e;">✅ Pagamento Confirmado</h2>
            <p><strong>Pedido:</strong> <span class="highlight">${data.orderNumber}</span></p>
            <p><strong>Cliente:</strong> ${data.customerName}</p>
            <p><strong>CPF:</strong> ${formatCPF(data.customerCPF)}</p>
            <p><strong>Status:</strong> <span class="status-badge status-confirmado">Confirmado</span></p>
          </div>

          <!-- Event Info -->
          <div class="info-card">
            <h2 style="margin: 0 0 10px 0; color: #000000;">🏃‍♂️ Evento</h2>
            <p><strong>${data.eventName}</strong></p>
            <p>📅 ${data.eventDate}</p>
            <p>📍 ${data.eventLocation}</p>
          </div>

          <!-- Address Confirmation -->
          <div class="info-card">
            <h2 style="margin: 0 0 10px 0; color: #000000;">📍 Endereço Confirmado</h2>
            <p>
              ${data.address.street}, ${data.address.number}
              ${data.address.complement ? `, ${data.address.complement}` : ''}
            </p>
            <p>${data.address.neighborhood} - ${data.address.city}/${data.address.state}</p>
            <p>CEP: ${data.address.zipCode}</p>
          </div>

          <!-- Kits -->
          <h2>🎽 Seus Kits (${data.kits.length})</h2>
          ${data.kits.map((kit, index) => `
            <div class="kit-card">
              <h3 style="margin: 0 0 10px 0;">Kit ${index + 1}</h3>
              <p><strong>Nome:</strong> ${kit.name}</p>
              <p><strong>CPF:</strong> ${formatCPF(kit.cpf)}</p>
              <p><strong>Tamanho da Camisa:</strong> ${kit.shirtSize}</p>
            </div>
          `).join('')}

          <!-- Important Instructions -->
          <div class="info-card primary">
            <h3 style="margin: 0 0 15px 0; color: #5e17eb;">📱 Instruções para Retirada</h3>
            <p><strong>⚠️ IMPORTANTE:</strong> Para retirar seus kits junto à organização do evento, você deve:</p>
            <p style="background-color: #fffacd; padding: 10px; border-radius: 5px; margin: 10px 0;"><strong>Envie em nosso WhatsApp seu comprovante de inscrição e documento com foto para a retirada do seu kit junto a organização</strong></p>
            <ul style="margin: 15px 0; padding-left: 20px;">
              <li>✅ Comprovante de inscrição no evento</li>
              <li>✅ Documento com foto (RG ou CNH)</li>
            </ul>
            <p style="background-color: #f0f9f0; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <strong>📞 WhatsApp KitRunner:</strong> Em breve enviaremos o número para contato!
            </p>
          </div>

          <p style="text-align: center; margin: 30px 0;">
            <a href="${process.env.REPLIT_DOMAINS || 'http://localhost:5000'}/my-orders" class="button">
              Acompanhar Pedido
            </a>
          </p>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p><strong>KitRunner</strong> - Sistema de Gerenciamento de Kits para Eventos</p>
          <p>Em caso de dúvidas, entre em contato conosco.</p>
          <p>Este é um email automático, não responda.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Pagamento confirmado - Pedido ${data.orderNumber} - KitRunner

Olá ${data.customerName},

Excelente notícia! Seu pagamento foi confirmado com sucesso.

PAGAMENTO CONFIRMADO:
- Pedido: ${data.orderNumber}
- Cliente: ${data.customerName}
- CPF: ${formatCPF(data.customerCPF)}
- Status: Confirmado

EVENTO:
- ${data.eventName}
- Data: ${data.eventDate}
- Local: ${data.eventLocation}

ENDEREÇO CONFIRMADO:
${data.address.street}, ${data.address.number}${data.address.complement ? `, ${data.address.complement}` : ''}
${data.address.neighborhood} - ${data.address.city}/${data.address.state}
CEP: ${data.address.zipCode}

SEUS KITS (${data.kits.length}):
${data.kits.map((kit, index) => `
Kit ${index + 1}:
- Nome: ${kit.name}
- CPF: ${formatCPF(kit.cpf)}
- Tamanho: ${kit.shirtSize}
`).join('')}

INSTRUÇÕES PARA RETIRADA:
IMPORTANTE: Para retirar seus kits junto à organização do evento, você deve:
Envie em nosso WhatsApp seu comprovante de inscrição e documento com foto para a retirada do seu kit junto a organização

- ✅ Comprovante de inscrição no evento
- ✅ Documento com foto (RG ou CNH)

WhatsApp KitRunner: Em breve enviaremos o número para contato!

Acompanhe seu pedido: ${process.env.REPLIT_DOMAINS || 'http://localhost:5000'}/my-orders

KitRunner - Sistema de Gerenciamento de Kits para Eventos
Em caso de dúvidas, entre em contato conosco.
Este é um email automático, não responda.
  `;

  return { subject, html, text };
}

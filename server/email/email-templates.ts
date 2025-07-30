import { OrderConfirmationData, StatusUpdateData, EmailTemplate } from './email-types';

const KITRUNNER_LOGO = 'https://assets.replit.app/attached_assets/Orange-Blue-Express-Delivery-Logistic-Logo1-1%20(1)_1753898762911.webp';

const baseStyles = `
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; }
    .header { background-color: #3B82F6; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; }
    .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
    .status-badge { padding: 8px 16px; border-radius: 20px; font-weight: bold; text-transform: uppercase; }
    .status-confirmado { background-color: #10B981; color: white; }
    .kit-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin: 10px 0; background-color: #f9fafb; }
    .pricing-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .pricing-table td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
    .total-row { font-weight: bold; background-color: #f3f4f6; }
    .button { display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 6px; }
  </style>
`;

export function generateOrderConfirmationTemplate(data: OrderConfirmationData): EmailTemplate {
  const subject = `Pedido ${data.orderNumber} confirmado - KitRunner`;
  
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
          <h1 style="margin: 10px 0 0 0; font-size: 24px;">Pedido Confirmado!</h1>
        </div>

        <!-- Content -->
        <div class="content">
          <p>Olá <strong>${data.customerName}</strong>,</p>
          
          <p>Seu pedido foi confirmado com sucesso! Aqui estão os detalhes:</p>

          <!-- Order Info -->
          <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin: 0 0 10px 0; color: #1e40af;">Detalhes do Pedido</h2>
            <p><strong>Número do Pedido:</strong> ${data.orderNumber}</p>
            <p><strong>CPF:</strong> ${data.customerCPF}</p>
            <p><strong>Status:</strong> <span class="status-badge status-confirmado">${data.status}</span></p>
          </div>

          <!-- Event Info -->
          <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin: 0 0 10px 0; color: #16a34a;">Evento</h2>
            <p><strong>${data.eventName}</strong></p>
            <p>📅 ${data.eventDate}</p>
            <p>📍 ${data.eventLocation}</p>
          </div>

          <!-- Kits -->
          <h2>Kits Solicitados (${data.kits.length})</h2>
          ${data.kits.map((kit, index) => `
            <div class="kit-card">
              <h3 style="margin: 0 0 10px 0;">Kit ${index + 1}</h3>
              <p><strong>Nome:</strong> ${kit.name}</p>
              <p><strong>CPF:</strong> ${kit.cpf}</p>
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
          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #92400e;">Próximos Passos</h3>
            <p>• Aguarde a confirmação do pagamento</p>
            <p>• Os kits serão separados para entrega</p>
            <p>• Você receberá atualizações por email sobre o status do seu pedido</p>
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
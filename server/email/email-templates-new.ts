import { OrderConfirmationData, StatusUpdateData, PaymentConfirmationData, DeliveryCompletedData, EmailTemplate } from './email-types';

const KITRUNNER_LOGO = 'https://assets.replit.app/attached_assets/Orange-Blue-Express-Delivery-Logistic-Logo1-1%20(1)_1753898762911.webp';

// Professional ecommerce-style email template with modern design
const modernEmailStyles = `
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; 
      margin: 0; 
      padding: 0; 
      background-color: #f8fafc; 
      color: #1f2937;
      line-height: 1.6;
    }
    .email-container { 
      max-width: 600px; 
      margin: 0 auto; 
      background-color: #ffffff; 
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .header { 
      background: linear-gradient(135deg, #5e17eb 0%, #7c3aed 100%); 
      color: white; 
      padding: 32px 24px; 
      text-align: center; 
    }
    .header .logo { 
      max-height: 60px; 
      width: auto; 
      margin-bottom: 16px;
      filter: brightness(0) invert(1);
    }
    .header h1 { 
      margin: 0; 
      font-size: 28px; 
      font-weight: 700; 
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header .subtitle {
      margin: 8px 0 0 0;
      font-size: 16px;
      opacity: 0.9;
      font-weight: 400;
    }
    .content { 
      padding: 40px 24px; 
      background-color: #ffffff;
    }
    .greeting {
      font-size: 18px;
      color: #374151;
      margin-bottom: 24px;
      font-weight: 500;
    }
    .status-banner {
      background: linear-gradient(135deg, #10b981 0%, #077d2e 100%);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      text-align: center;
      margin: 24px 0;
      font-weight: 600;
      font-size: 16px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }
    .status-pending {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
    }
    .info-grid {
      display: grid;
      gap: 20px;
      margin: 32px 0;
    }
    .info-card {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 24px;
      background: #f9fafb;
      border-left: 4px solid #5e17eb;
    }
    .info-card h3 {
      margin: 0 0 12px 0;
      color: #5e17eb;
      font-size: 16px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .info-card p {
      margin: 4px 0;
      color: #4b5563;
      font-size: 14px;
    }
    .info-card .highlight {
      color: #111827;
      font-weight: 600;
    }
    .kits-section {
      margin: 32px 0;
    }
    .kits-title {
      color: #5e17eb;
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 8px;
    }
    .kit-item {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      margin: 12px 0;
      border-left: 4px solid #077d2e;
    }
    .kit-item strong {
      color: #077d2e;
      font-weight: 600;
    }
    .pricing-table {
      width: 100%;
      border-collapse: collapse;
      margin: 24px 0;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .pricing-table th {
      background: #f3f4f6;
      padding: 12px 16px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border-bottom: 1px solid #e5e7eb;
    }
    .pricing-table td {
      padding: 12px 16px;
      border-bottom: 1px solid #f3f4f6;
      color: #4b5563;
    }
    .pricing-table .total-row {
      background: #5e17eb;
      color: white;
      font-weight: bold;
      font-size: 16px;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #5e17eb 0%, #7c3aed 100%);
      color: white;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
      margin: 24px 0;
      box-shadow: 0 4px 12px rgba(94, 23, 235, 0.3);
      transition: all 0.3s ease;
    }
    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(94, 23, 235, 0.4);
    }
    .footer {
      background: #f3f4f6;
      padding: 32px 24px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .footer-logo {
      max-height: 40px;
      width: auto;
      margin-bottom: 16px;
      opacity: 0.7;
    }
    .footer-text {
      color: #6b7280;
      font-size: 14px;
      line-height: 1.5;
      margin: 8px 0;
    }
    .footer-contact {
      margin: 16px 0;
    }
    .footer-contact a {
      color: #5e17eb;
      text-decoration: none;
      font-weight: 500;
    }
    .social-links {
      margin: 16px 0;
    }
    .social-links a {
      display: inline-block;
      margin: 0 8px;
      color: #6b7280;
      text-decoration: none;
      font-size: 14px;
    }
    .whatsapp-notice {
      background: linear-gradient(135deg, #25d366 0%, #128c7e 100%);
      color: white;
      padding: 20px;
      border-radius: 12px;
      margin: 24px 0;
      text align: center;
    }
    .whatsapp-notice strong {
      font-size: 16px;
      display: block;
      margin-bottom: 8px;
    }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; margin: 0 !important; }
      .content { padding: 24px 16px !important; }
      .header { padding: 24px 16px !important; }
      .info-card { padding: 16px !important; margin: 12px 0 !important; }
      .cta-button { width: 100%; padding: 16px !important; }
    }
  </style>
`;

// Function to format CPF with mask
function formatCPF(cpf: string): string {
  if (!cpf) return '';
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// Function to get status display with professional styling
function getStatusDisplay(status: string): { text: string, class: string } {
  switch (status) {
    case 'aguardando_pagamento':
      return { text: 'Aguardando Pagamento', class: 'status-pending' };
    case 'confirmado':
      return { text: 'Pagamento Confirmado', class: 'status-confirmed' };
    case 'em_transito':
      return { text: 'Em Trânsito', class: 'status-transit' };
    case 'entregue':
      return { text: 'Entregue', class: 'status-delivered' };
    case 'kits_sendo_retirados':
      return { text: 'Kit Retirado', class: 'status-delivered' }; // Changed from 'Retirada Confirmada' to 'Kit Retirado'
    default:
      return { text: status || 'Processando', class: 'status-pending' };
  }
}

export function generateOrderConfirmationTemplate(data: OrderConfirmationData): EmailTemplate {
  const subject = `Pedido ${data.orderNumber} recebido - KitRunner`;
  const statusDisplay = getStatusDisplay(data.status);

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      ${modernEmailStyles}
    </head>
    <body>
      <div class="email-container">
        <!-- Header -->
        <div class="header">
          <img src="${KITRUNNER_LOGO}" alt="KitRunner" class="logo">
          <h1>Pedido Recebido!</h1>
          <p class="subtitle">Obrigado por escolher a KitRunner</p>
        </div>

        <!-- Content -->
        <div class="content">
          <div class="greeting">
            Olá <strong>${data.customerName}</strong>,
          </div>

          <p>Seu pedido foi recebido com sucesso e está sendo processado. Abaixo estão os detalhes:</p>

          <div class="status-banner ${statusDisplay.class}">
            Status: ${statusDisplay.text}
          </div>

          <div class="info-grid">
            <div class="info-card">
              <h3>📋 Detalhes do Pedido</h3>
              <p><span class="highlight">Número:</span> ${data.orderNumber}</p>
              <p><span class="highlight">Evento:</span> ${data.eventName}</p>
              <p><span class="highlight">Data:</span> ${data.eventDate}</p>
              <p><span class="highlight">Local:</span> ${data.eventLocation}</p>
            </div>

            <div class="info-card">
              <h3>📍 Endereço de Entrega</h3>
              <p class="highlight">${data.deliveryAddress}</p>
            </div>
          </div>

          ${data.kits && data.kits.length > 0 ? `
          <div class="kits-section">
            <h3 class="kits-title">👕 Kits do Pedido</h3>
            ${data.kits.map(kit => `
              <div class="kit-item">
                <strong>${kit.name}</strong><br>
                CPF: ${formatCPF(kit.cpf)}<br>
                Tamanho: ${kit.size}
              </div>
            `).join('')}
          </div>
          ` : ''}

          <table class="pricing-table">
            <tr>
              <th>Descrição</th>
              <th>Valor</th>
            </tr>
            <tr>
              <td>Entrega</td>
              <td>R$ ${parseFloat(data.deliveryCost || '0').toFixed(2)}</td>
            </tr>
            ${data.extraKitsCost && parseFloat(data.extraKitsCost) > 0 ? `
            <tr>
              <td>Kits extras</td>
              <td>R$ ${parseFloat(data.extraKitsCost).toFixed(2)}</td>
            </tr>
            ` : ''}
            ${data.donationCost && parseFloat(data.donationCost) > 0 ? `
            <tr>
              <td>Doação</td>
              <td>R$ ${parseFloat(data.donationCost).toFixed(2)}</td>
            </tr>
            ` : ''}
            <tr class="total-row">
              <td>Total</td>
              <td>R$ ${data.totalAmount}</td>
            </tr>
          </table>

          <div class="whatsapp-notice">
            <strong>🏃‍♀️ Instruções para Retirada</strong>
            <p>Para retirar seus kits no local do evento, entre em contato via WhatsApp: <strong>(83) 99999-9999</strong></p>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="#" class="cta-button">Acompanhar Pedido</a>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
            Você receberá atualizações por email sobre o status do seu pedido.
          </p>
        </div>

        <!-- Footer -->
        <div class="footer">
          <img src="${KITRUNNER_LOGO}" alt="KitRunner" class="footer-logo">
          <p class="footer-text">KitRunner - Sua corrida, nossa paixão</p>
          <div class="footer-contact">
            <p><a href="mailto:contato@kitrunner.com.br">contato@kitrunner.com.br</a></p>
            <p>WhatsApp: (83) 99999-9999</p>
          </div>
          <div class="social-links">
            <a href="#">Instagram: @kitrunner_</a>
            <a href="#">Facebook: KitRunner</a>
          </div>
          <p class="footer-text" style="margin-top: 16px; font-size: 12px;">
            Este é um email automático, não responda diretamente.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

export function generatePaymentConfirmationTemplate(data: PaymentConfirmationData): EmailTemplate {
  const subject = `✅ Pagamento confirmado - Pedido ${data.orderNumber}`;

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      ${modernEmailStyles}
    </head>
    <body>
      <div class="email-container">
        <!-- Header -->
        <div class="header">
          <img src="${KITRUNNER_LOGO}" alt="KitRunner" class="logo">
          <h1>Pagamento Confirmado! 🎉</h1>
          <p class="subtitle">Seu pedido foi aprovado com sucesso</p>
        </div>

        <!-- Content -->
        <div class="content">
          <div class="greeting">
            Ótimas notícias, <strong>${data.customerName}</strong>!
          </div>

          <p>Seu pagamento foi processado com sucesso e seu pedido está confirmado.</p>

          <div class="status-banner">
            ✅ Pagamento Aprovado - Pedido Confirmado
          </div>

          <div class="info-grid">
            <div class="info-card">
              <h3>💳 Detalhes do Pagamento</h3>
              <p><span class="highlight">Pedido:</span> ${data.orderNumber}</p>
              <p><span class="highlight">Valor Pago:</span> R$ ${data.totalAmount}</p>
              <p><span class="highlight">Status:</span> Confirmado</p>
            </div>

            <div class="info-card">
              <h3>🏃‍♂️ Seu Evento</h3>
              <p><span class="highlight">Evento:</span> ${data.eventName}</p>
              <p><span class="highlight">Data:</span> ${data.eventDate}</p>
              <p><span class="highlight">Local:</span> ${data.eventLocation}</p>
            </div>

            <div class="info-card">
              <h3>📦 Entrega</h3>
              <p class="highlight">${data.deliveryAddress}</p>
            </div>
          </div>

          ${data.kits && data.kits.length > 0 ? `
          <div class="kits-section">
            <h3 class="kits-title">👕 Seus Kits Confirmados</h3>
            ${data.kits.map(kit => `
              <div class="kit-item">
                <strong>${kit.name}</strong><br>
                CPF: ${formatCPF(kit.cpf)}<br>
                Tamanho: ${kit.size}
              </div>
            `).join('')}
          </div>
          ` : ''}

          <div class="whatsapp-notice">
            <strong>🏃‍♀️ Próximos Passos</strong>
            <p>Seus kits estão sendo preparados! Para retirada no evento, entre em contato via WhatsApp: <strong>(83) 99999-9999</strong></p>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="#" class="cta-button">Acompanhar Status do Pedido</a>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
            Você receberá novas atualizações quando seus kits estiverem prontos para retirada.
          </p>
        </div>

        <!-- Footer -->
        <div class="footer">
          <img src="${KITRUNNER_LOGO}" alt="KitRunner" class="footer-logo">
          <p class="footer-text">KitRunner - Sua corrida, nossa paixão</p>
          <div class="footer-contact">
            <p><a href="mailto:contato@kitrunner.com.br">contato@kitrunner.com.br</a></p>
            <p>WhatsApp: (83) 99999-9999</p>
          </div>
          <div class="social-links">
            <a href="#">Instagram: @kitrunner_</a>
            <a href="#">#BoraCorrer</a>
          </div>
          <p class="footer-text" style="margin-top: 16px; font-size: 12px;">
            Este é um email automático, não responda diretamente.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

export function generateStatusUpdateTemplate(data: StatusUpdateData): EmailTemplate {
  const subject = `Atualização do pedido ${data.orderNumber} - KitRunner`;
  const statusDisplay = getStatusDisplay(data.newStatus);

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      ${modernEmailStyles}
    </head>
    <body>
      <div class="email-container">
        <!-- Header -->
        <div class="header">
          <img src="${KITRUNNER_LOGO}" alt="KitRunner" class="logo">
          <h1>Atualização de Status</h1>
          <p class="subtitle">Pedido ${data.orderNumber}</p>
        </div>

        <!-- Content -->
        <div class="content">
          <div class="greeting">
            Olá <strong>${data.customerName}</strong>,
          </div>

          <p>Temos uma atualização sobre seu pedido:</p>

          <div class="status-banner ${statusDisplay.class}">
            Novo Status: ${statusDisplay.text}
          </div>

          <div class="info-grid">
            <div class="info-card">
              <h3>📋 Detalhes da Atualização</h3>
              <p><span class="highlight">Pedido:</span> ${data.orderNumber}</p>
              <p><span class="highlight">Status Anterior:</span> ${getStatusDisplay(data.oldStatus).text}</p>
              <p><span class="highlight">Novo Status:</span> ${statusDisplay.text}</p>
              ${data.statusReason ? `<p><span class="highlight">Motivo:</span> ${data.statusReason}</p>` : ''}
            </div>

            <div class="info-card">
              <h3>🏃‍♂️ Evento</h3>
              <p><span class="highlight">Nome:</span> ${data.eventName}</p>
              <p><span class="highlight">Data:</span> ${data.eventDate}</p>
            </div>
          </div>

          ${data.trackingInfo ? `
          <div class="info-card">
            <h3>📦 Informações de Entrega</h3>
            ${data.trackingInfo.estimatedDelivery ? `<p><span class="highlight">Previsão:</span> ${data.trackingInfo.estimatedDelivery}</p>` : ''}
            ${data.trackingInfo.currentLocation ? `<p><span class="highlight">Localização:</span> ${data.trackingInfo.currentLocation}</p>` : ''}
          </div>
          ` : ''}

          ${data.newStatus === 'entregue' ? `
          <div class="whatsapp-notice">
            <strong>🎉 Pedido Entregue!</strong>
            <p>Obrigado por escolher a KitRunner! Não esqueça de nos marcar no Instagram: <strong>@kitrunner_</strong> com a hashtag <strong>#BoraCorrer</strong></p>
          </div>
          ` : `
          <div class="whatsapp-notice">
            <strong>📞 Precisa de Ajuda?</strong>
            <p>Entre em contato via WhatsApp: <strong>(83) 99999-9999</strong></p>
          </div>
          `}

          <div style="text-align: center; margin: 32px 0;">
            <a href="#" class="cta-button">Acompanhar Pedido</a>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <img src="${KITRUNNER_LOGO}" alt="KitRunner" class="footer-logo">
          <p class="footer-text">KitRunner - Sua corrida, nossa paixão</p>
          <div class="footer-contact">
            <p><a href="mailto:contato@kitrunner.com.br">contato@kitrunner.com.br</a></p>
            <p>WhatsApp: (83) 99999-9999</p>
          </div>
          <div class="social-links">
            <a href="#">Instagram: @kitrunner_</a>
            <a href="#">#BoraCorrer</a>
          </div>
          <p class="footer-text" style="margin-top: 16px; font-size: 12px;">
            Este é um email automático, não responda diretamente.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}
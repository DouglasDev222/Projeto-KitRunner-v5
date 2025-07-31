import {
  EmailTemplate,
  ServiceConfirmationData,
  KitEnRouteData,
  DeliveryConfirmationData,
  StatusUpdateData,
  PaymentPendingData,
  WelcomeData,
  PasswordResetData,
  PromotionalData,
  DEFAULT_THEME,
  EmailTheme,
  OrderStatus,
  StatusDisplay,
  KitItem,
} from "./email-types";

// Utility functions for email templates
export class EmailUtils {
  static formatCPF(cpf: string): string {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }

  static formatCurrency(value: string): string {
    const numValue = parseFloat(value);
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(numValue);
  }

  static formatDate(date: string): string {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(date));
  }

  static formatPhone(phone: string): string {
    if (phone.length === 11) {
      return phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    return phone.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }

  static formatPaymentMethod(method: string): string {
    const methodMap: Record<string, string> = {
      credit_card: "Cartão de Crédito",
      debit_card: "Cartão de Débito",
      pix: "PIX",
      bank_transfer: "Transferência Bancária",
      boleto: "Boleto Bancário",
    };
    return methodMap[method] || method;
  }

  static getStatusDisplay(status: OrderStatus): StatusDisplay {
    const statusMap: Record<OrderStatus, StatusDisplay> = {
      aguardando_pagamento: {
        text: "Aguardando Pagamento",
        color: "#f97316",
        class: "status-pending",
        description: "Finalize o pagamento para confirmarmos seu pedido",
      },
      pagamento_confirmado: {
        text: "Pagamento Confirmado",
        color: "#077d2e",
        class: "status-confirmed",
        description: "Pagamento confirmado! Em breve retiraremos seu kit",
      },
      retirada_confirmada: {
        text: "Retirada em Andamento",
        color: "#5e17eb",
        class: "status-pickup",
        description: "Sua retirada está em andamento",
      },
      em_transito: {
        text: "Em Trânsito",
        color: "#3b82f6",
        class: "status-transit",
        description: "Seu kit foi retirado e está a caminho da entrega",
      },
      saiu_para_entrega: {
        text: "Saiu para Entrega",
        color: "#8b5cf6",
        class: "status-delivery",
        description: "Seu kit está sendo entregue agora",
      },
      entregue: {
        text: "Entregue",
        color: "#10b981",
        class: "status-delivered",
        description: "Kit entregue com sucesso!",
      },
      cancelado: {
        text: "Cancelado",
        color: "#ef4444",
        class: "status-cancelled",
        description: "Pedido cancelado",
      },
      kits_sendo_retirados: {
        text: "Kits sendo Retirados",
        color: "#f97316",
        class: "status-pickup-progress",
        description: "Nossa equipe está retirando seus kits no evento",
      },
      confirmado: {
        text: "Confirmado",
        color: "#077d2e",
        class: "status-confirmed",
        description: "Pedido confirmado com sucesso",
      },
    };

    return statusMap[status];
  }

  static mergeTheme(customTheme?: Partial<EmailTheme>): EmailTheme {
    return { ...DEFAULT_THEME, ...customTheme };
  }

  static generateOrderDetailsUrl(
    orderNumber: string,
    baseUrl: string = process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
      : "https://kitrunner.com.br",
  ): string {
    return `${baseUrl}/orders/${orderNumber}`;
  }
}

// Base email template with common styling
function getBaseEmailTemplate(theme: EmailTheme): {
  header: string;
  footer: string;
  styles: string;
} {
  const styles = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: ${theme.fontFamily};
        line-height: 1.6;
        color: ${theme.textColor};
        background-color: ${theme.backgroundColor};
      }

      .email-container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        box-shadow: 0 4px 20px rgba(94, 23, 235, 0.08);
        border-radius: 12px;
        overflow: hidden;
      }

      .header {
        background: linear-gradient(135deg, ${theme.primaryColor}, ${theme.accentColor});
        padding: 32px 24px;
        text-align: center;
        color: white;
      }

      .logo {
        height: 40px;
        margin-bottom: 16px;
      }

      .header h1 {
        font-size: 24px;
        font-weight: 700;
        margin: 0;
      }

      .content {
        padding: 32px 24px;
      }

      .greeting {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 16px;
        color: ${theme.textColor};
      }

      .section {
        margin: 24px 0;
        padding: 20px;
        background-color: #f8fafc;
        border-radius: 8px;
        border-left: 4px solid ${theme.primaryColor};
      }

      .section h3 {
        color: ${theme.primaryColor};
        margin-bottom: 12px;
        font-weight: 600;
      }

      .button {
        display: inline-block;
        background: linear-gradient(135deg, ${theme.primaryColor}, ${theme.accentColor});
        color: white !important;
        padding: 14px 28px;
        text-decoration: none;
        border-radius: 8px;
        font-weight: 600;
        margin: 16px 0;
        transition: transform 0.2s;
      }

      .button:hover {
        transform: translateY(-2px);
      }

      .button-success {
        background: linear-gradient(135deg, ${theme.secondaryColor}, #059669);
      }

      .status-badge {
        display: inline-block;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 500;
        color: white;
        margin: 8px 0;
      }

      .info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin: 16px 0;
      }

      .info-item {
        padding: 12px;
        background: white;
        border-radius: 6px;
        border: 1px solid ${theme.borderColor};
      }

      .info-label {
        font-size: 12px;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
      }

      .info-value {
        font-weight: 600;
        color: ${theme.textColor};
      }

      .kit-list {
        margin: 16px 0;
      }

      .kit-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        margin: 8px 0;
        background: white;
        border-radius: 6px;
        border: 1px solid ${theme.borderColor};
      }

      .timeline {
        margin: 24px 0;
      }

      .timeline-item {
        display: flex;
        align-items: center;
        padding: 12px 0;
        border-left: 2px solid ${theme.borderColor};
        padding-left: 16px;
        margin-left: 8px;
        position: relative;
      }

      .timeline-item:before {
        content: '';
        position: absolute;
        left: -6px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: ${theme.primaryColor};
      }

      .timeline-item.active {
        border-left-color: ${theme.primaryColor};
      }

      .timeline-item.active:before {
        background: ${theme.primaryColor};
      }

      .footer {
        background-color: #f8fafc;
        padding: 24px;
        text-align: center;
        border-top: 1px solid ${theme.borderColor};
      }

      .footer-links {
        margin: 16px 0;
      }

      .footer-links a {
        color: ${theme.primaryColor};
        text-decoration: none;
        margin: 0 8px;
      }

      .social-links {
        margin: 16px 0;
      }

      .social-links a {
        display: inline-block;
        margin: 0 8px;
        padding: 8px;
        background: ${theme.primaryColor};
        color: white !important;
        border-radius: 6px;
        text-decoration: none;
      }

      @media only screen and (max-width: 600px) {
        .email-container {
          margin: 0;
          border-radius: 0;
        }

        .content, .header, .footer {
          padding: 20px 16px;
        }

        .info-grid {
          grid-template-columns: 1fr;
        }

        .kit-item {
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }
      }
    </style>
  `;

  const header = `
    <div class="header">
      ${theme.logoUrl ? `<img src="${theme.logoUrl}" alt="${theme.companyName}" class="logo">` : `<h1>${theme.companyName}</h1>`}
    </div>
  `;

  const footer = `
    <div class="footer">
      <div class="footer-links">
        <a href="${theme.websiteUrl}">Site</a>
        <a href="mailto:${theme.supportEmail}">Contato</a>
      </div>

      <div class="social-links">
        <a href="https://wa.me/5583981302961?text=Olá! Preciso de ajuda com meu pedido." 
           style="background: #25D366; color: white !important; padding: 12px 20px; border-radius: 8px; text-decoration: none; display: inline-block;">
          💬 Falar no WhatsApp
        </a>
      </div>

      <p style="font-size: 12px; color: #6b7280; margin-top: 16px;">
        ${theme.companyName}<br>
        ${theme.address}<br>
        ${theme.supportEmail} | 83 98130-2961
      </p>

      <p style="font-size: 11px; color: #9ca3af; margin-top: 12px;">
        Você está recebendo este email porque contratou nossos serviços.<br>
        Este é um email automático, não responda.
      </p>
    </div>
  `;

  return { header, footer, styles };
}

// Service Confirmation Email Template
export function generateServiceConfirmationTemplate(
  data: ServiceConfirmationData,
): EmailTemplate {
  const theme = EmailUtils.mergeTheme(data.theme);
  const { header, footer, styles } = getBaseEmailTemplate(theme);
  const statusInfo = EmailUtils.getStatusDisplay(data.status);
  const orderDetailsUrl = EmailUtils.generateOrderDetailsUrl(data.orderNumber);

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Serviço Confirmado - ${theme.companyName}</title>
      ${styles}
    </head>
    <body>
      <div class="email-container">
        ${header}

        <div class="content">
          <div class="greeting">
            Olá, ${data.customerName}! 👋
          </div>

          <p>Seu pedido de retirada de kit foi confirmado com sucesso!</p>
          <p>Nossa equipe especializada irá retirar seu kit no local do evento e entregar no endereço informado com toda segurança e agilidade.</p>

          <div class="section">
            <h3>📋 Detalhes do Pedido</h3>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Número do Pedido</div>
                <div class="info-value">${data.orderNumber}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Status</div>
                <div class="status-badge" style="background-color: ${statusInfo.color};">
                  ${statusInfo.text}
                </div>
              </div>
            </div>
          </div>

          <div class="section">
            <h3>🏃‍♂️ Evento</h3>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Nome do Evento</div>
                <div class="info-value">${data.eventName}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Data</div>
                <div class="info-value">${EmailUtils.formatDate(data.eventDate)}</div>
              </div>
            </div>
            <p style="margin-top: 12px;">📍 ${data.eventLocation}</p>
          </div>

          <div class="section">
            <h3>📦 Kits a Retirar</h3>
            <div class="kit-list">
              ${data.kits
                .map(
                  (kit) => `
                <div class="kit-item">
                  <div>
                    <strong>${kit.name}</strong><br>
                    <small>CPF: ${EmailUtils.formatCPF(kit.cpf)}</small>
                  </div>
                  <div>
                    <span style="background: ${theme.primaryColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                      ${kit.shirtSize} - ${kit.category}
                    </span>
                  </div>
                </div>
              `,
                )
                .join("")}
            </div>
          </div>

          <div class="section">
            <h3>🏠 Endereço de Entrega</h3>
            <p><strong>${data.address.street}, ${data.address.number}</strong></p>
            ${data.address.complement ? `<p>${data.address.complement}</p>` : ""}
            <p>${data.address.neighborhood} - ${data.address.city}, ${data.address.state}</p>
            <p>CEP: ${data.address.zipCode}</p>
            ${data.address.reference ? `<p><em>Referência: ${data.address.reference}</em></p>` : ""}
          </div>

          <div class="section">
            <h3>💰 Resumo Financeiro</h3>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Taxa de Entrega</div>
                <div class="info-value">${EmailUtils.formatCurrency(data.pricing.deliveryCost)}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Total</div>
                <div class="info-value"><strong>${EmailUtils.formatCurrency(data.pricing.totalCost)}</strong></div>
              </div>
            </div>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${orderDetailsUrl}" class="button">
              📋 Detalhes do Pedido
            </a>
          </div>

          <div class="timeline">
            <h3>📅 Próximos Passos</h3>
            <div class="timeline-item active">
              ✅ <strong>Pedido Confirmado</strong> - Agora
            </div>
            <div class="timeline-item">
              🏃‍♀️ <strong>Retirada do Kit</strong> - até 1 dia antes do evento
            </div>
            <div class="timeline-item">
              🚚 <strong>A Caminho</strong> - Logo após retirada
            </div>
            <div class="timeline-item">
              📦 <strong>Entrega</strong> - 1 dia antes da data do evento
            </div>
          </div>

          <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; margin-top: 24px;">
            <p><strong>💡 Dica:</strong> Mantenha seu telefone por perto! Entraremos em contato caso precisemos de alguma informação adicional.</p>
          </div>
        </div>

        ${footer}
      </div>
    </body>
    </html>
  `;

  const text = `
    ${theme.companyName} - Serviço Confirmado!

    Olá, ${data.customerName}!

    Seu pedido de retirada de kit foi confirmado com sucesso!

    Pedido: ${data.orderNumber}
    Status: ${statusInfo.text}
    Evento: ${data.eventName}
    Data: ${EmailUtils.formatDate(data.eventDate)}
    Local: ${data.eventLocation}

    Kits:
    ${data.kits.map((kit) => `- ${kit.name} (${kit.shirtSize} - ${kit.category})`).join("\n")}

    Entrega em:
    ${data.address.street}, ${data.address.number}
    ${data.address.neighborhood} - ${data.address.city}, ${data.address.state}

    Total: ${EmailUtils.formatCurrency(data.pricing.totalCost)}

    Acompanhe seu pedido: ${orderDetailsUrl}

    ${theme.companyName}
    ${theme.supportEmail}
  `;

  return {
    subject: `Seu pedido de retirada de kit foi confirmado! - ${data.orderNumber}`,
    html,
    text,
  };
}

// Kit En Route Email Template
export function generateKitEnRouteTemplate(
  data: KitEnRouteData,
): EmailTemplate {
  const theme = EmailUtils.mergeTheme(data.theme);
  const { header, footer, styles } = getBaseEmailTemplate(theme);
  const orderDetailsUrl = EmailUtils.generateOrderDetailsUrl(data.orderNumber);

  // Calculate delivery date as 1 day before event - with safe date handling
  let formattedDeliveryDate = "1 dia antes do evento";
  try {
    const eventDate = new Date(data.eventDate);
    if (!isNaN(eventDate.getTime())) {
      const deliveryDate = new Date(eventDate);
      deliveryDate.setDate(eventDate.getDate() - 1);
      formattedDeliveryDate = EmailUtils.formatDate(deliveryDate.toISOString());
    }
  } catch (error) {
    console.warn("Error calculating delivery date:", error);
  }

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Seu kit está a caminho! - ${theme.companyName}</title>
      ${styles}
    </head>
    <body>
      <div class="email-container">
        ${header}

        <div class="content">
          <div class="greeting">
            Olá, ${data.customerName}! 🚚
          </div>

          <p><strong>Seu kit está a caminho!</strong></p>
          <p>Nossa equipe já retirou seu kit do evento <strong>${data.eventName}</strong> e está a caminho do seu endereço.</p>

          <div class="section">
            <h3>📦 Kits em Trânsito</h3>
            <div class="kit-list">
              ${data.kits
                .map(
                  (kit) => `
                <div class="kit-item">
                  <div>
                    <strong>${kit.name}</strong><br>
                    <small>CPF: ${EmailUtils.formatCPF(kit.cpf)}</small>
                  </div>
                  <div>
                    <span style="background: ${theme.secondaryColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                      ${kit.shirtSize} - ${kit.category}
                    </span>
                  </div>
                </div>
              `,
                )
                .join("")}
            </div>
          </div>

          <div class="section">
            <h3>🏠 Endereço de Entrega</h3>
            <p><strong>${data.address.street}, ${data.address.number}</strong></p>
            ${data.address.complement ? `<p>${data.address.complement}</p>` : ""}
            <p>${data.address.neighborhood} - ${data.address.city}, ${data.address.state}</p>
            <p>CEP: ${data.address.zipCode}</p>
          </div>

          <div class="section">
            <h3>⏰ Previsão de Entrega</h3>
            <p style="font-size: 18px; color: ${theme.secondaryColor}; font-weight: 600;">
              ${formattedDeliveryDate}
            </p>
          </div>

          ${
            data.driverName
              ? `
            <div class="section">
              <h3>👤 Entregador</h3>
              <p><strong>${data.driverName}</strong></p>
              ${data.driverPhone ? `<p>📱 ${EmailUtils.formatPhone(data.driverPhone)}</p>` : ""}
            </div>
          `
              : ""
          }

          <div style="text-align: center; margin: 32px 0;">
            <a href="${orderDetailsUrl}" class="button">
              📋 Detalhes do Pedido
            </a>
          </div>

          <div style="background: #ecfdf5; border: 1px solid ${theme.secondaryColor}; padding: 16px; border-radius: 8px; margin-top: 24px;">
            <h4 style="color: ${theme.secondaryColor}; margin-bottom: 8px;">🎯 Esteja Preparado</h4>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Mantenha seu telefone por perto</li>
              <li>Tenha um documento com foto em mãos</li>
              <li>Alguém deve estar no local para receber</li>
            </ul>
          </div>
        </div>

        ${footer}
      </div>
    </body>
    </html>
  `;

  const text = `
    ${theme.companyName} - Seu kit está a caminho!

    Olá, ${data.customerName}!

    Seu kit está a caminho!

    Pedido: ${data.orderNumber}
    Evento: ${data.eventName}

    Kits em trânsito:
    ${data.kits.map((kit) => `- ${kit.name} (${kit.shirtSize} - ${kit.category})`).join("\n")}

    Entrega prevista para: ${data.estimatedDelivery}

    Endereço: ${data.address.street}, ${data.address.number}
    ${data.address.neighborhood} - ${data.address.city}, ${data.address.state}


    Detalhes: ${orderDetailsUrl}

    ${theme.companyName}
    ${theme.supportEmail}
  `;

  return {
    subject: `Seu kit está a caminho! 🚚 - ${data.orderNumber}`,
    html,
    text,
  };
}

// Delivery Confirmation Email Template
export function generateDeliveryConfirmationTemplate(
  data: DeliveryConfirmationData,
): EmailTemplate {
  const theme = EmailUtils.mergeTheme(data.theme);
  const { header, footer, styles } = getBaseEmailTemplate(theme);

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Kit entregue com sucesso! - ${theme.companyName}</title>
      ${styles}
    </head>
    <body>
      <div class="email-container">
        ${header}

        <div class="content">
          <div class="greeting">
            Olá, ${data.customerName}! 🎉
          </div>

          <p><strong>Seu kit foi entregue com sucesso!</strong></p>
          <p>Missão cumprida! Seu kit do evento <strong>${data.eventName}</strong> chegou direitinho no seu endereço.</p>

          <div class="section">
            <h3>✅ Confirmação de Entrega</h3>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Data e Hora</div>
                <div class="info-value">${EmailUtils.formatDate(data.deliveredAt)}</div>
              </div>
              ${
                data.receivedBy
                  ? `
                <div class="info-item">
                  <div class="info-label">Recebido por</div>
                  <div class="info-value">${data.receivedBy}</div>
                </div>
              `
                  : ""
              }
            </div>
          </div>

          <div class="section">
            <h3>📦 Kits Entregues</h3>
            <div class="kit-list">
              ${data.kits
                .map(
                  (kit) => `
                <div class="kit-item">
                  <div>
                    <strong>${kit.name}</strong><br>
                    <small>CPF: ${EmailUtils.formatCPF(kit.cpf)}</small>
                  </div>
                  <div>
                    <span style="background: ${theme.secondaryColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                      ✅ Entregue
                    </span>
                  </div>
                </div>
              `,
                )
                .join("")}
            </div>
          </div>

          <div style="text-align: center; margin: 32px 0; padding: 24px; background: linear-gradient(135deg, ${theme.secondaryColor}, #059669); border-radius: 12px; color: white;">
            <h2 style="margin: 0 0 16px 0;">🏃‍♂️ Agora é só correr!</h2>
            <p style="margin: 0; opacity: 0.9;">Desejamos uma excelente corrida e que você alcance todos os seus objetivos!</p>
          </div>

          ${
            data.feedbackUrl
              ? `
            <div style="text-align: center; margin: 24px 0;">
              <a href="${data.feedbackUrl}" class="button">
                ⭐ Avaliar Nosso Serviço
              </a>
            </div>
          `
              : ""
          }

          <div class="section">
            <h3>📱 Compartilhe nas Redes</h3>
            <p>Ajude outros corredores a conhecer nosso serviço! Marque-nos no Instagram:</p>
            <p style="font-size: 16px; font-weight: 600; color: ${theme.primaryColor};">
              ${theme.instagramHandle} #BoraCorrer #KitRunner
            </p>
            ${
              data.shareMessage
                ? `
              <div style="background: #f8fafc; padding: 12px; border-radius: 6px; margin-top: 12px; font-style: italic;">
                "${data.shareMessage}"
              </div>
            `
                : ""
            }
          </div>

          <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 16px; border-radius: 8px; margin-top: 24px;">
            <h4 style="color: #f59e0b; margin-bottom: 8px;">💛 Obrigado pela Confiança!</h4>
            <p style="margin: 0;">A equipe da ${theme.companyName} agradece imensamente pela sua confiança. Estamos aqui para facilitar sua vida de corredor!</p>
          </div>
        </div>

        ${footer}
      </div>
    </body>
    </html>
  `;

  const text = `
    ${theme.companyName} - Kit entregue com sucesso! 🎉

    Olá, ${data.customerName}!

    Seu kit foi entregue com sucesso!

    Pedido: ${data.orderNumber}
    Evento: ${data.eventName}
    Entregue em: ${EmailUtils.formatDate(data.deliveredAt)}
    ${data.receivedBy ? `Recebido por: ${data.receivedBy}` : ""}

    Kits entregues:
    ${data.kits.map((kit) => `- ${kit.name} (${kit.shirtSize} - ${kit.category})`).join("\n")}

    Agora é só correr! 🏃‍♂️

    Compartilhe nas redes: ${theme.instagramHandle} #BoraCorrer

    Obrigado pela confiança!

    ${theme.companyName}
    ${theme.supportEmail}
  `;

  return {
    subject: `Seu kit chegou direitinho em sua casa! 🎉 - ${data.orderNumber}`,
    html,
    text,
  };
}

// Status Update Email Template
export function generateStatusUpdateTemplate(
  data: StatusUpdateData,
): EmailTemplate {
  const theme = EmailUtils.mergeTheme(data.theme);
  const { header, footer, styles } = getBaseEmailTemplate(theme);
  const previousStatusInfo = EmailUtils.getStatusDisplay(data.previousStatus);
  const newStatusInfo = EmailUtils.getStatusDisplay(data.newStatus);
  const orderDetailsUrl = EmailUtils.generateOrderDetailsUrl(data.orderNumber);

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Atualização do Pedido - ${theme.companyName}</title>
      ${styles}
    </head>
    <body>
      <div class="email-container">
        ${header}

        <div class="content">
          <div class="greeting">
            Olá, ${data.customerName}! 📢
          </div>

          <p>Temos uma atualização sobre seu pedido!</p>
          <p>O status do seu serviço foi alterado e queremos mantê-lo informado sobre cada etapa.</p>

          <div class="section">
            <h3>📋 Atualização do Status</h3>
            <div style="display: flex; align-items: center; justify-content: space-between; margin: 16px 0;">
              <div style="text-align: center; flex: 1;">
                <div class="status-badge" style="background-color: ${previousStatusInfo.color};">
                  ${previousStatusInfo.text}
                </div>
                <p style="font-size: 12px; color: #6b7280; margin-top: 4px;">Status Anterior</p>
              </div>
              <div style="margin: 0 16px; color: ${theme.primaryColor};">→</div>
              <div style="text-align: center; flex: 1;">
                <div class="status-badge" style="background-color: ${newStatusInfo.color};">
                  ${newStatusInfo.text}
                </div>
                <p style="font-size: 12px; color: #6b7280; margin-top: 4px;">Status Atual</p>
              </div>
            </div>
            <p><strong>O que isso significa:</strong> ${data.statusDescription || newStatusInfo.description}</p>
          </div>

          <div class="section">
            <h3>🏃‍♂️ Evento</h3>
            <p><strong>${data.eventName}</strong></p>
            <p>Pedido: <strong>${data.orderNumber}</strong></p>
          </div>

          <div class="section">
            <h3>📦 Kits</h3>
            <div class="kit-list">
              ${data.kits
                .map(
                  (kit) => `
                <div class="kit-item">
                  <div>
                    <strong>${kit.name}</strong><br>
                    <small>CPF: ${EmailUtils.formatCPF(kit.cpf)}</small>
                  </div>
                  <div>
                    <span style="background: ${newStatusInfo.color}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                      ${kit.shirtSize} - ${kit.category}
                    </span>
                  </div>
                </div>
              `,
                )
                .join("")}
            </div>
          </div>

          ${
            data.nextSteps
              ? `
            <div class="section">
              <h3>⏭️ Próximos Passos</h3>
              <p>${data.nextSteps}</p>
              ${data.estimatedTime ? `<p><strong>Previsão:</strong> ${data.estimatedTime}</p>` : ""}
            </div>
          `
              : ""
          }



          <div style="text-align: center; margin: 32px 0;">
            <a href="${orderDetailsUrl}" class="button">
              📋 Detalhes do Pedido
            </a>
          </div>

          <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; margin-top: 24px;">
            <p><strong>💬 Dúvidas?</strong> Nossa equipe está sempre disponível para esclarecer qualquer questão sobre seu pedido.</p>
          </div>
        </div>

        ${footer}
      </div>
    </body>
    </html>
  `;

  const text = `
    ${theme.companyName} - Atualização do Pedido

    Olá, ${data.customerName}!

    Atualização do seu pedido ${data.orderNumber}:

    Status anterior: ${previousStatusInfo.text}
    Status atual: ${newStatusInfo.text}

    O que isso significa: ${data.statusDescription || newStatusInfo.description}

    Evento: ${data.eventName}

    Kits:
    ${data.kits.map((kit) => `- ${kit.name} (${kit.shirtSize} - ${kit.category})`).join("\n")}

    ${data.nextSteps ? `Próximos passos: ${data.nextSteps}` : ""}
    ${data.estimatedTime ? `Previsão: ${data.estimatedTime}` : ""}

    Detalhes: ${orderDetailsUrl}

    ${theme.companyName}
    ${theme.supportEmail}
  `;

  return {
    subject: `Atualização do seu pedido — Status alterado para ${newStatusInfo.text}`,
    html,
    text,
  };
}

// Welcome Email Template
export function generateWelcomeTemplate(data: WelcomeData): EmailTemplate {
  const theme = EmailUtils.mergeTheme(data.theme);
  const { header, footer, styles } = getBaseEmailTemplate(theme);

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bem-vindo à ${theme.companyName}!</title>
      ${styles}
    </head>
    <body>
      <div class="email-container">
        ${header}

        <div class="content">
          <div class="greeting">
            Bem-vindo, ${data.customerName}! 🎉
          </div>

          <p>É um prazer tê-lo conosco na <strong>${theme.companyName}</strong>!</p>
          <p>Somos especialistas em <strong>retirar seu kit e entregar na sua casa</strong>, oferecendo toda a praticidade que você merece para focar no que realmente importa: sua corrida.</p>

          <div class="section">
            <h3>🚀 Como funciona nosso serviço</h3>
            <div class="timeline">
              <div class="timeline-item active">
                <strong>1. Você contrata o serviço</strong><br>
                <small>Simples e rápido pelo nosso site</small>
              </div>
              <div class="timeline-item active">
                <strong>2. Retiramos seu kit</strong><br>
                <small>Nossa equipe busca no local do evento</small>
              </div>
              <div class="timeline-item active">
                <strong>3. Entregamos na sua casa</strong><br>
                <small>Com segurança e agilidade</small>
              </div>
              <div class="timeline-item active">
                <strong>4. Você corre feliz!</strong><br>
                <small>Sem stress, sem filas, sem perda de tempo</small>
              </div>
            </div>
          </div>

          <div class="section">
            <h3>💡 Por que escolher a ${theme.companyName}?</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li><strong>Economia de tempo:</strong> Não perca horas na retirada</li>
              <li><strong>Segurança:</strong> Seu kit chega em perfeitas condições</li>
              <li><strong>Comodidade:</strong> Receba no conforto da sua casa</li>
              <li><strong>Confiabilidade:</strong> Equipe especializada e experiente</li>
              <li><strong>Rastreamento:</strong> Acompanhe todo o processo</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${theme.websiteUrl}" class="button">
              🏃‍♂️ Conheça Nossos Serviços
            </a>
          </div>

          <div class="section">
            <h3>📱 Siga-nos nas Redes</h3>
            <p>Fique por dentro das novidades e acompanhe histórias de outros corredores:</p>
            <div style="text-align: center; margin: 16px 0;">
              <a href="https://instagram.com/${theme.instagramHandle.replace("@", "")}" class="button">
                📸 ${theme.instagramHandle}
              </a>
            </div>
          </div>

          <div style="background: linear-gradient(135deg, ${theme.primaryColor}, ${theme.accentColor}); padding: 24px; border-radius: 12px; color: white; text-align: center; margin-top: 24px;">
            <h3 style="margin: 0 0 12px 0;">🎯 Pronto para a próxima corrida?</h3>
            <p style="margin: 0; opacity: 0.9;">Deixe a retirada do kit conosco e foque no que realmente importa: sua performance!</p>
          </div>
        </div>

        ${footer}
      </div>
    </body>
    </html>
  `;

  const text = `
    Bem-vindo à ${theme.companyName}!

    Olá, ${data.customerName}!

    É um prazer tê-lo conosco! Somos especialistas em retirar seu kit e entregar na sua casa.

    Como funciona:
    1. Você contrata o serviço
    2. Retiramos seu kit no evento
    3. Entregamos na sua casa
    4. Você corre feliz!

    Por que escolher a ${theme.companyName}:
    - Economia de tempo
    - Segurança total
    - Máxima comodidade
    - Equipe confiável
    - Rastreamento completo

    Visite: ${theme.websiteUrl}
    Instagram: ${theme.instagramHandle}

    Pronto para a próxima corrida?

    ${theme.companyName}
    ${theme.supportEmail}
  `;

  return {
    subject: `Bem-vindo à ${theme.companyName}! 🏃‍♂️`,
    html,
    text,
  };
}

// Password Reset Email Template
export function generatePasswordResetTemplate(
  data: PasswordResetData,
): EmailTemplate {
  const theme = EmailUtils.mergeTheme(data.theme);
  const { header, footer, styles } = getBaseEmailTemplate(theme);

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Redefinir Senha - ${theme.companyName}</title>
      ${styles}
    </head>
    <body>
      <div class="email-container">
        ${header}

        <div class="content">
          <div class="greeting">
            Olá, ${data.customerName}! 🔐
          </div>

          <p>Recebemos uma solicitação para redefinir a senha da sua conta na <strong>${theme.companyName}</strong>.</p>
          <p>Se você fez esta solicitação, clique no botão abaixo para criar uma nova senha:</p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${data.resetUrl}" class="button">
              🔑 Redefinir Senha
            </a>
          </div>

          <div class="section">
            <h3>🛡️ Informações de Segurança</h3>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Token de Segurança</div>
                <div class="info-value" style="font-family: monospace; font-size: 12px;">${data.resetToken}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Válido até</div>
                <div class="info-value">${data.expirationTime}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <h3>📋 Instruções</h3>
            <ol style="margin: 0; padding-left: 20px;">
              <li>Clique no botão "Redefinir Senha" acima</li>
              <li>Você será direcionado para uma página segura</li>
              <li>Digite sua nova senha (mínimo 8 caracteres)</li>
              <li>Confirme a nova senha</li>
              <li>Faça login com suas novas credenciais</li>
            </ol>
          </div>

          <div style="background: #fef2f2; border: 1px solid #ef4444; padding: 16px; border-radius: 8px; margin-top: 24px;">
            <h4 style="color: #ef4444; margin-bottom: 8px;">⚠️ Não solicitou esta alteração?</h4>
            <p style="margin: 0;">Se você não solicitou a redefinição de senha, ignore este email. Sua conta permanece segura e nenhuma alteração será feita.</p>
          </div>

          <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; margin-top: 16px;">
            <h4 style="color: #3b82f6; margin-bottom: 8px;">💡 Dicas de Segurança</h4>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Use uma senha forte e única</li>
              <li>Combine letras, números e símbolos</li>
              <li>Não compartilhe suas credenciais</li>
              <li>Mantenha seus dados sempre atualizados</li>
            </ul>
          </div>
        </div>

        ${footer}
      </div>
    </body>
    </html>
  `;

  const text = `
    ${theme.companyName} - Redefinir Senha

    Olá, ${data.customerName}!

    Recebemos uma solicitação para redefinir sua senha.

    Para redefinir sua senha, acesse o link:
    ${data.resetUrl}

    Token de segurança: ${data.resetToken}
    Válido até: ${data.expirationTime}

    Instruções:
    1. Clique no link acima
    2. Digite sua nova senha
    3. Confirme a senha
    4. Faça login com as novas credenciais

    Se você não solicitou esta alteração, ignore este email.

    Dicas de segurança:
    - Use uma senha forte e única
    - Combine letras, números e símbolos
    - Não compartilhe suas credenciais

    ${theme.companyName}
    ${theme.supportEmail}
  `;

  return {
    subject: `Redefinir senha da sua conta - ${theme.companyName}`,
    html,
    text,
  };
}

// Promotional Email Template
export function generatePromotionalTemplate(
  data: PromotionalData,
): EmailTemplate {
  const theme = EmailUtils.mergeTheme(data.theme);
  const { header, footer, styles } = getBaseEmailTemplate(theme);

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${data.promoTitle} - ${theme.companyName}</title>
      ${styles}
    </head>
    <body>
      <div class="email-container">
        ${header}

        <div class="content">
          <div class="greeting">
            Olá, ${data.customerName}! 🎉
          </div>

          <div style="text-align: center; padding: 32px 24px; background: linear-gradient(135deg, ${theme.primaryColor}, ${theme.accentColor}); border-radius: 12px; color: white; margin: 24px 0;">
            <h1 style="margin: 0 0 16px 0; font-size: 28px;">${data.promoTitle}</h1>
            ${
              data.discountPercentage
                ? `
              <div style="font-size: 48px; font-weight: 700; margin: 16px 0;">
                ${data.discountPercentage}% OFF
              </div>
            `
                : ""
            }
            <p style="margin: 0; opacity: 0.9; font-size: 18px;">${data.promoDescription}</p>
          </div>

          ${
            data.discountCode
              ? `
            <div class="section">
              <h3>🎫 Código Promocional</h3>
              <div style="text-align: center; padding: 16px; background: #f8fafc; border: 2px dashed ${theme.primaryColor}; border-radius: 8px;">
                <div style="font-size: 24px; font-weight: 700; color: ${theme.primaryColor}; font-family: monospace;">
                  ${data.discountCode}
                </div>
                <p style="margin: 8px 0 0 0; font-size: 12px; color: #6b7280;">Copie e cole este código no checkout</p>
              </div>
            </div>
          `
              : ""
          }

          <div style="text-align: center; margin: 32px 0;">
            <a href="${data.ctaUrl}" class="button" style="font-size: 18px; padding: 16px 32px;">
              ${data.ctaText}
            </a>
          </div>

          ${
            data.features && data.features.length > 0
              ? `
            <div class="section">
              <h3>⭐ Por que escolher nosso serviço?</h3>
              <ul style="margin: 0; padding-left: 20px;">
                ${data.features.map((feature) => `<li>${feature}</li>`).join("")}
              </ul>
            </div>
          `
              : ""
          }

          <div class="section">
            <h3>⏰ Oferta Limitada</h3>
            <p><strong>Válida até:</strong> ${EmailUtils.formatDate(data.validUntil)}</p>
            <p style="color: #ef4444; font-weight: 600;">Não perca esta oportunidade única!</p>
          </div>

          <div style="background: #ecfdf5; border: 1px solid ${theme.secondaryColor}; padding: 16px; border-radius: 8px; margin-top: 24px;">
            <h4 style="color: ${theme.secondaryColor}; margin-bottom: 8px;">🏃‍♂️ Facilite sua vida de corredor</h4>
            <p style="margin: 0;">Deixe a retirada do kit conosco e foque no que realmente importa: sua performance na corrida!</p>
          </div>

          <div style="text-align: center; margin: 24px 0; padding: 16px; background: #fef3c7; border-radius: 8px;">
            <p style="margin: 0; color: #f59e0b; font-weight: 600;">
              🔥 Vagas limitadas! Garante já a sua!
            </p>
          </div>
        </div>

        ${footer}
      </div>
    </body>
    </html>
  `;

  const text = `
    ${data.promoTitle} - ${theme.companyName}

    Olá, ${data.customerName}!

    ${data.promoTitle}

    ${data.promoDescription}

    ${data.discountPercentage ? `Desconto: ${data.discountPercentage}% OFF` : ""}
    ${data.discountCode ? `Código promocional: ${data.discountCode}` : ""}

    ${
      data.features && data.features.length > 0
        ? `
    Por que escolher nosso serviço:
    ${data.features.map((feature) => `- ${feature}`).join("\n")}
    `
        : ""
    }

    Válido até: ${EmailUtils.formatDate(data.validUntil)}

    ${data.ctaText}: ${data.ctaUrl}

    Não perca esta oportunidade única!

    ${theme.companyName}
    ${theme.supportEmail}
  `;

  return {
    subject: `${data.promoTitle} - Oferta Especial ${theme.companyName}`,
    html,
    text,
  };
}

// Payment Pending Email Template
export function generatePaymentPendingTemplate(
  data: PaymentPendingData,
): EmailTemplate {
  const theme = EmailUtils.mergeTheme(data.theme);
  const { header, footer, styles } = getBaseEmailTemplate(theme);
  const orderDetailsUrl = EmailUtils.generateOrderDetailsUrl(data.orderNumber);

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Aguardando Pagamento - ${theme.companyName}</title>
      ${styles}
    </head>
    <body>
      <div class="email-container">
        ${header}

        <div class="content">
          <div class="greeting">
            ⏳ Aguardando Pagamento
          </div>
          
          <h2 style="color: ${theme.primaryColor}; font-size: 20px; margin: 16px 0;">
            Finalize seu pagamento para confirmarmos seu pedido
          </h2>

          <p>Olá, ${data.customerName}!</p>
          <p>Seu pedido foi criado com sucesso, mas ainda precisa ser pago para ser confirmado.</p>
          <p>Assim que o pagamento for confirmado, nossa equipe irá retirar seu kit no local do evento e entregá-lo no endereço informado.</p>

          ${
            data.paymentUrl
              ? `
          <div style="text-align: center; margin: 24px 0;">
            <a href="${data.paymentUrl}" 
               style="background-color: ${theme.primaryColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              Finalizar Pagamento - ${EmailUtils.formatCurrency(data.totalAmount || data.pricing.totalCost)}
            </a>
            <p style="font-size: 12px; color: #6b7280; margin-top: 8px;">
              🔒 Pagamento 100% seguro
            </p>
          </div>
          `
              : ""
          }

          <div class="section">
            <h3>📋 Detalhes do Pedido</h3>
            <div class="grid-container">
              <div class="grid-item">
                <strong>Pedido:</strong> ${data.orderNumber}
              </div>
              <div class="grid-item">
                <strong>Evento:</strong> ${data.eventName}
              </div>
              <div class="grid-item">
                <strong>Data:</strong> ${EmailUtils.formatDate(data.eventDate)}
              </div>
              <div class="grid-item">
                <strong>Local:</strong> ${data.eventLocation}
              </div>
              <div class="grid-item">
                <strong>Kits:</strong> ${data.kits.length} kit${data.kits.length > 1 ? "s" : ""}
              </div>
              <div class="grid-item">
                <strong>Forma de Pagamento:</strong> ${EmailUtils.formatPaymentMethod(data.paymentMethod)}
              </div>
            </div>
          </div>

          <div class="section">
            <h3>🏃‍♂️ Kits do Pedido</h3>
            <div class="kits-list">
              ${data.kits
                .map(
                  (kit) => `
                <div class="kit-item">
                  <div class="kit-info">
                    <strong>${kit.name}</strong> • ${kit.category}
                  </div>
                  <div class="kit-details">
                    <span class="kit-size">Tamanho ${kit.shirtSize}</span>
                    ${kit.cpf ? `<span class="kit-cpf">${EmailUtils.formatCPF(kit.cpf)}</span>` : ""}
                  </div>
                </div>
              `,
                )
                .join("")}
            </div>
          </div>

          <div class="section">
            <h3>📍 Endereço de Entrega</h3>
            <div class="address-card">
              <div class="address-info">
                <p><strong>${data.address.street}, ${data.address.number}</strong>
                ${data.address.complement ? `<br>${data.address.complement}` : ""}</p>
                <p>${data.address.neighborhood} - ${data.address.city}/${data.address.state}</p>
                <p>CEP: ${data.address.zipCode}</p>
                ${data.address.reference ? `<p><em>Ref: ${data.address.reference}</em></p>` : ""}
              </div>
            </div>
          </div>

          <div class="section">
            <h3>💰 Resumo Financeiro</h3>
            <div class="pricing-breakdown">
              <div class="pricing-item">
                <span>Taxa de entrega:</span>
                <span>${EmailUtils.formatCurrency(data.pricing.deliveryCost)}</span>
              </div>
              ${
                data.pricing.extraKitsCost !== "0" &&
                data.pricing.extraKitsCost !== "0.00"
                  ? `
              <div class="pricing-item">
                <span>Kits extras:</span>
                <span>${EmailUtils.formatCurrency(data.pricing.extraKitsCost)}</span>
              </div>
              `
                  : ""
              }
              ${
                data.pricing.donationCost &&
                data.pricing.donationCost !== "0" &&
                data.pricing.donationCost !== "0.00"
                  ? `
              <div class="pricing-item">
                <span>Doação:</span>
                <span>${EmailUtils.formatCurrency(data.pricing.donationCost)}</span>
              </div>
              `
                  : ""
              }
              <div class="pricing-item pricing-total">
                <span><strong>Total:</strong></span>
                <span><strong>${EmailUtils.formatCurrency(data.pricing.totalCost)}</strong></span>
              </div>
            </div>
          </div>

          <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 16px; border-radius: 8px; margin-top: 24px;">
            <h4 style="color: #f59e0b; margin-bottom: 8px;">⚠️ Importante</h4>
            <p style="margin: 0;">Este pedido expira em 24 horas (${EmailUtils.formatDate(data.expiresAt)}). Finalize o pagamento antes do prazo para garantir seu kit!</p>
          </div>

          <div style="text-align: center; margin-top: 32px; padding: 20px; background: #f8fafc; border-radius: 8px;">
            <h4 style="color: ${theme.primaryColor}; margin-bottom: 12px;">📞 Precisa de Ajuda?</h4>
            <p style="margin: 4px 0;">WhatsApp: ${theme.supportPhone}</p>
            <p style="margin: 4px 0;">Email: ${theme.supportEmail}</p>
            <p style="margin: 12px 0 0 0; font-size: 14px; color: #6b7280;">
              Nossa equipe está pronta para ajudar você!
            </p>
          </div>
        </div>

        ${footer}
      </div>
    </body>
    </html>
  `;

  const text = `
    ${theme.companyName} - Aguardando Pagamento ⏳

    Finalize seu pagamento para confirmarmos seu pedido

    Olá, ${data.customerName}!

    Seu pedido foi criado com sucesso, mas ainda precisa ser pago para ser confirmado.

    Pedido: ${data.orderNumber}
    Evento: ${data.eventName}
    Data: ${EmailUtils.formatDate(data.eventDate)}
    Local: ${data.eventLocation}
    Kits: ${data.kits.length} kit${data.kits.length > 1 ? "s" : ""}
    Forma de Pagamento: ${EmailUtils.formatPaymentMethod(data.paymentMethod)}

    Kits do Pedido:
    ${data.kits.map((kit) => `- ${kit.name} (${kit.shirtSize} - ${kit.category}) ${kit.cpf ? `CPF: ${EmailUtils.formatCPF(kit.cpf)}` : ""}`).join("\n")}

    Endereço de Entrega:
    ${data.address.street}, ${data.address.number}${data.address.complement ? `, ${data.address.complement}` : ""}
    ${data.address.neighborhood} - ${data.address.city}/${data.address.state}
    CEP: ${data.address.zipCode}
    ${data.address.reference ? `Ref: ${data.address.reference}` : ""}

    Resumo Financeiro:
    Taxa de entrega: ${EmailUtils.formatCurrency(data.pricing.deliveryCost)}
    ${data.pricing.extraKitsCost !== "0" && data.pricing.extraKitsCost !== "0.00" ? `Kits extras: ${EmailUtils.formatCurrency(data.pricing.extraKitsCost)}` : ""}
    ${data.pricing.donationCost && data.pricing.donationCost !== "0" && data.pricing.donationCost !== "0.00" ? `Doação: ${EmailUtils.formatCurrency(data.pricing.donationCost)}` : ""}
    Total: ${EmailUtils.formatCurrency(data.pricing.totalCost)}

    ⚠️ IMPORTANTE: Este pedido expira em 24 horas (${EmailUtils.formatDate(data.expiresAt)}). 
    Finalize o pagamento antes do prazo para garantir seu kit!

    Precisa de ajuda?
    WhatsApp: ${theme.supportPhone}
    Email: ${theme.supportEmail}

    ${theme.companyName}
  `;

  return {
    subject: `⏳ Aguardando Pagamento - Finalize seu pedido! ${data.orderNumber}`,
    html,
    text,
  };
}

import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import type { Order, Customer, Event, Address, Kit } from '@shared/schema';

interface OrderWithDetails extends Order {
  customer: Customer;
  event: Event;
  address: Address;
  kits: Kit[];
}

// Brazilian formatting functions
function formatCPF(cpf: string): string {
  const cleanCPF = cpf.replace(/\D/g, '');
  return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatPhone(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length === 11) {
    return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (cleanPhone.length === 10) {
    return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR');
}

function formatCurrency(value: string | number): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(numValue);
}

function addLogoToDocument(doc: PDFDocument, x: number, y: number, height: number): void {
  // Primeiro tenta a nova logo
  const newLogoPath = path.join(process.cwd(), 'attached_assets', 'logo-kitrunner-new.png');

  try {
    if (fs.existsSync(newLogoPath)) {
      doc.image(newLogoPath, x, y, { height });
      return;
    }
  } catch (error) {
    console.log('Nova logo não encontrada, tentando fallback');
  }

  // Fallback para logo antiga
  const fallbackLogoPath = path.join(process.cwd(), 'attached_assets', 'logo_1753468396785.png');
  try {
    if (fs.existsSync(fallbackLogoPath)) {
      doc.image(fallbackLogoPath, x, y, { height });
      return;
    }
  } catch (error) {
    console.log('Logo de fallback não encontrada');
  }

  // Se nenhuma logo for encontrada, adiciona texto
  doc.fillColor('white').fontSize(20).font('Helvetica-Bold');
  doc.text('KITRUNNER', x, y + 15);
}

export async function generateDeliveryLabel(order: OrderWithDetails): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 30,
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 30;
    const contentWidth = pageWidth - (margin * 2);

    let currentY = margin;

    // Header com background roxo
    doc.rect(margin, currentY, contentWidth, 80)
       .fillAndStroke('#6366f1', '#4f46e5')
       .fill();

    // Adicionar logo
    addLogoToDocument(doc, margin + 20, currentY + 15, 50);

    // Número do pedido no canto direito com margem adequada
    doc.fontSize(16).font('Helvetica-Bold').fillColor('white');
    doc.text(`#${order.orderNumber}`, pageWidth - 250, currentY + 25, {
      width: 200,
      align: 'right'
    });

    currentY += 100; // Espaçamento após header

    // Seção Informações do Pedido
    doc.fillColor('#f8fafc');
    doc.rect(margin, currentY, contentWidth, 100)
       .fillAndStroke('#f8fafc', '#e2e8f0');

    doc.fillColor('#1e293b');
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text('INFORMAÇÕES DO PEDIDO', margin + 20, currentY + 20);

    // Colunas de informações
    const leftColumn = margin + 25;
    const rightColumn = margin + (contentWidth / 2) + 15;

    doc.fontSize(10).fillColor('#64748b');
    doc.font('Helvetica-Bold').text('Data do Pedido:', leftColumn, currentY + 45);
    doc.fillColor('#1e293b').font('Helvetica').text(formatDate(order.createdAt.toISOString()), leftColumn + 85, currentY + 45);

    doc.fillColor('#64748b').font('Helvetica-Bold').text('Evento:', leftColumn, currentY + 65);
    doc.fillColor('#1e293b').font('Helvetica').text(order.event.name, leftColumn + 45, currentY + 65, { width: 180 });

    doc.fillColor('#64748b').font('Helvetica-Bold').text('Quantidade:', rightColumn, currentY + 45);
    doc.fillColor('#1e293b').font('Helvetica').text(`${order.kitQuantity} kit(s)`, rightColumn + 65, currentY + 45);

    doc.fillColor('#64748b').font('Helvetica-Bold').text('Valor Total:', rightColumn, currentY + 65);
    doc.fillColor('#1e293b').font('Helvetica').text(formatCurrency(order.totalCost), rightColumn + 65, currentY + 65);

    currentY += 130; // Margem aumentada após seção

    // Seção Dados do Destinatário
    doc.fillColor('#fefefe');
    doc.rect(margin, currentY, contentWidth, 150)
       .fillAndStroke('#fefefe', '#e2e8f0');

    doc.fillColor('#1e293b');
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text('DADOS DO DESTINATÁRIO', margin + 20, currentY + 20);

    const recipientStartY = currentY + 50; // Margem aumentada
    const recipientLeftColumn = margin + 25;
    const recipientRightColumn = margin + (contentWidth / 2) + 15;

    // Coluna esquerda - Dados pessoais
    doc.fontSize(10).fillColor('#64748b');
    doc.font('Helvetica-Bold').text('Nome Completo:', recipientLeftColumn, recipientStartY);
    doc.fillColor('#1e293b').font('Helvetica').text(order.customer.name, recipientLeftColumn, recipientStartY + 15, { width: 200 });

    doc.fillColor('#64748b').font('Helvetica-Bold').text('CPF:', recipientLeftColumn, recipientStartY + 40);
    doc.fillColor('#1e293b').font('Helvetica').text(formatCPF(order.customer.cpf), recipientLeftColumn, recipientStartY + 55);

    doc.fillColor('#64748b').font('Helvetica-Bold').text('Telefone:', recipientLeftColumn, recipientStartY + 80);
    doc.fillColor('#1e293b').font('Helvetica').text(formatPhone(order.customer.phone), recipientLeftColumn, recipientStartY + 95);

    // Coluna direita - Endereço
    doc.fillColor('#64748b').font('Helvetica-Bold').text('Endereço de Entrega:', recipientRightColumn, recipientStartY);
    const address = order.address;
    const fullAddress = `${address.street}, ${address.number}${address.complement ? ' - ' + address.complement : ''}
${address.neighborhood}
${address.city} - ${address.state}
CEP: ${address.zipCode}`;
    doc.fillColor('#1e293b').font('Helvetica').text(fullAddress, recipientRightColumn, recipientStartY + 15, { width: 230 });

    currentY += 190; // Margem aumentada após seção

    // Seção Itens do Pedido
    const itemSectionHeight = 100 + (order.kits.length * 15);
    doc.fillColor('#f8fafc');
    doc.rect(margin, currentY, contentWidth, itemSectionHeight)
       .fillAndStroke('#f8fafc', '#e2e8f0');

    doc.fillColor('#1e293b');
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text('ITENS DO PEDIDO', margin + 20, currentY + 20);

    // Cabeçalho da tabela
    doc.fillColor('#6366f1');
    doc.rect(margin + 20, currentY + 50, contentWidth - 40, 22) // Margem aumentada
       .fillAndStroke('#6366f1', '#4f46e5');

    doc.fillColor('white');
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Produto', margin + 30, currentY + 57);
    doc.text('Quantidade', pageWidth - 130, currentY + 57);

    let itemY = currentY + 80;

    // Linha principal do produto
    doc.fillColor('#1e293b');
    doc.fontSize(10).font('Helvetica');
    doc.text(order.event.name, margin + 30, itemY, { width: 380 });
    doc.text(`${order.kitQuantity} kit(s)`, pageWidth - 130, itemY);
    itemY += 18;

    // Detalhes dos kits
    if (order.kits.length > 0) {
      doc.fontSize(9).fillColor('#64748b');
      order.kits.forEach((kit, index) => {
        const kitText = `Kit ${index + 1}: ${kit.name} • CPF: ${formatCPF(kit.cpf)} • Tamanho: ${kit.shirtSize}`;
        doc.text(kitText, margin + 40, itemY, { width: 480 });
        itemY += 12;
      });
    }

    currentY += itemSectionHeight + 30; // Margem aumentada após seção

    // Seção Confirmação de Recebimento
    doc.fillColor('#fefefe');
    doc.rect(margin, currentY, contentWidth, 180) // Altura aumentada para acomodar campos do terceiro autorizado
       .fillAndStroke('#fefefe', '#e2e8f0');

    doc.fillColor('#1e293b');
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text('CONFIRMAÇÃO DE RECEBIMENTO', margin + 20, currentY + 20);

    doc.fontSize(10).fillColor('#64748b').font('Helvetica');
    doc.text('Declaro que recebi os itens acima relacionados em perfeito estado e conforme especificado.',
      margin + 20, currentY + 50, { width: contentWidth - 40 }); // Margem aumentada

    // Campos de assinatura
    const sigY = currentY + 80; // Margem aumentada
    const sig1X = margin + 25;
    const sig2X = margin + (contentWidth / 2) + 15;
    const sigWidth = (contentWidth / 2) - 40;

    // Assinatura do destinatário
    doc.fillColor('#f8fafc');
    doc.rect(sig1X, sigY, sigWidth, 35)
       .fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold');
    doc.text('Assinatura do Destinatário', sig1X + 8, sigY + 8);

    // Terceiro autorizado
    doc.fillColor('#f8fafc');
    doc.rect(sig2X, sigY, sigWidth, 35)
       .fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold');
    doc.text('Terceiro Autorizado', sig2X + 8, sigY + 8);
    doc.fontSize(8).font('Helvetica');
    doc.text('(nome completo e documento)', sig2X + 8, sigY + 22);

    // Campos CPF e Data
    const fieldsY = sigY + 50;
    const fieldWidth = (sigWidth / 2) - 5;

    // Campos do destinatário (esquerda)
    const field1X = sig1X;
    const field2X = sig1X + fieldWidth + 10;

    // Campos do terceiro autorizado (direita)
    const field3X = sig2X;
    const field4X = sig2X + fieldWidth + 10;

    // CPF destinatário
    doc.fillColor('#f8fafc');
    doc.rect(field1X, fieldsY, fieldWidth, 20)
       .fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold');
    doc.text('CPF', field1X + 5, fieldsY + 6);

    // Data destinatário
    doc.fillColor('#f8fafc');
    doc.rect(field2X, fieldsY, fieldWidth, 20)
       .fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold');
    doc.text('Data', field2X + 5, fieldsY + 6);

    // CPF terceiro autorizado
    doc.fillColor('#f8fafc');
    doc.rect(field3X, fieldsY, fieldWidth, 20)
       .fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold');
    doc.text('CPF', field3X + 5, fieldsY + 6);

    // Data terceiro autorizado
    doc.fillColor('#f8fafc');
    doc.rect(field4X, fieldsY, fieldWidth, 20)
       .fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold');
    doc.text('Data', field4X + 5, fieldsY + 6);

    // Footer
    const footerY = pageHeight - 50;
    doc.fillColor('#6366f1');
    doc.rect(margin, footerY, contentWidth, 25)
       .fillAndStroke('#6366f1', '#4f46e5');
    doc.fillColor('white').fontSize(8).font('Helvetica');
    doc.text('KITRUNNER - Sistema de Gerenciamento de Kits de Eventos', margin + 15, footerY + 9);
    doc.text(`Gerado em: ${formatDate(new Date().toISOString())}`, pageWidth - 140, footerY + 9);

    doc.end();
  });
}

export async function generateMultipleLabels(orders: OrderWithDetails[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 30,
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 30;
    const contentWidth = pageWidth - (margin * 2);

    orders.forEach((order, index) => {
      if (index > 0) {
        doc.addPage();
      }

      let currentY = margin;

      // Header com background roxo
      doc.rect(margin, currentY, contentWidth, 80)
         .fillAndStroke('#6366f1', '#4f46e5')
         .fill();

      // Adicionar logo
      addLogoToDocument(doc, margin + 20, currentY + 15, 50);

      // Número do pedido no canto direito com margem adequada
      doc.fontSize(16).font('Helvetica-Bold').fillColor('white');
      doc.text(`#${order.orderNumber}`, pageWidth - 250, currentY + 25, {
        width: 200,
        align: 'right'
      });

      currentY += 100; // Espaçamento após header

      // Seção Informações do Pedido
      doc.fillColor('#f8fafc');
      doc.rect(margin, currentY, contentWidth, 100)
         .fillAndStroke('#f8fafc', '#e2e8f0');

      doc.fillColor('#1e293b');
      doc.fontSize(14).font('Helvetica-Bold');
      doc.text('INFORMAÇÕES DO PEDIDO', margin + 20, currentY + 20);

      const leftColumn = margin + 25;
      const rightColumn = margin + (contentWidth / 2) + 15;

      doc.fontSize(10).fillColor('#64748b');
      doc.font('Helvetica-Bold').text('Data do Pedido:', leftColumn, currentY + 45);
      doc.fillColor('#1e293b').font('Helvetica').text(formatDate(order.createdAt.toISOString()), leftColumn + 85, currentY + 45);

      doc.fillColor('#64748b').font('Helvetica-Bold').text('Evento:', leftColumn, currentY + 65);
      doc.fillColor('#1e293b').font('Helvetica').text(order.event.name, leftColumn + 45, currentY + 65, { width: 180 });

      doc.fillColor('#64748b').font('Helvetica-Bold').text('Quantidade:', rightColumn, currentY + 45);
      doc.fillColor('#1e293b').font('Helvetica').text(`${order.kitQuantity} kit(s)`, rightColumn + 65, currentY + 45);

      doc.fillColor('#64748b').font('Helvetica-Bold').text('Valor Total:', rightColumn, currentY + 65);
      doc.fillColor('#1e293b').font('Helvetica').text(formatCurrency(order.totalCost), rightColumn + 65, currentY + 65);

      currentY += 130; // Margem aumentada após seção

      // Seção Dados do Destinatário
      doc.fillColor('#fefefe');
      doc.rect(margin, currentY, contentWidth, 150)
         .fillAndStroke('#fefefe', '#e2e8f0');

      doc.fillColor('#1e293b');
      doc.fontSize(14).font('Helvetica-Bold');
      doc.text('DADOS DO DESTINATÁRIO', margin + 20, currentY + 20);

      const recipientStartY = currentY + 50; // Margem aumentada
      const recipientLeftColumn = margin + 25;
      const recipientRightColumn = margin + (contentWidth / 2) + 15;

      // Coluna esquerda - Dados pessoais
      doc.fontSize(10).fillColor('#64748b');
      doc.font('Helvetica-Bold').text('Nome Completo:', recipientLeftColumn, recipientStartY);
      doc.fillColor('#1e293b').font('Helvetica').text(order.customer.name, recipientLeftColumn, recipientStartY + 15, { width: 200 });

      doc.fillColor('#64748b').font('Helvetica-Bold').text('CPF:', recipientLeftColumn, recipientStartY + 40);
      doc.fillColor('#1e293b').font('Helvetica').text(formatCPF(order.customer.cpf), recipientLeftColumn, recipientStartY + 55);

      doc.fillColor('#64748b').font('Helvetica-Bold').text('Telefone:', recipientLeftColumn, recipientStartY + 80);
      doc.fillColor('#1e293b').font('Helvetica').text(formatPhone(order.customer.phone), recipientLeftColumn, recipientStartY + 95);

      // Coluna direita - Endereço
      doc.fillColor('#64748b').font('Helvetica-Bold').text('Endereço de Entrega:', recipientRightColumn, recipientStartY);
      const address = order.address;
      const fullAddress = `${address.street}, ${address.number}${address.complement ? ' - ' + address.complement : ''}
${address.neighborhood}
${address.city} - ${address.state}
CEP: ${address.zipCode}`;
      doc.fillColor('#1e293b').font('Helvetica').text(fullAddress, recipientRightColumn, recipientStartY + 15, { width: 230 });

      currentY += 190; // Margem aumentada após seção

      // Seção Itens do Pedido
      const itemSectionHeight = 100 + (order.kits.length * 15);
      doc.fillColor('#f8fafc');
      doc.rect(margin, currentY, contentWidth, itemSectionHeight)
         .fillAndStroke('#f8fafc', '#e2e8f0');

      doc.fillColor('#1e293b');
      doc.fontSize(14).font('Helvetica-Bold');
      doc.text('ITENS DO PEDIDO', margin + 20, currentY + 20);

      // Cabeçalho da tabela
      doc.fillColor('#6366f1');
      doc.rect(margin + 20, currentY + 50, contentWidth - 40, 22) // Margem aumentada
         .fillAndStroke('#6366f1', '#4f46e5');

      doc.fillColor('white');
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Produto', margin + 30, currentY + 57);
      doc.text('Quantidade', pageWidth - 130, currentY + 57);

      let itemY = currentY + 80;

      // Linha principal do produto
      doc.fillColor('#1e293b');
      doc.fontSize(10).font('Helvetica');
      doc.text(order.event.name, margin + 30, itemY, { width: 380 });
      doc.text(`${order.kitQuantity} kit(s)`, pageWidth - 130, itemY);
      itemY += 18;

      // Detalhes dos kits
      if (order.kits.length > 0) {
        doc.fontSize(9).fillColor('#64748b');
        order.kits.forEach((kit, kitIndex) => {
          const kitText = `Kit ${kitIndex + 1}: ${kit.name} • CPF: ${formatCPF(kit.cpf)} • Tamanho: ${kit.shirtSize}`;
          doc.text(kitText, margin + 40, itemY, { width: 480 });
          itemY += 12;
        });
      }

      currentY += itemSectionHeight + 30; // Margem aumentada após seção

      // Seção Confirmação de Recebimento (agora com campos completos também)
      doc.fillColor('#fefefe');
      doc.rect(margin, currentY, contentWidth, 180) // Altura aumentada para campos completos
         .fillAndStroke('#fefefe', '#e2e8f0');

      doc.fillColor('#1e293b');
      doc.fontSize(14).font('Helvetica-Bold');
      doc.text('CONFIRMAÇÃO DE RECEBIMENTO', margin + 20, currentY + 20);

      doc.fontSize(10).fillColor('#64748b').font('Helvetica');
      doc.text('Declaro que recebi os itens acima relacionados em perfeito estado e conforme especificado.',
        margin + 20, currentY + 50, { width: contentWidth - 40 }); // Margem aumentada

      // Campos de assinatura
      const sigY = currentY + 80; // Margem aumentada
      const sig1X = margin + 25;
      const sig2X = margin + (contentWidth / 2) + 15;
      const sigWidth = (contentWidth / 2) - 40;

      // Assinatura do destinatário
      doc.fillColor('#f8fafc');
      doc.rect(sig1X, sigY, sigWidth, 35)
         .fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold');
      doc.text('Assinatura do Destinatário', sig1X + 8, sigY + 8);

      // Terceiro autorizado
      doc.fillColor('#f8fafc');
      doc.rect(sig2X, sigY, sigWidth, 35)
         .fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold');
      doc.text('Terceiro Autorizado', sig2X + 8, sigY + 8);
      doc.fontSize(8).font('Helvetica');
      doc.text('(nome completo e documento)', sig2X + 8, sigY + 22);

      // Campos CPF e Data
      const fieldsY = sigY + 50;
      const fieldWidth = (sigWidth / 2) - 5;

      // Campos do destinatário (esquerda)
      const field1X = sig1X;
      const field2X = sig1X + fieldWidth + 10;

      // Campos do terceiro autorizado (direita)
      const field3X = sig2X;
      const field4X = sig2X + fieldWidth + 10;

      // CPF destinatário
      doc.fillColor('#f8fafc');
      doc.rect(field1X, fieldsY, fieldWidth, 20)
         .fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold');
      doc.text('CPF', field1X + 5, fieldsY + 6);

      // Data destinatário
      doc.fillColor('#f8fafc');
      doc.rect(field2X, fieldsY, fieldWidth, 20)
         .fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold');
      doc.text('Data', field2X + 5, fieldsY + 6);

      // CPF terceiro autorizado
      doc.fillColor('#f8fafc');
      doc.rect(field3X, fieldsY, fieldWidth, 20)
         .fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold');
      doc.text('CPF', field3X + 5, fieldsY + 6);

      // Data terceiro autorizado
      doc.fillColor('#f8fafc');
      doc.rect(field4X, fieldsY, fieldWidth, 20)
         .fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold');
      doc.text('Data', field4X + 5, fieldsY + 6);

      // Footer
      const footerY = pageHeight - 50;
      doc.fillColor('#6366f1');
      doc.rect(margin, footerY, contentWidth, 25)
         .fillAndStroke('#6366f1', '#4f46e5');
      doc.fillColor('white').fontSize(8).font('Helvetica');
      doc.text('KITRUNNER - Sistema de Gerenciamento de Kits de Eventos', margin + 15, footerY + 9);
      doc.text(`Gerado em: ${formatDate(new Date().toISOString())}`, pageWidth - 140, footerY + 9);
    });

    doc.end();
  });
}
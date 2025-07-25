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

    // Header with background color
    doc.rect(margin, currentY, contentWidth, 80)
       .fillAndStroke('#6366f1', '#4f46e5')
       .fill();

    // Try to add logo
    const logoPath = path.join(process.cwd(), 'attached_assets', 'logo_1753468396785.png');
    try {
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, margin + 20, currentY + 15, { height: 50 });
      }
    } catch (error) {
      console.log('Logo not found, using text fallback');
    }

    // Header text
    doc.fillColor('white');
    doc.fontSize(24).font('Helvetica-Bold');
    doc.text('KITRUNNER', margin + 120, currentY + 15);
    doc.fontSize(14).font('Helvetica');
    doc.text('ETIQUETA DE ENTREGA', margin + 120, currentY + 45);
    
    // Order number in top right
    doc.fontSize(16).font('Helvetica-Bold');
    doc.text(`#${order.orderNumber}`, pageWidth - 200, currentY + 25, { 
      width: 170, 
      align: 'right' 
    });
    
    currentY += 100;

    // Order Information Section with modern card style
    doc.fillColor('#f8fafc');
    doc.rect(margin, currentY, contentWidth, 100)
       .fillAndStroke('#f8fafc', '#e2e8f0');

    doc.fillColor('#1e293b');
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text('INFORMAÇÕES DO PEDIDO', margin + 20, currentY + 20);
    
    // Create two columns with proper spacing
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
    
    currentY += 120;

    // Recipient Information Section with modern card style
    doc.fillColor('#fefefe');
    doc.rect(margin, currentY, contentWidth, 150)
       .fillAndStroke('#fefefe', '#e2e8f0');

    doc.fillColor('#1e293b');
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text('DADOS DO DESTINATÁRIO', margin + 20, currentY + 20);
    
    // Two columns layout with proper spacing
    const recipientStartY = currentY + 45;
    const recipientLeftColumn = margin + 25;
    const recipientRightColumn = margin + (contentWidth / 2) + 15;
    
    // Left column - Personal info
    doc.fontSize(10).fillColor('#64748b');
    doc.font('Helvetica-Bold').text('Nome Completo:', recipientLeftColumn, recipientStartY);
    doc.fillColor('#1e293b').font('Helvetica').text(order.customer.name, recipientLeftColumn, recipientStartY + 15, { width: 200 });
    
    doc.fillColor('#64748b').font('Helvetica-Bold').text('CPF:', recipientLeftColumn, recipientStartY + 40);
    doc.fillColor('#1e293b').font('Helvetica').text(formatCPF(order.customer.cpf), recipientLeftColumn, recipientStartY + 55);
    
    doc.fillColor('#64748b').font('Helvetica-Bold').text('Telefone:', recipientLeftColumn, recipientStartY + 80);
    doc.fillColor('#1e293b').font('Helvetica').text(formatPhone(order.customer.phone), recipientLeftColumn, recipientStartY + 95);
    
    // Right column - Address
    doc.fillColor('#64748b').font('Helvetica-Bold').text('Endereço de Entrega:', recipientRightColumn, recipientStartY);
    const address = order.address;
    const fullAddress = `${address.street}, ${address.number}${address.complement ? ' - ' + address.complement : ''}
${address.neighborhood}
${address.city} - ${address.state}
CEP: ${address.zipCode}`;
    doc.fillColor('#1e293b').font('Helvetica').text(fullAddress, recipientRightColumn, recipientStartY + 15, { width: 230 });
    
    currentY += 170;

    // Order Items Section with modern card style
    const itemSectionHeight = 80 + (order.kits.length * 15);
    doc.fillColor('#f8fafc');
    doc.rect(margin, currentY, contentWidth, itemSectionHeight)
       .fillAndStroke('#f8fafc', '#e2e8f0');

    doc.fillColor('#1e293b');
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text('ITENS DO PEDIDO', margin + 20, currentY + 20);
    
    // Items table header
    doc.fillColor('#6366f1');
    doc.rect(margin + 20, currentY + 45, contentWidth - 40, 22)
       .fillAndStroke('#6366f1', '#4f46e5');
       
    doc.fillColor('white');
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Produto', margin + 30, currentY + 52);
    doc.text('Quantidade', pageWidth - 130, currentY + 52);
    
    let itemY = currentY + 75;
    
    // Main product row
    doc.fillColor('#1e293b');
    doc.fontSize(10).font('Helvetica');
    doc.text(order.event.name, margin + 30, itemY, { width: 380 });
    doc.text(`${order.kitQuantity} kit(s)`, pageWidth - 130, itemY);
    itemY += 18;
    
    // Kit details with better formatting
    if (order.kits.length > 0) {
      doc.fontSize(9).fillColor('#64748b');
      order.kits.forEach((kit, index) => {
        const kitText = `Kit ${index + 1}: ${kit.name} • CPF: ${formatCPF(kit.cpf)} • Tamanho: ${kit.shirtSize}`;
        doc.text(kitText, margin + 40, itemY, { width: 480 });
        itemY += 12;
      });
    }
    
    currentY += itemSectionHeight + 20;

    // Signature Section with modern card style
    doc.fillColor('#fefefe');
    doc.rect(margin, currentY, contentWidth, 160)
       .fillAndStroke('#fefefe', '#e2e8f0');

    doc.fillColor('#1e293b');
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text('CONFIRMAÇÃO DE RECEBIMENTO', margin + 20, currentY + 20);
    
    doc.fontSize(10).fillColor('#64748b').font('Helvetica');
    doc.text('Declaro que recebi os itens acima relacionados em perfeito estado e conforme especificado.', 
      margin + 20, currentY + 45, { width: contentWidth - 40 });
    
    // Signature fields with modern styling
    const sigY = currentY + 75;
    const sig1X = margin + 25;
    const sig2X = margin + (contentWidth / 2) + 15;
    const sigWidth = (contentWidth / 2) - 40;
    
    // Main signature box
    doc.fillColor('#f8fafc');
    doc.rect(sig1X, sigY, sigWidth, 35)
       .fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold');
    doc.text('Assinatura do Destinatário', sig1X + 8, sigY + 8);
    
    // Third party signature box
    doc.fillColor('#f8fafc');
    doc.rect(sig2X, sigY, sigWidth, 35)
       .fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold');
    doc.text('Terceiro Autorizado', sig2X + 8, sigY + 8);
    doc.fontSize(8).font('Helvetica');
    doc.text('(nome completo e documento)', sig2X + 8, sigY + 22);
    
    // CPF and Date fields
    const fieldsY = sigY + 50;
    const fieldWidth = (sigWidth / 2) - 5;
    
    // Left section fields
    const field1X = sig1X;
    const field2X = sig1X + fieldWidth + 10;
    
    // Right section fields  
    const field3X = sig2X;
    const field4X = sig2X + fieldWidth + 10;
    
    // CPF field (left)
    doc.fillColor('#f8fafc');
    doc.rect(field1X, fieldsY, fieldWidth, 20)
       .fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold');
    doc.text('CPF', field1X + 5, fieldsY + 6);
    
    // Date field (left)
    doc.fillColor('#f8fafc');
    doc.rect(field2X, fieldsY, fieldWidth, 20)
       .fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold');
    doc.text('Data', field2X + 5, fieldsY + 6);
    
    // Third party CPF field (right)
    doc.fillColor('#f8fafc');
    doc.rect(field3X, fieldsY, fieldWidth, 20)
       .fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold');
    doc.text('CPF', field3X + 5, fieldsY + 6);
    
    // Third party Date field (right)
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

      // Header with background color
      doc.rect(margin, currentY, contentWidth, 80)
         .fillAndStroke('#6366f1', '#4f46e5')
         .fill();

      // Try to add logo
      const logoPath = path.join(process.cwd(), 'attached_assets', 'logo_1753468396785.png');
      try {
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, margin + 20, currentY + 15, { height: 50 });
        }
      } catch (error) {
        console.log('Logo not found, using text fallback');
      }

      // Header text
      doc.fillColor('white');
      doc.fontSize(24).font('Helvetica-Bold');
      doc.text('KITRUNNER', margin + 120, currentY + 15);
      doc.fontSize(14).font('Helvetica');
      doc.text('ETIQUETA DE ENTREGA', margin + 120, currentY + 45);
      
      // Order number in top right
      doc.fontSize(16).font('Helvetica-Bold');
      doc.text(`#${order.orderNumber}`, pageWidth - 200, currentY + 25, { 
        width: 170, 
        align: 'right' 
      });
      
      currentY += 100;

      // Create two columns with proper spacing
      const leftColumn = margin + 25;
      const rightColumn = margin + (contentWidth / 2) + 15;

      // Order Information Section with modern card style
      doc.fillColor('#f8fafc');
      doc.rect(margin, currentY, contentWidth, 100)
         .fillAndStroke('#f8fafc', '#e2e8f0');

      doc.fillColor('#1e293b');
      doc.fontSize(14).font('Helvetica-Bold');
      doc.text('INFORMAÇÕES DO PEDIDO', margin + 20, currentY + 20);
      
      doc.fontSize(10).fillColor('#64748b');
      doc.font('Helvetica-Bold').text('Data do Pedido:', leftColumn, currentY + 45);
      doc.fillColor('#1e293b').font('Helvetica').text(formatDate(order.createdAt.toISOString()), leftColumn + 85, currentY + 45);
      
      doc.fillColor('#64748b').font('Helvetica-Bold').text('Evento:', leftColumn, currentY + 65);
      doc.fillColor('#1e293b').font('Helvetica').text(order.event.name, leftColumn + 45, currentY + 65, { width: 180 });
      
      doc.fillColor('#64748b').font('Helvetica-Bold').text('Quantidade:', rightColumn, currentY + 45);
      doc.fillColor('#1e293b').font('Helvetica').text(`${order.kitQuantity} kit(s)`, rightColumn + 65, currentY + 45);
      
      doc.fillColor('#64748b').font('Helvetica-Bold').text('Valor Total:', rightColumn, currentY + 65);
      doc.fillColor('#1e293b').font('Helvetica').text(formatCurrency(order.totalCost), rightColumn + 65, currentY + 65);
      
      currentY += 120;

      // Recipient Information Section with modern card style
      doc.fillColor('#fefefe');
      doc.rect(margin, currentY, contentWidth, 150)
         .fillAndStroke('#fefefe', '#e2e8f0');

      doc.fillColor('#1e293b');
      doc.fontSize(14).font('Helvetica-Bold');
      doc.text('DADOS DO DESTINATÁRIO', margin + 20, currentY + 20);
      
      // Two columns layout with proper spacing
      const recipientStartY = currentY + 45;
      const recipientLeftColumn = margin + 25;
      const recipientRightColumn = margin + (contentWidth / 2) + 15;
      
      // Left column - Personal info
      doc.fontSize(10).fillColor('#64748b');
      doc.font('Helvetica-Bold').text('Nome Completo:', recipientLeftColumn, recipientStartY);
      doc.fillColor('#1e293b').font('Helvetica').text(order.customer.name, recipientLeftColumn, recipientStartY + 15, { width: 200 });
      
      doc.fillColor('#64748b').font('Helvetica-Bold').text('CPF:', recipientLeftColumn, recipientStartY + 40);
      doc.fillColor('#1e293b').font('Helvetica').text(formatCPF(order.customer.cpf), recipientLeftColumn, recipientStartY + 55);
      
      doc.fillColor('#64748b').font('Helvetica-Bold').text('Telefone:', recipientLeftColumn, recipientStartY + 80);
      doc.fillColor('#1e293b').font('Helvetica').text(formatPhone(order.customer.phone), recipientLeftColumn, recipientStartY + 95);
      
      // Right column - Address
      doc.fillColor('#64748b').font('Helvetica-Bold').text('Endereço de Entrega:', recipientRightColumn, recipientStartY);
      const address = order.address;
      const fullAddress = `${address.street}, ${address.number}${address.complement ? ' - ' + address.complement : ''}
${address.neighborhood}
${address.city} - ${address.state}
CEP: ${address.zipCode}`;
      doc.fillColor('#1e293b').font('Helvetica').text(fullAddress, recipientRightColumn, recipientStartY + 15, { width: 230 });
      
      currentY += 170;

      // Order Items Section with modern card style
      const itemSectionHeight = 80 + (order.kits.length * 15);
      doc.fillColor('#f8fafc');
      doc.rect(margin, currentY, contentWidth, itemSectionHeight)
         .fillAndStroke('#f8fafc', '#e2e8f0');

      doc.fillColor('#1e293b');
      doc.fontSize(14).font('Helvetica-Bold');
      doc.text('ITENS DO PEDIDO', margin + 20, currentY + 20);
      
      // Items table header
      doc.fillColor('#6366f1');
      doc.rect(margin + 20, currentY + 45, contentWidth - 40, 22)
         .fillAndStroke('#6366f1', '#4f46e5');
         
      doc.fillColor('white');
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Produto', margin + 30, currentY + 52);
      doc.text('Quantidade', pageWidth - 130, currentY + 52);
      
      let itemY = currentY + 75;
      
      // Main product row
      doc.fillColor('#1e293b');
      doc.fontSize(10).font('Helvetica');
      doc.text(order.event.name, margin + 30, itemY, { width: 380 });
      doc.text(`${order.kitQuantity} kit(s)`, pageWidth - 130, itemY);
      itemY += 18;
      
      // Kit details with better formatting
      if (order.kits.length > 0) {
        doc.fontSize(9).fillColor('#64748b');
        order.kits.forEach((kit, kitIndex) => {
          const kitText = `Kit ${kitIndex + 1}: ${kit.name} • CPF: ${formatCPF(kit.cpf)} • Tamanho: ${kit.shirtSize}`;
          doc.text(kitText, margin + 40, itemY, { width: 480 });
          itemY += 12;
        });
      }
      
      currentY += itemSectionHeight + 20;

      // Signature Section with modern card style
      doc.fillColor('#fefefe');
      doc.rect(margin, currentY, contentWidth, 140)
         .fillAndStroke('#fefefe', '#e2e8f0');

      doc.fillColor('#1e293b');
      doc.fontSize(14).font('Helvetica-Bold');
      doc.text('CONFIRMAÇÃO DE RECEBIMENTO', margin + 20, currentY + 20);
      
      doc.fontSize(10).fillColor('#64748b').font('Helvetica');
      doc.text('Declaro que recebi os itens acima relacionados em perfeito estado e conforme especificado.', 
        margin + 20, currentY + 45, { width: contentWidth - 40 });
      
      // Signature fields with modern styling
      const sigY = currentY + 75;
      const sig1X = margin + 25;
      const sig2X = margin + (contentWidth / 2) + 15;
      const sigWidth = (contentWidth / 2) - 40;
      
      // Signature boxes
      doc.fillColor('#f8fafc');
      doc.rect(sig1X, sigY, sigWidth, 35)
         .fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold');
      doc.text('Assinatura do Destinatário', sig1X + 8, sigY + 8);
      
      doc.fillColor('#f8fafc');
      doc.rect(sig2X, sigY, sigWidth, 35)
         .fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold');
      doc.text('Data', sig2X + 8, sigY + 15);

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
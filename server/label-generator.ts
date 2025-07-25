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
    doc.rect(margin, currentY, contentWidth, 90)
       .fillAndStroke('#f8fafc', '#e2e8f0');

    doc.fillColor('#1e293b');
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text('INFORMAÇÕES DO PEDIDO', margin + 20, currentY + 15);
    
    // Create two columns
    const leftColumn = margin + 20;
    const rightColumn = margin + (contentWidth / 2) + 10;
    
    doc.fontSize(10).fillColor('#64748b');
    doc.font('Helvetica-Bold').text('Data do Pedido:', leftColumn, currentY + 40);
    doc.fillColor('#1e293b').font('Helvetica').text(formatDate(order.createdAt.toISOString()), leftColumn + 80, currentY + 40);
    
    doc.fillColor('#64748b').font('Helvetica-Bold').text('Evento:', leftColumn, currentY + 60);
    doc.fillColor('#1e293b').font('Helvetica').text(order.event.name, leftColumn + 40, currentY + 60, { width: 200 });
    
    doc.fillColor('#64748b').font('Helvetica-Bold').text('Quantidade:', rightColumn, currentY + 40);
    doc.fillColor('#1e293b').font('Helvetica').text(`${order.kitQuantity} kit(s)`, rightColumn + 60, currentY + 40);
    
    doc.fillColor('#64748b').font('Helvetica-Bold').text('Valor Total:', rightColumn, currentY + 60);
    doc.fillColor('#1e293b').font('Helvetica').text(formatCurrency(order.totalCost), rightColumn + 60, currentY + 60);
    
    currentY += 110;

    // Recipient Information Section with modern card style
    doc.fillColor('#fefefe');
    doc.rect(margin, currentY, contentWidth, 140)
       .fillAndStroke('#fefefe', '#e2e8f0');

    doc.fillColor('#1e293b');
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text('DADOS DO DESTINATÁRIO', margin + 20, currentY + 15);
    
    // Two columns layout
    const startY = currentY + 40;
    
    // Left column - Personal info
    doc.fontSize(10).fillColor('#64748b');
    doc.font('Helvetica-Bold').text('Nome Completo:', leftColumn, startY);
    doc.fillColor('#1e293b').font('Helvetica').text(order.customer.name, leftColumn, startY + 15, { width: 220 });
    
    doc.fillColor('#64748b').font('Helvetica-Bold').text('CPF:', leftColumn, startY + 35);
    doc.fillColor('#1e293b').font('Helvetica').text(formatCPF(order.customer.cpf), leftColumn, startY + 50);
    
    doc.fillColor('#64748b').font('Helvetica-Bold').text('Telefone:', leftColumn, startY + 70);
    doc.fillColor('#1e293b').font('Helvetica').text(formatPhone(order.customer.phone), leftColumn, startY + 85);
    
    // Right column - Address
    doc.fillColor('#64748b').font('Helvetica-Bold').text('Endereço de Entrega:', rightColumn, startY);
    const address = order.address;
    const fullAddress = `${address.street}, ${address.number}${address.complement ? ' - ' + address.complement : ''}
${address.neighborhood}
${address.city} - ${address.state}
CEP: ${address.zipCode}`;
    doc.fillColor('#1e293b').font('Helvetica').text(fullAddress, rightColumn, startY + 15, { width: 250 });
    
    currentY += 160;

    // Order Items Section with modern card style
    const itemSectionHeight = 60 + (order.kits.length * 15);
    doc.fillColor('#f8fafc');
    doc.rect(margin, currentY, contentWidth, itemSectionHeight)
       .fillAndStroke('#f8fafc', '#e2e8f0');

    doc.fillColor('#1e293b');
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text('ITENS DO PEDIDO', margin + 20, currentY + 15);
    
    // Items table header
    doc.fillColor('#6366f1');
    doc.rect(margin + 20, currentY + 40, contentWidth - 40, 20)
       .fillAndStroke('#6366f1', '#4f46e5');
       
    doc.fillColor('white');
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Produto', margin + 30, currentY + 47);
    doc.text('Quantidade', pageWidth - 120, currentY + 47);
    
    let itemY = currentY + 70;
    
    // Main product row
    doc.fillColor('#1e293b');
    doc.fontSize(10).font('Helvetica');
    doc.text(order.event.name, margin + 30, itemY, { width: 350 });
    doc.text(`${order.kitQuantity} kit(s)`, pageWidth - 120, itemY);
    itemY += 20;
    
    // Kit details with better formatting
    if (order.kits.length > 0) {
      doc.fontSize(9).fillColor('#64748b');
      order.kits.forEach((kit, index) => {
        const kitText = `Kit ${index + 1}: ${kit.name} • CPF: ${formatCPF(kit.cpf)} • Tamanho: ${kit.shirtSize}`;
        doc.text(kitText, margin + 40, itemY, { width: 450 });
        itemY += 12;
      });
    }
    
    currentY += itemSectionHeight + 20;

    // Signature Section with modern card style
    doc.fillColor('#fefefe');
    doc.rect(margin, currentY, contentWidth, 180)
       .fillAndStroke('#fefefe', '#e2e8f0');

    doc.fillColor('#1e293b');
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text('CONFIRMAÇÃO DE RECEBIMENTO', margin + 20, currentY + 15);
    
    doc.fontSize(10).fillColor('#64748b').font('Helvetica');
    doc.text('Declaro que recebi os itens acima relacionados em perfeito estado e conforme especificado.', 
      margin + 20, currentY + 40, { width: contentWidth - 40 });
    
    // Signature fields with modern styling
    const sigY = currentY + 70;
    const sig1X = margin + 40;
    const sig2X = margin + (contentWidth / 2) + 20;
    const sigWidth = (contentWidth / 2) - 60;
    
    // Main signature box
    doc.fillColor('#f8fafc');
    doc.rect(sig1X, sigY, sigWidth, 40)
       .fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold');
    doc.text('Assinatura do Destinatário', sig1X + 10, sigY + 5);
    
    // Third party signature box
    doc.fillColor('#f8fafc');
    doc.rect(sig2X, sigY, sigWidth, 40)
       .fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold');
    doc.text('Terceiro Autorizado', sig2X + 10, sigY + 5);
    doc.fontSize(8).font('Helvetica');
    doc.text('(nome completo e documento)', sig2X + 10, sigY + 18);
    
    // CPF and Date fields
    const fieldsY = sigY + 60;
    const field1X = sig1X;
    const field2X = sig1X + (sigWidth / 2) + 10;
    const field3X = sig2X;
    const field4X = sig2X + (sigWidth / 2) + 10;
    const fieldWidth = (sigWidth / 2) - 10;
    
    // CPF field
    doc.fillColor('#f8fafc');
    doc.rect(field1X, fieldsY, fieldWidth, 25)
       .fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold');
    doc.text('CPF', field1X + 5, fieldsY + 5);
    
    // Date field  
    doc.fillColor('#f8fafc');
    doc.rect(field2X, fieldsY, fieldWidth, 25)
       .fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold');
    doc.text('Data', field2X + 5, fieldsY + 5);
    
    // Third party CPF field
    doc.fillColor('#f8fafc');
    doc.rect(field3X, fieldsY, fieldWidth, 25)
       .fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold');
    doc.text('CPF', field3X + 5, fieldsY + 5);
    
    // Third party Date field
    doc.fillColor('#f8fafc');
    doc.rect(field4X, fieldsY, fieldWidth, 25)
       .fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold');
    doc.text('Data', field4X + 5, fieldsY + 5);
    
    // Footer
    currentY = pageHeight - 60;
    doc.fillColor('#6366f1');
    doc.rect(margin, currentY, contentWidth, 30)
       .fillAndStroke('#6366f1', '#4f46e5');
    doc.fillColor('white').fontSize(8).font('Helvetica');
    doc.text('KITRUNNER - Sistema de Gerenciamento de Kits de Eventos', margin + 20, currentY + 11);
    doc.text(`Gerado em: ${formatDate(new Date().toISOString())}`, pageWidth - 150, currentY + 11);

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

      // Create two columns
      const leftColumn = margin + 20;
      const rightColumn = margin + (contentWidth / 2) + 10;

      // Order Information Section with modern card style
      doc.fillColor('#f8fafc');
      doc.rect(margin, currentY, contentWidth, 90)
         .fillAndStroke('#f8fafc', '#e2e8f0');

      doc.fillColor('#1e293b');
      doc.fontSize(14).font('Helvetica-Bold');
      doc.text('INFORMAÇÕES DO PEDIDO', margin + 20, currentY + 15);
      
      doc.fontSize(10).fillColor('#64748b');
      doc.font('Helvetica-Bold').text('Data do Pedido:', leftColumn, currentY + 40);
      doc.fillColor('#1e293b').font('Helvetica').text(formatDate(order.createdAt.toISOString()), leftColumn + 80, currentY + 40);
      
      doc.fillColor('#64748b').font('Helvetica-Bold').text('Evento:', leftColumn, currentY + 60);
      doc.fillColor('#1e293b').font('Helvetica').text(order.event.name, leftColumn + 40, currentY + 60, { width: 200 });
      
      doc.fillColor('#64748b').font('Helvetica-Bold').text('Quantidade:', rightColumn, currentY + 40);
      doc.fillColor('#1e293b').font('Helvetica').text(`${order.kitQuantity} kit(s)`, rightColumn + 60, currentY + 40);
      
      doc.fillColor('#64748b').font('Helvetica-Bold').text('Valor Total:', rightColumn, currentY + 60);
      doc.fillColor('#1e293b').font('Helvetica').text(formatCurrency(order.totalCost), rightColumn + 60, currentY + 60);
      
      currentY += 110;

      // Recipient Information Section with modern card style
      doc.fillColor('#fefefe');
      doc.rect(margin, currentY, contentWidth, 140)
         .fillAndStroke('#fefefe', '#e2e8f0');

      doc.fillColor('#1e293b');
      doc.fontSize(14).font('Helvetica-Bold');
      doc.text('DADOS DO DESTINATÁRIO', margin + 20, currentY + 15);
      
      // Two columns layout
      const startY = currentY + 40;
      
      // Left column - Personal info
      doc.fontSize(10).fillColor('#64748b');
      doc.font('Helvetica-Bold').text('Nome Completo:', leftColumn, startY);
      doc.fillColor('#1e293b').font('Helvetica').text(order.customer.name, leftColumn, startY + 15, { width: 220 });
      
      doc.fillColor('#64748b').font('Helvetica-Bold').text('CPF:', leftColumn, startY + 35);
      doc.fillColor('#1e293b').font('Helvetica').text(formatCPF(order.customer.cpf), leftColumn, startY + 50);
      
      doc.fillColor('#64748b').font('Helvetica-Bold').text('Telefone:', leftColumn, startY + 70);
      doc.fillColor('#1e293b').font('Helvetica').text(formatPhone(order.customer.phone), leftColumn, startY + 85);
      
      // Right column - Address
      doc.fillColor('#64748b').font('Helvetica-Bold').text('Endereço de Entrega:', rightColumn, startY);
      const address = order.address;
      const fullAddress = `${address.street}, ${address.number}${address.complement ? ' - ' + address.complement : ''}
${address.neighborhood}
${address.city} - ${address.state}
CEP: ${address.zipCode}`;
      doc.fillColor('#1e293b').font('Helvetica').text(fullAddress, rightColumn, startY + 15, { width: 250 });
      
      currentY += 160;

      // Order Items Section with modern card style
      const itemSectionHeight = 60 + (order.kits.length * 15);
      doc.fillColor('#f8fafc');
      doc.rect(margin, currentY, contentWidth, itemSectionHeight)
         .fillAndStroke('#f8fafc', '#e2e8f0');

      doc.fillColor('#1e293b');
      doc.fontSize(14).font('Helvetica-Bold');
      doc.text('ITENS DO PEDIDO', margin + 20, currentY + 15);
      
      // Items table header
      doc.fillColor('#6366f1');
      doc.rect(margin + 20, currentY + 40, contentWidth - 40, 20)
         .fillAndStroke('#6366f1', '#4f46e5');
         
      doc.fillColor('white');
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Produto', margin + 30, currentY + 47);
      doc.text('Quantidade', pageWidth - 120, currentY + 47);
      
      let itemY = currentY + 70;
      
      // Main product row
      doc.fillColor('#1e293b');
      doc.fontSize(10).font('Helvetica');
      doc.text(order.event.name, margin + 30, itemY, { width: 350 });
      doc.text(`${order.kitQuantity} kit(s)`, pageWidth - 120, itemY);
      itemY += 20;
      
      // Kit details with better formatting
      if (order.kits.length > 0) {
        doc.fontSize(9).fillColor('#64748b');
        order.kits.forEach((kit, kitIndex) => {
          const kitText = `Kit ${kitIndex + 1}: ${kit.name} • CPF: ${formatCPF(kit.cpf)} • Tamanho: ${kit.shirtSize}`;
          doc.text(kitText, margin + 40, itemY, { width: 450 });
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
      doc.text('CONFIRMAÇÃO DE RECEBIMENTO', margin + 20, currentY + 15);
      
      doc.fontSize(10).fillColor('#64748b').font('Helvetica');
      doc.text('Declaro que recebi os itens acima relacionados em perfeito estado e conforme especificado.', 
        margin + 20, currentY + 40, { width: contentWidth - 40 });
      
      // Signature fields with modern styling
      const sigY = currentY + 70;
      const sig1X = margin + 40;
      const sig2X = margin + (contentWidth / 2) + 20;
      const sigWidth = (contentWidth / 2) - 60;
      
      // Signature boxes
      doc.fillColor('#f8fafc');
      doc.rect(sig1X, sigY, sigWidth, 25)
         .fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold');
      doc.text('Assinatura do Destinatário', sig1X + 10, sigY + 8);
      
      doc.fillColor('#f8fafc');
      doc.rect(sig2X, sigY, sigWidth, 25)
         .fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold');
      doc.text('Data', sig2X + 10, sigY + 8);

      // Footer
      const footerY = pageHeight - 60;
      doc.fillColor('#6366f1');
      doc.rect(margin, footerY, contentWidth, 30)
         .fillAndStroke('#6366f1', '#4f46e5');
      doc.fillColor('white').fontSize(8).font('Helvetica');
      doc.text('KITRUNNER - Sistema de Gerenciamento de Kits de Eventos', margin + 20, footerY + 11);
      doc.text(`Gerado em: ${formatDate(new Date().toISOString())}`, pageWidth - 150, footerY + 11);
    });

    doc.end();
  });
}
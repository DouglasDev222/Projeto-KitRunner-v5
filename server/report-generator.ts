import ExcelJS from 'exceljs';
import { db } from './db';
import { orders, customers, events, kits, addresses, cepZones } from '@shared/schema';
import { eq, inArray, and, or, gte, lte } from 'drizzle-orm';

export interface KitReportData {
  orderNumber: string;
  athleteName: string;
  cpf: string;
  shirtSize: string;
  product: string;
  customerName: string;
  address: string;
}

export interface CircuitReportData {
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  extraInfo: string;
}

export interface OrderReportData {
  orderNumber: string;
  customerName: string;
  customerCpf: string;
  status: string;
  totalValue: number;
  cepZone?: string;
  kitsArray: string;
  address: string;
  orderDate: string;
  paymentMethod?: string;
}

export async function generateKitsReport(eventId: number, status?: string[], format: 'excel' | 'pdf' | 'csv' = 'excel'): Promise<Buffer> {
  // Get event details
  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  
  if (!event) {
    throw new Error('Evento não encontrado');
  }

  // Get all orders for this event with related data - FIXED: Now filters by status
  const eventOrders = await db
    .select({
      orderId: orders.id,
      orderNumber: orders.orderNumber,
      customerId: orders.customerId,
      addressId: orders.addressId,
      customerName: customers.name,
      customerCpf: customers.cpf,
      street: addresses.street,
      number: addresses.number,
      neighborhood: addresses.neighborhood,
      city: addresses.city,
      state: addresses.state,
      complement: addresses.complement,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .innerJoin(addresses, eq(orders.addressId, addresses.id))
    .where(
      status && status.length > 0
        ? and(eq(orders.eventId, eventId), inArray(orders.status, status))
        : eq(orders.eventId, eventId)
    );

  // Get all kits for these orders
  const reportData: KitReportData[] = [];
  
  for (const order of eventOrders) {
    const orderKits = await db
      .select()
      .from(kits)
      .where(eq(kits.orderId, order.orderId));

    for (const kit of orderKits) {
      // Format address
      const address = `${order.street}, ${order.number}${order.complement ? `, ${order.complement}` : ''} - ${order.neighborhood}, ${order.city}/${order.state}`;

      reportData.push({
        orderNumber: order.orderNumber,
        athleteName: kit.name,
        cpf: formatCPF(kit.cpf),
        shirtSize: kit.shirtSize,
        product: `[Retirada do Kit] ${event.name}`,
        customerName: order.customerName,
        address,
      });
    }
  }

  // Sort by order number
  reportData.sort((a, b) => a.orderNumber.localeCompare(b.orderNumber));

  // Generate based on format
  if (format === 'pdf') {
    return await generateKitsPDF(reportData, event.name);
  } else if (format === 'csv') {
    return generateKitsCSV(reportData);
  }

  // Default: Excel format
  // Create Excel workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Relatório de Kits');

  // Set column headers
  const headers = [
    'Nº Pedido',
    'Nome do Atleta', 
    'CPF',
    'Camisa',
    'Produto',
    'Cliente Responsável',
    'Endereço de Entrega'
  ];

  // Add headers
  const headerRow = worksheet.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE6E6FA' }
  };

  // Set column widths
  worksheet.columns = [
    { width: 15 }, // Nº Pedido
    { width: 25 }, // Nome do Atleta
    { width: 15 }, // CPF
    { width: 12 }, // Camisa
    { width: 40 }, // Produto
    { width: 25 }, // Cliente Responsável
    { width: 50 }, // Endereço de Entrega
  ];

  // Add data rows with visual grouping by order number
  let currentOrderNumber = '';
  let orderGroupColor = 'FFFFE0A0'; // Light yellow for first group
  
  reportData.forEach((item, index) => {
    // Check if this is a new order group
    if (item.orderNumber !== currentOrderNumber) {
      currentOrderNumber = item.orderNumber;
      // Alternate group colors to visually separate orders with more contrast
      orderGroupColor = orderGroupColor === 'FFFFE0A0' ? 'FFB0E0FF' : 'FFFFE0A0'; // Yellow/Light Blue alternating
    }

    const row = worksheet.addRow([
      item.orderNumber,
      item.athleteName,
      item.cpf,
      item.shirtSize,
      item.product,
      item.customerName,
      item.address
    ]);

    // Apply group-based coloring to visually group kits from same order
    row.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: orderGroupColor }
    };
  });

  // Add borders to all cells
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  // Generate buffer
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return buffer;
}

function formatCPF(cpf: string): string {
  // Format CPF as XXX.XXX.XXX-XX
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// Generate Kits PDF with user-specified format
async function generateKitsPDF(reportData: KitReportData[], eventName: string): Promise<Buffer> {
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const buffers: Buffer[] = [];

  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', () => {});

  // Header with logo space and title
  doc.fontSize(20).text(`Retirada de Kit ${eventName}`, {
    align: 'center'
  });
  doc.moveDown();
  
  // Add a line separator
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown();

  // Table headers - simplified columns as requested
  const startY = doc.y;
  const colWidths = [100, 200, 120, 70]; // Column widths for: Nº Pedido, Nome do Atleta, CPF, Camisa
  const headers = ['Nº Pedido', 'Nome do Atleta', 'CPF', 'Camisa'];
  
  let x = 50;
  doc.fontSize(12).fillColor('black');
  headers.forEach((header, i) => {
    doc.text(header, x, startY, { width: colWidths[i], align: 'left' });
    x += colWidths[i];
  });
  
  // Draw header line
  doc.moveTo(50, startY + 20).lineTo(540, startY + 20).stroke();
  doc.moveDown(1.5);

  // Table data
  reportData.forEach((kit, index) => {
    if (doc.y > 720) { // New page if needed (leave margin for page end)
      doc.addPage();
      doc.fontSize(20).text(`Retirada de Kit ${eventName}`, {
        align: 'center'
      });
      doc.moveDown();
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown();
      
      // Redraw headers on new page
      const newStartY = doc.y;
      let newX = 50;
      doc.fontSize(12).fillColor('black');
      headers.forEach((header, i) => {
        doc.text(header, newX, newStartY, { width: colWidths[i], align: 'left' });
        newX += colWidths[i];
      });
      doc.moveTo(50, newStartY + 20).lineTo(540, newStartY + 20).stroke();
      doc.moveDown(1.5);
    }
    
    const y = doc.y;
    x = 50;
    
    const rowData = [
      kit.orderNumber,
      kit.athleteName.length > 25 ? kit.athleteName.substring(0, 22) + '...' : kit.athleteName,
      kit.cpf,
      kit.shirtSize
    ];
    
    doc.fontSize(10).fillColor('black');
    rowData.forEach((data, i) => {
      doc.text(data || '', x, y, { width: colWidths[i], align: 'left' });
      x += colWidths[i];
    });
    
    // Add a subtle line between rows for better readability
    if (index % 2 === 0) {
      doc.rect(50, y - 2, 490, 14).fillAndStroke('#f8f9fa', '#f8f9fa');
      doc.fillColor('black');
    }
    
    doc.moveDown(0.7);
  });

  doc.end();
  
  return new Promise((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(buffers));
    });
  });
}

// Generate Kits CSV
function generateKitsCSV(reportData: KitReportData[]): Buffer {
  const headers = ['Nº Pedido', 'Nome do Atleta', 'CPF', 'Camisa'];

  let csv = headers.join(',') + '\n';
  
  reportData.forEach(kit => {
    const row = [
      `"${kit.orderNumber}"`,
      `"${kit.athleteName}"`,
      `"${kit.cpf}"`,
      `"${kit.shirtSize}"`
    ];
    csv += row.join(',') + '\n';
  });

  return Buffer.from(csv, 'utf-8');
}

// Circuit Report Generator
export async function generateCircuitReport(eventId: number, zoneIds?: number[], status?: string[]): Promise<Buffer> {
  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  
  if (!event) {
    throw new Error('Evento não encontrado');
  }

  // Build query with status filtering if provided
  let ordersQuery = db
    .select({
      orderId: orders.id,
      orderNumber: orders.orderNumber,
      street: addresses.street,
      number: addresses.number,
      complement: addresses.complement,
      neighborhood: addresses.neighborhood,
      city: addresses.city,
      state: addresses.state,
      zipCode: addresses.zipCode,
    })
    .from(orders)
    .innerJoin(addresses, eq(orders.addressId, addresses.id))
    .where(
      status && status.length > 0
        ? and(eq(orders.eventId, eventId), inArray(orders.status, status))
        : eq(orders.eventId, eventId)
    );

  const eventOrders = await ordersQuery;

  // Filter by zones if provided - FIXED: Now respects priority and active status
  let filteredOrders = eventOrders;
  if (zoneIds && zoneIds.length > 0) {
    // Get ALL zone definitions to properly calculate priorities
    const allZones = await db.select().from(cepZones);
    const requestedZones = await db.select().from(cepZones).where(inArray(cepZones.id, zoneIds));
    
    // Import the correct function for CEP zone calculation
    const { findCepZoneFromList } = await import('./cep-zones-calculator');
    
    filteredOrders = eventOrders.filter(order => {
      // Find which zone this CEP actually belongs to (respecting priority and active status)
      const actualZone = findCepZoneFromList(order.zipCode, allZones);
      
      // Only include order if it belongs to one of the requested zones AND that zone was actually assigned
      if (!actualZone) return false;
      
      return requestedZones.some(requestedZone => requestedZone.id === actualZone.id);
    });
  }

  // Prepare Circuit report data
  const reportData: CircuitReportData[] = filteredOrders.map(order => ({
    addressLine1: `${order.street}, ${order.number}${order.complement ? `, ${order.complement}` : ''}`,
    city: order.city,
    state: order.state,
    postalCode: order.zipCode,
    extraInfo: `Pedido - ${order.orderNumber}`,
  }));

  // Create Excel workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Endereços Circuit');

  // Set column headers (Circuit format)
  const headers = ['Address Line 1', 'City', 'State', 'Postal Code', 'Extra Info'];

  // Add headers
  const headerRow = worksheet.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };

  // Set column widths
  worksheet.columns = [
    { width: 50 }, // Address Line 1
    { width: 20 }, // City
    { width: 10 }, // State
    { width: 15 }, // Postal Code
    { width: 20 }, // Extra Info
  ];

  // Add data rows
  reportData.forEach(item => {
    const row = worksheet.addRow([
      item.addressLine1,
      item.city,
      item.state,
      item.postalCode,
      item.extraInfo
    ]);
  });

  // Add borders to all cells
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  // Generate buffer
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return buffer;
}

// Orders Report Generator
export async function generateOrdersReport(
  eventId: number, 
  options: {
    zoneIds?: number[];
    status?: string[];
    format?: 'excel' | 'pdf' | 'csv';
  } = {}
): Promise<Buffer> {
  const { zoneIds, status, format = 'excel' } = options;
  
  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  
  if (!event) {
    throw new Error('Evento não encontrado');
  }

  // Get orders with related data
  let ordersQuery = db
    .select({
      orderId: orders.id,
      orderNumber: orders.orderNumber,
      orderStatus: orders.status,
      totalCost: orders.totalCost,
      paymentMethod: orders.paymentMethod,
      createdAt: orders.createdAt,
      customerName: customers.name,
      customerCpf: customers.cpf,
      street: addresses.street,
      number: addresses.number,
      complement: addresses.complement,
      neighborhood: addresses.neighborhood,
      city: addresses.city,
      state: addresses.state,
      zipCode: addresses.zipCode,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .innerJoin(addresses, eq(orders.addressId, addresses.id))
    .where(eq(orders.eventId, eventId));

  // Apply status filter - rebuild query if needed
  if (status && status.length > 0) {
    ordersQuery = db
      .select({
        orderId: orders.id,
        orderNumber: orders.orderNumber,
        orderStatus: orders.status,
        totalCost: orders.totalCost,
        paymentMethod: orders.paymentMethod,
        createdAt: orders.createdAt,
        customerName: customers.name,
        customerCpf: customers.cpf,
        street: addresses.street,
        number: addresses.number,
        complement: addresses.complement,
        neighborhood: addresses.neighborhood,
        city: addresses.city,
        state: addresses.state,
        zipCode: addresses.zipCode,
      })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .innerJoin(addresses, eq(orders.addressId, addresses.id))
      .where(and(eq(orders.eventId, eventId), inArray(orders.status, status)));
  }

  const eventOrders = await ordersQuery;

  // Get all zones for filtering and reporting - FIXED: Now using correct priority logic
  const allZones = await db.select().from(cepZones);

  // Import the correct function for CEP zone calculation
  const { findCepZoneFromList } = await import('./cep-zones-calculator');

  // Process orders with zone information
  const reportData: OrderReportData[] = [];
  
  for (const order of eventOrders) {
    // Get kits for this order
    const orderKits = await db.select().from(kits).where(eq(kits.orderId, order.orderId));
    
    // Find CEP zone using correct priority and active status logic
    const matchingZone = findCepZoneFromList(order.zipCode, allZones);

    // Apply zone filter if provided - FIXED: Now respects actual zone assignment based on priority
    if (zoneIds && zoneIds.length > 0) {
      if (!matchingZone || !zoneIds.includes(matchingZone.id)) {
        continue;
      }
    }

    const kitsArray = orderKits.map(kit => 
      `${kit.name} (${kit.shirtSize})`
    ).join(', ');

    const address = `${order.street}, ${order.number}${order.complement ? `, ${order.complement}` : ''} - ${order.neighborhood}, ${order.city}/${order.state}`;

    reportData.push({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerCpf: formatCPF(order.customerCpf),
      status: order.orderStatus,
      totalValue: parseFloat(order.totalCost.toString()),
      cepZone: matchingZone?.name || 'Não identificada',
      kitsArray,
      address,
      orderDate: order.createdAt.toISOString().split('T')[0],
      paymentMethod: order.paymentMethod,
    });
  }

  // Sort by order number
  reportData.sort((a, b) => a.orderNumber.localeCompare(b.orderNumber));

  if (format === 'excel') {
    return await generateOrdersExcel(reportData, event.name);
  } else if (format === 'csv') {
    return generateOrdersCSV(reportData);
  } else if (format === 'pdf') {
    return await generateOrdersPDF(reportData, event.name);
  } else {
    throw new Error(`Formato ${format} não suportado`);
  }
}

async function generateOrdersExcel(reportData: OrderReportData[], eventName: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Relatório de Pedidos');

  // Set headers
  const headers = [
    'Nº Pedido',
    'Cliente', 
    'CPF',
    'Status',
    'Valor Total',
    'Zona CEP',
    'Kits',
    'Endereço',
    'Data do Pedido',
    'Pagamento'
  ];

  // Add headers
  const headerRow = worksheet.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2E8B57' }
  };

  // Set column widths
  worksheet.columns = [
    { width: 15 }, // Nº Pedido
    { width: 25 }, // Cliente
    { width: 15 }, // CPF
    { width: 20 }, // Status
    { width: 15 }, // Valor Total
    { width: 20 }, // Zona CEP
    { width: 30 }, // Kits
    { width: 50 }, // Endereço
    { width: 15 }, // Data
    { width: 15 }, // Pagamento
  ];

  // Add data rows
  reportData.forEach(item => {
    worksheet.addRow([
      item.orderNumber,
      item.customerName,
      item.customerCpf,
      item.status,
      `R$ ${item.totalValue.toFixed(2)}`,
      item.cepZone,
      item.kitsArray,
      item.address,
      item.orderDate,
      item.paymentMethod
    ]);
  });

  // Add borders
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function generateOrdersCSV(reportData: OrderReportData[]): Buffer {
  const headers = [
    'Nº Pedido',
    'Cliente', 
    'CPF',
    'Status',
    'Valor Total',
    'Zona CEP',
    'Kits',
    'Endereço',
    'Data do Pedido',
    'Pagamento'
  ];

  let csv = headers.join(',') + '\n';
  
  reportData.forEach(item => {
    const row = [
      `"${item.orderNumber}"`,
      `"${item.customerName}"`,
      `"${item.customerCpf}"`,
      `"${item.status}"`,
      `"R$ ${item.totalValue.toFixed(2)}"`,
      `"${item.cepZone}"`,
      `"${item.kitsArray}"`,
      `"${item.address}"`,
      `"${item.orderDate}"`,
      `"${item.paymentMethod}"`
    ];
    csv += row.join(',') + '\n';
  });

  return Buffer.from(csv, 'utf-8');
}

export async function getEventsForReports() {
  return await db.select({
    id: events.id,
    name: events.name,
    date: events.date,
    city: events.city,
  }).from(events).where(eq(events.available, true));
}

// PDF Generator for Orders Report
async function generateOrdersPDF(reportData: OrderReportData[], eventName: string): Promise<Buffer> {
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument();
  const buffers: Buffer[] = [];

  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', () => {});

  // Header
  doc.fontSize(20).text(`Relatório de Pedidos - ${eventName}`, {
    align: 'center'
  });
  doc.moveDown();

  // Summary info
  doc.fontSize(12).text(`Total de Pedidos: ${reportData.length}`);
  const totalValue = reportData.reduce((sum, order) => sum + order.totalValue, 0);
  doc.text(`Valor Total: R$ ${totalValue.toFixed(2)}`);
  doc.moveDown();

  // Table headers
  const startY = doc.y;
  const colWidths = [60, 100, 80, 60, 80]; // Column widths
  const headers = ['Pedido', 'Cliente', 'Status', 'Valor', 'Zona CEP'];
  
  let x = 50;
  headers.forEach((header, i) => {
    doc.text(header, x, startY, { width: colWidths[i] });
    x += colWidths[i];
  });
  
  doc.moveDown();

  // Table data
  reportData.forEach((order, index) => {
    if (doc.y > 700) { // New page if needed
      doc.addPage();
    }
    
    const y = doc.y;
    x = 50;
    
    const rowData = [
      order.orderNumber,
      order.customerName.substring(0, 15) + (order.customerName.length > 15 ? '...' : ''),
      order.status,
      `R$ ${order.totalValue.toFixed(2)}`,
      order.cepZone || 'N/A'
    ];
    
    rowData.forEach((data, i) => {
      doc.fontSize(8).text(data, x, y, { width: colWidths[i] });
      x += colWidths[i];
    });
    
    doc.moveDown(0.5);
  });

  doc.end();
  
  return new Promise((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(buffers));
    });
  });
}

// =======================
// FASE 3: RELATÓRIOS ANALÍTICOS
// =======================

// Billing Report Interfaces
interface BillingReportData {
  period: string;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  deliveryRevenue: number;
  extrasRevenue: number;
  donationsRevenue: number;
  couponsUsed: number;
  couponsDiscount: number;
  conversionRate: number;
}

interface SalesReportData {
  eventName: string;
  eventId: number;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  conversionRate: number;
  topZones: { zoneName: string; orderCount: number; revenue: number }[];
  couponsStats: { code: string; usageCount: number; totalDiscount: number }[];
}

interface CustomersReportData {
  customerId: number;
  customerName: string;
  email: string;
  city: string;
  state: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  avgOrderValue: number;
}

// 3.1 - Billing Reports
export async function generateBillingReport(
  options: {
    period: 'daily' | 'weekly' | 'monthly' | 'yearly';
    startDate: Date;
    endDate: Date;
    eventId?: number;
    format?: 'excel' | 'pdf' | 'csv';
  }
): Promise<Buffer> {
  const { period, startDate, endDate, eventId, format = 'excel' } = options;

  // Build base query with date filtering
  let ordersQuery = db
    .select({
      orderId: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      totalCost: orders.totalCost,
      deliveryCost: orders.deliveryCost,
      donationAmount: orders.donationAmount,
      couponCode: orders.couponCode,
      createdAt: orders.createdAt,
      eventName: events.name,
    })
    .from(orders)
    .innerJoin(events, eq(orders.eventId, events.id))
    .where(
      and(
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate),
        eventId ? eq(orders.eventId, eventId) : undefined
      )
    );

  const ordersData = await ordersQuery;

  // Group data by period
  const billingData: BillingReportData[] = [];
  const groupedData = new Map<string, typeof ordersData>();

  ordersData.forEach(order => {
    let periodKey: string;
    const orderDate = new Date(order.createdAt);

    switch (period) {
      case 'daily':
        periodKey = orderDate.toISOString().split('T')[0];
        break;
      case 'weekly':
        const weekStart = new Date(orderDate);
        weekStart.setDate(orderDate.getDate() - orderDate.getDay());
        periodKey = weekStart.toISOString().split('T')[0];
        break;
      case 'monthly':
        periodKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'yearly':
        periodKey = String(orderDate.getFullYear());
        break;
    }

    if (!groupedData.has(periodKey)) {
      groupedData.set(periodKey, []);
    }
    groupedData.get(periodKey)!.push(order);
  });

  // Calculate metrics for each period
  groupedData.forEach((periodOrders, periodKey) => {
    const confirmedOrders = periodOrders.filter(o => o.status === 'confirmado');
    const totalOrders = periodOrders.length;
    const totalRevenue = confirmedOrders.reduce((sum, order) => sum + parseFloat(order.totalCost.toString()), 0);
    const deliveryRevenue = confirmedOrders.reduce((sum, order) => sum + parseFloat(order.deliveryCost?.toString() || '0'), 0);
    const extrasRevenue = 0; // Campo não existe no schema atual
    const donationsRevenue = confirmedOrders.reduce((sum, order) => sum + parseFloat(order.donationAmount?.toString() || '0'), 0);
    const couponsUsed = confirmedOrders.filter(o => o.couponCode).length;
    const couponsDiscount = 0; // Campo não existe no schema atual
    const conversionRate = totalOrders > 0 ? (confirmedOrders.length / totalOrders) * 100 : 0;

    billingData.push({
      period: periodKey,
      totalRevenue,
      totalOrders: confirmedOrders.length,
      averageOrderValue: confirmedOrders.length > 0 ? totalRevenue / confirmedOrders.length : 0,
      deliveryRevenue,
      extrasRevenue,
      donationsRevenue,
      couponsUsed,
      couponsDiscount,
      conversionRate
    });
  });

  // Sort by period
  billingData.sort((a, b) => a.period.localeCompare(b.period));

  if (format === 'excel') {
    return await generateBillingExcel(billingData, period, startDate, endDate);
  } else if (format === 'csv') {
    return generateBillingCSV(billingData);
  } else {
    return await generateBillingPDF(billingData, period, startDate, endDate);
  }
}

// 3.2 - Sales and Performance Reports
export async function generateSalesReport(
  options: {
    startDate: Date;
    endDate: Date;
    format?: 'excel' | 'pdf' | 'csv';
  }
): Promise<Buffer> {
  const { startDate, endDate, format = 'excel' } = options;

  // Get all events with their sales data
  const salesData = await db
    .select({
      eventId: events.id,
      eventName: events.name,
      orderId: orders.id,
      orderStatus: orders.status,
      totalCost: orders.totalCost,
      couponCode: orders.couponCode,
      customerZipCode: addresses.zipCode,
    })
    .from(events)
    .leftJoin(orders, eq(events.id, orders.eventId))
    .leftJoin(addresses, eq(orders.addressId, addresses.id))
    .where(
      and(
        eq(events.available, true),
        orders.createdAt ? gte(orders.createdAt, startDate) : undefined,
        orders.createdAt ? lte(orders.createdAt, endDate) : undefined
      )
    );

  // Get active CEP zones for zone analysis
  const activeCepZones = await db.select().from(cepZones).where(eq(cepZones.active, true));

  // Group by events
  const eventSalesMap = new Map<number, SalesReportData>();

  salesData.forEach(row => {
    if (!eventSalesMap.has(row.eventId)) {
      eventSalesMap.set(row.eventId, {
        eventId: row.eventId,
        eventName: row.eventName,
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        conversionRate: 0,
        topZones: [],
        couponsStats: []
      });
    }

    const eventData = eventSalesMap.get(row.eventId)!;
    
    if (row.orderId && row.orderStatus === 'confirmado') {
      eventData.totalRevenue += parseFloat(row.totalCost?.toString() || '0');
      eventData.totalOrders += 1;
    }
  });

  // Calculate averages and finalize data
  const finalSalesData: SalesReportData[] = Array.from(eventSalesMap.values())
    .map(event => ({
      ...event,
      averageOrderValue: event.totalOrders > 0 ? event.totalRevenue / event.totalOrders : 0
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  if (format === 'excel') {
    return await generateSalesExcel(finalSalesData, startDate, endDate);
  } else if (format === 'csv') {
    return generateSalesCSV(finalSalesData);
  } else {
    return await generateSalesPDF(finalSalesData, startDate, endDate);
  }
}

// 3.3 - Customers Reports
export async function generateCustomersReport(
  options: {
    sortBy?: 'orders' | 'revenue' | 'recent';
    city?: string;
    state?: string;
    format?: 'excel' | 'pdf' | 'csv';
  } = {}
): Promise<Buffer> {
  const { sortBy = 'revenue', city, state, format = 'excel' } = options;

  // Get customers with their order statistics
  const customersData = await db
    .select({
      customerId: customers.id,
      customerName: customers.name,
      email: customers.email,
      customerCity: addresses.city,
      customerState: addresses.state,
      orderId: orders.id,
      orderStatus: orders.status,
      totalCost: orders.totalCost,
      orderDate: orders.createdAt
    })
    .from(customers)
    .leftJoin(addresses, eq(customers.id, addresses.customerId))
    .leftJoin(orders, eq(customers.id, orders.customerId))
    .where(
      and(
        addresses.isDefault ? eq(addresses.isDefault, true) : undefined,
        city ? eq(addresses.city, city) : undefined,
        state ? eq(addresses.state, state) : undefined
      )
    );

  // Group by customers
  const customerStatsMap = new Map<number, CustomersReportData>();

  customersData.forEach(row => {
    if (!customerStatsMap.has(row.customerId)) {
      customerStatsMap.set(row.customerId, {
        customerId: row.customerId,
        customerName: row.customerName,
        email: row.email,
        city: row.customerCity || '',
        state: row.customerState || '',
        totalOrders: 0,
        totalSpent: 0,
        lastOrderDate: '',
        avgOrderValue: 0
      });
    }

    const customerData = customerStatsMap.get(row.customerId)!;
    
    if (row.orderId && row.orderStatus === 'confirmado') {
      customerData.totalOrders += 1;
      customerData.totalSpent += parseFloat(row.totalCost?.toString() || '0');
      
      const orderDate = row.orderDate?.toISOString().split('T')[0] || '';
      if (!customerData.lastOrderDate || orderDate > customerData.lastOrderDate) {
        customerData.lastOrderDate = orderDate;
      }
    }
  });

  // Calculate averages and sort
  let finalCustomersData: CustomersReportData[] = Array.from(customerStatsMap.values())
    .map(customer => ({
      ...customer,
      avgOrderValue: customer.totalOrders > 0 ? customer.totalSpent / customer.totalOrders : 0
    }));

  // Apply sorting
  switch (sortBy) {
    case 'orders':
      finalCustomersData.sort((a, b) => b.totalOrders - a.totalOrders);
      break;
    case 'recent':
      finalCustomersData.sort((a, b) => b.lastOrderDate.localeCompare(a.lastOrderDate));
      break;
    default: // revenue
      finalCustomersData.sort((a, b) => b.totalSpent - a.totalSpent);
  }

  if (format === 'excel') {
    return await generateCustomersExcel(finalCustomersData, sortBy);
  } else if (format === 'csv') {
    return generateCustomersCSV(finalCustomersData);
  } else {
    return await generateCustomersPDF(finalCustomersData, sortBy);
  }
}

// Excel Generators for Phase 3
async function generateBillingExcel(data: BillingReportData[], period: string, startDate: Date, endDate: Date): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Relatório de Faturamento');

  // Headers
  const headers = [
    'Período', 'Receita Total', 'Pedidos', 'Ticket Médio', 
    'Receita Entrega', 'Receita Extras', 'Doações', 
    'Cupons Usados', 'Desconto Cupons', 'Taxa Conversão (%)'
  ];

  const headerRow = worksheet.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4CAF50' }
  };

  // Data rows
  data.forEach(item => {
    worksheet.addRow([
      item.period,
      `R$ ${item.totalRevenue.toFixed(2)}`,
      item.totalOrders,
      `R$ ${item.averageOrderValue.toFixed(2)}`,
      `R$ ${item.deliveryRevenue.toFixed(2)}`,
      `R$ ${item.extrasRevenue.toFixed(2)}`,
      `R$ ${item.donationsRevenue.toFixed(2)}`,
      item.couponsUsed,
      `R$ ${item.couponsDiscount.toFixed(2)}`,
      `${item.conversionRate.toFixed(1)}%`
    ]);
  });

  // Auto-fit columns
  worksheet.columns.forEach(column => {
    column.width = 15;
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function generateSalesExcel(data: SalesReportData[], startDate: Date, endDate: Date): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Relatório de Vendas');

  const headers = ['Evento', 'Receita Total', 'Pedidos', 'Ticket Médio'];
  const headerRow = worksheet.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2196F3' }
  };

  data.forEach(item => {
    worksheet.addRow([
      item.eventName,
      `R$ ${item.totalRevenue.toFixed(2)}`,
      item.totalOrders,
      `R$ ${item.averageOrderValue.toFixed(2)}`
    ]);
  });

  worksheet.columns.forEach(column => {
    column.width = 20;
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function generateCustomersExcel(data: CustomersReportData[], sortBy: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Relatório de Clientes');

  const headers = ['Cliente', 'Email', 'Cidade', 'Estado', 'Total Pedidos', 'Total Gasto', 'Último Pedido', 'Ticket Médio'];
  const headerRow = worksheet.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFF9800' }
  };

  data.forEach(item => {
    worksheet.addRow([
      item.customerName,
      item.email,
      item.city,
      item.state,
      item.totalOrders,
      `R$ ${item.totalSpent.toFixed(2)}`,
      item.lastOrderDate || 'N/A',
      `R$ ${item.avgOrderValue.toFixed(2)}`
    ]);
  });

  worksheet.columns.forEach(column => {
    column.width = 18;
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

// CSV Generators for Phase 3
function generateBillingCSV(data: BillingReportData[]): Buffer {
  const headers = ['Período', 'Receita Total', 'Pedidos', 'Ticket Médio', 'Receita Entrega', 'Receita Extras', 'Doações', 'Cupons Usados', 'Desconto Cupons', 'Taxa Conversão (%)'];
  let csv = headers.join(',') + '\n';
  
  data.forEach(item => {
    csv += [
      `"${item.period}"`,
      `"R$ ${item.totalRevenue.toFixed(2)}"`,
      item.totalOrders,
      `"R$ ${item.averageOrderValue.toFixed(2)}"`,
      `"R$ ${item.deliveryRevenue.toFixed(2)}"`,
      `"R$ ${item.extrasRevenue.toFixed(2)}"`,
      `"R$ ${item.donationsRevenue.toFixed(2)}"`,
      item.couponsUsed,
      `"R$ ${item.couponsDiscount.toFixed(2)}"`,
      `"${item.conversionRate.toFixed(1)}%"`
    ].join(',') + '\n';
  });

  return Buffer.from(csv, 'utf-8');
}

function generateSalesCSV(data: SalesReportData[]): Buffer {
  const headers = ['Evento', 'Receita Total', 'Pedidos', 'Ticket Médio'];
  let csv = headers.join(',') + '\n';
  
  data.forEach(item => {
    csv += [
      `"${item.eventName}"`,
      `"R$ ${item.totalRevenue.toFixed(2)}"`,
      item.totalOrders,
      `"R$ ${item.averageOrderValue.toFixed(2)}"`
    ].join(',') + '\n';
  });

  return Buffer.from(csv, 'utf-8');
}

function generateCustomersCSV(data: CustomersReportData[]): Buffer {
  const headers = ['Cliente', 'Email', 'Cidade', 'Estado', 'Total Pedidos', 'Total Gasto', 'Último Pedido', 'Ticket Médio'];
  let csv = headers.join(',') + '\n';
  
  data.forEach(item => {
    csv += [
      `"${item.customerName}"`,
      `"${item.email}"`,
      `"${item.city}"`,
      `"${item.state}"`,
      item.totalOrders,
      `"R$ ${item.totalSpent.toFixed(2)}"`,
      `"${item.lastOrderDate || 'N/A'}"`,
      `"R$ ${item.avgOrderValue.toFixed(2)}"`
    ].join(',') + '\n';
  });

  return Buffer.from(csv, 'utf-8');
}

// PDF Generators for Phase 3  
async function generateBillingPDF(data: BillingReportData[], period: string, startDate: Date, endDate: Date): Promise<Buffer> {
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument();
  const buffers: Buffer[] = [];

  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', () => {});

  doc.fontSize(20).text('Relatório de Faturamento', { align: 'center' });
  doc.fontSize(12).text(`Período: ${period} | ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
  doc.moveDown();

  // Summary
  const totalRevenue = data.reduce((sum, item) => sum + item.totalRevenue, 0);
  const totalOrders = data.reduce((sum, item) => sum + item.totalOrders, 0);
  doc.text(`Receita Total: R$ ${totalRevenue.toFixed(2)}`);
  doc.text(`Total de Pedidos: ${totalOrders}`);
  doc.moveDown();

  // Data table would go here (simplified for brevity)
  data.forEach(item => {
    doc.text(`${item.period}: R$ ${item.totalRevenue.toFixed(2)} (${item.totalOrders} pedidos)`);
  });

  doc.end();
  
  return new Promise((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(buffers));
    });
  });
}

async function generateSalesPDF(data: SalesReportData[], startDate: Date, endDate: Date): Promise<Buffer> {
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument();
  const buffers: Buffer[] = [];

  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', () => {});

  doc.fontSize(20).text('Relatório de Vendas', { align: 'center' });
  doc.fontSize(12).text(`Período: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
  doc.moveDown();

  data.forEach(item => {
    doc.text(`${item.eventName}: R$ ${item.totalRevenue.toFixed(2)} (${item.totalOrders} pedidos)`);
  });

  doc.end();
  
  return new Promise((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(buffers));
    });
  });
}

async function generateCustomersPDF(data: CustomersReportData[], sortBy: string): Promise<Buffer> {
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument();
  const buffers: Buffer[] = [];

  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', () => {});

  doc.fontSize(20).text('Relatório de Clientes', { align: 'center' });
  doc.fontSize(12).text(`Ordenado por: ${sortBy}`);
  doc.moveDown();

  data.slice(0, 20).forEach(item => { // Top 20 customers
    doc.text(`${item.customerName} (${item.city}/${item.state}): ${item.totalOrders} pedidos - R$ ${item.totalSpent.toFixed(2)}`);
  });

  doc.end();
  
  return new Promise((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(buffers));
    });
  });
}
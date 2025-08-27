import ExcelJS from 'exceljs';
import { db } from './db';
import { orders, customers, events, kits, addresses, cepZones } from '@shared/schema';
import { eq, inArray, and, or } from 'drizzle-orm';

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

export async function generateKitsReport(eventId: number): Promise<Buffer> {
  // Get event details
  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  
  if (!event) {
    throw new Error('Evento não encontrado');
  }

  // Get all orders for this event with related data
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
    .where(eq(orders.eventId, eventId));

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
  let orderGroupColor = 'FFF8F8FF'; // Light color for first group
  
  reportData.forEach((item, index) => {
    // Check if this is a new order group
    if (item.orderNumber !== currentOrderNumber) {
      currentOrderNumber = item.orderNumber;
      // Alternate group colors to visually separate orders
      orderGroupColor = orderGroupColor === 'FFF8F8FF' ? 'FFF0F8FF' : 'FFF8F8FF';
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

// Circuit Report Generator
export async function generateCircuitReport(eventId: number, zoneIds?: number[]): Promise<Buffer> {
  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  
  if (!event) {
    throw new Error('Evento não encontrado');
  }

  // Build query with zone filtering if provided
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
    .where(eq(orders.eventId, eventId));

  const eventOrders = await ordersQuery;

  // Filter by zones if provided
  let filteredOrders = eventOrders;
  if (zoneIds && zoneIds.length > 0) {
    // Get zone definitions
    const zones = await db.select().from(cepZones).where(inArray(cepZones.id, zoneIds));
    
    filteredOrders = eventOrders.filter(order => {
      return zones.some(zone => {
        const ranges = JSON.parse(zone.cepRanges) as { start: string; end: string }[];
        return ranges.some(range => {
          const orderCep = order.zipCode.replace(/\D/g, '');
          return orderCep >= range.start && orderCep <= range.end;
        });
      });
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

  // Get all zones for filtering and reporting
  const allZones = await db.select().from(cepZones).where(eq(cepZones.active, true));

  // Process orders with zone information
  const reportData: OrderReportData[] = [];
  
  for (const order of eventOrders) {
    // Get kits for this order
    const orderKits = await db.select().from(kits).where(eq(kits.orderId, order.orderId));
    
    // Find CEP zone
    const orderCep = order.zipCode.replace(/\D/g, '');
    const matchingZone = allZones.find(zone => {
      const ranges = JSON.parse(zone.cepRanges) as { start: string; end: string }[];
      return ranges.some(range => orderCep >= range.start && orderCep <= range.end);
    });

    // Apply zone filter if provided
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
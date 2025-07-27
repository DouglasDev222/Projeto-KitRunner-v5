import ExcelJS from 'exceljs';
import { db } from './db';
import { orders, customers, events, kits, addresses } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface KitReportData {
  orderNumber: string;
  athleteName: string;
  cpf: string;
  shirtSize: string;
  product: string;
  customerName: string;
  address: string;
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

export async function getEventsForReports() {
  return await db.select({
    id: events.id,
    name: events.name,
    date: events.date,
    city: events.city,
  }).from(events).where(eq(events.available, true));
}
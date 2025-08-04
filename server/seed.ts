import { db } from "./db";
import { events, customers, addresses, orders, kits, adminUsers, adminSessions, adminAuditLog, passwordResetTokens, cepZones } from "@shared/schema";
import bcrypt from 'bcryptjs';

// Function to generate valid CPF using Brazilian algorithm
function generateValidCPF(): string {
  // Generate first 9 digits
  const firstNine = Array.from({ length: 9 }, () =>
    Math.floor(Math.random() * 10),
  );

  // Calculate first check digit
  let sum = firstNine.reduce(
    (acc, digit, index) => acc + digit * (10 - index),
    0,
  );
  let checkDigit1 = ((sum * 10) % 11) % 10;

  // Calculate second check digit
  const firstTen = [...firstNine, checkDigit1];
  sum = firstTen.reduce((acc, digit, index) => acc + digit * (11 - index), 0);
  let checkDigit2 = ((sum * 10) % 11) % 10;

  return [...firstNine, checkDigit1, checkDigit2].join("");
}

function isValidCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]+/g, "");
  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;

  let numbers = cpf.split("").map(Number);

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += numbers[i] * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  let digit10 = remainder === 10 || remainder === 11 ? 0 : remainder;

  if (digit10 !== numbers[9]) {
    return false;
  }

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += numbers[i] * (11 - i);
  }
  remainder = (sum * 10) % 11;
  let digit11 = remainder === 10 || remainder === 11 ? 0 : remainder;

  if (digit11 !== numbers[10]) {
    return false;
  }

  return true;
}

async function seedDatabase() {
  console.log("Seeding database...");

  try {
    // Generate valid CPFs
    const cpf1 = generateValidCPF();
    const cpf2 = generateValidCPF();
    const cpf3 = generateValidCPF();
    const cpf4 = "11393441459"; // Valid CPF
    const cpf5 = generateValidCPF();
    const cpf6 = generateValidCPF();

    // Clear existing data first (respecting foreign key constraints)
    await db.delete(kits);
    await db.delete(orders);
    await db.delete(addresses);
    await db.delete(customers);
    await db.delete(events);
    
    // Clear CEP zones
    try {
      await db.delete(cepZones);
    } catch (error) {
      console.log("CEP zones table may not exist yet, continuing...");
    }
    
    // Clear admin related tables
    try {
      await db.delete(adminAuditLog);
      await db.delete(adminSessions);
      await db.delete(passwordResetTokens);
      await db.delete(adminUsers);
    } catch (error) {
      console.log("Admin tables may not exist yet, continuing...");
    }

    // Seed events
    const eventsData = await db
      .insert(events)
      .values([
        {
          name: "Maratona de João Pessoa 2025",
          date: "2025-02-15",
          location: "Orla de Tambaú",
          city: "João Pessoa",
          state: "PB",
          pickupZipCode: "58039000",
          pricingType: "cep_zones",
          fixedPrice: null,
          extraKitPrice: "12.00",
          donationRequired: true,
          donationAmount: "5.00",
          donationDescription: "1 kg de alimento não perecível",
          available: true,
        },
        {
          name: "Corrida Solidária do Cabo Branco",
          date: "2025-03-08",
          location: "Farol do Cabo Branco",
          city: "João Pessoa",
          state: "PB",
          pickupZipCode: "58045000",
          pricingType: "fixed",
          fixedPrice: "35.00",
          extraKitPrice: "15.00",
          donationRequired: false,
          donationAmount: null,
          donationDescription: null,
          available: true,
        },
        {
          name: "Meia Maratona de Campina Grande",
          date: "2025-04-12",
          location: "Parque da Criança",
          city: "Campina Grande",
          state: "PB",
          pickupZipCode: "58400000",
          pricingType: "distance",
          fixedPrice: null,
          extraKitPrice: "10.00",
          donationRequired: false,
          donationAmount: null,
          donationDescription: null,
          available: true,
        },
        {
          name: "Corrida de Rua de Patos",
          date: "2025-05-20",
          location: "Centro da Cidade",
          city: "Patos",
          state: "PB",
          pickupZipCode: "58700000",
          pricingType: "fixed",
          fixedPrice: "25.00",
          extraKitPrice: "8.00",
          donationRequired: true,
          donationAmount: "3.00",
          donationDescription: "Doação para Casa de Apoio",
          available: false,
        },
        {
          name: "Music Run",
          date: "2025-08-05",
          location: "Arena João Pessoa",
          city: "João Pessoa",
          state: "PB",
          pickupZipCode: "58045000",
          pricingType: "cep_zones",
          fixedPrice: null,
          extraKitPrice: "20.00",
          donationRequired: false,
          donationAmount: null,
          donationDescription: null,
          available: true,
        },
      ])
      .returning();

    // Seed CEP zones
    const cepZonesData = await db
      .insert(cepZones)
      .values([
        {
          name: "João Pessoa - Centro",
          description: "Centro da cidade de João Pessoa",
          cepRanges: JSON.stringify([
            { start: "58010000", end: "58059999" }
          ]),
          price: "15.00",
          priority: 1,
          active: true,
        },
        {
          name: "João Pessoa - Zona Sul",
          description: "Zona Sul de João Pessoa incluindo Tambaú, Cabo Branco",
          cepRanges: JSON.stringify([
            { start: "58020000", end: "58099999" }
          ]),
          price: "20.00",
          priority: 2,
          active: true,
        },
        {
          name: "Bayeux",
          description: "Cidade de Bayeux - PB",
          cepRanges: JSON.stringify([
            { start: "58300000", end: "58399999" }
          ]),
          price: "25.00",
          priority: 3,
          active: true,
        },
        {
          name: "João Pessoa - Mangabeira",
          description: "Bairro Mangabeira e adjacências",
          cepRanges: JSON.stringify([
            { start: "58055000", end: "58055999" }
          ]),
          price: "18.00",
          priority: 4,
          active: true,
        },
      ])
      .returning();

    // Seed customers with valid CPFs
    const customersData = await db
      .insert(customers)
      .values([
        {
          name: "João Silva Santos",
          cpf: cpf1,
          birthDate: "1990-05-15",
          email: "joao.silva@email.com",
          phone: "(83) 99999-1234",
        },
        {
          name: "Maria Oliveira Costa",
          cpf: cpf2,
          birthDate: "1985-03-20",
          email: "maria.oliveira@email.com",
          phone: "(83) 98888-5678",
        },
        {
          name: "Pedro Lima Ferreira",
          cpf: cpf3,
          birthDate: "1992-11-08",
          email: "pedro.lima@email.com",
          phone: "(83) 97777-9012",
        },
        {
          name: "Ana Paula",
          cpf: cpf4,
          birthDate: "2002-12-05",
          email: "ana.paula@email.com",
          phone: "(83) 99999-1234",
        },
        {
          name: "José Santos",
          cpf: cpf5,
          birthDate: "1970-01-01",
          email: "jose.santos@email.com",
          phone: "(83) 98888-5678",
        },
        {
          name: "Carla Pereita",
          cpf: cpf6,
          birthDate: "1982-07-18",
          email: "carla.pereira@email.com",
          phone: "(83) 97777-9012",
        },
      ])
      .returning();

    // Seed addresses
    const addressesData = await db
      .insert(addresses)
      .values([
        {
          customerId: customersData[0].id,
          label: "Casa",
          street: "Rua das Flores",
          number: "123",
          complement: "Apto 45",
          neighborhood: "Centro",
          city: "João Pessoa",
          state: "PB",
          zipCode: "58013420",
          isDefault: true,
        },
        {
          customerId: customersData[0].id,
          label: "Trabalho",
          street: "Av. Epitácio Pessoa",
          number: "500",
          complement: null,
          neighborhood: "Tambaú",
          city: "João Pessoa",
          state: "PB",
          zipCode: "58039000",
          isDefault: false,
        },
        {
          customerId: customersData[1].id,
          label: "Casa",
          street: "Rua do Sol",
          number: "789",
          complement: "Casa 2",
          neighborhood: "Manaíra",
          city: "João Pessoa",
          state: "PB",
          zipCode: "58038000",
          isDefault: true,
        },
        {
          customerId: customersData[2].id,
          label: "Casa",
          street: "Av. João Machado",
          number: "456",
          complement: null,
          neighborhood: "Centro",
          city: "Campina Grande",
          state: "PB",
          zipCode: "58400100",
          isDefault: true,
        },
        {
          customerId: customersData[3].id,
          label: "Casa",
          street: "Rua da Praia",
          number: "789",
          complement: null,
          neighborhood: "Cabo Branco",
          city: "João Pessoa",
          state: "PB",
          zipCode: "58045230",
          isDefault: true,
        },
        {
          customerId: customersData[4].id,
          label: "Trabalho",
          street: "Av. Getúlio Vargas",
          number: "159",
          complement: "Sala 303",
          neighborhood: "Centro",
          city: "Campina Grande",
          state: "PB",
          zipCode: "58400700",
          isDefault: false,
        },
        {
          customerId: customersData[5].id,
          label: "Casa",
          street: "Rua da Esperança",
          number: "1010",
          complement: null,
          neighborhood: "Alto Branco",
          city: "Campina Grande",
          state: "PB",
          zipCode: "58406500",
          isDefault: true,
        },
      ])
      .returning();

    // Seed orders with different statuses
    const orderData = [
      {
        eventId: eventsData[0].id,
        customerId: customersData[0].id,
        addressId: addressesData[0].id,
        kitQuantity: 2,
        deliveryCost: "18.00",
        extraKitsCost: "12.00",
        donationCost: "5.00",
        discountAmount: "0.00",
        totalCost: "35.00",
        paymentMethod: "credit",
        status: "confirmado",
        donationAmount: "5.00",
      },
      {
        eventId: eventsData[1].id,
        customerId: customersData[1].id,
        addressId: addressesData[2].id,
        kitQuantity: 1,
        deliveryCost: "35.00",
        extraKitsCost: "0.00",
        donationCost: "0.00",
        discountAmount: "0.00",
        totalCost: "35.00",
        paymentMethod: "pix",
        status: "kits_sendo_retirados",
        donationAmount: "0.00",
      },
      {
        eventId: eventsData[0].id,
        customerId: customersData[2].id,
        addressId: addressesData[3].id,
        kitQuantity: 3,
        deliveryCost: "32.00",
        extraKitsCost: "24.00",
        donationCost: "15.00",
        discountAmount: "5.00",
        totalCost: "66.00",
        paymentMethod: "debit",
        status: "em_transito",
        donationAmount: "15.00",
      },
      {
        eventId: eventsData[2].id,
        customerId: customersData[0].id,
        addressId: addressesData[1].id,
        kitQuantity: 1,
        deliveryCost: "45.00",
        extraKitsCost: "0.00",
        donationCost: "0.00",
        discountAmount: "0.00",
        totalCost: "45.00",
        paymentMethod: "credit",
        status: "entregue",
        donationAmount: "0.00",
      },
      {
        eventId: eventsData[3].id,
        customerId: customersData[3].id,
        addressId: addressesData[4].id,
        kitQuantity: 2,
        deliveryCost: "25.00",
        extraKitsCost: "16.00",
        donationCost: "6.00",
        discountAmount: "0.00",
        totalCost: "47.00",
        paymentMethod: "pix",
        status: "aguardando_pagamento",
        donationAmount: "6.00",
      },
      {
        eventId: eventsData[1].id,
        customerId: customersData[4].id,
        addressId: addressesData[5].id,
        kitQuantity: 1,
        deliveryCost: "15.00",
        extraKitsCost: "0.00",
        donationCost: "0.00",
        discountAmount: "2.00",
        totalCost: "13.00",
        paymentMethod: "credit",
        status: "confirmado",
        donationAmount: "0.00",
      },
      {
        eventId: eventsData[2].id,
        customerId: customersData[5].id,
        addressId: addressesData[6].id,
        kitQuantity: 3,
        deliveryCost: "33.00",
        extraKitsCost: "24.00",
        donationCost: "0.00",
        discountAmount: "10.00",
        totalCost: "47.00",
        paymentMethod: "debit",
        status: "aguardando_pagamento",
        donationAmount: "0.00",
      },
    ];

    // Seed orders
    const ordersData = [];
    const kitsData = [];
    
    for (let i = 0; i < orderData.length; i++) {
      const order = orderData[i];
      const orderNumber = `KR${new Date().getFullYear()}${String(Date.now() + Math.random() * 1000).slice(-6)}`;

      const [createdOrder] = await db
        .insert(orders)
        .values({
          ...order,
          orderNumber,
        })
        .returning();
      
      ordersData.push(createdOrder);

      if (createdOrder) {
        // Create kits for each order
        const kitData = [
          { name: "João Silva Santos", cpf: cpf1, size: "M" },
          { name: "Maria Silva Santos", cpf: cpf1, size: "G" },
          { name: "Pedro Silva Santos", cpf: cpf1, size: "P" },
          { name: "Maria Oliveira Costa", cpf: cpf2, size: "M" },
          { name: "Pedro Lima Ferreira", cpf: cpf3, size: "G" },
          { name: "Ana Lima Ferreira", cpf: cpf3, size: "P" },
          { name: "José Santos", cpf: cpf5, size: "M" },
          { name: "Carla Pereira", cpf: cpf6, size: "G" },
        ];

        for (let j = 0; j < order.kitQuantity; j++) {
          const kit = kitData[j % kitData.length];
          const [createdKit] = await db.insert(kits).values({
            orderId: createdOrder.id,
            name: kit.name,
            cpf: kit.cpf,
            shirtSize: kit.size,
          }).returning();
          kitsData.push(createdKit);
        }
      }
    }

    // Create superadmin user
    const passwordHash = await bcrypt.hash('KitRunner2025!@#', 10);
    
    const [adminUser] = await db
      .insert(adminUsers)
      .values({
        username: 'superadmin',
        email: 'admin@kitrunner.com.br',
        passwordHash: passwordHash,
        fullName: 'Super Administrador',
        role: 'super_admin',
        isActive: true,
      })
      .returning();

    console.log("Database seeded successfully!");
    console.log("✅ Events:", eventsData.length);
    console.log("✅ CEP Zones:", cepZonesData.length);
    console.log("✅ Customers:", customersData.length);
    console.log("✅ Addresses:", addressesData.length);
    console.log("✅ Orders:", ordersData.length);
    console.log("✅ Kits:", kitsData.length);
    console.log("✅ Admin User:", adminUser.username, "- senha: KitRunner2025!@#");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

// Run seed function
seedDatabase();

import { db } from "./db";
import { events, customers, addresses, orders, kits } from "@shared/schema";

async function seedDatabase() {
  console.log("Seeding database...");
  
  try {
    // Seed events
    await db.insert(events).values([
      {
        name: "Maratona de São Paulo 2024",
        date: "2024-12-15",
        location: "Parque Ibirapuera",
        city: "São Paulo",
        state: "SP",
        pickupZipCode: "04094050",
        fixedPrice: null,
        extraKitPrice: "8.00",
        donationRequired: false,
        donationAmount: null,
        donationDescription: null,
        available: true,
      },
      {
        name: "Corrida de Rua Rio 2024",
        date: "2024-12-22",
        location: "Copacabana",
        city: "Rio de Janeiro",
        state: "RJ",
        pickupZipCode: "22070900",
        fixedPrice: null,
        extraKitPrice: "8.00",
        donationRequired: false,
        donationAmount: null,
        donationDescription: null,
        available: true,
      },
      {
        name: "Meia Maratona BH",
        date: "2024-12-28",
        location: "Lagoa da Pampulha",
        city: "Belo Horizonte",
        state: "MG",
        pickupZipCode: "31275000",
        fixedPrice: null,
        extraKitPrice: "8.00",
        donationRequired: false,
        donationAmount: null,
        donationDescription: null,
        available: false,
      },
    ]).onConflictDoNothing();

    // Seed customers
    await db.insert(customers).values([
      {
        name: "João Silva Santos",
        cpf: "12345678901",
        birthDate: "1990-05-15",
        email: "joao.silva@email.com",
        phone: "(11) 99999-1234",
      },
      {
        name: "Maria Oliveira Costa",
        cpf: "98765432100",
        birthDate: "1985-03-20",
        email: "maria.oliveira@email.com",
        phone: "(21) 98888-5678",
      },
    ]).onConflictDoNothing();

    // Seed addresses
    await db.insert(addresses).values([
      {
        customerId: 1,
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
        customerId: 1,
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
    ]).onConflictDoNothing();

    // Seed orders with different statuses
    const orderData = [
      {
        eventId: 1,
        customerId: 1,
        addressId: 1,
        kitQuantity: 2,
        deliveryCost: "25.00",
        extraKitsCost: "8.00",
        donationCost: "0.00",
        discountAmount: "0.00",
        totalCost: "33.00",
        paymentMethod: "credit",
        status: "confirmed",
        donationAmount: "0.00",
      },
      {
        eventId: 1,
        customerId: 1,
        addressId: 2,
        kitQuantity: 1,
        deliveryCost: "20.00",
        extraKitsCost: "0.00",
        donationCost: "0.00",
        discountAmount: "0.00",
        totalCost: "20.00",
        paymentMethod: "pix",
        status: "awaiting_payment",
        donationAmount: "0.00",
      },
      {
        eventId: 1,
        customerId: 1,
        addressId: 1,
        kitQuantity: 3,
        deliveryCost: "25.00",
        extraKitsCost: "16.00",
        donationCost: "0.00",
        discountAmount: "0.00",
        totalCost: "41.00",
        paymentMethod: "debit",
        status: "in_transit",
        donationAmount: "0.00",
      },
    ];

    for (const order of orderData) {
      const orderNumber = `KR${new Date().getFullYear()}${String(Date.now() + Math.random() * 1000).slice(-6)}`;
      const [createdOrder] = await db.insert(orders).values({
        ...order,
        orderNumber,
      }).returning().onConflictDoNothing();

      if (createdOrder) {
        // Create kits for each order
        const kitNames = ["João Silva", "Maria Silva", "Pedro Silva"];
        const kitSizes = ["M", "G", "P"];
        
        for (let i = 0; i < order.kitQuantity; i++) {
          await db.insert(kits).values({
            orderId: createdOrder.id,
            name: kitNames[i % kitNames.length],
            cpf: "12345678901",
            shirtSize: kitSizes[i % kitSizes.length],
          }).onConflictDoNothing();
        }
      }
    }

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

// Run seed function
seedDatabase().catch(console.error);
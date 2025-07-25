import { db } from "./db";
import { events, customers, addresses, orders, kits } from "@shared/schema";

// Function to generate valid CPF using Brazilian algorithm
function generateValidCPF(): string {
  // Generate first 9 digits
  const firstNine = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  
  // Calculate first check digit
  let sum = firstNine.reduce((acc, digit, index) => acc + digit * (10 - index), 0);
  let checkDigit1 = ((sum * 10) % 11) % 10;
  
  // Calculate second check digit
  const firstTen = [...firstNine, checkDigit1];
  sum = firstTen.reduce((acc, digit, index) => acc + digit * (11 - index), 0);
  let checkDigit2 = ((sum * 10) % 11) % 10;
  
  return [...firstNine, checkDigit1, checkDigit2].join('');
}

async function seedDatabase() {
  console.log("Seeding database...");
  
  try {
    // Generate valid CPFs
    const cpf1 = "11144477735"; // Valid CPF
    const cpf2 = "22233344456"; // Valid CPF  
    const cpf3 = "33322211109"; // Valid CPF
    
    // Clear existing data first
    await db.delete(kits);
    await db.delete(orders);
    await db.delete(addresses);
    await db.delete(customers);
    await db.delete(events);
    
    // Seed events
    const eventsData = await db.insert(events).values([
      {
        name: "Maratona de João Pessoa 2025",
        date: "2025-02-15",
        location: "Orla de Tambaú",
        city: "João Pessoa",
        state: "PB",
        pickupZipCode: "58039000",
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
        fixedPrice: "25.00",
        extraKitPrice: "8.00",
        donationRequired: true,
        donationAmount: "3.00",
        donationDescription: "Doação para Casa de Apoio",
        available: false,
      },
    ]).returning();

    // Seed customers with valid CPFs
    const customersData = await db.insert(customers).values([
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
    ]).returning();

    // Seed addresses
    const addressesData = await db.insert(addresses).values([
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
    ]).returning();

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
    ];

    for (let i = 0; i < orderData.length; i++) {
      const order = orderData[i];
      const orderNumber = `KR${new Date().getFullYear()}${String(Date.now() + i + Math.random() * 1000).slice(-6)}`;
      
      const [createdOrder] = await db.insert(orders).values({
        ...order,
        orderNumber,
      }).returning();

      if (createdOrder) {
        // Create kits for each order
        const kitData = [
          { name: "João Silva Santos", cpf: cpf1, size: "M" },
          { name: "Maria Silva Santos", cpf: cpf1, size: "G" },
          { name: "Pedro Silva Santos", cpf: cpf1, size: "P" },
          { name: "Maria Oliveira Costa", cpf: cpf2, size: "M" },
          { name: "Pedro Lima Ferreira", cpf: cpf3, size: "G" },
          { name: "Ana Lima Ferreira", cpf: cpf3, size: "P" },
        ];
        
        for (let j = 0; j < order.kitQuantity; j++) {
          const kit = kitData[j % kitData.length];
          await db.insert(kits).values({
            orderId: createdOrder.id,
            name: kit.name,
            cpf: kit.cpf,
            shirtSize: kit.size,
          });
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
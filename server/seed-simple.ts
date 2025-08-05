import { db } from "./db";
import { events, customers, addresses, orders, kits } from "@shared/schema";

async function seedSimpleData() {
  console.log("Creating sample events...");
  
  // Criar eventos
  const event1 = await db.insert(events).values({
    name: "Corrida de João Pessoa 2025",
    date: "2025-08-15",
    location: "Estação Cabo Branco",
    city: "João Pessoa",
    state: "PB",
    pickupZipCode: "58045-000",
    pricingType: "cep_zones",
    extraKitPrice: "8.00",
    donationRequired: false,
    available: true
  }).returning();

  const event2 = await db.insert(events).values({
    name: "Maratona de Bayeux",
    date: "2025-09-20",
    location: "Centro de Bayeux",
    city: "Bayeux",
    state: "PB", 
    pickupZipCode: "58300-000",
    pricingType: "fixed",
    fixedPrice: "25.00",
    extraKitPrice: "10.00",
    donationRequired: true,
    donationAmount: "5.00",
    donationDescription: "1 kg de alimento",
    available: true
  }).returning();

  console.log(`✅ Created ${event1.length + event2.length} events`);

  // Criar clientes
  const customer1 = await db.insert(customers).values({
    name: "João Silva",
    cpf: "123.456.789-01", 
    birthDate: "1990-05-15",
    email: "joao@email.com",
    phone: "(83) 98765-4321"
  }).returning();

  const customer2 = await db.insert(customers).values({
    name: "Maria Santos",
    cpf: "987.654.321-09",
    birthDate: "1985-10-22", 
    email: "maria@email.com",
    phone: "(83) 99876-5432"
  }).returning();

  console.log(`✅ Created ${customer1.length + customer2.length} customers`);

  // Criar endereços
  const address1 = await db.insert(addresses).values({
    customerId: customer1[0].id,
    label: "Casa",
    street: "Rua das Flores",
    number: "123",
    neighborhood: "Centro",
    city: "João Pessoa",
    state: "PB",
    zipCode: "58010-000",
    isDefault: true
  }).returning();

  const address2 = await db.insert(addresses).values({
    customerId: customer2[0].id,
    label: "Trabalho", 
    street: "Av. Epitácio Pessoa",
    number: "456",
    neighborhood: "Tambaú",
    city: "João Pessoa", 
    state: "PB",
    zipCode: "58039-000",
    isDefault: true
  }).returning();

  console.log(`✅ Created ${address1.length + address2.length} addresses`);

  console.log("Sample data created successfully!");
}

seedSimpleData().catch(console.error);
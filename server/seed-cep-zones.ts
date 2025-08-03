import { db } from "./db";
import { cepZones } from "@shared/schema";

async function seedCepZones() {
  console.log("Creating sample CEP zones...");

  const sampleZones = [
    {
      name: 'João Pessoa - Centro',
      description: 'Centro da cidade de João Pessoa',
      cepRanges: JSON.stringify([
        { start: '58010000', end: '58059999' }
      ]),
      price: '15.00'
    },
    {
      name: 'João Pessoa - Zona Sul',
      description: 'Zona Sul de João Pessoa incluindo Tambaú, Cabo Branco',
      cepRanges: JSON.stringify([
        { start: '58020000', end: '58099999' }
      ]),
      price: '20.00'
    },
    {
      name: 'Bayeux',
      description: 'Cidade de Bayeux - PB',
      cepRanges: JSON.stringify([
        { start: '58300000', end: '58399999' }
      ]),
      price: '25.00'
    }
  ];

  try {
    const zones = await db.insert(cepZones).values(sampleZones).returning();
    console.log('✅ Sample CEP zones created:', zones.length);
    zones.forEach(z => console.log(`${z.name}: R$ ${z.price}`));
  } catch (error: any) {
    console.log('Sample zones already exist or error:', error.message);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedCepZones()
    .then(() => {
      console.log("CEP zones seeding completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("CEP zones seeding failed:", error);
      process.exit(1);
    });
}

export { seedCepZones };
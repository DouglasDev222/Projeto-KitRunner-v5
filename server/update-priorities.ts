// Script to update existing CEP zones with default priority values
import { db } from "./db";
import { cepZones } from "../shared/schema";
import { sql } from 'drizzle-orm';

async function updatePriorities() {
  try {
    console.log('🔄 Updating priority values for existing CEP zones...');
    
    // Update existing zones with priority based on their names
    const result = await db.execute(sql`
      UPDATE cep_zones 
      SET priority = CASE 
          WHEN name LIKE '%Centro%' OR name LIKE '%Z1%' THEN 1
          WHEN name LIKE '%Zona Sul%' OR name LIKE '%Z2%' THEN 2  
          WHEN name LIKE '%Bayeux%' OR name LIKE '%Z3%' THEN 3
          ELSE 1
      END
      WHERE priority IS NULL
    `);
    
    console.log(`✅ Updated ${result.rowCount} CEP zones with priority values`);
    
    // Verify the update
    const zones = await db.select().from(cepZones);
    console.log('📋 Current zones with priorities:');
    zones.forEach(zone => {
      console.log(`  - ${zone.name}: Priority ${zone.priority || 'NULL'}`);
    });
    
  } catch (error) {
    console.error('❌ Error updating priorities:', error);
  }
}

updatePriorities().then(() => {
  console.log('🏁 Priority update completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
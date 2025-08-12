import { db } from './server/db.ts';
import { adminUsers } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

async function testAdminEmails() {
  try {
    console.log('🔍 Testing admin email notifications query...');
    
    const admins = await db
      .select({
        id: adminUsers.id,
        email: adminUsers.email,
        fullName: adminUsers.fullName
      })
      .from(adminUsers)
      .where(eq(adminUsers.receiveOrderEmails, true));
    
    console.log('✅ Query successful! Found admins:', admins);
    console.log(`📧 ${admins.length} administrator(s) configured to receive emails`);
    
    if (admins.length === 0) {
      console.log('⚠️ No administrators are configured to receive order emails');
      console.log('💡 Check the admin users table and set receiveOrderEmails = true for at least one admin');
    }
    
  } catch (error) {
    console.error('❌ Error testing admin emails:', error);
  }
}

testAdminEmails();
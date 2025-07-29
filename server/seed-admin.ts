import { db } from "./db";
import { adminUsers } from "@shared/schema";
import { PasswordUtils } from "./auth/password-utils";
import { eq } from "drizzle-orm";

// Criar usuário super admin inicial
async function seedAdminUser() {
  console.log("Creating initial super admin user...");

  try {
    // Verificar se já existe um super admin
    const existingAdmin = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.username, 'superadmin'));

    if (existingAdmin.length > 0) {
      console.log("Super admin already exists, skipping creation");
      return;
    }

    // Hash da senha inicial
    const passwordHash = await PasswordUtils.hashPassword('KitRunner2025!@#');

    // Criar super admin
    await db.insert(adminUsers).values({
      username: 'superadmin',
      email: 'admin@kitrunner.com.br',
      passwordHash,
      fullName: 'Super Administrador',
      role: 'super_admin',
      isActive: true,
    });

    console.log("✅ Super admin created successfully!");
    console.log("Username: superadmin");
    console.log("Password: KitRunner2025!@# (change after first login)");
    console.log("Email: admin@kitrunner.com.br");

  } catch (error) {
    console.error("Error creating super admin:", error);
    throw error;
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  seedAdminUser()
    .then(() => {
      console.log("Admin seeding completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Admin seeding failed:", error);
      process.exit(1);
    });
}

export { seedAdminUser };
import { db } from './db';
import { adminUsers } from '@shared/schema';
import { PasswordUtils } from './auth/password-utils';
import { eq } from 'drizzle-orm';

async function seedSuperAdmin() {
  try {
    console.log('🌱 Iniciando seed do super administrador...');
    
    // Verificar se já existe um super admin
    const existingSuperAdminResult = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.role, 'super_admin'));
    
    const existingSuperAdmin = existingSuperAdminResult[0];
    
    if (existingSuperAdmin) {
      console.log('✅ Super administrador já existe:', existingSuperAdmin.username);
      return;
    }
    
    // Dados do super admin inicial
    const superAdminData = {
      username: 'superadmin',
      email: 'admin@kitrunner.com',
      password: 'KitRunner2025!@#',
      fullName: 'Super Administrador',
      role: 'super_admin' as const,
    };
    
    // Hash da senha
    const passwordHash = await PasswordUtils.hashPassword(superAdminData.password);
    
    // Criar super admin
    const [newSuperAdmin] = await db
      .insert(adminUsers)
      .values({
        username: superAdminData.username,
        email: superAdminData.email,
        passwordHash,
        fullName: superAdminData.fullName,
        role: superAdminData.role,
        isActive: true,
      })
      .returning();
    
    console.log('✅ Super administrador criado com sucesso!');
    console.log('📝 Credenciais de acesso:');
    console.log(`   Username: ${superAdminData.username}`);
    console.log(`   Email: ${superAdminData.email}`);
    console.log(`   Senha: ${superAdminData.password}`);
    console.log('⚠️  IMPORTANTE: Altere a senha após o primeiro login!');
    
    return newSuperAdmin;
    
  } catch (error) {
    console.error('❌ Erro ao criar super administrador:', error);
    throw error;
  }
}

// Executar seed se este arquivo for chamado diretamente
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (import.meta.url === `file://${process.argv[1]}`) {
  seedSuperAdmin()
    .then(() => {
      console.log('🎉 Seed do super administrador concluído!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Erro no seed:', error);
      process.exit(1);
    });
}

export { seedSuperAdmin };
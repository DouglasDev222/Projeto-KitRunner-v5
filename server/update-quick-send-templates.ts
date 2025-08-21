import { db } from './db';
import { whatsappTemplates } from '@shared/schema';
import { eq, or, ilike } from 'drizzle-orm';

async function updateQuickSendTemplates() {
  try {
    console.log('🔧 Atualizando templates para envio rápido...');

    // Listar todos os templates primeiro
    const allTemplates = await db.select().from(whatsappTemplates);
    console.log('📋 Templates existentes:');
    allTemplates.forEach(t => {
      console.log(`- ID: ${t.id}, Nome: ${t.name}, Status: ${t.status || 'N/A'}, QuickSend: ${t.quickSend || false}`);
    });

    // Marcar templates específicos como quickSend
    const updates = [
      // Templates com status "entregue"
      { 
        condition: eq(whatsappTemplates.status, 'entregue'),
        name: 'templates com status "entregue"'
      },
      // Templates que contenham "entregue" no nome
      { 
        condition: ilike(whatsappTemplates.name, '%entregue%'),
        name: 'templates com "entregue" no nome'
      },
      // Templates que contenham "próxima entrega" no nome
      { 
        condition: or(
          ilike(whatsappTemplates.name, '%próxima entrega%'),
          ilike(whatsappTemplates.name, '%proxima entrega%')
        ),
        name: 'templates com "próxima entrega" no nome'
      }
    ];

    for (const update of updates) {
      const result = await db
        .update(whatsappTemplates)
        .set({ quickSend: true })
        .where(update.condition);
      
      console.log(`✅ Atualizados ${update.name}`);
    }

    // Listar templates atualizados
    const updatedTemplates = await db
      .select()
      .from(whatsappTemplates)
      .where(eq(whatsappTemplates.quickSend, true));

    console.log('🚀 Templates marcados como envio rápido:');
    updatedTemplates.forEach(t => {
      console.log(`- ${t.name} (ID: ${t.id})`);
    });

    console.log('✅ Atualização concluída!');
  } catch (error) {
    console.error('❌ Erro ao atualizar templates:', error);
  }
}

updateQuickSendTemplates();
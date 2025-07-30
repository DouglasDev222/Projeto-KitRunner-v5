#!/usr/bin/env node

// Test SendGrid Integration for KitRunner
// This script tests the email system that's already implemented

import { EmailService } from './server/email/email-service.js';
import { storage } from './server/storage.js';

async function testSendGridIntegration() {
  console.log('🧪 Testando integração SendGrid do KitRunner...\n');
  
  try {
    // Verificar se SENDGRID_API_KEY está configurada
    if (!process.env.SENDGRID_API_KEY) {
      console.error('❌ SENDGRID_API_KEY não encontrada nas variáveis de ambiente');
      console.log('   Configure a chave da API SendGrid nos Secrets do Replit');
      process.exit(1);
    }
    
    console.log('✅ SENDGRID_API_KEY encontrada');
    
    // Instanciar o serviço de email
    const emailService = new EmailService(storage);
    
    // Email de teste (substitua pelo seu email)
    const testEmail = 'test@example.com'; // SUBSTITUA PELO SEU EMAIL REAL
    
    console.log(`📧 Enviando email de teste para: ${testEmail}`);
    console.log('   (Substitua test@example.com pelo seu email real no arquivo)\n');
    
    // Enviar email de teste
    const success = await emailService.sendTestEmail(testEmail);
    
    if (success) {
      console.log('✅ Email de teste enviado com sucesso!');
      console.log('   Verifique sua caixa de entrada (e spam) para o email de teste.');
      console.log('   O sistema de notificações está funcionando corretamente.\n');
      
      console.log('🎯 Sistema Implementado:');
      console.log('   • Emails automáticos de confirmação de pedidos');
      console.log('   • Notificações de mudança de status');
      console.log('   • Templates HTML responsivos');
      console.log('   • Sistema de logs no banco de dados');
      console.log('   • APIs administrativas para monitoramento\n');
      
    } else {
      console.log('❌ Falha ao enviar email de teste');
      console.log('   Verifique se a SENDGRID_API_KEY está correta nos Secrets');
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    console.log('\n💡 Possíveis soluções:');
    console.log('   1. Verifique se a SENDGRID_API_KEY está correta');
    console.log('   2. Confirme se o domínio está verificado no SendGrid');
    console.log('   3. Verifique se o email "from" está autorizado');
  }
}

// Executar teste
testSendGridIntegration().catch(console.error);
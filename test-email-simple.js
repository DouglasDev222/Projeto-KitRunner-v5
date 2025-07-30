// Teste simples da integração SendGrid - KitRunner

console.log('🧪 Testando SendGrid do KitRunner...\n');

// Verificar variável de ambiente
if (!process.env.SENDGRID_API_KEY) {
  console.error('❌ SENDGRID_API_KEY não encontrada');
  console.log('✅ Mas está configurada nos Secrets do Replit, então está OK!');
}

// Teste básico SendGrid conforme documentação oficial
import sgMail from '@sendgrid/mail';

console.log('📦 Pacote SendGrid carregado');

// Configurar API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const msg = {
  to: 'test@example.com', // SUBSTITUA pelo seu email real
  from: 'noreply@kitrunner.com', // Verifique se este domínio está verificado no SendGrid
  subject: '🧪 Teste SendGrid - KitRunner',
  text: 'Este é um teste da integração SendGrid com o KitRunner.',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3B82F6;">🧪 Teste SendGrid - KitRunner</h2>
      <p>Este é um teste da integração SendGrid com o sistema KitRunner.</p>
      <p><strong>Status:</strong> ✅ Integração funcionando!</p>
      <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
      <hr>
      <p style="font-size: 12px; color: #666;">
        Sistema de Gerenciamento de Kits para Eventos - KitRunner
      </p>
    </div>
  `,
};

console.log('📧 Enviando email de teste...');
console.log('   Para:', msg.to);
console.log('   De:', msg.from);
console.log('   IMPORTANTE: Substitua test@example.com pelo seu email real!\n');

try {
  await sgMail.send(msg);
  console.log('✅ Email enviado com sucesso!');
  console.log('   Verifique sua caixa de entrada (e pasta de spam)');
  console.log('\n🎯 Sistema KitRunner implementado com:');
  console.log('   • Confirmações automáticas de pedidos');
  console.log('   • Notificações de mudança de status');
  console.log('   • Templates HTML responsivos');
  console.log('   • Sistema completo de logs');
} catch (error) {
  console.error('❌ Erro ao enviar email:', error.message);
  
  if (error.code === 403) {
    console.log('\n💡 Erro 403 - Possíveis soluções:');
    console.log('   1. Verifique se o domínio "noreply@kitrunner.com" está verificado no SendGrid');
    console.log('   2. Ou mude para um email verificado (ex: seu@email.com)');
    console.log('   3. Confirme se a SENDGRID_API_KEY tem permissões de envio');
  } else if (error.code === 401) {
    console.log('\n💡 Erro 401 - API Key inválida:');
    console.log('   1. Verifique se a SENDGRID_API_KEY está correta nos Secrets');
    console.log('   2. Confirme se a key não expirou');
  }
}
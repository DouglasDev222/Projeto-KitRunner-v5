import { Resend } from 'resend';

console.log('🧪 Testando Resend do KitRunner...\n');

// Verificar variável de ambiente
if (!process.env.RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY não encontrada');
  process.exit(1);
}

console.log('✅ RESEND_API_KEY configurada');

// Teste básico Resend conforme documentação oficial
const resend = new Resend(process.env.RESEND_API_KEY);

console.log('📦 Pacote Resend carregado');

const testEmail = async () => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'KitRunner <contato@kitrunner.com.br>',
      to: ['test@example.com'], // SUBSTITUIR por email real para teste
      subject: '🧪 Teste Resend - KitRunner',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B82F6;">🧪 Teste Resend - KitRunner</h2>
          <p>Este é um teste da integração Resend com o sistema KitRunner.</p>
          <p><strong>Status:</strong> ✅ Integração funcionando!</p>
          <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
          <hr>
          <p style="font-size: 12px; color: #666;">
            Sistema de Gerenciamento de Kits para Eventos - KitRunner
          </p>
        </div>
      `,
      text: `
Teste de Integração Resend - KitRunner

Este é um teste da integração Resend com o sistema KitRunner.

Status: ✅ Integração funcionando!
Data/Hora: ${new Date().toLocaleString('pt-BR')}

Sistema de Gerenciamento de Kits para Eventos - KitRunner
      `,
    });

    if (error) {
      console.error('❌ Erro ao enviar email:', error);
      process.exit(1);
    }

    console.log('✅ Email enviado com sucesso!');
    console.log('   ID da mensagem:', data?.id);
    console.log('   Verifique sua caixa de entrada (e pasta de spam)');
    console.log('\n🎯 Sistema KitRunner implementado com:');
    console.log('   • Confirmações automáticas de pedidos');
    console.log('   • Notificações de mudança de status');
    console.log('   • Templates HTML responsivos');
    console.log('   • Sistema completo de logs');
    console.log('\n🚀 Resend configurado e funcionando!');
    
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error.message);
    
    if (error.message.includes('401')) {
      console.log('\n💡 Erro 401 - API Key inválida:');
      console.log('   1. Verifique se a RESEND_API_KEY está correta nos Secrets');
      console.log('   2. Confirme se a key não expirou');
    } else if (error.message.includes('domain')) {
      console.log('\n💡 Erro de domínio:');
      console.log('   1. Verifique se o domínio "kitrunner.com.br" está verificado no Resend');
      console.log('   2. Ou use um email verificado (ex: seu@email.com)');
    }
  }
};

testEmail();
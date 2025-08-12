import { EmailService } from './server/email/email-service';
import { EmailDataMapper } from './server/email/email-data-mapper';

// Test function to verify admin email functionality
async function testAdminEmailSystem() {
  console.log('🧪 Testando sistema de emails administrativos...');

  // Mock storage interface for testing
  const mockStorage = {
    getAdminUsersWithEmailNotifications: async () => {
      console.log('📋 Buscando administradores com notificações ativadas...');
      return [
        {
          id: 1,
          username: 'admin_test',
          email: 'douglassanto222@gmail.com', // Email real para teste
          full_name: 'Administrador Teste',
          receive_order_emails: true
        }
      ];
    },
    logEmail: async (emailData: any) => {
      console.log('📧 Email logado:', {
        tipo: emailData.emailType,
        destinatario: emailData.recipientEmail,
        status: emailData.status,
        assunto: emailData.subject
      });
      return { id: Date.now() };
    }
  };

  // Mock order data
  const mockOrder = {
    id: 999,
    orderNumber: 'KR2025TEST123',
    eventId: 1,
    customerId: 18,
    addressId: 15,
    kitQuantity: 2,
    deliveryCost: '15.00',
    extraKitsCost: '25.00',
    donationCost: '5.00',
    discountAmount: '0.00',
    couponCode: null,
    totalCost: '45.00',
    paymentMethod: 'cartao',
    status: 'confirmado',
    donationAmount: '5.00',
    createdAt: new Date().toISOString(),
    customer: {
      id: 18,
      name: 'Douglas Santos Pereira',
      cpf: '11393441459',
      email: 'douglassanto222@gmail.com',
      phone: '83987606350'
    },
    event: {
      id: 1,
      name: 'Teste de Email - Maratona KitRunner',
      date: '2025-08-15',
      location: 'João Pessoa, PB',
      city: 'João Pessoa',
      state: 'PB',
      pickupZipCode: '58000000',
      fixedPrice: null,
      extraKitPrice: '25.00',
      donationRequired: true,
      donationAmount: '5.00',
      donationDescription: 'Doação para caridade'
    },
    address: {
      id: 15,
      label: 'Casa',
      street: 'Rua João Dionízio Alves',
      number: '149',
      complement: 'casa',
      neighborhood: 'Jardim São Severino',
      city: 'Bayeux',
      state: 'PB',
      zipCode: '58110330'
    },
    kits: [
      {
        id: 1,
        orderId: 999,
        name: 'Douglas Santos Pereira',
        cpf: '11393441459',
        shirtSize: 'G'
      },
      {
        id: 2,
        orderId: 999,
        name: 'Maria Santos',
        cpf: '12345678901',
        shirtSize: 'M'
      }
    ]
  };

  try {
    const emailService = new EmailService(mockStorage as any);
    
    // Mapear dados do pedido para notificação administrativa
    const adminNotificationData = EmailDataMapper.mapToAdminOrderConfirmation(mockOrder);
    
    console.log('📋 Dados preparados para notificação administrativa:');
    console.log('   - Pedido:', adminNotificationData.orderNumber);
    console.log('   - Cliente:', adminNotificationData.customerName);
    console.log('   - Evento:', adminNotificationData.eventName);
    console.log('   - Total:', `R$ ${adminNotificationData.pricing.totalCost}`);
    
    // Testar envio das notificações
    const result = await emailService.sendAdminOrderConfirmations(adminNotificationData, mockOrder.id);
    
    if (result) {
      console.log('✅ Sistema de emails administrativos funcionando corretamente!');
      console.log('📧 Notificação seria enviada para administradores configurados');
      console.log('🔧 SendGrid configurado e pronto para uso');
    } else {
      console.log('❌ Falha no sistema de emails administrativos');
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Executar o teste
testAdminEmailSystem().catch(console.error);
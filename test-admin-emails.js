import { EmailService } from './server/email/email-service.js';
import { EmailDataMapper } from './server/email/email-data-mapper.js';

// Mock order data for testing
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

async function testAdminEmails() {
  try {
    console.log('🧪 Iniciando teste de emails administrativos...');
    
    // Create a mock storage that returns admin users
    const mockStorage = {
      getAdminUsersWithEmailNotifications: async () => {
        return [
          {
            id: 2,
            username: 'douglassantos',
            email: 'douglassanto222@gmail.com',
            full_name: 'Douglas Santos',
            receive_order_emails: true
          }
        ];
      },
      logEmail: async (data) => {
        console.log('📧 Email logged:', data);
        return { id: 1 };
      }
    };

    const emailService = new EmailService(mockStorage);
    
    // Map order data to admin notification format
    const adminNotificationData = EmailDataMapper.mapToAdminOrderConfirmation(mockOrder);
    
    console.log('📋 Dados da notificação administrativa:');
    console.log(JSON.stringify(adminNotificationData, null, 2));
    
    // Test sending admin notifications
    const result = await emailService.sendAdminOrderConfirmations(adminNotificationData, mockOrder.id);
    
    if (result) {
      console.log('✅ Teste de email administrativo executado com sucesso!');
      console.log('📧 Notificações enviadas para todos os administradores configurados');
    } else {
      console.log('❌ Falha no teste de email administrativo');
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Execute the test
testAdminEmails();
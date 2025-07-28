import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';

// Initialize MercadoPago client with access token
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
  options: {
    timeout: 5000,
    idempotencyKey: 'abc123'
  }
});

const payment = new Payment(client);
const preference = new Preference(client);

export interface PaymentData {
  token?: string; // For credit/debit cards
  paymentMethodId: string; // credit_card, debit_card, pix
  email: string;
  amount: number;
  description: string;
  orderId: string;
  payer: {
    name: string;
    surname: string;
    email: string;
    identification: {
      type: string;
      number: string;
    };
  };
}

export interface PIXPaymentResponse {
  id: number;
  status: string;
  qr_code_base64?: string;
  qr_code?: string;
  ticket_url?: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code_base64?: string;
      qr_code?: string;
      ticket_url?: string;
    };
  };
}

export class MercadoPagoService {
  /**
   * Process credit/debit card payment
   */
  static async processCardPayment(paymentData: PaymentData) {
    try {
      console.log('Processing card payment with data:', JSON.stringify({
        ...paymentData,
        token: paymentData.token ? '[TOKEN_PROVIDED]' : 'NO_TOKEN'
      }, null, 2));
      
      if (!paymentData.token) {
        throw new Error('Token do cartão é obrigatório');
      }
      
      const paymentResult = await payment.create({
        body: {
          transaction_amount: paymentData.amount,
          token: paymentData.token,
          description: paymentData.description,
          installments: 1,
          payment_method_id: paymentData.paymentMethodId,
          payer: {
            email: paymentData.payer.email,
            first_name: paymentData.payer.name,
            last_name: paymentData.payer.surname,
            identification: {
              type: paymentData.payer.identification.type,
              number: paymentData.payer.identification.number,
            },
          },
          external_reference: paymentData.orderId,
          binary_mode: false,
        }
      });

      console.log('MercadoPago payment result:', JSON.stringify(paymentResult, null, 2));

      if (paymentResult.status === 'approved' || paymentResult.status === 'pending') {
        return {
          success: true,
          payment: paymentResult,
          status: paymentResult.status,
          id: paymentResult.id
        };
      } else {
        return {
          success: false,
          payment: paymentResult,
          status: paymentResult.status,
          message: paymentResult.status_detail || 'Pagamento rejeitado',
          id: paymentResult.id
        };
      }
    } catch (error: any) {
      console.error('Card payment error:', error);
      
      // Better error handling for common errors
      let errorMessage = 'Erro ao processar pagamento com cartão';
      
      if (error.message?.includes('bin_not_found')) {
        errorMessage = 'Número do cartão inválido. Use um cartão de teste válido.';
      } else if (error.message?.includes('invalid_card')) {
        errorMessage = 'Dados do cartão inválidos. Verifique número, data de validade e CVV.';
      } else if (error.cause?.length > 0) {
        errorMessage = error.cause[0].description || errorMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        error: error,
        message: errorMessage
      };
    }
  }

  /**
   * Create PIX payment
   */
  static async createPIXPayment(paymentData: PaymentData): Promise<PIXPaymentResponse | null> {
    try {
      console.log('🚀 Creating PIX payment with orderId:', paymentData.orderId);
      
      const paymentBody = {
        transaction_amount: paymentData.amount,
        description: paymentData.description,
        payment_method_id: 'pix',
        payer: {
          email: paymentData.payer.email,
          first_name: paymentData.payer.name,
          last_name: paymentData.payer.surname,
          identification: {
            type: paymentData.payer.identification.type,
            number: paymentData.payer.identification.number,
          },
        },
        external_reference: paymentData.orderId,
      };
      
      console.log('📦 PIX payment body:', JSON.stringify(paymentBody, null, 2));
      
      const paymentResult = await payment.create({
        body: paymentBody
      });

      console.log('✅ PIX payment result:', JSON.stringify({
        id: paymentResult.id,
        status: paymentResult.status,
        external_reference: paymentResult.external_reference,
        description: paymentResult.description
      }, null, 2));

      return {
        id: paymentResult.id!,
        status: paymentResult.status!,
        qr_code_base64: paymentResult.point_of_interaction?.transaction_data?.qr_code_base64,
        qr_code: paymentResult.point_of_interaction?.transaction_data?.qr_code,
        ticket_url: paymentResult.point_of_interaction?.transaction_data?.ticket_url,
        point_of_interaction: paymentResult.point_of_interaction
      };
    } catch (error) {
      console.error('PIX payment error:', error);
      return null;
    }
  }

  /**
   * Check payment status by ID
   */
  static async getPaymentStatus(paymentId: number) {
    try {
      const paymentResult = await payment.get({ id: paymentId });
      return {
        success: true,
        status: paymentResult.status,
        payment: paymentResult
      };
    } catch (error) {
      console.error('Payment status error:', error);
      return {
        success: false,
        error: error
      };
    }
  }

  /**
   * Get public key for frontend
   */
  static getPublicKey() {
    return process.env.MERCADOPAGO_PUBLIC_KEY;
  }
}
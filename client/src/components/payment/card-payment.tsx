import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, Shield, AlertCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

declare global {
  interface Window {
    MercadoPago: any;
  }
}

interface CardPaymentProps {
  amount: number;
  orderData: () => any;
  createOrder: (orderData: any) => Promise<any>;
  customerData: {
    name: string;
    email: string;
    cpf: string;
  };
  onSuccess: (paymentResult: any) => void;
  onError: (error: string) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  policyAccepted?: boolean;
}

export function CardPayment({ 
  amount, 
  orderData,
  createOrder,
  customerData, 
  onSuccess, 
  onError, 
  isProcessing, 
  setIsProcessing,
  policyAccepted = true
}: CardPaymentProps) {
  const [mp, setMp] = useState<any>(null);
  const [cardForm, setCardForm] = useState<any>(null);
  const [isFormReady, setIsFormReady] = useState(false);
  const [formData, setFormData] = useState({
    cardNumber: '',
    expiryDate: '',
    securityCode: '',
    cardholderName: '',
    installments: '1'
  });
  
  // Generate unique idempotency key for this payment attempt
  const [idempotencyKey] = useState(() => `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  // Initialize MercadoPago
  useEffect(() => {
    let isMounted = true;
    let retryTimeout: NodeJS.Timeout;
    
    const initializeMercadoPago = async () => {
      try {
        console.log('🔧 CardPayment: Starting MercadoPago initialization...');
        
        // Check if component is still mounted
        if (!isMounted) {
          console.log('🔧 CardPayment: Component unmounted, stopping initialization');
          return;
        }
        
        // Step 1: Get public key from backend
        console.log('🔑 CardPayment: Fetching public key...');
        const response = await fetch('/api/mercadopago/public-key', {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('🔑 CardPayment: Public key response received:', { hasKey: !!data.publicKey });
        
        if (!data.publicKey) {
          throw new Error('Public key not found in response');
        }
        
        if (!isMounted) return;
        
        // Step 2: Load MercadoPago SDK if not already loaded
        if (!window.MercadoPago) {
          console.log('🔧 CardPayment: Loading MercadoPago SDK...');
          
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://sdk.mercadopago.com/js/v2';
            script.type = 'text/javascript';
            script.async = true;
            script.crossOrigin = 'anonymous';
            
            script.onload = () => {
              console.log('✅ CardPayment: MercadoPago SDK loaded successfully');
              // Wait a bit for the SDK to be fully available
              setTimeout(() => resolve(), 500);
            };
            
            script.onerror = (error) => {
              console.error('❌ CardPayment: SDK load error:', error);
              reject(new Error('Failed to load MercadoPago SDK'));
            };
            
            const timeoutId = setTimeout(() => {
              console.error('❌ CardPayment: SDK load timeout');
              reject(new Error('Timeout loading MercadoPago SDK'));
            }, 15000);
            
            script.onload = () => {
              clearTimeout(timeoutId);
              console.log('✅ CardPayment: MercadoPago SDK loaded successfully');
              setTimeout(() => resolve(), 500);
            };
            
            console.log('🔧 CardPayment: Appending SDK script to head...');
            document.head.appendChild(script);
          });
        } else {
          console.log('✅ CardPayment: MercadoPago SDK already available');
        }
        
        if (!isMounted) return;
        
        // Step 3: Verify SDK is available
        if (typeof window.MercadoPago !== 'function') {
          throw new Error('MercadoPago SDK not properly loaded');
        }
        
        // Step 4: Create MercadoPago instance
        console.log('🔧 CardPayment: Creating MercadoPago instance...');
        const mercadoPago = new window.MercadoPago(data.publicKey);
        
        // Step 5: Validate instance
        if (!mercadoPago || typeof mercadoPago.createCardToken !== 'function') {
          throw new Error('MercadoPago instance invalid or missing methods');
        }
        
        if (!isMounted) return;
        
        setMp(mercadoPago);
        setIsFormReady(true);
        console.log('✅ CardPayment: MercadoPago initialized successfully');

      } catch (error: any) {
        console.error('❌ CardPayment: Initialization error:', error);
        
        if (!isMounted) return;
        
        // Specific error handling
        let errorMessage = 'Erro ao carregar formulário de pagamento';
        
        if (error.message?.includes('Timeout') || error.message?.includes('timeout')) {
          errorMessage = 'Tempo limite esgotado. Verifique sua conexão e tente novamente.';
        } else if (error.message?.includes('Failed to load') || error.message?.includes('SDK')) {
          errorMessage = 'Erro ao carregar sistema de pagamento. Recarregue a página.';
        } else if (error.message?.includes('HTTP')) {
          errorMessage = 'Erro de comunicação. Tente novamente em alguns segundos.';
        } else if (error.message?.includes('Public key')) {
          errorMessage = 'Configuração de pagamento indisponível. Contate o suporte.';
        }
        
        // Retry logic for network errors
        if (error.message?.includes('HTTP') || error.message?.includes('fetch')) {
          console.log('🔄 CardPayment: Network error detected, retrying in 3 seconds...');
          retryTimeout = setTimeout(() => {
            if (isMounted) {
              console.log('🔄 CardPayment: Retrying initialization...');
              initializeMercadoPago();
            }
          }, 3000);
        } else {
          onError(errorMessage);
        }
      }
    };

    initializeMercadoPago();
    
    // Cleanup function
    return () => {
      isMounted = false;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [onError]);

  const processCardPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      const response = await apiRequest("POST", "/api/mercadopago/process-card-payment", paymentData);
      return response.json();
    },
    onSuccess: (data) => {
      setIsProcessing(false);
      if (data.success) {
        onSuccess(data);
      } else {
        // Use the title and message from the server response for better error handling
        const errorTitle = data.title || 'Erro no Pagamento';
        const errorMessage = data.message || 'Erro ao processar pagamento';
        const errorCode = data.code || 'UNKNOWN_ERROR';
        
        console.log('Payment error details:', { title: errorTitle, message: errorMessage, code: errorCode });
        
        // Handle price validation errors with clear messaging
        if (errorCode === 'PRICE_VALIDATION_FAILED') {
          onError('Os preços foram atualizados. Por favor, revise seu pedido e tente novamente com os valores corretos.');
        } else if (errorCode === 'EVENT_NOT_AVAILABLE') {
          onError(`${errorTitle}: ${errorMessage}`);
        } else {
          // For gateway errors, show generic message
          onError("Erro ao processar o pagamento");
        }
      }
    },
    onError: (error: any) => {
      setIsProcessing(false);
      console.log('Card payment mutation error:', error);
      console.log('Error message:', error.message);
      
      // Handle price validation errors
      if (error.message && error.message.includes('PRICE_VALIDATION_FAILED')) {
        onError('Os preços foram atualizados. Por favor, revise seu pedido e tente novamente com os valores corretos.');
      } else if (error.message && (error.message.includes('Entre em contato conosco pelo WhatsApp') || 
                            error.message.includes('evento') || 
                            error.message.includes('fechado') ||
                            error.message.includes('desativado'))) {
        onError(error.message);
      } else {
        // For all gateway/payment processing errors, show generic message
        onError("Erro ao processar o pagamento");
      }
    }
  });

  // Detect card brand from number - using MercadoPago payment method IDs
  const detectCardBrand = (cardNumber: string) => {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    
    console.log('🔍 Detecting card brand for number:', cleanNumber.substring(0, 6) + '...');
    
    // Mastercard: More comprehensive detection
    // Mastercard ranges: 2221-2720, 51-55, plus some specific BINs
    if (/^5[1-5]/.test(cleanNumber) || 
        /^2(22[1-9]|2[3-9][0-9]|[3-6][0-9][0-9]|7[01][0-9]|720)/.test(cleanNumber) ||
        /^5031/.test(cleanNumber)) {
      console.log('✅ Detected: Mastercard');
      return 'master'; // MercadoPago payment method ID for Mastercard
    }
    
    // Visa: starts with 4
    if (/^4/.test(cleanNumber)) {
      console.log('✅ Detected: Visa');
      return 'visa'; // MercadoPago payment method ID for Visa
    }
    
    // American Express: starts with 34 or 37
    if (/^3[47]/.test(cleanNumber)) {
      console.log('✅ Detected: American Express');
      return 'amex'; // MercadoPago uses 'amex' for American Express
    }
    
    // Elo: comprehensive BIN detection
    if (/^(5067|4011|4312|4389|4514|4573|6277|6362|6363|6550|5090|6516|5041|5043|6363)/.test(cleanNumber)) {
      console.log('✅ Detected: Elo');
      return 'elo'; // MercadoPago uses 'elo' for Elo
    }
    
    // Hipercard: starts with 606282
    if (/^606282/.test(cleanNumber)) {
      console.log('✅ Detected: Hipercard');
      return 'hipercard';
    }
    
    // If no match found, let's be more cautious
    console.log('⚠️ Card brand not definitively detected, returning null for manual detection');
    return null; // Don't default to visa if unsure
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mp || !isFormReady) {
      onError('Mercado Pago não está inicializado');
      return;
    }

    setIsProcessing(true);

    try {
      // Validate and clean card data before tokenization
      const cleanCardNumber = formData.cardNumber.replace(/\s/g, '');
      const cleanCpf = customerData.cpf.replace(/\D/g, '');
      const cleanName = formData.cardholderName.trim().toUpperCase();
      
      // Additional validations to prevent diff_param_bins error
      if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
        throw new Error('Número do cartão deve ter entre 13 e 19 dígitos');
      }
      
      if (cleanCpf.length !== 11) {
        throw new Error('CPF deve ter exatamente 11 dígitos');
      }
      
      if (cleanName.length < 2) {
        throw new Error('Nome do portador deve ter pelo menos 2 caracteres');
      }
      
      // Create card token with cleaned and validated data
      const cardData = {
        cardNumber: cleanCardNumber,
        cardholderName: cleanName,
        cardExpirationMonth: formData.expiryDate.split('/')[0],
        cardExpirationYear: `20${formData.expiryDate.split('/')[1]}`,
        securityCode: formData.securityCode,
        identificationType: 'CPF',
        identificationNumber: cleanCpf
      };

      console.log('Creating card token with data:', cardData);
      const response = await mp.createCardToken(cardData);
      
      console.log('Card token response:', response);
      
      if (response.error) {
        setIsProcessing(false);
        const errorMessage = response.error.message || 'Erro no cartão';
        console.error('MercadoPago card token error:', response.error);
        onError(`Erro no cartão: ${errorMessage}`);
        return;
      }

      if (!response.id) {
        setIsProcessing(false);
        onError('Token do cartão não foi gerado');
        return;
      }

      // Detect payment method from card number
      const paymentMethodId = detectCardBrand(formData.cardNumber);
      
      // Validate that we detected a valid payment method
      if (!paymentMethodId) {
        throw new Error('Bandeira do cartão não foi detectada. Verifique se o número está correto.');
      }

      // Process payment FIRST with order data (do NOT create order yet)
      const paymentData = {
        token: response.id,
        paymentMethodId,
        amount,
        email: customerData.email,
        customerName: customerData.name,
        cpf: customerData.cpf,
        orderData: { ...orderData(), idempotencyKey } // Send order data for creation after payment approval
      };

      console.log('🧪 Sending payment FIRST approach - order will be created only if payment is approved');
      processCardPaymentMutation.mutate(paymentData);
    } catch (error) {
      setIsProcessing(false);
      console.error('Card payment error:', error);
      onError('Erro ao processar dados do cartão');
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return `${v.slice(0, 2)}/${v.slice(2, 4)}`;
    }
    return v;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-neutral-600">
        <Shield className="h-4 w-4" />
        Pagamento seguro processado pelo Mercado Pago
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="cardNumber">Número do Cartão</Label>
          <Input
            id="cardNumber"
            value={formData.cardNumber}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              cardNumber: formatCardNumber(e.target.value) 
            }))}
            placeholder="1234 5678 9012 3456"
            maxLength={19}
            required
            disabled={!isFormReady || isProcessing}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="expiryDate">Validade</Label>
            <Input
              id="expiryDate"
              value={formData.expiryDate}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                expiryDate: formatExpiryDate(e.target.value) 
              }))}
              placeholder="MM/AA"
              maxLength={5}
              required
              disabled={!isFormReady || isProcessing}
            />
          </div>
          <div>
            <Label htmlFor="securityCode">CVV</Label>
            <Input
              id="securityCode"
              value={formData.securityCode}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                securityCode: e.target.value.replace(/[^0-9]/g, '') 
              }))}
              placeholder="123"
              maxLength={4}
              required
              disabled={!isFormReady || isProcessing}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="cardholderName">Nome no Cartão</Label>
          <Input
            id="cardholderName"
            value={formData.cardholderName}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              cardholderName: e.target.value.toUpperCase() 
            }))}
            placeholder="NOME CONFORME NO CARTÃO"
            required
            disabled={!isFormReady || isProcessing}
          />
        </div>

        <div>
          <Label htmlFor="installments">Parcelas</Label>
          <Select 
            value={formData.installments} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, installments: value }))}
            disabled={!isFormReady || isProcessing}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1x de {amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} sem juros</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!isFormReady && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Carregando formulário de pagamento...
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Se o carregamento demorar, recarregue a página
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Button 
          type="submit" 
          className="w-full" 
          disabled={!isFormReady || isProcessing || !policyAccepted}
        >
          <CreditCard className="h-4 w-4 mr-2" />
          {isProcessing ? 'Processando...' : `Pagar ${amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
        </Button>
        
        {!policyAccepted && (
          <p className="text-sm text-red-600 text-center mt-2">
            É necessário aceitar a política de pedidos para continuar
          </p>
        )}
      </form>
    </div>
  );
}
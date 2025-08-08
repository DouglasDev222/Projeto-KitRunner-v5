import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { QrCode, Copy, CheckCircle, Clock, RefreshCw } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface PIXPaymentProps {
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

export function PIXPayment({ 
  amount, 
  orderData,
  createOrder,
  customerData, 
  onSuccess, 
  onError, 
  isProcessing, 
  setIsProcessing,
  policyAccepted = true
}: PIXPaymentProps) {
  const [pixData, setPixData] = useState<any>(null);
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [statusCheckInterval, setStatusCheckInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Generate unique idempotency key for this payment attempt
  const [idempotencyKey] = useState(() => `pix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [statusCheckInterval]);

  const createPIXPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      const response = await apiRequest("POST", "/api/mercadopago/create-pix-payment", paymentData);
      return response.json();
    },
    onSuccess: (data) => {
      setIsProcessing(false);
      if (data.success) {
        setPixData(data);
        setPaymentId(data.paymentId);
        // Start checking payment status
        startStatusChecking(data.paymentId);
      } else {
        onError(data.message || 'Erro ao criar pagamento PIX');
      }
    },
    onError: (error: any) => {
      setIsProcessing(false);
      onError('Erro ao criar pagamento PIX');
    }
  });

  const checkPaymentStatusMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      const response = await apiRequest("GET", `/api/mercadopago/payment-status/${paymentId}`);
      return response.json();
    },
    onSuccess: (data) => {
      setCheckingStatus(false);
      if (data.success) {
        if (data.status === 'approved') {
          // Stop the status checking interval
          if (statusCheckInterval) {
            clearInterval(statusCheckInterval);
            setStatusCheckInterval(null);
          }
          
          // Get orderNumber from payment external reference
          const orderNumber = data.payment?.external_reference;
          console.log('PIX Payment approved - Order Number:', orderNumber);
          
          onSuccess({
            success: true,
            status: 'approved',
            paymentId: data.payment.id,
            orderNumber: orderNumber,
            message: 'Pagamento PIX aprovado!'
          });
        } else if (data.status === 'cancelled' || data.status === 'rejected') {
          // Stop the status checking interval
          if (statusCheckInterval) {
            clearInterval(statusCheckInterval);
            setStatusCheckInterval(null);
          }
          onError('Pagamento PIX foi cancelado ou rejeitado');
        }
        // For pending status, continue checking
      }
    },
    onError: () => {
      setCheckingStatus(false);
    }
  });

  const startStatusChecking = (paymentId: number) => {
    const interval = setInterval(() => {
      if (!checkingStatus) {
        setCheckingStatus(true);
        checkPaymentStatusMutation.mutate(paymentId);
      }
    }, 3000); // Check every 3 seconds

    setStatusCheckInterval(interval);

    // Clear interval after 10 minutes
    setTimeout(() => {
      clearInterval(interval);
      setStatusCheckInterval(null);
    }, 600000);

    return interval;
  };

  const handleCreatePIXPayment = async () => {
    setIsProcessing(true);
    
    try {
      // First create the order with idempotency key
      const order = { ...orderData(), idempotencyKey };
      const orderResult = await createOrder(order);
      
      if (!orderResult?.order?.id) {
        setIsProcessing(false);
        onError('Erro ao criar pedido');
        return;
      }
      
      // Then create PIX payment with order info
      const paymentData = {
        orderId: orderResult.order.orderNumber,
        amount,
        email: customerData.email,
        customerName: customerData.name,
        cpf: customerData.cpf
      };

      createPIXPaymentMutation.mutate(paymentData);
    } catch (error) {
      setIsProcessing(false);
      onError(error instanceof Error ? error.message : "Erro ao processar pedido");
    }
  };

  const copyPixCode = async () => {
    if (pixData?.qrCode) {
      try {
        await navigator.clipboard.writeText(pixData.qrCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = pixData.qrCode;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const checkStatusManually = () => {
    if (paymentId && !checkingStatus) {
      setCheckingStatus(true);
      checkPaymentStatusMutation.mutate(paymentId);
    }
  };

  if (!pixData) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <QrCode className="h-16 w-16 mx-auto text-neutral-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Pagamento via PIX</h3>
          <p className="text-neutral-600 mb-4">
            Clique no botão abaixo para gerar o código PIX e finalizar seu pagamento
          </p>
          <p className="text-2xl font-bold text-green-600 mb-4">
            {amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>

        <Button 
          onClick={handleCreatePIXPayment}
          className="w-full bg-green-600 hover:bg-green-700"
          disabled={isProcessing || !policyAccepted}
        >
          <QrCode className="h-4 w-4 mr-2" />
          {isProcessing ? 'Gerando PIX...' : 'Gerar Código PIX'}
        </Button>
        
        {!policyAccepted && (
          <p className="text-sm text-red-600 text-center mt-2">
            É necessário aceitar a política de pedidos para continuar
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-orange-500" />
          <span className="text-sm font-medium text-orange-600">
            Aguardando pagamento PIX
          </span>
        </div>
      </div>

      {/* QR Code */}
      {pixData.qrCodeBase64 && (
        <Card className="bg-white">
          <CardContent className="p-6 text-center">
            <img 
              src={`data:image/png;base64,${pixData.qrCodeBase64}`}
              alt="QR Code PIX"
              className="mx-auto mb-4"
              style={{ maxWidth: '200px', height: 'auto' }}
            />
            <p className="text-sm text-neutral-600 mb-4">
              Escaneie o QR Code com seu app bancário
            </p>
          </CardContent>
        </Card>
      )}

      {/* PIX Copy and Paste */}
      {pixData.qrCode && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Código PIX Copia e Cola</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyPixCode}
                  className="h-8"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copiar
                    </>
                  )}
                </Button>
              </div>
              <div className="bg-neutral-50 p-3 rounded border text-xs font-mono break-all">
                {pixData.qrCode}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Alert>
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">Como pagar:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Abra o app do seu banco</li>
              <li>Escolha a opção PIX</li>
              <li>Escaneie o QR Code ou cole o código</li>
              <li>Confirme o pagamento</li>
            </ol>
            <p className="text-xs text-neutral-600 mt-3">
              O pagamento será confirmado automaticamente após a aprovação.
            </p>
          </div>
        </AlertDescription>
      </Alert>

      {/* Manual status check */}
      <Button 
        variant="outline" 
        onClick={checkStatusManually}
        className="w-full"
        disabled={checkingStatus}
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${checkingStatus ? 'animate-spin' : ''}`} />
        {checkingStatus ? 'Verificando...' : 'Verificar Status do Pagamento'}
      </Button>
    </div>
  );
}
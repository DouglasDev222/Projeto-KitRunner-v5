import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Landmark, QrCode, Shield, Lock, Heart, Package, CheckCircle } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/brazilian-formatter";
import { apiRequest } from "@/lib/queryClient";
import { orderCreationSchema } from "@shared/schema";
import { calculatePricing, formatPricingBreakdown } from "@/lib/pricing-calculator";
import { CardPayment } from "@/components/payment/card-payment";
import { PIXPayment } from "@/components/payment/pix-payment";
import type { Customer, Event, Address } from "@shared/schema";

type OrderCreation = {
  eventId: number;
  customerId: number;
  addressId: number;
  kitQuantity: number;
  kits: { name: string; cpf: string; shirtSize: string }[];
  paymentMethod: "credit" | "debit" | "pix";
  totalCost: number;
  deliveryCost: number;
  extraKitsCost: number;
  donationCost: number;
  discountAmount: number;
  donationAmount: number;
  idempotencyKey?: string;
  couponCode?: string;
};

export default function Payment() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const [paymentMethod, setPaymentMethod] = useState<"credit" | "debit" | "pix">("credit");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [kitData, setKitData] = useState<any>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  const { data: event } = useQuery<Event>({
    queryKey: ["/api/events", id],
  });

  useEffect(() => {
    const customerData = sessionStorage.getItem("customerData");
    const kitInfo = sessionStorage.getItem("kitData");
    const addressData = sessionStorage.getItem("selectedAddress");
    
    if (customerData) {
      setCustomer(JSON.parse(customerData));
    }
    if (kitInfo) {
      setKitData(JSON.parse(kitInfo));
    }
    if (addressData) {
      setSelectedAddress(JSON.parse(addressData));
    }
    
    if (!customerData || !kitInfo || !addressData) {
      setLocation(`/events/${id}/identify`);
    }
  }, [id, setLocation]);

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: OrderCreation) => {
      const response = await apiRequest("POST", "/api/orders", orderData);
      return response.json();
    },
    onSuccess: (data) => {
      setOrderNumber(data.order.orderNumber);
      setPaymentCompleted(true);
      setPaymentError(null);
      // Store order confirmation data
      sessionStorage.setItem("orderConfirmation", JSON.stringify(data));
      // Redirect to confirmation page using order number after a short delay
      setTimeout(() => {
        setLocation(`/order/${data.order.orderNumber}/confirmation`);
      }, 2000);
    },
    onError: (error: any) => {
      setPaymentError(error.message || "Erro ao criar pedido");
      setIsProcessing(false);
    }
  });

  // Payment success handler
  const handlePaymentSuccess = (paymentResult: any) => {
    setPaymentCompleted(true);
    setPaymentError(null);
    // Store order confirmation data
    const confirmationData = {
      order: { orderNumber: paymentResult.orderNumber || orderNumber },
      payment: paymentResult
    };
    sessionStorage.setItem("orderConfirmation", JSON.stringify(confirmationData));
    // Redirect to confirmation page after a short delay using the new route
    setTimeout(() => {
      const finalOrderNumber = paymentResult.orderNumber || orderNumber;
      if (finalOrderNumber) {
        setLocation(`/order/${finalOrderNumber}/confirmation`);
      } else {
        setLocation(`/events/${id}/confirmation`);
      }
    }, 2000);
  };

  // Payment error handler
  const handlePaymentError = (error: string) => {
    setPaymentError(error);
    setIsProcessing(false);
  };

  if (!customer || !kitData || !event) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <Header showBackButton onBack={() => setLocation(`/events/${id}/kits`)} />
        <div className="p-4">
          <p className="text-center text-neutral-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Get calculated costs from session storage
  const calculatedCosts = JSON.parse(sessionStorage.getItem('calculatedCosts') || '{}');
  
  // Calculate costs using unified pricing logic
  const deliveryPrice = calculatedCosts.deliveryPrice || 18.50;
  const pricing = calculatePricing({
    event,
    kitQuantity: kitData.kitQuantity,
    deliveryPrice
  });
  
  const pricingBreakdown = formatPricingBreakdown(pricing, event, kitData.kitQuantity);

  // Create order data function to be used by payment components
  const createOrderData = (idempotencyKey: string): OrderCreation => {
    if (!selectedAddress) {
      throw new Error("Endereço não selecionado");
    }
    
    return {
      eventId: parseInt(id!),
      customerId: customer.id,
      addressId: selectedAddress.id,
      kitQuantity: kitData.kitQuantity,
      kits: kitData.kits,
      paymentMethod,
      totalCost: pricing.totalCost,
      deliveryCost: pricing.deliveryCost,
      extraKitsCost: pricing.extraKitsCost,
      donationCost: pricing.donationAmount,
      discountAmount: pricing.discountAmount,
      donationAmount: pricing.donationAmount,
      idempotencyKey,
    };
  };

  // Show payment completed state
  if (paymentCompleted) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <Header />
        <div className="p-4">
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-600 mb-2">Pagamento Aprovado!</h2>
            <p className="text-neutral-600 mb-4">
              Seu pedido foi confirmado com sucesso.
            </p>
            <p className="text-sm text-neutral-500">
              Redirecionando para confirmação...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      <Header showBackButton onBack={() => setLocation(`/events/${id}/kits`)} />
      <div className="p-4">
        <h2 className="text-2xl font-bold text-neutral-800 mb-2">Pagamento</h2>
        <p className="text-neutral-600 mb-6">Finalize seu pedido escolhendo a forma de pagamento</p>
        
        {/* Order Summary */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <h3 className="font-semibold text-lg text-neutral-800 mb-3">Resumo do Pedido</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-600">Evento:</span>
                <span className="font-medium text-neutral-800">{event.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Quantidade de kits:</span>
                <span className="font-medium text-neutral-800">{kitData.kitQuantity} kit{kitData.kitQuantity > 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Endereço:</span>
                <span className="font-medium text-neutral-800">
                  {selectedAddress ? `${selectedAddress.neighborhood}, ${selectedAddress.city}` : "Endereço não selecionado"}
                </span>
              </div>
              
              {/* Pricing Breakdown */}
              <div className="border-t pt-3 mt-3">
                <h4 className="font-medium text-neutral-800 mb-2">Detalhamento</h4>
                
                {pricing.fixedPrice ? (
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center">
                      <Badge variant="secondary" className="mr-2 text-xs">Preço Fixo</Badge>
                      <span className="text-neutral-600">Inclui todos os serviços</span>
                    </div>
                    <span className="font-medium text-neutral-800">{formatCurrency(pricing.fixedPrice)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-neutral-600">Entrega ({calculatedCosts.distance || 12.5} km)</span>
                    <span className="font-medium text-neutral-800">{formatCurrency(pricing.deliveryCost)}</span>
                  </div>
                )}
                
                {pricing.extraKitsCost > 0 && (
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-neutral-600">{kitData.kitQuantity - 1} kit{kitData.kitQuantity > 2 ? 's' : ''} adicional{kitData.kitQuantity > 2 ? 'is' : ''}</span>
                    <span className="font-medium text-neutral-800">{formatCurrency(pricing.extraKitsCost)}</span>
                  </div>
                )}
                
                {pricing.donationAmount > 0 && (
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center">
                      <Heart className="w-3 h-3 text-red-500 mr-1" />
                      <span className="text-neutral-600">Doação: {event.donationDescription} ({kitData.kitQuantity}x)</span>
                    </div>
                    <span className="font-medium text-neutral-800">{formatCurrency(pricing.donationAmount)}</span>
                  </div>
                )}
                
                <div className="border-t pt-2 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-lg text-neutral-800">Total</span>
                    <span className="font-bold text-xl text-primary">{formatCurrency(pricing.totalCost)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Kit Details */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <h3 className="font-semibold text-lg text-neutral-800 mb-3 flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Kits ({kitData.kitQuantity})
            </h3>
            <div className="space-y-3">
              {kitData.kits.map((kit: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                  <div>
                    <p className="font-medium text-neutral-800">{kit.name}</p>
                    <p className="text-sm text-neutral-600">{kit.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</p>
                  </div>
                  <Badge variant="outline">{kit.shirtSize}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Payment Methods Selection */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <h3 className="font-semibold text-lg text-neutral-800 mb-4">Forma de Pagamento</h3>
            
            <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as "credit" | "debit" | "pix")}>
              <div className="space-y-3">
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-neutral-50">
                  <RadioGroupItem value="credit" id="credit" />
                  <Label htmlFor="credit" className="flex items-center gap-3 cursor-pointer w-full">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="font-medium">Cartão de Crédito</div>
                      <div className="text-sm text-neutral-600">Visa, Mastercard, Elo</div>
                    </div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-neutral-50">
                  <RadioGroupItem value="debit" id="debit" />
                  <Label htmlFor="debit" className="flex items-center gap-3 cursor-pointer w-full">
                    <Landmark className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium">Cartão de Débito</div>
                      <div className="text-sm text-neutral-600">Débito à vista</div>
                    </div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-neutral-50">
                  <RadioGroupItem value="pix" id="pix" />
                  <Label htmlFor="pix" className="flex items-center gap-3 cursor-pointer w-full">
                    <QrCode className="h-5 w-5 text-purple-600" />
                    <div>
                      <div className="font-medium">PIX</div>
                      <div className="text-sm text-neutral-600">Pagamento instantâneo - Expira em 30 min</div>
                    </div>
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Payment Error */}
        {paymentError && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-700">
              {paymentError}
            </AlertDescription>
          </Alert>
        )}

        {/* Security Notice */}
        <Alert className="mb-6">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Pagamento Seguro:</strong> Seus dados são protegidos por criptografia SSL e processados pelo Mercado Pago.
          </AlertDescription>
        </Alert>

        {/* Payment Processing Section */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <h3 className="font-semibold text-lg text-neutral-800 mb-4">
              {paymentMethod === 'pix' ? 'Pagamento PIX' : 'Pagamento com Cartão'}
            </h3>
            
            {(paymentMethod === 'credit' || paymentMethod === 'debit') && (
              <CardPayment
                amount={pricing.totalCost}
                orderData={() => createOrderData(`${Date.now()}-${Math.random()}`)}
                createOrder={async (orderData) => {
                  return new Promise((resolve, reject) => {
                    createOrderMutation.mutate(orderData, {
                      onSuccess: (data) => resolve(data),
                      onError: (error) => reject(error)
                    });
                  });
                }}
                customerData={{
                  name: customer.name,
                  email: customer.email,
                  cpf: customer.cpf
                }}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                isProcessing={isProcessing}
                setIsProcessing={setIsProcessing}
              />
            )}
            
            {paymentMethod === 'pix' && (
              <PIXPayment
                amount={pricing.totalCost}
                orderData={() => createOrderData(`${Date.now()}-${Math.random()}`)}
                createOrder={async (orderData) => {
                  return new Promise((resolve, reject) => {
                    createOrderMutation.mutate(orderData, {
                      onSuccess: (data) => resolve(data),
                      onError: (error) => reject(error)
                    });
                  });
                }}
                customerData={{
                  name: customer.name,
                  email: customer.email,
                  cpf: customer.cpf
                }}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                isProcessing={isProcessing}
                setIsProcessing={setIsProcessing}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

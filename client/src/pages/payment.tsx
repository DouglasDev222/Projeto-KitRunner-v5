import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Landmark, QrCode, Shield, Lock, Heart, Package } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/brazilian-formatter";
import { apiRequest } from "@/lib/queryClient";
import { orderCreationSchema } from "@shared/schema";
import { calculatePricing, formatPricingBreakdown } from "@/lib/pricing-calculator";
import type { Customer, Event, Address } from "@shared/schema";

type OrderCreation = {
  eventId: number;
  customerId: number;
  addressId: number;
  kitQuantity: number;
  kits: { name: string; cpf: string; shirtSize: string }[];
  paymentMethod: "credit" | "debit" | "pix";
  couponCode?: string;
};

export default function Payment() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const [paymentMethod, setPaymentMethod] = useState<"credit" | "debit" | "pix">("credit");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [kitData, setKitData] = useState<any>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

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
      // Store order confirmation data
      sessionStorage.setItem("orderConfirmation", JSON.stringify(data));
      setLocation(`/events/${id}/confirmation`);
    },
  });

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

  const handleFinishOrder = () => {
    if (!selectedAddress) {
      alert("Endereço não selecionado. Por favor, volte e selecione um endereço.");
      return;
    }
    
    const orderData: OrderCreation = {
      eventId: parseInt(id!),
      customerId: customer.id,
      addressId: selectedAddress.id,
      kitQuantity: kitData.kitQuantity,
      kits: kitData.kits,
      paymentMethod,
    };

    createOrderMutation.mutate(orderData);
  };

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
        
        {/* Payment Methods */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg text-neutral-800">Forma de Pagamento</h3>
          
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod as any}>
            <div className="space-y-3">
              <Label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <RadioGroupItem value="credit" className="mr-3" />
                <CreditCard className="w-5 h-5 text-primary mr-3" />
                <div>
                  <span className="font-medium text-neutral-800">Cartão de Crédito</span>
                  <p className="text-sm text-neutral-600">Visa, Mastercard, Elo</p>
                </div>
              </Label>
              
              <Label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <RadioGroupItem value="debit" className="mr-3" />
                <Landmark className="w-5 h-5 text-primary mr-3" />
                <div>
                  <span className="font-medium text-neutral-800">Cartão de Débito</span>
                  <p className="text-sm text-neutral-600">Débito em conta</p>
                </div>
              </Label>
              
              <Label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <RadioGroupItem value="pix" className="mr-3" />
                <QrCode className="w-5 h-5 text-primary mr-3" />
                <div>
                  <span className="font-medium text-neutral-800">PIX</span>
                  <p className="text-sm text-neutral-600">Pagamento instantâneo</p>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>
        
        <Alert className="mt-6 border-green-200 bg-green-50">
          <Shield className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <span className="font-medium">Pagamento Seguro:</span> Suas informações são protegidas com 
            criptografia SSL. Pagamento processado em ambiente seguro.
          </AlertDescription>
        </Alert>
        
        <Button 
          className="w-full bg-secondary text-white hover:bg-secondary/90 mt-6" 
          size="lg"
          onClick={handleFinishOrder}
          disabled={createOrderMutation.isPending}
        >
          <Lock className="w-4 h-4 mr-2" />
          {createOrderMutation.isPending ? "Processando..." : "Finalizar Pedido"}
        </Button>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Calculator, InfoIcon, Heart } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/brazilian-formatter";
import { calculatePricing, formatPricingBreakdown } from "@/lib/pricing-calculator";
import type { Event } from "@shared/schema";

export default function PartialCost() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const [deliveryAddress, setDeliveryAddress] = useState<any>(null);
  const [calculatedCosts, setCalculatedCosts] = useState<any>(null);

  const { data: event } = useQuery<Event>({
    queryKey: ["/api/events", id],
  });

  useEffect(() => {
    // Get delivery address and calculated costs from session storage
    const address = sessionStorage.getItem('selectedAddress');
    const costs = sessionStorage.getItem('calculatedCosts');
    
    if (address) setDeliveryAddress(JSON.parse(address));
    if (costs) setCalculatedCosts(JSON.parse(costs));
  }, []);

  const deliveryCost = calculatedCosts?.deliveryPrice || 18.50;
  const distance = calculatedCosts?.distance || 12.5;
  
  // Calculate pricing for single kit (base estimation)
  const pricing = event ? calculatePricing({
    event,
    kitQuantity: 1, // Base calculation for 1 kit
    deliveryPrice: deliveryCost
  }) : null;

  const handleContinue = () => {
    setLocation(`/events/${id}/kits`);
  };

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      <Header showBackButton onBack={() => setLocation(`/events/${id}/address`)} />
      <div className="p-4">
        <h2 className="text-2xl font-bold text-neutral-800 mb-2">Cálculo do Delivery</h2>
        <p className="text-neutral-600 mb-6">Valor calculado com base no seu endereço</p>
        
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg text-neutral-800">Resumo do Pedido</h3>
              <Calculator className="w-5 h-5 text-primary" />
            </div>
            
            <div className="space-y-3">
              {pricing?.fixedPrice ? (
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Badge variant="secondary" className="mb-2">Preço Fixo</Badge>
                  <p className="text-sm text-neutral-600 mb-2">
                    Este evento possui preço único que inclui todos os serviços
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-lg text-neutral-800">Valor Total</span>
                    <span className="font-bold text-xl text-primary">{formatCurrency(pricing.fixedPrice)}</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">Retirada do Kit</span>
                    <span className="font-semibold text-neutral-800">Incluído</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">Entrega ({distance.toFixed(1)} km)</span>
                    <span className="font-semibold text-neutral-800">{formatCurrency(deliveryCost)}</span>
                  </div>
                  {event?.donationRequired && (
                    <div className="flex justify-between items-center border-t pt-3">
                      <div className="flex items-center">
                        <Heart className="w-4 h-4 text-red-500 mr-2" />
                        <span className="text-neutral-600">Doação: {event.donationDescription} (por kit)</span>
                      </div>
                      <span className="font-semibold text-neutral-800">{formatCurrency(Number(event.donationAmount || 0))}</span>
                    </div>
                  )}
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-lg text-neutral-800">Total Parcial (1 kit)</span>
                      <span className="font-bold text-xl text-primary">{formatCurrency(pricing?.totalCost || 0)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <InfoIcon className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <span className="font-medium">Informação:</span> Este é o valor para retirada de 1 kit. 
            {!pricing?.fixedPrice && " Kits adicionais custam " + formatCurrency(Number(event?.extraKitPrice || 8)) + " cada."}
            {event?.donationRequired && (
              <span className="block mt-1">
                <span className="font-medium">Doação obrigatória:</span> {event.donationDescription}
              </span>
            )}
          </AlertDescription>
        </Alert>
        
        <Button 
          className="w-full bg-primary text-white hover:bg-primary/90" 
          size="lg"
          onClick={handleContinue}
        >
          Informar Kits para Retirada
        </Button>
      </div>
    </div>
  );
}

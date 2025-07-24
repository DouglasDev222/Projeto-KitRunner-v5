import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, InfoIcon } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useState, useEffect } from "react";
import { formatCurrency, formatDate } from "@/lib/brazilian-formatter";

export default function OrderConfirmation() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const [orderData, setOrderData] = useState<any>(null);

  useEffect(() => {
    const confirmationData = sessionStorage.getItem("orderConfirmation");
    if (confirmationData) {
      setOrderData(JSON.parse(confirmationData));
    } else {
      setLocation("/");
    }
  }, [setLocation]);

  if (!orderData) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <Header />
        <div className="p-4">
          <p className="text-center text-neutral-600">Carregando...</p>
        </div>
      </div>
    );
  }

  const handleNewOrder = () => {
    // Clear session storage
    sessionStorage.removeItem("customerData");
    sessionStorage.removeItem("kitData");
    sessionStorage.removeItem("orderConfirmation");
    setLocation("/");
  };

  const handleTrackOrder = () => {
    // In a real app, this would navigate to order tracking
    alert("Funcionalidade de rastreamento será implementada em breve!");
  };

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      <Header />
      <div className="p-4 text-center">
        <div className="bg-secondary rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        
        <h2 className="text-2xl font-bold text-neutral-800 mb-2">Pedido Confirmado!</h2>
        <p className="text-neutral-600 mb-6">Seu pedido foi processado com sucesso</p>
        
        <Card className="mb-6 text-left">
          <CardContent className="p-4">
            <h3 className="font-semibold text-lg text-neutral-800 mb-3">Detalhes do Pedido</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-600">Número do pedido:</span>
                <span className="font-medium text-neutral-800">#{orderData.order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Evento:</span>
                <span className="font-medium text-neutral-800">{orderData.event.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Data do evento:</span>
                <span className="font-medium text-neutral-800">{formatDate(orderData.event.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Previsão de entrega:</span>
                <span className="font-medium text-neutral-800">
                  Até {formatDate(orderData.deliveryEstimate.deliveryDate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Valor pago:</span>
                <span className="font-medium text-primary">
                  {formatCurrency(parseFloat(orderData.order.totalCost))}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Alert className="mb-6 text-left border-blue-200 bg-blue-50">
          <InfoIcon className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <h3 className="font-semibold mb-2">Próximos Passos</h3>
            <ul className="text-sm space-y-1">
              <li>• Você receberá um e-mail com os detalhes do pedido</li>
              <li>• Acompanhe o status pelo número do pedido</li>
              <li>• Seu kit será retirado no dia do evento</li>
              <li>• Entrega em até 2 dias úteis após o evento</li>
            </ul>
          </AlertDescription>
        </Alert>
        
        <div className="space-y-3">
          <Button 
            className="w-full bg-primary text-white hover:bg-primary/90" 
            size="lg"
            onClick={handleNewOrder}
          >
            Fazer Novo Pedido
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full" 
            size="lg"
            onClick={handleTrackOrder}
          >
            Acompanhar Pedido
          </Button>
        </div>
      </div>
    </div>
  );
}

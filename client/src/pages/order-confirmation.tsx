import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, InfoIcon } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatDate } from "@/lib/brazilian-formatter";

export default function OrderConfirmation() {
  const [, setLocation] = useLocation();
  const { id, orderNumber: urlOrderNumber } = useParams<{ id?: string; orderNumber?: string }>();
  const [orderData, setOrderData] = useState<any>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  // Try to get order number from sessionStorage or URL
  useEffect(() => {
    const confirmationData = sessionStorage.getItem("orderConfirmation");
    if (confirmationData) {
      const data = JSON.parse(confirmationData);
      setOrderData(data);
      setOrderNumber(data.order?.orderNumber);
    }
    
    // Priority: URL order number takes precedence over everything
    if (urlOrderNumber) {
      setOrderNumber(urlOrderNumber);
      return; // Exit early to prevent legacy logic from running
    }
    
    // Legacy route /events/:id/confirmation - only run if we're not in the new route
    if (id && !urlOrderNumber) {
      setOrderNumber(id);
    } else if (!confirmationData && !urlOrderNumber) {
      setLocation("/");
    }
  }, [setLocation, id, urlOrderNumber]);

  // Fetch order data from API as fallback
  const { data: apiOrderData, isLoading } = useQuery({
    queryKey: ["order-confirmation", orderNumber],
    queryFn: async () => {
      if (!orderNumber) return null;
      const response = await fetch(`/api/orders/${orderNumber}`);
      if (!response.ok) {
        throw new Error("Pedido não encontrado");
      }
      return response.json();
    },
    enabled: !!orderNumber && (!orderData || !orderData.order?.orderNumber),
  });

  // Prefer API data (complete) over sessionStorage data (incomplete)
  const displayData = apiOrderData || orderData;



  if (isLoading || !displayData) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <Header />
        <div className="p-4">
          <p className="text-center text-neutral-600">Carregando...</p>
        </div>
      </div>
    );
  }

  const handleViewOrderDetails = () => {
    // Navigate to order details page
    const finalOrderNumber = displayData?.orderNumber || orderNumber;
    if (finalOrderNumber) {
      setLocation(`/orders/${finalOrderNumber}`);
    }
  };

  const handleBackToHome = () => {
    // Clear session storage and go to home
    sessionStorage.removeItem("customerData");
    sessionStorage.removeItem("kitData");
    sessionStorage.removeItem("orderConfirmation");
    setLocation("/");
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
                <span className="font-medium text-neutral-800">#{displayData?.orderNumber || displayData?.order?.orderNumber || orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Evento:</span>
                <span className="font-medium text-neutral-800">{displayData.event?.name || 'Nome do evento'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Data do evento:</span>
                <span className="font-medium text-neutral-800">{displayData.event?.date ? formatDate(displayData.event.date) : 'Data do evento'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Previsão de entrega:</span>
                <span className="font-medium text-neutral-800">
                  Até o dia anterior do evento
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Valor pago:</span>
                <span className="font-medium text-primary">
                  {displayData?.totalCost || displayData?.order?.totalCost ? 
                    formatCurrency(parseFloat(displayData.totalCost || displayData.order?.totalCost)) : 
                    'R$ 0,00'
                  }
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
              <li className="text-[14px]">• Seu kit será retirado no dia de retirada do evento</li>
              <li>• Entrega em até o dia anterior do evento</li>
            </ul>
          </AlertDescription>
        </Alert>
        
        <div className="space-y-3">
          <Button 
            className="w-full bg-primary text-white hover:bg-primary/90" 
            size="lg"
            onClick={handleViewOrderDetails}
          >
            Ver Detalhes do Pedido
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full" 
            size="lg"
            onClick={handleBackToHome}
          >
            Voltar ao Início
          </Button>
        </div>
      </div>
    </div>
  );
}

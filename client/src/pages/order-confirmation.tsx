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

  // Always fetch complete order data from API when we have orderNumber
  const { data: apiOrderData, isLoading } = useQuery({
    queryKey: [`/api/orders/${orderNumber}`],
    enabled: !!orderNumber, // Always fetch if we have orderNumber
  });

  // Always prefer API data when available (complete), fallback to sessionStorage (incomplete)
  const displayData = apiOrderData || orderData;
  
  // Extract order and payment data correctly
  const order = displayData?.id ? displayData : displayData?.order;
  const event = displayData?.event;
  const address = displayData?.address;
  const customer = displayData?.customer;

  // Debug log to see what data we have
  console.log('Order confirmation displayData:', displayData);
  console.log('API data:', apiOrderData);
  console.log('Session data:', orderData);

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
    const finalOrderNumber = order?.orderNumber || orderNumber;
    if (finalOrderNumber) {
      setLocation(`/orders/${finalOrderNumber}`);
    }
  };

  const handleBackToHome = () => {
    // Clear session storage and go to eventos
    sessionStorage.removeItem("customerData");
    sessionStorage.removeItem("kitData");
    sessionStorage.removeItem("orderConfirmation");
    setLocation("/eventos");
  };

  return (
    <>
      {/* Mobile Layout */}
      <div className="lg:hidden max-w-md mx-auto bg-white min-h-screen">
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
                  <span className="font-medium text-neutral-800">#{order?.orderNumber || orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Evento:</span>
                  <span className="font-medium text-neutral-800">{event?.name || 'Nome do evento'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Data do evento:</span>
                  <span className="font-medium text-neutral-800">{event?.date ? formatDate(event.date) : 'Data do evento'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Previsão de entrega:</span>
                  <span className="font-medium text-neutral-800">
                    {event?.date ? `Até ${formatDate(new Date(new Date(event.date).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0])}` : 'Até o dia anterior do evento'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Valor pago:</span>
                  <span className="font-medium text-primary">
                    {order?.totalCost ? formatCurrency(parseFloat(order.totalCost)) : 'R$ 0,00'}
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

      {/* Desktop Layout */}
      <div className="hidden lg:block min-h-screen bg-gray-50">
        {/* Desktop Header */}
        <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="max-w-6xl mx-auto px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img src="/logo.webp" alt="KitRunner" className="h-10 w-auto" />
            </div>
            <nav className="flex items-center space-x-6">
              <Button 
                variant="ghost" 
                onClick={handleBackToHome}
                className="text-neutral-600 hover:text-primary"
              >
                Página Inicial
              </Button>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            {/* Left Column - Success Message */}
            <div className="lg:col-span-2">
              <div className="text-center mb-8">
                <div className="bg-green-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                
                <h1 className="text-4xl font-bold text-neutral-900 mb-4">
                  Pedido Confirmado!
                </h1>
                <p className="text-xl text-neutral-600 mb-8">
                  Seu pedido foi processado com sucesso
                </p>
                
                <div className="bg-white rounded-lg p-6 shadow-lg border border-green-200">
                  <h3 className="text-lg font-semibold text-green-700 mb-2">
                    Número do Pedido
                  </h3>
                  <p className="text-3xl font-bold text-green-600">
                    #{order?.orderNumber || orderNumber}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column - Order Details */}
            <div className="lg:col-span-3">
              <div className="space-y-8">
                {/* Order Information */}
                <Card className="shadow-lg">
                  <CardContent className="p-8">
                    <h3 className="text-2xl font-semibold text-neutral-900 mb-6">
                      Detalhes do Pedido
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between py-3 border-b border-gray-100">
                        <span className="text-neutral-600 font-medium">Evento:</span>
                        <span className="font-semibold text-neutral-900">
                          {event?.name || 'Nome do evento'}
                        </span>
                      </div>
                      <div className="flex justify-between py-3 border-b border-gray-100">
                        <span className="text-neutral-600 font-medium">Data do evento:</span>
                        <span className="font-semibold text-neutral-900">
                          {event?.date ? formatDate(event.date) : 'Data do evento'}
                        </span>
                      </div>
                      <div className="flex justify-between py-3 border-b border-gray-100">
                        <span className="text-neutral-600 font-medium">Previsão de entrega:</span>
                        <span className="font-semibold text-neutral-900">
                          {event?.date ? `Até ${formatDate(new Date(new Date(event.date).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0])}` : 'Até o dia anterior do evento'}
                        </span>
                      </div>
                      <div className="flex justify-between py-3">
                        <span className="text-neutral-600 font-medium">Valor pago:</span>
                        <span className="font-bold text-2xl text-primary">
                          {order?.totalCost ? formatCurrency(parseFloat(order.totalCost)) : 'R$ 0,00'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Next Steps */}
                <Alert className="border-blue-200 bg-blue-50 p-6">
                  <InfoIcon className="h-5 w-5 text-blue-600" />
                  <AlertDescription className="text-blue-900">
                    <h3 className="font-semibold text-lg mb-4">Próximos Passos</h3>
                    <ul className="space-y-2 text-base">
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2">•</span>
                        Você receberá um e-mail com os detalhes do pedido
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2">•</span>
                        Acompanhe o status pelo número do pedido
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2">•</span>
                        Seu kit será retirado no dia de retirada do evento
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2">•</span>
                        Entrega em até o dia anterior do evento
                      </li>
                    </ul>
                  </AlertDescription>
                </Alert>

                {/* Action Buttons */}
                <div className="flex space-x-4">
                  <Button 
                    className="flex-1 bg-primary text-white hover:bg-primary/90 py-6 text-lg font-semibold" 
                    onClick={handleViewOrderDetails}
                  >
                    Ver Detalhes do Pedido
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="flex-1 py-6 text-lg font-semibold hover:bg-gray-50" 
                    onClick={handleBackToHome}
                  >
                    Voltar ao Início
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

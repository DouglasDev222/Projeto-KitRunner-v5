import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, MapPin, Users, Truck, Clock, Shield, Heart, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { formatDateTime, formatCurrency } from "@/lib/brazilian-formatter";
import { useAuth } from "@/lib/auth-context";
import { useState, useEffect } from "react";
import type { Event } from "@shared/schema";

// Helper functions for event status logic
const getEventStatusMessage = (event: Event, isPastEvent: boolean): string | null => {
  if (isPastEvent) {
    return "Este evento já foi finalizado e não aceita mais pedidos.";
  }
  
  switch (event.status) {
    case 'inativo':
      return "Este evento ainda não está disponível para pedidos. Em breve!";
    case 'fechado_pedidos':
      return "Este evento está fechado para novos pedidos.";
    case 'ativo':
      return null; // No message needed
    default:
      return "Este evento não está disponível para pedidos no momento.";
  }
};

const isEventAvailable = (event: Event, isPastEvent: boolean): boolean => {
  if (isPastEvent) return false;
  return event.status === 'ativo';
};

const getButtonText = (event: Event, isPastEvent: boolean): string => {
  if (isPastEvent) return "Evento Finalizado";
  
  switch (event.status) {
    case 'ativo':
      return "Solicitar Retirada do Kit";
    case 'inativo':
      return "Em Breve";
    case 'fechado_pedidos':
      return "Fechado para Pedidos";
    default:
      return "Indisponível";
  }
};

export default function EventDetails() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, user } = useAuth();
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  const { data: event, isLoading } = useQuery<Event>({
    queryKey: ["/api/events", id],
    queryFn: async () => {
      const response = await fetch(`/api/events/${id}`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    staleTime: 0, // Always fetch fresh data to detect changes
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  // Get minimum price for dynamic pricing display
  const { data: minimumPriceData } = useQuery<{ minimumPrice: number; pricingType: string }>({
    queryKey: ["/api/events", id, "minimum-price"],
    queryFn: async () => {
      const response = await fetch(`/api/events/${id}/minimum-price`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    enabled: !!event, // Only run when event is loaded
    staleTime: 0, // Always fetch fresh data to detect changes
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <Header 
          showBackButton 
          title="Detalhes do Evento"
        />
        <div className="p-4">
          <div className="animate-pulse">
            <div className="h-48 bg-gray-200 rounded-lg mb-6" />
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded-lg" />
              <div className="h-32 bg-gray-200 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <Header 
          showBackButton 
          title="Detalhes do Evento"
        />
        <div className="p-4">
          <p className="text-center text-neutral-600">Evento não encontrado</p>
        </div>
      </div>
    );
  }

  // Detect if user has scrolled to bottom
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // Check if user is at or near the bottom (within 50px)
      if (scrollTop + windowHeight >= documentHeight - 50) {
        setHasScrolledToBottom(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleRequestPickup = () => {
    if (!isAuthenticated) {
      // Store the intended destination for after login
      sessionStorage.setItem("loginReturnPath", `/events/${id}/address`);
      setLocation(`/login`);
    } else {
      // User is authenticated, store user data and proceed directly to address
      sessionStorage.setItem("customerData", JSON.stringify(user));
      setLocation(`/events/${id}/address`);
    }
  };

  const handleFixedCTAClick = () => {
    if (!hasScrolledToBottom) {
      // First click: scroll to bottom
      window.scrollTo({ 
        top: document.documentElement.scrollHeight, 
        behavior: 'smooth' 
      });
    } else {
      // Second click: proceed to next step
      handleRequestPickup();
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `${event?.name} - KitRunner`,
      text: `🏃‍♂️ ${event?.name}\n\nFaça sua solicitação de retirada e receba seu kit em casa! Sem filas, sem estresse - o KitRunner cuida de tudo para você. 📦✨`,
      url: window.location.href,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        // You could add a toast notification here
        console.log('Link copiado para a área de transferência!');
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        console.log('Link copiado para a área de transferência!');
      } catch (clipboardError) {
        console.error('Erro ao copiar para área de transferência:', clipboardError);
      }
    }
  };

  // Check if event is in the past
  const isPastEvent = (() => {
    const [year, month, day] = event.date.split('-');
    const eventDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate < today;
  })();

  const statusMessage = getEventStatusMessage(event, isPastEvent);
  const eventAvailable = isEventAvailable(event, isPastEvent);
  const buttonText = getButtonText(event, isPastEvent);

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      <Header 
        showBackButton 
        title="Detalhes do Evento"
        showShareButton 
        onShare={handleShare}
      />
      <div className="p-4 pb-20">
        {/* Hero Section */}
        <div className="relative h-48 bg-gradient-to-br from-primary to-secondary rounded-lg mb-6 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <Users className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold">{event.name}</h2>
          </div>
        </div>

        {/* Event Information */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <h3 className="font-semibold text-lg text-neutral-800 mb-3">Informações do Evento</h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-primary mr-3" />
                <div>
                  <p className="font-medium text-neutral-800">Data</p>
                  <p className="text-neutral-600 text-sm">{(() => {
                    // Parse date in Brazilian timezone to avoid date shifting issue
                    const [year, month, day] = event.date.split('-');
                    const brasilianDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                    return brasilianDate.toLocaleDateString('pt-BR');
                  })()}</p>
                </div>
              </div>
              <div className="flex items-center">
                <MapPin className="w-5 h-5 text-primary mr-3" />
                <div>
                  <p className="font-medium text-neutral-800">Local</p>
                  <p className="text-neutral-600 text-sm">
                    {event.location}<br />
                    {event.city} - {event.state}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Important Information */}
        <Alert className="mb-4 border-blue-200 bg-blue-50">
          <Shield className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <div className="space-y-2">
              <p className="font-medium">Importante:</p>
              <p className="text-sm">
                Para utilizar nosso serviço, você precisa estar devidamente inscrito no evento através da página oficial da organização. 
                Após a inscrição, basta solicitar a retirada conosco com seu número de inscrição e dados necessários.
              </p>
              <p className="text-sm font-medium">
                Este é um serviço independente, sem vínculo com a organização do evento. Nossa missão é facilitar sua experiência!
              </p>
            </div>
          </AlertDescription>
        </Alert>

        {/* KitRunner Service */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <h3 className="font-semibold text-lg text-neutral-800 mb-3">Serviço KitRunner</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <Truck className="w-5 h-5 text-secondary mr-3 mt-1" />
                <div>
                  <p className="font-medium text-neutral-800">Retirada e Entrega</p>
                  <p className="text-neutral-600 text-sm">Retiramos seu kit no evento e entregamos em sua casa</p>
                </div>
              </div>
              <div className="flex items-start">
                <Clock className="w-5 h-5 text-secondary mr-3 mt-1" />
                <div>
                  <p className="font-medium text-neutral-800">Prazo de Entrega</p>
                  <p className="text-neutral-600 text-sm">Até o dia anterior do evento</p>
                </div>
              </div>
              <div className="flex items-start">
                <Shield className="w-5 h-5 text-secondary mr-3 mt-1" />
                <div>
                  <p className="font-medium text-neutral-800">Segurança</p>
                  <p className="text-neutral-600 text-sm">Identificação segura com CPF e dados pessoais</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Information */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg text-neutral-800">Informações de Preço</h3>
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            
            {event.pricingType === 'fixed' ? (
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Badge variant="secondary" className="mb-2">Preço Fixo</Badge>
                <p className="text-2xl font-bold text-primary mb-2">{formatCurrency(Number(event.fixedPrice))}</p>
                <p className="text-sm text-neutral-600">
                  Preço único que inclui todos os serviços de retirada e entrega
                </p>
                {event.extraKitPrice && (
                  <p className="text-xs text-neutral-500 mt-2">
                    Kits adicionais: {formatCurrency(Number(event.extraKitPrice))} cada
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">
                    {event.pricingType === 'cep_zones' ? 'Entrega (varia por zona):' : 'Entrega (varia por distância):'}
                  </span>
                  <span className="font-medium">
                    A partir de {minimumPriceData ? formatCurrency(minimumPriceData.minimumPrice) : 'R$ 10,00'}
                  </span>
                </div>
                {event.extraKitPrice && (
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600">Kits adicionais:</span>
                    <span className="font-medium">{formatCurrency(Number(event.extraKitPrice))} cada</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Donation Information */}
        {event.donationRequired && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <Heart className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <span className="font-medium">Doação obrigatória:</span> {event.donationDescription}
              {event.donationAmount && (
                <span className="block mt-1">
                  Valor: {formatCurrency(Number(event.donationAmount))}
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Status Warning */}
        {statusMessage && (
          <Alert className="mb-4 border-orange-200 bg-orange-50">
            <Shield className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <span className="font-medium">Status do Evento:</span> {statusMessage}
            </AlertDescription>
          </Alert>
        )}

        <Button 
          className="w-full bg-primary text-white hover:bg-primary/90 disabled:bg-gray-400 disabled:cursor-not-allowed" 
          size="lg"
          onClick={handleRequestPickup}
          disabled={!eventAvailable}
        >
          {buttonText}
        </Button>
      </div>

      {/* Fixed CTA Button */}
      {eventAvailable && (
        <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 p-4 z-50 shadow-lg">
          <Button 
            className="w-full bg-secondary text-white hover:bg-secondary/90 disabled:bg-gray-400 disabled:cursor-not-allowed" 
            size="lg"
            onClick={handleFixedCTAClick}
            disabled={!eventAvailable}
          >
            {!hasScrolledToBottom ? "Ver Mais Detalhes ↓" : buttonText}
          </Button>
        </div>
      )}

      <div className={eventAvailable ? "pb-20" : ""}>
        <Footer />
      </div>
    </div>
  );
}

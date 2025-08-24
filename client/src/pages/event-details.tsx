import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, MapPin, Users, Truck, Clock, Shield, Heart, DollarSign, Zap, Home, User, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { formatDateTime, formatCurrency } from "@/lib/brazilian-formatter";
import { useAuth } from "@/lib/auth-context";
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
      <>
        {/* Mobile Loading */}
        <div className="lg:hidden max-w-md mx-auto bg-white min-h-screen">
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

        {/* Desktop Loading */}
        <div className="hidden lg:block min-h-screen bg-gray-50">
          {/* Desktop Header Skeleton */}
          <nav className="bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center">
                  <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="flex items-center space-x-8">
                  <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                  <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </nav>

          {/* Main Content Skeleton */}
          <main className="max-w-7xl mx-auto px-8 py-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              {/* Left Column - Event Info Skeleton */}
              <div className="lg:col-span-2 space-y-8">
                {/* Hero Card Skeleton */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-pulse">
                  <div className="h-64 bg-gray-200" />
                  <div className="p-8">
                    <div className="h-8 bg-gray-200 rounded mb-4" />
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-6" />
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-1/2" />
                      <div className="h-4 bg-gray-200 rounded w-2/3" />
                      <div className="h-4 bg-gray-200 rounded w-1/3" />
                    </div>
                  </div>
                </div>

                {/* Additional Info Cards Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow-md p-6 animate-pulse">
                    <div className="h-6 bg-gray-200 rounded mb-4" />
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-full" />
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                    </div>
                  </div>
                  <div className="bg-white rounded-xl shadow-md p-6 animate-pulse">
                    <div className="h-6 bg-gray-200 rounded mb-4" />
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-full" />
                      <div className="h-4 bg-gray-200 rounded w-2/3" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Action Card Skeleton */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-lg p-8 animate-pulse sticky top-6">
                  <div className="h-6 bg-gray-200 rounded mb-6" />
                  <div className="space-y-4 mb-8">
                    <div className="h-4 bg-gray-200 rounded w-full" />
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                  </div>
                  <div className="h-14 bg-gray-200 rounded-lg" />
                </div>
              </div>
            </div>
          </main>
        </div>
      </>
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

  const handleRequestPickup = () => {
    if (!isAuthenticated) {
      // Set return path for event flow
      sessionStorage.setItem("loginReturnPath", `/events/${id}/address`);
      setLocation("/login");
    } else {
      // User is authenticated, store user data and proceed directly to address
      sessionStorage.setItem("customerData", JSON.stringify(user));
      setLocation(`/events/${id}/address`);
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
    <>
      {/* Mobile Version */}
      <div className="lg:hidden max-w-md mx-auto bg-white min-h-screen">
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
                <Zap className="w-8 h-8" />
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
        <Footer />
      </div>

      {/* Desktop Version */}
      <div className="hidden lg:block min-h-screen bg-gray-50">
        {/* Desktop Header */}
        <nav className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex items-center">
                <img src="/logo.webp" alt="KitRunner" className="h-10 w-auto" />
              </div>

              {/* Navigation Links */}
              <div className="flex items-center space-x-8">
                <Button
                  variant="ghost"
                  onClick={() => setLocation("/")}
                  className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-lg transition-colors"
                >
                  <Home className="w-4 h-4" />
                  <span>Início</span>
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setLocation("/my-orders")}
                  className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-lg transition-colors"
                >
                  <Package className="w-4 h-4" />
                  <span>Pedidos</span>
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setLocation("/eventos")}
                  className="flex items-center space-x-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-lg font-medium"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Eventos</span>
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setLocation("/profile")}
                  className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-lg transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span>Perfil</span>
                </Button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto pt-16 pb-8 px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Event Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 sticky top-24">
                {/* Hero Section */}
                <div className="relative h-40 bg-gradient-to-br from-primary to-secondary rounded-lg mb-6 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Zap className="w-6 h-6" />
                    </div>
                    <h2 className="text-lg font-bold">{event.name}</h2>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-gray-900">Data do Evento</p>
                      <p className="text-sm text-gray-600">{(() => {
                        const [year, month, day] = event.date.split('-');
                        const brasilianDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                        return brasilianDate.toLocaleDateString('pt-BR');
                      })()}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <MapPin className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-gray-900">Local</p>
                      <p className="text-sm text-gray-600">{event.location}</p>
                      <p className="text-sm text-gray-600">{event.city} - {event.state}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-gray-900">Preço</p>
                      <p className="text-sm text-gray-600">
                        {event.pricingType === 'fixed' 
                          ? formatCurrency(Number(event.fixedPrice))
                          : `A partir de ${minimumPriceData ? formatCurrency(minimumPriceData.minimumPrice) : 'R$ 10,00'}`
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <Button 
                    className="w-full bg-purple-600 text-white hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed" 
                    size="lg"
                    onClick={handleRequestPickup}
                    disabled={!eventAvailable}
                  >
                    {buttonText}
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Column - Event Details */}
            <div className="lg:col-span-2">
              <div className="space-y-6">
                {/* KitRunner Service */}
                <Card className="shadow-lg">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Serviço KitRunner</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="flex items-start space-x-3">
                        <Truck className="w-6 h-6 text-purple-600 mt-1" />
                        <div>
                          <p className="font-medium text-gray-900">Retirada e Entrega</p>
                          <p className="text-gray-600 text-sm">Retiramos seu kit no evento e entregamos em sua casa</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <Clock className="w-6 h-6 text-purple-600 mt-1" />
                        <div>
                          <p className="font-medium text-gray-900">Prazo de Entrega</p>
                          <p className="text-gray-600 text-sm">Até o dia anterior do evento</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <Shield className="w-6 h-6 text-purple-600 mt-1" />
                        <div>
                          <p className="font-medium text-gray-900">Segurança</p>
                          <p className="text-gray-600 text-sm">Identificação segura com CPF e dados pessoais</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Important Information */}
                <Alert className="border-blue-200 bg-blue-50">
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

                {/* Donation Information */}
                {event.donationRequired && (
                  <Alert className="border-red-200 bg-red-50">
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

                {/* Pricing Information */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center mb-3">
                    <DollarSign className="w-5 h-5 text-purple-600 mr-2" />
                    <h3 className="text-lg font-medium text-gray-900">Informações de Preço</h3>
                  </div>

                  {event.pricingType === 'fixed' ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Preço fixo:</span>
                        <span className="font-bold text-purple-600">{formatCurrency(Number(event.fixedPrice))}</span>
                      </div>
                      {event.extraKitPrice && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Kits adicionais:</span>
                          <span className="text-sm font-medium text-purple-600">{formatCurrency(Number(event.extraKitPrice))} cada</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                          {event.pricingType === 'cep_zones' ? 'Entrega (varia por zona):' : 'Entrega (varia por distância):'}
                        </span>
                        <span className="font-bold text-purple-600">
                          A partir de {minimumPriceData ? formatCurrency(minimumPriceData.minimumPrice) : 'R$ 10,00'}
                        </span>
                      </div>
                      {event.extraKitPrice && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Kits adicionais:</span>
                          <span className="text-sm font-medium text-purple-600">{formatCurrency(Number(event.extraKitPrice))} cada</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Status Warning */}
                {statusMessage && (
                  <Alert className="border-orange-200 bg-orange-50">
                    <Shield className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      <span className="font-medium">Status do Evento:</span> {statusMessage}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
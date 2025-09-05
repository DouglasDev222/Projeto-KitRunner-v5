import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Zap, ChevronDown, Calendar, MapPin, ChevronRight, ChevronLeft } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { formatDate } from "@/lib/brazilian-formatter";
import type { Event } from "@shared/schema";
import { useState, useRef } from "react";

const Landing = () => {
  const [, setLocation] = useLocation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Fetch upcoming events for the landing page
  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    staleTime: 0, // Always fetch fresh data to detect changes
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  // Filter and sort events to show upcoming events first
  const upcomingEvents = events ? events
    .filter(event => {
      // Parse date in Brazilian timezone to avoid timezone issues
      const [year, month, day] = event.date.split('-');
      const eventDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Set to start of today for proper comparison
      return eventDate >= now; // Only upcoming events (including today)
    })
    .sort((a, b) => {
      // Parse dates in Brazilian timezone to avoid timezone issues
      const [yearA, monthA, dayA] = a.date.split('-');
      const [yearB, monthB, dayB] = b.date.split('-');
      const dateA = new Date(parseInt(yearA), parseInt(monthA) - 1, parseInt(dayA));
      const dateB = new Date(parseInt(yearB), parseInt(monthB) - 1, parseInt(dayB));
      return dateA.getTime() - dateB.getTime(); // Earliest first
    })
    .slice(0, 8) // Limit to 8 events for better grid display
    : [];

  const handleSolicitarRetirada = () => {
    setLocation("/eventos");
  };

  const handleEventClick = (eventId: number) => {
    setLocation(`/events/${eventId}`);
  };

  // Navigation functions for desktop
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      const scrollAmount = 320; // Card width + gap
      scrollContainerRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      const scrollAmount = 320; // Card width + gap
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return <div className="min-h-screen bg-background">
      {/* Header simples */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.webp" alt="KitRunner Logo" className="h-8 w-auto" />
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => setLocation("/login")}
            >
              Entrar
            </Button>
            <Button 
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              onClick={() => setLocation("/register")}
            >
              Cadastrar
            </Button>
          </div>
        </div>
      </header>

      {/* Hero section limpa */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground">
              Seu Kit de Corrida,{" "}
              <span className="text-primary">Entregue com Agilidade</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              A solução que poupa seu tempo e te deixa focado no que importa: correr!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8 py-6" onClick={handleSolicitarRetirada}>
              <Zap className="h-5 w-5" />
              Solicitar Retirada
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6">
              Como Funciona
            </Button>
          </div>
        </div>

        {/* Próximos Eventos Section */}
        {upcomingEvents.length > 0 && (
          <div className="max-w-6xl mx-auto mt-20 space-y-8 events-section">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-foreground mb-4">Próximos Eventos</h2>
              <p className="text-muted-foreground mb-6">Selecione o evento que deseja solicitar a retirada do kit</p>
            </div>

            {/* Desktop Grid: 2 rows x 2 columns with navigation buttons */}
            <div className="hidden md:block relative">
              <div className="relative overflow-hidden">
                {/* Navigation Buttons */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-background/80 backdrop-blur border shadow-lg hover:bg-background"
                  onClick={scrollLeft}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-background/80 backdrop-blur border shadow-lg hover:bg-background"
                  onClick={scrollRight}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>

                {/* Cards Container */}
                <div 
                  ref={scrollContainerRef}
                  className="overflow-x-auto scroll-smooth scrollbar-hide"
                >
                  <div className="grid grid-rows-2 grid-flow-col gap-4" style={{ gridAutoColumns: '320px' }}>
                    {upcomingEvents.map((event) => (
                      <Card
                        key={event.id}
                        className="w-80 cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
                        onClick={() => handleEventClick(event.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg text-foreground mb-2 line-clamp-2">{event.name}</h3>
                              <div className="space-y-1">
                                <p className="text-sm text-muted-foreground flex items-center">
                                  <Calendar className="w-4 h-4 mr-2" />
                                  {formatDate(event.date)}
                                </p>
                                <p className="text-sm text-muted-foreground flex items-center">
                                  <MapPin className="w-4 h-4 mr-2" />
                                  {event.location}, {event.city} - {event.state}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 mt-3">
                                <Badge
                                  variant={event.available ? "default" : "secondary"}
                                  className={event.available ? "bg-primary hover:bg-primary/80" : ""}
                                >
                                  {event.available ? "Disponível" : "Em Breve"}
                                </Badge>
                                {event.isOfficial && (
                                  <Badge
                                    variant="outline"
                                    className="bg-gradient-to-r from-yellow-50 to-amber-50 border-amber-200 text-amber-700 font-medium"
                                    data-testid="badge-official-partnership"
                                  >
                                    ⭐ Oficial
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground ml-2" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile: 2 rows with horizontal scroll */}
            <div className="md:hidden">
              <div className="overflow-x-auto pb-4 scroll-smooth scrollbar-hide">
                <div className="grid grid-rows-2 grid-flow-col gap-4" style={{ gridAutoColumns: '280px' }}>
                  {upcomingEvents.map((event) => (
                    <Card
                      key={event.id}
                      className="w-70 cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => handleEventClick(event.id)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <h3 className="font-semibold text-lg text-foreground line-clamp-2">{event.name}</h3>
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground flex items-center">
                              <Calendar className="w-4 h-4 mr-2" />
                              {formatDate(event.date)}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center">
                              <MapPin className="w-4 h-4 mr-2" />
                              {event.location}, {event.city} - {event.state}
                            </p>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={event.available ? "default" : "secondary"}
                                className={event.available ? "bg-primary hover:bg-primary/80" : ""}
                              >
                                {event.available ? "Disponível" : "Em Breve"}
                              </Badge>
                              {event.isOfficial && (
                                <Badge
                                  variant="outline"
                                  className="bg-gradient-to-r from-yellow-50 to-amber-50 border-amber-200 text-amber-700 font-medium text-xs"
                                  data-testid="badge-official-partnership-mobile"
                                >
                                  ⭐ Oficial
                                </Badge>
                              )}
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            {/* View All Events Button */}
            <div className="text-center">
              <Button variant="outline" onClick={() => setLocation("/eventos")} className="mt-4">
                Ver Todos os Eventos
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Seção como funciona */}
        <div className="max-w-4xl mx-auto mt-24 space-y-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground mb-4">Como Funciona</h2>
            <p className="text-muted-foreground">Simples e rápido</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                1
              </div>
              <h3 className="text-lg font-semibold text-foreground">Faça seu Pedido</h3>
              <p className="text-muted-foreground">Selecione o evento que gostaria da retirada kit através do nosso sistema</p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                2
              </div>
              <h3 className="text-lg font-semibold text-foreground">Confirmamos</h3>
              <p className="text-muted-foreground">Nossa equipe fará a retirada do seu kit com cuidado e segurança</p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                3
              </div>
              <h3 className="text-lg font-semibold text-foreground">Receba e Corra</h3>
              <p className="text-muted-foreground">Receba em sua casa e foque na sua corrida</p>
            </div>
          </div>
        </div>

        {/* Benefícios simples */}
        <div className="max-w-4xl mx-auto mt-24 space-y-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground mb-4">Por que usar nosso serviço?</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center flex-shrink-0">
                  ✓
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Economia de Tempo</h3>
                  <p className="text-muted-foreground">Não perca tempo indo até o local de retirada</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center flex-shrink-0">
                  ✓
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Entrega Rápida</h3>
                  <p className="text-muted-foreground">Receba no conforto de casa. Entrega garantida 1 dia antes do evento</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center flex-shrink-0">
                  ✓
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Cuidado e Segurança</h3>
                  <p className="text-muted-foreground">Seu kit é entregue com cuidado e total segurança</p>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-8 text-center">
              <div className="text-4xl mb-4">📦</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Pronto para começar?</h3>
              <p className="text-muted-foreground mb-6">Faça seu primeiro pedido agora</p>
              <Button size="lg" className="w-full" onClick={handleSolicitarRetirada}>
                <Zap className="h-5 w-5" />
                Solicitar Retirada Agora
              </Button>
            </div>
          </div>
        </div>
        {/* Seção de FAQ */}
        <div className="max-w-4xl mx-auto mt-24 space-y-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground mb-4">FAQ (Perguntas Frequentes)</h2>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>Como faço para pedir meu kit?</AccordionTrigger>
              <AccordionContent>
                É simples! Basta acessar nosso site, escolher o evento, informar o local e horário de entrega, e pronto! Nós cuidamos do resto.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger>Qual a área de cobertura do serviço?</AccordionTrigger>
              <AccordionContent>
                Atendemos toda a região metropolitana de João Pessoa! Consulte a disponibilidade para o seu endereço diretamente no nosso site.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger>Qual é o custo da entrega?</AccordionTrigger>
              <AccordionContent>
                O custo varia de acordo com a localização e o evento. Você pode visualizar o valor exato no momento da solicitação, sem surpresas.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger>E se meu evento não estiver listado?</AccordionTrigger>
              <AccordionContent>
                Nós estamos sempre adicionando novos eventos! Entre em contato pelo nosso canal de suporte, e verificaremos a possibilidade de incluir o evento no nosso serviço.
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="text-center mt-8">
            <p className="text-muted-foreground mb-4">Ainda tem dúvidas? Entre em contato conosco pelo WhatsApp ou e-mail, e nossa equipe estará pronta para ajudar!</p>
            <a href="https://wa.me/5583981302961" target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="text-lg px-8 py-6">
                WhatsApp
              </Button>
            </a>
          </div>
        </div>

      </main>

      {/* Footer simples */}
      <footer className="border-t border-border mt-24">
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 w-full">
              <div className="flex items-center gap-2">
                <img src="/logo.webp" alt="KitRunner Logo" className="h-5 w-auto" />
              </div>
              <div className="flex flex-col md:flex-row items-center gap-2">
                <p className="text-sm text-muted-foreground">© 2025 KitRunner. Todos os direitos reservados.</p>
                <p className="text-sm text-muted-foreground">CNPJ: 55.108.434/0001-00</p>
              </div>
              <a href="https://www.instagram.com/kitrunner_/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-instagram"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.5" y1="6.5" y2="6.5"/></svg>
              </a>
          </div>
        </div>
      </footer>
    </div>;
};

export default Landing;
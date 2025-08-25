import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  MapPin,
  ChevronRight,
  Search,
  Package,
  Clock,
  User,
  Zap,
  X,
  CheckCircle,
  Hourglass,
  Ban,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { formatDate } from "@/lib/brazilian-formatter";
import { useState, useMemo, useEffect } from "react";
import type { Event } from "@shared/schema";
import { useAuth } from "@/lib/auth-context";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

type FilterType = "all" | "week" | "month";

// Helper functions for event status logic
const getEventStatusLabel = (event: Event, isPastEvent: boolean): JSX.Element => {
  if (isPastEvent) {
    return (
      <span className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Finalizado
      </span>
    );
  }

  switch (event.status) {
    case 'ativo':
      return (
        <span className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Disponível
        </span>
      );
    case 'inativo':
      return (
        <span className="flex items-center gap-1">
          <Hourglass className="h-3 w-3" />
          Em breve
        </span>
      );
    case 'fechado_pedidos':
      return (
        <span className="flex items-center gap-1">
          <Ban className="h-3 w-3" />
          Fechado para pedidos
        </span>
      );
    default:
      return (
        <span className="flex items-center gap-1">
          <Hourglass className="h-3 w-3" />
          Em breve
        </span>
      );
  }
};

const getEventStatusVariant = (event: Event, isPastEvent: boolean) => {
  if (isPastEvent) {
    return "secondary";
  }

  switch (event.status) {
    case 'ativo':
      return "default";
    case 'inativo':
    case 'fechado_pedidos':
    default:
      return "secondary";
  }
};

const getEventStatusColor = (event: Event, isPastEvent: boolean): string => {
  if (isPastEvent) {
    return "bg-gray-200 text-gray-600 border-0";
  }

  switch (event.status) {
    case 'ativo':
      return "bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0";
    case 'inativo':
      return "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0";
    case 'fechado_pedidos':
      return "bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0";
    default:
      return "bg-gray-200 text-gray-600 border-0";
  }
};

export default function Events() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const { isAuthenticated } = useAuth();

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Responsive page size: 10 for mobile, 12 for desktop
  const pageSize = isMobile ? 10 : 12;

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType]);

  // Filter and sort events: search + date filter + upcoming events first
  const filteredAndSortedEvents = useMemo(() => {
    if (!events) return [];

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Get date ranges for filters
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(now.getDate() + 7);

    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(now.getMonth() + 1);

    // Filter by search term
    let filtered = events.filter(
      (event) =>
        event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.city.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    // Apply date filters
    if (filterType !== "all") {
      filtered = filtered.filter((event) => {
        const [year, month, day] = event.date.split("-");
        const eventDate = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
        );

        if (filterType === "week") {
          return eventDate >= now && eventDate <= oneWeekFromNow;
        } else if (filterType === "month") {
          return eventDate >= now && eventDate <= oneMonthFromNow;
        }
        return true;
      });
    }

    // Sort by date: upcoming events first
    return filtered.sort((a, b) => {
      const [yearA, monthA, dayA] = a.date.split("-");
      const [yearB, monthB, dayB] = b.date.split("-");
      const dateA = new Date(
        parseInt(yearA),
        parseInt(monthA) - 1,
        parseInt(dayA),
      );
      const dateB = new Date(
        parseInt(yearB),
        parseInt(monthB) - 1,
        parseInt(dayB),
      );

      const isAfuture = dateA >= now;
      const isBfuture = dateB >= now;

      if (isAfuture && !isBfuture) return -1;
      if (!isAfuture && isBfuture) return 1;

      if (isAfuture && isBfuture) {
        return dateA.getTime() - dateB.getTime();
      } else {
        return dateB.getTime() - dateA.getTime();
      }
    });
  }, [events, searchTerm, filterType]);

  // Pagination logic
  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAndSortedEvents.slice(startIndex, endIndex);
  }, [filteredAndSortedEvents, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAndSortedEvents.length / pageSize);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto bg-gray-50 min-h-screen md:hidden">
        <div className="bg-gradient-to-br from-purple-600 to-purple-700 h-32 animate-pulse"></div>
        <div className="p-4 space-y-3">
          <div className="h-10 bg-gray-200 rounded-xl animate-pulse"></div>
          <div className="h-20 bg-gray-200 rounded-xl animate-pulse"></div>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 bg-gray-200 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const handleEventClick = (eventId: number) => {
    setLocation(`/events/${eventId}`);
  };

  const availableEventsCount = filteredAndSortedEvents.filter(
    (event) => event.available,
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Layout (mantém o formato app atual) */}
      <div className="md:hidden max-w-md mx-auto page-with-footer">
        {/* Compact Mobile Header */}
        <div className="bg-gradient-to-br from-purple-600 to-purple-700 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-black/5">
            <div className="absolute top-4 right-4 w-12 h-12 bg-white/10 rounded-full blur-lg"></div>
            <div className="absolute bottom-6 left-6 w-8 h-8 bg-white/10 rounded-full blur-lg"></div>
          </div>

          <div className="relative px-4 pt-8 pb-6">
            {/* Brand */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-xl mb-3">
                <Package className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-1">KitRunner</h1>
              <p className="text-purple-100 text-sm">
                Retirada e Entrega de Kits de Corrida
              </p>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10" />
              <Input
                placeholder="Buscar eventos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10 py-3 w-full bg-white/95 text-gray-900 border-0 rounded-xl shadow-sm focus:ring-2 focus:ring-white/30 placeholder:text-gray-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
                  aria-label="Limpar busca"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats Mobile */}
        <div className="px-4 -mt-3 relative z-10 mb-4">
          <Card className="bg-white border-0 shadow-lg rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-3 rounded-xl">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Receba seu kit em casa
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Confira os eventos disponíveis
                    </p>
                  </div>
                </div>
                <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 px-3 py-1 rounded-full">
                  {availableEventsCount}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <main className="px-4 pb-8">
          {/* Mobile Filter Tabs */}
          <div className="mb-6">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <Button
                variant={filterType === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("all")}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  filterType === "all"
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md"
                    : "border-gray-200 hover:border-purple-300 hover:bg-purple-50"
                }`}
              >
                Todos
              </Button>
              <Button
                variant={filterType === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("week")}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  filterType === "week"
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md"
                    : "border-gray-200 hover:border-purple-300 hover:bg-purple-50"
                }`}
              >
                <Clock className="h-3 w-3 mr-1" />
                Semana
              </Button>
              <Button
                variant={filterType === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("month")}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  filterType === "month"
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md"
                    : "border-gray-200 hover:border-purple-300 hover:bg-purple-50"
                }`}
              >
                <Calendar className="h-3 w-3 mr-1" />
                Mês
              </Button>
            </div>
          </div>

          {/* Results Info Mobile */}
          {(searchTerm || filterType !== "all") && (
            <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-sm font-medium text-blue-900">
                {filteredAndSortedEvents.length} evento
                {filteredAndSortedEvents.length !== 1 ? "s" : ""} encontrado
                {filteredAndSortedEvents.length !== 1 ? "s" : ""}
              </p>
              {searchTerm && (
                <p className="text-xs text-blue-700 mt-1">
                  Busca por "{searchTerm}"
                </p>
              )}
            </div>
          )}

          {/* Empty States Mobile */}
          {filteredAndSortedEvents.length === 0 && searchTerm && (
            <div className="text-center py-16">
              <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <Search className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhum evento encontrado
              </h3>
              <p className="text-gray-600 mb-4 text-sm">
                Não encontramos eventos com "{searchTerm}"
              </p>
              <Button
                variant="outline"
                onClick={() => setSearchTerm("")}
                className="rounded-full px-6 py-2 text-sm"
              >
                Limpar busca
              </Button>
            </div>
          )}

          {filteredAndSortedEvents.length === 0 &&
            !searchTerm &&
            filterType !== "all" && (
              <div className="text-center py-16">
                <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <Calendar className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhum evento{" "}
                  {filterType === "week" ? "esta semana" : "este mês"}
                </h3>
                <p className="text-gray-600 mb-4 text-sm">
                  Experimente ver todos os eventos
                </p>
                <Button
                  variant="outline"
                  onClick={() => setFilterType("all")}
                  className="rounded-full px-6 py-2 text-sm"
                >
                  Ver todos
                </Button>
              </div>
            )}

          {/* Mobile Events List */}
          <div className="space-y-3">
            {paginatedEvents.map((event) => {
              const [year, month, day] = event.date.split("-");
              const eventDate = new Date(
                parseInt(year),
                parseInt(month) - 1,
                parseInt(day),
              );
              const now = new Date();
              now.setHours(0, 0, 0, 0);
              const isPastEvent = eventDate < now;

              return (
                <Card
                  key={event.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-0 shadow-sm rounded-xl overflow-hidden ${
                    isPastEvent ? "opacity-70" : ""
                  } ${event.available ? "bg-white" : "bg-gray-50"}`}
                  onClick={() => handleEventClick(event.id)}
                >
                  <CardContent className="p-4 relative">
                    {/* Status indicator */}
                    <div
                      className={`absolute top-0 left-0 w-1 h-full ${
                        isPastEvent
                          ? "bg-gradient-to-b from-gray-400 to-gray-500"
                          : event.status === 'ativo'
                          ? "bg-gradient-to-b from-purple-400 to-purple-500"
                          : event.status === 'inativo'
                          ? "bg-gradient-to-b from-blue-400 to-blue-500"
                          : event.status === 'fechado_pedidos'
                          ? "bg-gradient-to-b from-orange-400 to-orange-500"
                          : "bg-gradient-to-b from-gray-400 to-gray-500"
                      }`}
                    />

                    <div className="pl-3">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base text-gray-900 truncate mb-1">
                            {event.name}
                          </h3>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 ml-2 flex-shrink-0" />
                      </div>

                      <div className="space-y-2 mb-3">
                        <div className="flex items-center text-gray-600 text-sm">
                          <Calendar className="w-4 h-4 mr-2 text-purple-500" />
                          <span>{formatDate(event.date)}</span>
                        </div>
                        <div className="flex items-center text-gray-600 text-sm">
                          <MapPin className="w-4 h-4 mr-2 text-purple-500" />
                          <span className="truncate">
                            {event.location}, {event.city} - {event.state}
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant={getEventStatusVariant(event, isPastEvent)}
                        className={`text-xs rounded-full px-3 py-1 ${getEventStatusColor(event, isPastEvent)}`}
                      >
                        {getEventStatusLabel(event, isPastEvent)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Mobile Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 space-y-4">
              <div className="text-xs text-muted-foreground text-center">
                Página {currentPage} de {totalPages} ({filteredAndSortedEvents.length} eventos)
              </div>
              
              <div className="flex justify-center">
                <Pagination>
                  <PaginationContent className="flex-wrap gap-1">
                    <PaginationItem>
                      <PaginationPrevious 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage > 1) handlePageChange(currentPage - 1);
                        }}
                        className={cn(
                          currentPage === 1 ? "pointer-events-none opacity-50" : "",
                          "text-xs px-2 py-1"
                        )}
                      />
                    </PaginationItem>
                    
                    {/* Smart page display for mobile */}
                    {(() => {
                      const maxPagesShown = 3;
                      let startPage = Math.max(1, currentPage - Math.floor(maxPagesShown / 2));
                      let endPage = Math.min(totalPages, startPage + maxPagesShown - 1);
                      
                      if (endPage - startPage + 1 < maxPagesShown) {
                        startPage = Math.max(1, endPage - maxPagesShown + 1);
                      }
                      
                      const pages = [];
                      
                      if (startPage > 1) {
                        pages.push(
                          <PaginationItem key={1}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                handlePageChange(1);
                              }}
                              className="w-8 h-8 text-xs"
                            >
                              1
                            </PaginationLink>
                          </PaginationItem>
                        );
                        
                        if (startPage > 2) {
                          pages.push(
                            <PaginationItem key="ellipsis-start">
                              <PaginationEllipsis className="w-8 h-8" />
                            </PaginationItem>
                          );
                        }
                      }
                      
                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <PaginationItem key={i}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                handlePageChange(i);
                              }}
                              isActive={currentPage === i}
                              className="w-8 h-8 text-xs"
                            >
                              {i}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      }
                      
                      if (endPage < totalPages) {
                        if (endPage < totalPages - 1) {
                          pages.push(
                            <PaginationItem key="ellipsis-end">
                              <PaginationEllipsis className="w-8 h-8" />
                            </PaginationItem>
                          );
                        }
                        
                        pages.push(
                          <PaginationItem key={totalPages}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                handlePageChange(totalPages);
                              }}
                              className="w-8 h-8 text-xs"
                            >
                              {totalPages}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      }
                      
                      return pages;
                    })()}
                    
                    <PaginationItem>
                      <PaginationNext 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage < totalPages) handlePageChange(currentPage + 1);
                        }}
                        className={cn(
                          currentPage === totalPages ? "pointer-events-none opacity-50" : "",
                          "text-xs px-2 py-1"
                        )}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>

      {/* Desktop Layout (novo layout expandido) */}
      <div className="hidden md:block min-h-screen">
        {/* Desktop Navigation Menu */}
        <nav className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex items-center">
                <a href="/eventos">
                  <img src="/logo.webp" alt="KitRunner" className="h-10 w-auto" />
                </a>
              </div>

              {/* Navigation Links */}
              <div className="flex items-center space-x-8">
                <Button
                  variant="ghost"
                  className="flex items-center space-x-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-lg font-medium"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Eventos</span>
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setLocation("/my-orders")}
                  className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-lg transition-colors"
                >
                  <Package className="w-4 h-4" />
                  <span>Pedidos</span>
                </Button>

                {isAuthenticated ? (
                  <Button
                    variant="ghost"
                    onClick={() => setLocation("/profile")}
                    className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-lg transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span>Perfil</span>
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={() => setLocation("/login")}
                    className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-lg transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span>Entrar</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Desktop Header - Mais Expansivo */}
        <div className="bg-gradient-to-br from-purple-600 to-purple-700 relative overflow-hidden">
          {/* Background decoration - mais elementos */}
          <div className="absolute inset-0 bg-black/5">
            <div className="absolute top-8 right-16 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
            <div className="absolute bottom-12 left-16 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
            <div className="absolute top-1/2 left-1/3 w-12 h-12 bg-white/5 rounded-full blur-lg"></div>
            <div className="absolute bottom-1/4 right-1/3 w-8 h-8 bg-white/5 rounded-full blur-md"></div>
          </div>

          <div className="relative max-w-7xl mx-auto px-8 pt-8 pb-12">
            {/* Search Bar Desktop - Simplificada */}
            <div className="max-w-xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
              <Input
                placeholder="Buscar eventos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-6 py-3 w-full bg-white/95 text-gray-900 border-0 rounded-xl shadow-md text-base focus:ring-2 focus:ring-white/30 placeholder:text-gray-500 transition-all duration-200"
              />
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-8 -mt-6 relative z-10">
          {/* Quick Stats Desktop - Layout Harmonioso */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
            <Card className="bg-white border border-gray-100 shadow-sm rounded-lg hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <Zap className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">
                      Entrega em Casa
                    </h3>
                    <p className="text-xs text-gray-500">
                      Rápida e segura
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-100 shadow-sm rounded-lg hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <Calendar className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">
                      Eventos Disponíveis
                    </h3>
                    <Badge className="bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-md text-xs">
                      {availableEventsCount} eventos
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-100 shadow-sm rounded-lg hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">
                      Processamento
                    </h3>
                    <p className="text-xs text-gray-500">
                      Até 24 horas
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Desktop Filter Bar */}
          <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Eventos Disponíveis</h2>
                <p className="text-sm text-gray-600">Selecione um evento para fazer seu pedido</p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant={filterType === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("all")}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    filterType === "all"
                      ? "bg-purple-600 text-white shadow-sm hover:bg-purple-700"
                      : "border border-gray-200 hover:border-purple-300 hover:bg-purple-50"
                  }`}
                >
                  Todos
                </Button>
                <Button
                  variant={filterType === "week" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("week")}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    filterType === "week"
                      ? "bg-purple-600 text-white shadow-sm hover:bg-purple-700"
                      : "border border-gray-200 hover:border-purple-300 hover:bg-purple-50"
                  }`}
                >
                  <Clock className="h-3 w-3 mr-1" />
                  Semana
                </Button>
                <Button
                  variant={filterType === "month" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("month")}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    filterType === "month"
                      ? "bg-purple-600 text-white shadow-sm hover:bg-purple-700"
                      : "border border-gray-200 hover:border-purple-300 hover:bg-purple-50"
                  }`}
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  Mês
                </Button>
              </div>
            </div>
          </div>

          {/* Results Info Desktop */}
          {(searchTerm || filterType !== "all") && (
            <div className="mb-8 p-6 bg-blue-50 rounded-2xl border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-blue-900">
                    {filteredAndSortedEvents.length} evento
                    {filteredAndSortedEvents.length !== 1 ? "s" : ""} encontrado
                    {filteredAndSortedEvents.length !== 1 ? "s" : ""}
                  </p>
                  {searchTerm && (
                    <p className="text-blue-700 mt-1">
                      Busca por "{searchTerm}"
                    </p>
                  )}
                </div>
                {searchTerm && (
                  <Button
                    variant="outline"
                    onClick={() => setSearchTerm("")}
                    className="rounded-full px-6 py-2"
                  >
                    Limpar busca
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Empty States Desktop */}
          {filteredAndSortedEvents.length === 0 && searchTerm && (
            <div className="text-center py-24 bg-white rounded-2xl shadow-lg">
              <div className="bg-gray-100 rounded-full p-12 w-32 h-32 mx-auto mb-8 flex items-center justify-center">
                <Search className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                Nenhum evento encontrado
              </h3>
              <p className="text-gray-600 mb-8 text-lg max-w-md mx-auto">
                Não encontramos eventos que correspondam à sua busca por "{searchTerm}"
              </p>
              <Button
                variant="outline"
                onClick={() => setSearchTerm("")}
                className="rounded-full px-8 py-3 text-base"
              >
                Limpar busca e ver todos os eventos
              </Button>
            </div>
          )}

          {filteredAndSortedEvents.length === 0 &&
            !searchTerm &&
            filterType !== "all" && (
              <div className="text-center py-24 bg-white rounded-2xl shadow-lg">
                <div className="bg-gray-100 rounded-full p-12 w-32 h-32 mx-auto mb-8 flex items-center justify-center">
                  <Calendar className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                  Nenhum evento{" "}
                  {filterType === "week" ? "esta semana" : "este mês"}
                </h3>
                <p className="text-gray-600 mb-8 text-lg max-w-md mx-auto">
                  Tente ampliar sua busca para ver todos os eventos disponíveis
                </p>
                <Button
                  variant="outline"
                  onClick={() => setFilterType("all")}
                  className="rounded-full px-8 py-3 text-base"
                >
                  Ver todos os eventos
                </Button>
              </div>
            )}

          {/* Desktop Events Grid - Expansivo */}
          {filteredAndSortedEvents.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 pb-16">
              {paginatedEvents.map((event) => {
                const [year, month, day] = event.date.split("-");
                const eventDate = new Date(
                  parseInt(year),
                  parseInt(month) - 1,
                  parseInt(day),
                );
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                const isPastEvent = eventDate < now;

                return (
                  <Card
                    key={event.id}
                    className={`transition-all duration-200 border border-gray-100 shadow-sm hover:shadow-md rounded-lg overflow-hidden group ${
                      isPastEvent ? "opacity-70" : ""
                    } ${event.available ? "bg-white hover:border-purple-200" : "bg-gray-50"}`}
                  >
                    <CardContent className="p-6 relative">
                      {/* Status indicator */}
                      <div
                        className={`absolute top-0 left-0 w-1 h-full ${
                          isPastEvent
                            ? "bg-gray-400"
                            : event.status === 'ativo'
                            ? "bg-green-500"
                            : event.status === 'inativo'
                            ? "bg-yellow-500"
                            : event.status === 'fechado_pedidos'
                            ? "bg-orange-500"
                            : "bg-gray-400"
                        }`}
                      />

                      <div className="pl-3">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2 leading-tight group-hover:text-purple-700 transition-colors cursor-pointer" onClick={() => handleEventClick(event.id)}>
                            {event.name}
                          </h3>
                        </div>

                        <div className="space-y-3 mb-4">
                          <div className="flex items-center text-gray-600">
                            <Calendar className="w-4 h-4 mr-2 text-purple-500" />
                            <span className="text-sm">{formatDate(event.date)}</span>
                          </div>
                          <div className="flex items-start text-gray-600">
                            <MapPin className="w-4 h-4 mr-2 text-purple-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">
                              {event.location}<br />
                              <span className="text-xs text-gray-500">{event.city} - {event.state}</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <Badge
                            variant={getEventStatusVariant(event, isPastEvent)}
                            className={`text-xs rounded-md px-3 py-1 font-medium ${getEventStatusColor(event, isPastEvent)}`}
                          >
                            {getEventStatusLabel(event, isPastEvent)}
                          </Badge>

                          <div className="flex gap-2">
                            {event.status === 'ativo' && !isPastEvent ? (
                              <Button
                                size="sm"
                                onClick={() => handleEventClick(event.id)}
                                className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-4 py-2 rounded-md transition-colors"
                              >
                                Solicitar Retirada
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEventClick(event.id)}
                                className="text-gray-600 hover:text-purple-600 hover:bg-purple-50 text-xs px-3 py-2 rounded-md transition-colors"
                              >
                                Ver Detalhes
                                <ChevronRight className="w-3 h-3 ml-1" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Desktop Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 space-y-6">
              <div className="text-sm text-muted-foreground text-center">
                Página {currentPage} de {totalPages} • {filteredAndSortedEvents.length} eventos encontrados
              </div>
              
              <div className="flex justify-center">
                <Pagination>
                  <PaginationContent className="gap-2">
                    <PaginationItem>
                      <PaginationPrevious 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage > 1) handlePageChange(currentPage - 1);
                        }}
                        className={cn(
                          currentPage === 1 ? "pointer-events-none opacity-50" : "",
                          "px-3 py-2"
                        )}
                      />
                    </PaginationItem>
                    
                    {/* Smart page display for desktop */}
                    {(() => {
                      const maxPagesShown = 7;
                      let startPage = Math.max(1, currentPage - Math.floor(maxPagesShown / 2));
                      let endPage = Math.min(totalPages, startPage + maxPagesShown - 1);
                      
                      if (endPage - startPage + 1 < maxPagesShown) {
                        startPage = Math.max(1, endPage - maxPagesShown + 1);
                      }
                      
                      const pages = [];
                      
                      if (startPage > 1) {
                        pages.push(
                          <PaginationItem key={1}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                handlePageChange(1);
                              }}
                              className="w-10 h-10"
                            >
                              1
                            </PaginationLink>
                          </PaginationItem>
                        );
                        
                        if (startPage > 2) {
                          pages.push(
                            <PaginationItem key="ellipsis-start">
                              <PaginationEllipsis className="w-10 h-10" />
                            </PaginationItem>
                          );
                        }
                      }
                      
                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <PaginationItem key={i}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                handlePageChange(i);
                              }}
                              isActive={currentPage === i}
                              className="w-10 h-10"
                            >
                              {i}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      }
                      
                      if (endPage < totalPages) {
                        if (endPage < totalPages - 1) {
                          pages.push(
                            <PaginationItem key="ellipsis-end">
                              <PaginationEllipsis className="w-10 h-10" />
                            </PaginationItem>
                          );
                        }
                        
                        pages.push(
                          <PaginationItem key={totalPages}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                handlePageChange(totalPages);
                              }}
                              className="w-10 h-10"
                            >
                              {totalPages}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      }
                      
                      return pages;
                    })()}
                    
                    <PaginationItem>
                      <PaginationNext 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage < totalPages) handlePageChange(currentPage + 1);
                        }}
                        className={cn(
                          currentPage === totalPages ? "pointer-events-none opacity-50" : "",
                          "px-3 py-2"
                        )}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
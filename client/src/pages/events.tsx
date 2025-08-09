
import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, ChevronRight, Search, Filter, Package, Clock, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { formatDate } from "@/lib/brazilian-formatter";
import { useState, useMemo } from "react";
import type { Event } from "@shared/schema";

type FilterType = "all" | "week" | "month";

export default function Events() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

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
    let filtered = events.filter(event =>
      event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.city.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Apply date filters
    if (filterType !== "all") {
      filtered = filtered.filter(event => {
        const [year, month, day] = event.date.split('-');
        const eventDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        
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
      const [yearA, monthA, dayA] = a.date.split('-');
      const [yearB, monthB, dayB] = b.date.split('-');
      const dateA = new Date(parseInt(yearA), parseInt(monthA) - 1, parseInt(dayA));
      const dateB = new Date(parseInt(yearB), parseInt(monthB) - 1, parseInt(dayB));

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

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto bg-gray-50 min-h-screen">
        <div className="bg-gradient-to-br from-purple-600 to-purple-700 h-40 animate-pulse"></div>
        <div className="p-6 space-y-4">
          <div className="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const handleEventClick = (eventId: number) => {
    setLocation(`/events/${eventId}`);
  };

  const availableEventsCount = filteredAndSortedEvents.filter(event => event.available).length;

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen page-with-footer">
      
      {/* Modern Header Section */}
      <div className="relative bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-black/10">
          <div className="absolute top-0 left-0 w-full h-full opacity-20">
            <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
            <div className="absolute top-20 right-8 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
            <div className="absolute bottom-10 left-1/2 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
          </div>
        </div>
        
        <div className="relative px-6 pt-12 pb-8">
          <div className="text-center text-white">
            {/* Brand Section */}
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mb-4">
                <Package className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold mb-2">KitRunner</h1>
              <p className="text-purple-100 text-lg font-medium">Encontre e retire seus kits de corrida</p>
            </div>
            
            {/* Search Section */}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-4 h-5 w-5 text-gray-400 z-10" />
              <Input
                placeholder="Buscar por evento, local ou cidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-16 py-4 w-full bg-white/95 backdrop-blur-sm text-gray-900 border-0 rounded-2xl shadow-xl focus:ring-2 focus:ring-white/50 focus:shadow-2xl transition-all duration-300 placeholder:text-gray-500"
              />
              <Button
                size="sm"
                variant="ghost"
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
              >
                <Filter className="h-5 w-5" />
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center justify-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-purple-100">{availableEventsCount} disponíveis</span>
              </div>
              <div className="flex items-center space-x-2">
                <Star className="w-4 h-4 text-yellow-400" />
                <span className="text-purple-100">Entrega gratuita</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Card - Floating */}
      <div className="px-6 -mt-6 relative z-10 mb-6">
        <Card className="bg-white border-0 shadow-2xl rounded-3xl overflow-hidden backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-4 rounded-2xl shadow-lg">
                <Package className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-1">Seus kits estão prontos!</h3>
                <p className="text-gray-600 text-sm">Confira os eventos disponíveis para retirada</p>
              </div>
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 px-4 py-2 rounded-full shadow-lg">
                {availableEventsCount} kit{availableEventsCount !== 1 ? 's' : ''}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <main className="px-6 pb-8">
        {/* Enhanced Filter Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filtrar eventos</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            <Button
              variant={filterType === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("all")}
              className={`whitespace-nowrap rounded-full px-6 py-3 font-medium transition-all duration-300 ${
                filterType === "all" 
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg transform scale-105" 
                  : "border-gray-200 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700"
              }`}
            >
              Todos os Eventos
            </Button>
            <Button
              variant={filterType === "week" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("week")}
              className={`whitespace-nowrap rounded-full px-6 py-3 font-medium transition-all duration-300 ${
                filterType === "week" 
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg transform scale-105" 
                  : "border-gray-200 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700"
              }`}
            >
              <Clock className="h-4 w-4 mr-2" />
              Esta Semana
            </Button>
            <Button
              variant={filterType === "month" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("month")}
              className={`whitespace-nowrap rounded-full px-6 py-3 font-medium transition-all duration-300 ${
                filterType === "month" 
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg transform scale-105" 
                  : "border-gray-200 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700"
              }`}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Este Mês
            </Button>
          </div>
        </div>

        {/* Results Summary */}
        {(searchTerm || filterType !== "all") && (
          <div className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border border-blue-100/50 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-blue-900 mb-1">
                  {filteredAndSortedEvents.length} evento{filteredAndSortedEvents.length !== 1 ? 's' : ''} encontrado{filteredAndSortedEvents.length !== 1 ? 's' : ''}
                </p>
                {searchTerm && (
                  <p className="text-sm text-blue-700">
                    Resultados para "<span className="font-medium">{searchTerm}</span>"
                  </p>
                )}
              </div>
              {availableEventsCount > 0 && (
                <Badge className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white border-0 px-3 py-1 rounded-full">
                  {availableEventsCount} disponível{availableEventsCount !== 1 ? 'eis' : ''}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Enhanced Empty States */}
        {filteredAndSortedEvents.length === 0 && searchTerm && (
          <div className="text-center py-20">
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-full p-8 w-32 h-32 mx-auto mb-8 flex items-center justify-center shadow-lg">
              <Search className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Nenhum evento encontrado</h3>
            <p className="text-gray-600 mb-6 text-lg">
              Não encontramos eventos com "<span className="font-medium">{searchTerm}</span>"
            </p>
            <Button 
              variant="outline" 
              onClick={() => setSearchTerm("")}
              className="rounded-full px-8 py-3 border-2 border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300 transition-all duration-300"
            >
              Limpar busca
            </Button>
          </div>
        )}

        {filteredAndSortedEvents.length === 0 && !searchTerm && filterType !== "all" && (
          <div className="text-center py-20">
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-full p-8 w-32 h-32 mx-auto mb-8 flex items-center justify-center shadow-lg">
              <Calendar className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Nenhum evento {filterType === "week" ? "nesta semana" : "neste mês"}
            </h3>
            <p className="text-gray-600 mb-6 text-lg">
              Experimente selecionar "Todos os Eventos"
            </p>
            <Button 
              variant="outline" 
              onClick={() => setFilterType("all")}
              className="rounded-full px-8 py-3 border-2 border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300 transition-all duration-300"
            >
              Ver todos os eventos
            </Button>
          </div>
        )}

        {/* Enhanced Events List */}
        <div className="space-y-5">
          {filteredAndSortedEvents.map((event) => {
            const [year, month, day] = event.date.split('-');
            const eventDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const isPastEvent = eventDate < now;

            return (
              <Card
                key={event.id}
                className={`cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 border-0 shadow-lg rounded-3xl overflow-hidden group ${
                  isPastEvent ? "opacity-70" : ""
                } ${event.available ? "bg-white" : "bg-gray-50"}`}
                onClick={() => handleEventClick(event.id)}
              >
                <CardContent className="p-0 relative">
                  {/* Enhanced Status Bar */}
                  <div className={`h-2 w-full ${
                    event.available 
                      ? "bg-gradient-to-r from-green-400 via-emerald-500 to-green-600" 
                      : "bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500"
                  }`} />
                  
                  {/* Hover Effect Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 to-indigo-500/0 group-hover:from-purple-500/5 group-hover:to-indigo-500/5 transition-all duration-300 pointer-events-none" />
                  
                  <div className="p-7 relative">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-4">
                          <h3 className="font-bold text-xl text-gray-900 truncate group-hover:text-purple-700 transition-colors duration-300">
                            {event.name}
                          </h3>
                          {isPastEvent && (
                            <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-600 rounded-full px-3 py-1">
                              Finalizado
                            </Badge>
                          )}
                        </div>
                        
                        <div className="space-y-4 mb-6">
                          <div className="flex items-center text-gray-600">
                            <div className="bg-purple-100 p-2 rounded-xl mr-4">
                              <Calendar className="w-5 h-5 text-purple-600" />
                            </div>
                            <span className="text-base font-medium">{formatDate(event.date)}</span>
                          </div>
                          <div className="flex items-center text-gray-600">
                            <div className="bg-purple-100 p-2 rounded-xl mr-4">
                              <MapPin className="w-5 h-5 text-purple-600" />
                            </div>
                            <span className="text-base truncate">{event.location}, {event.city} - {event.state}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Badge
                            variant={event.available ? "default" : "secondary"}
                            className={`rounded-full px-5 py-2 font-semibold text-sm ${
                              event.available 
                                ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-md" 
                                : "bg-gray-200 text-gray-600 border-0"
                            }`}
                          >
                            {event.available ? "✓ Disponível para retirada" : "⏳ Em breve"}
                          </Badge>
                        </div>
                      </div>
                      <div className="ml-6 flex items-center">
                        <div className="bg-purple-100 group-hover:bg-purple-200 p-3 rounded-2xl transition-all duration-300">
                          <ChevronRight className="w-6 h-6 text-purple-600 group-hover:translate-x-1 transition-transform duration-300" />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Show some events message when there are results */}
        {filteredAndSortedEvents.length > 0 && (
          <div className="text-center mt-8 py-6">
            <p className="text-gray-500 text-sm">
              Mostrando {filteredAndSortedEvents.length} evento{filteredAndSortedEvents.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}


import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, ChevronRight, Search, Filter, Package, Clock } from "lucide-react";
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
        <div className="bg-gradient-to-br from-purple-600 to-purple-700 px-6 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-purple-300 rounded-lg w-3/4 mx-auto"></div>
            <div className="h-4 bg-purple-300 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
        <div className="bg-white px-6 py-8">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200 rounded-lg mb-6"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg" />
            ))}
          </div>
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
      
      {/* Header Section */}
      <div className="bg-gradient-to-br from-purple-600 to-purple-700 px-6 pt-12 pb-8">
        <div className="text-center text-white">
          <h1 className="text-3xl font-bold mb-3">KitRunner</h1>
          <p className="text-purple-100 text-lg mb-8">Encontre e retire seus kits de corrida</p>
          
          {/* Search Section */}
          <div className="relative">
            <Search className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Buscar por evento, local ou cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-16 py-4 w-full bg-white text-gray-900 border-0 rounded-xl shadow-lg focus:ring-2 focus:ring-purple-300 focus:shadow-xl transition-all duration-200"
            />
            <Button
              size="sm"
              variant="ghost"
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <Filter className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Status Card */}
      <div className="px-6 -mt-8 relative z-10">
        <Card className="bg-white border-0 shadow-xl rounded-2xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-purple-100 p-3 rounded-xl">
                  <Package className="h-8 w-8 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Seus kits estão prontos!</h3>
                  <p className="text-gray-600 text-sm">Confira os eventos disponíveis</p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-700 border-green-200 px-3 py-1">
                {availableEventsCount} disponível{availableEventsCount !== 1 ? 'eis' : ''}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <main className="px-6 pt-6 pb-8">
        {/* Filter Section */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={filterType === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("all")}
              className={`whitespace-nowrap rounded-full px-4 py-2 transition-all duration-200 ${
                filterType === "all" 
                  ? "bg-purple-600 hover:bg-purple-700 text-white shadow-md" 
                  : "border-gray-200 hover:border-purple-300 hover:bg-purple-50"
              }`}
            >
              Todos os Eventos
            </Button>
            <Button
              variant={filterType === "week" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("week")}
              className={`whitespace-nowrap rounded-full px-4 py-2 transition-all duration-200 ${
                filterType === "week" 
                  ? "bg-purple-600 hover:bg-purple-700 text-white shadow-md" 
                  : "border-gray-200 hover:border-purple-300 hover:bg-purple-50"
              }`}
            >
              <Clock className="h-4 w-4 mr-1" />
              Esta Semana
            </Button>
            <Button
              variant={filterType === "month" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("month")}
              className={`whitespace-nowrap rounded-full px-4 py-2 transition-all duration-200 ${
                filterType === "month" 
                  ? "bg-purple-600 hover:bg-purple-700 text-white shadow-md" 
                  : "border-gray-200 hover:border-purple-300 hover:bg-purple-50"
              }`}
            >
              <Calendar className="h-4 w-4 mr-1" />
              Este Mês
            </Button>
          </div>
        </div>

        {/* Results Summary */}
        {(searchTerm || filterType !== "all") && (
          <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">
                  {filteredAndSortedEvents.length} evento{filteredAndSortedEvents.length !== 1 ? 's' : ''} encontrado{filteredAndSortedEvents.length !== 1 ? 's' : ''}
                </p>
                {searchTerm && (
                  <p className="text-xs text-blue-700 mt-1">
                    Resultados para "{searchTerm}"
                  </p>
                )}
              </div>
              {availableEventsCount > 0 && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {availableEventsCount} disponível{availableEventsCount !== 1 ? 'eis' : ''}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Events List */}
        <div className="space-y-4">
          {filteredAndSortedEvents.length === 0 && searchTerm && (
            <div className="text-center py-16">
              <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <Search className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum evento encontrado</h3>
              <p className="text-gray-600 mb-4">
                Não encontramos eventos com "{searchTerm}"
              </p>
              <Button 
                variant="outline" 
                onClick={() => setSearchTerm("")}
                className="rounded-full"
              >
                Limpar busca
              </Button>
            </div>
          )}

          {filteredAndSortedEvents.length === 0 && !searchTerm && filterType !== "all" && (
            <div className="text-center py-16">
              <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <Calendar className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhum evento {filterType === "week" ? "nesta semana" : "neste mês"}
              </h3>
              <p className="text-gray-600 mb-4">
                Experimente selecionar "Todos os Eventos"
              </p>
              <Button 
                variant="outline" 
                onClick={() => setFilterType("all")}
                className="rounded-full"
              >
                Ver todos os eventos
              </Button>
            </div>
          )}

          {filteredAndSortedEvents.map((event) => {
            const [year, month, day] = event.date.split('-');
            const eventDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const isPastEvent = eventDate < now;

            return (
              <Card
                key={event.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 border-0 shadow-md rounded-2xl overflow-hidden ${
                  isPastEvent ? "opacity-60" : ""
                }`}
                onClick={() => handleEventClick(event.id)}
              >
                <CardContent className="p-0">
                  {/* Event Status Bar */}
                  <div className={`h-1 w-full ${
                    event.available 
                      ? "bg-gradient-to-r from-green-400 to-green-500" 
                      : "bg-gradient-to-r from-gray-300 to-gray-400"
                  }`} />
                  
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="font-semibold text-xl text-gray-900 truncate">{event.name}</h3>
                          {isPastEvent && (
                            <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                              Finalizado
                            </Badge>
                          )}
                        </div>
                        
                        <div className="space-y-3 mb-4">
                          <div className="flex items-center text-gray-600">
                            <Calendar className="w-5 h-5 mr-3 text-purple-500 flex-shrink-0" />
                            <span className="text-sm font-medium">{formatDate(event.date)}</span>
                          </div>
                          <div className="flex items-center text-gray-600">
                            <MapPin className="w-5 h-5 mr-3 text-purple-500 flex-shrink-0" />
                            <span className="text-sm truncate">{event.location}, {event.city} - {event.state}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Badge
                            variant={event.available ? "default" : "secondary"}
                            className={`rounded-full px-3 py-1 font-medium ${
                              event.available 
                                ? "bg-green-100 text-green-700 border-green-200" 
                                : "bg-gray-100 text-gray-600 border-gray-200"
                            }`}
                          >
                            {event.available ? "Disponível para retirada" : "Em breve"}
                          </Badge>
                        </div>
                      </div>
                      <ChevronRight className="w-6 h-6 text-gray-400 ml-4 flex-shrink-0" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}


import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, ChevronRight, Search, Filter, Package } from "lucide-react";
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
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <Header />
        <div className="bg-gradient-to-br from-purple-600 to-purple-700 px-6 py-8 text-white">
          <div className="animate-pulse">
            <div className="h-8 bg-purple-300 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-purple-300 rounded w-1/2"></div>
          </div>
        </div>
        <div className="p-4">
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
    <div className="max-w-md mx-auto bg-white min-h-screen page-with-footer">
      
      {/* Hero Section - Split Layout */}
      <div className="relative">
        {/* Purple Background - Top Half */}
        <div className="bg-gradient-to-br from-purple-600 to-purple-700 px-6 pt-8 pb-4 text-white">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">KitRunner</h1>
            <p className="text-purple-100">Encontre e retire seus kits de corrida</p>
          </div>
        </div>

        {/* White Background - Bottom Half with Search */}
        <div className="bg-white px-6 pt-2 pb-6">
          {/* Search Input */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar eventos por nome, local..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 w-full bg-white text-gray-900 border border-gray-200 focus:ring-2 focus:ring-purple-300 shadow-sm"
            />
            <Button
              size="sm"
              variant="ghost"
              className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {/* Status Card */}
          <Card className="bg-purple-500 border-purple-400 text-white">
            <CardContent className="p-6 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-purple-100" />
              <h3 className="text-lg font-semibold mb-2">Seus kits estão prontos!</h3>
              <p className="text-purple-100 text-sm">
                Confira os eventos disponíveis para retirada
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <main className="p-4">
        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={filterType === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("week")}
            className={filterType === "week" ? "bg-purple-600 hover:bg-purple-700" : "border-purple-200"}
          >
            Esta Semana
          </Button>
          <Button
            variant={filterType === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("month")}
            className={filterType === "month" ? "bg-purple-600 hover:bg-purple-700" : "border-purple-200"}
          >
            Este Mês
          </Button>
          <Button
            variant={filterType === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("all")}
            className={filterType === "all" ? "bg-purple-600 hover:bg-purple-700" : "border-purple-200"}
          >
            Todos
          </Button>
        </div>

        {/* Results Summary */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            {searchTerm && `Resultados para "${searchTerm}" • `}
            {filteredAndSortedEvents.length} evento(s) encontrado(s)
            {availableEventsCount > 0 && ` • ${availableEventsCount} disponível(eis)`}
          </p>
        </div>

        {/* Events List */}
        <div className="space-y-4">
          {filteredAndSortedEvents.length === 0 && searchTerm && (
            <div className="text-center py-12">
              <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600 mb-2">Nenhum evento encontrado</p>
              <p className="text-sm text-gray-500">
                Tente buscar por nome, local ou cidade
              </p>
            </div>
          )}

          {filteredAndSortedEvents.length === 0 && !searchTerm && filterType !== "all" && (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600 mb-2">
                Nenhum evento {filterType === "week" ? "nesta semana" : "neste mês"}
              </p>
              <p className="text-sm text-gray-500">
                Tente selecionar "Todos" para ver mais eventos
              </p>
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
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-l-4 ${
                  event.available 
                    ? "border-l-purple-500 hover:border-l-purple-600" 
                    : "border-l-gray-300"
                } ${isPastEvent ? "opacity-70" : ""}`}
                onClick={() => handleEventClick(event.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg text-gray-800">{event.name}</h3>
                        {isPastEvent && (
                          <Badge variant="secondary" className="text-xs">
                            Passado
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-2 mb-3">
                        <p className="text-gray-600 text-sm flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-purple-500" />
                          {formatDate(event.date)}
                        </p>
                        <p className="text-gray-600 text-sm flex items-center">
                          <MapPin className="w-4 h-4 mr-2 text-purple-500" />
                          {event.location}, {event.city} - {event.state}
                        </p>
                      </div>
                      
                      <div className="flex items-center">
                        <Badge
                          variant={event.available ? "default" : "secondary"}
                          className={
                            event.available 
                              ? "bg-purple-100 text-purple-800 hover:bg-purple-200" 
                              : "bg-gray-100 text-gray-600"
                          }
                        >
                          {event.available ? "Disponível" : "Em Breve"}
                        </Badge>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 ml-4 flex-shrink-0" />
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

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar, MapPin, ChevronRight, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { formatDate } from "@/lib/brazilian-formatter";
import { useState, useMemo } from "react";
import type { Event } from "@shared/schema";

export default function Events() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    staleTime: 0, // Always fetch fresh data to detect changes
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  // Filter and sort events: search + upcoming events first
  const filteredAndSortedEvents = useMemo(() => {
    if (!events) return [];
    
    // Filter by search term
    const filtered = events.filter(event =>
      event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.city.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Sort by date: upcoming events first
    const now = new Date();
    return filtered.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      
      // Events in the future come first, sorted by date (earliest first)
      // Past events come last, sorted by date (most recent first)
      const isAfuture = dateA >= now;
      const isBfuture = dateB >= now;
      
      if (isAfuture && !isBfuture) return -1;
      if (!isAfuture && isBfuture) return 1;
      
      if (isAfuture && isBfuture) {
        return dateA.getTime() - dateB.getTime(); // Earliest upcoming first
      } else {
        return dateB.getTime() - dateA.getTime(); // Most recent past first
      }
    });
  }, [events, searchTerm]);

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <Header />
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

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen pb-20">
      <Header />
      <div className="p-4">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-neutral-800 mb-2">Próximos Eventos</h2>
          <p className="text-neutral-600 mb-4">Selecione o evento para retirar seu kit</p>
          
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Buscar eventos por nome, local ou cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 w-full border-neutral-200 focus:border-primary"
            />
          </div>
        </div>

        <div className="space-y-4">
          {filteredAndSortedEvents.length === 0 && searchTerm && (
            <div className="text-center py-8">
              <p className="text-neutral-600">Nenhum evento encontrado para "{searchTerm}"</p>
              <p className="text-sm text-neutral-500 mt-1">Tente buscar por nome, local ou cidade</p>
            </div>
          )}
          
          {filteredAndSortedEvents.map((event) => (
            <Card
              key={event.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleEventClick(event.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-neutral-800">{event.name}</h3>
                    <p className="text-neutral-600 text-sm mt-1 flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      {formatDate(event.date)}
                    </p>
                    <p className="text-neutral-600 text-sm mt-1 flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      {event.location}, {event.city} - {event.state}
                    </p>
                    <div className="flex items-center mt-2">
                      <Badge
                        variant={event.available ? "default" : "secondary"}
                        className={event.available ? "bg-secondary hover:bg-secondary/80" : ""}
                      >
                        {event.available ? "Disponível" : "Em Breve"}
                      </Badge>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-neutral-400 ml-4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
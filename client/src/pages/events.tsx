import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { formatDate } from "@/lib/brazilian-formatter";
import type { Event } from "@shared/schema";

export default function Events() {
  const [, setLocation] = useLocation();

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-neutral-800">Próximos Eventos</h2>
            <p className="text-neutral-600">Selecione o evento para retirar seu kit</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/admin")}
            className="text-xs"
          >
            Admin
          </Button>
        </div>
        
        <div className="space-y-4">
          {events?.map((event) => (
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

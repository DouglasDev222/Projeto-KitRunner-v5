import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Eye, 
  Edit, 
  Calendar, 
  MapPin, 
  DollarSign, 
  Package, 
  Gift,
  Users,
  Info,
  Heart
} from "lucide-react";
import { useLocation } from "wouter";
import { formatCurrency, formatDate } from "@/lib/brazilian-formatter";
import { apiRequest } from "@/lib/queryClient";
import type { Event } from "@shared/schema";

interface EventDetailsModalProps {
  event: Event;
  trigger?: React.ReactNode;
}

interface EventDetails extends Event {
  cepZonePrices?: Array<{
    zoneId: number;
    zoneName: string;
    customPrice: number;
  }> | null;
}

export function EventDetailsModal({ event, trigger }: EventDetailsModalProps) {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);

  // Fetch detailed event information when modal opens
  const { data: eventDetails, isLoading } = useQuery<EventDetails>({
    queryKey: ["/api/admin/events", event.id, "details"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/admin/events/${event.id}`);
      return response.json();
    },
    enabled: open,
  });

  const handleEdit = () => {
    setOpen(false);
    setLocation(`/admin/events/${event.id}/edit`);
  };

  const getPricingTypeLabel = (type: string) => {
    switch (type) {
      case "fixed": return "Preço Fixo";
      case "distance": return "Por Distância";
      case "cep_zones": return "Zonas de CEP";
      default: return type;
    }
  };

  const getPricingTypeColor = (type: string) => {
    switch (type) {
      case "fixed": return "bg-green-100 text-green-800";
      case "distance": return "bg-blue-100 text-blue-800";
      case "cep_zones": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-1" />
            Detalhes
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {event.name}
          </DialogTitle>
          <DialogDescription>
            Informações completas do evento
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-20 bg-gray-100 rounded"></div>
          </div>
        ) : eventDetails ? (
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Data do Evento</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{formatDate(eventDetails.date)}</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Local</label>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span>{eventDetails.location}</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Cidade/Estado</label>
                  <p className="mt-1">{eventDetails.city}, {eventDetails.state}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">CEP de Retirada</label>
                  <p className="mt-1 font-mono">{eventDetails.pickupZipCode}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    <Badge 
                      variant={eventDetails.available ? "secondary" : "outline"}
                      className={eventDetails.available ? "bg-green-100 text-green-800" : ""}
                    >
                      {eventDetails.available ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Preço Kit Extra</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Package className="h-4 w-4 text-gray-400" />
                    <span>{formatCurrency(Number(eventDetails.extraKitPrice))}</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Pricing Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Precificação
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Tipo de Precificação</label>
                  <div className="mt-1">
                    <Badge className={getPricingTypeColor(eventDetails.pricingType)}>
                      {getPricingTypeLabel(eventDetails.pricingType)}
                    </Badge>
                  </div>
                </div>

                {eventDetails.pricingType === "fixed" && eventDetails.fixedPrice && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Preço Fixo</label>
                    <div className="flex items-center gap-2 mt-1">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span className="text-lg font-semibold">
                        {formatCurrency(Number(eventDetails.fixedPrice))}
                      </span>
                    </div>
                  </div>
                )}

                {eventDetails.pricingType === "cep_zones" && eventDetails.cepZonePrices && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Preços Personalizados por Zona
                    </label>
                    {eventDetails.cepZonePrices.length > 0 ? (
                      <div className="mt-2 space-y-2">
                        {eventDetails.cepZonePrices.map((zonePrice) => (
                          <div 
                            key={zonePrice.zoneId}
                            className="flex justify-between items-center p-3 bg-purple-50 rounded border border-purple-200"
                          >
                            <span className="font-medium text-purple-900">
                              {zonePrice.zoneName}
                            </span>
                            <span className="text-lg font-semibold text-purple-900">
                              {formatCurrency(zonePrice.customPrice)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200 text-center">
                        <Info className="h-5 w-5 mx-auto mb-1 text-gray-400" />
                        <p className="text-sm text-gray-600">
                          Usando preços globais das zonas
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Donation Information */}
            {eventDetails.donationRequired && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Doação
                  </h3>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-red-400" />
                      <span className="text-sm font-medium">Doação Obrigatória</span>
                      <Badge variant="secondary" className="bg-red-100 text-red-800">
                        Ativa
                      </Badge>
                    </div>

                    {eventDetails.donationAmount && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Valor</label>
                        <p className="text-lg font-semibold">
                          {formatCurrency(Number(eventDetails.donationAmount))}
                        </p>
                      </div>
                    )}

                    {eventDetails.donationDescription && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Descrição</label>
                        <p className="text-sm text-gray-700 mt-1">
                          {eventDetails.donationDescription}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Action Buttons */}
            <Separator />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Fechar
              </Button>
              <Button onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-1" />
                Editar Evento
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Info className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p className="text-gray-600">Erro ao carregar detalhes do evento</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
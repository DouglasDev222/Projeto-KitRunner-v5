import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminLayout } from "@/components/admin-layout";
import { EventDetailsModal } from "@/components/admin/EventDetailsModal";
// Sistema novo: AdminRouteGuard já protege esta página
import { 
  Plus, 
  Edit, 
  Eye, 
  ToggleLeft, 
  ToggleRight, 
  Calendar,
  MapPin,
  Users,
  Package,
  DollarSign
} from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate } from "@/lib/brazilian-formatter";
import { useToast } from "@/hooks/use-toast";
import type { Event, Order } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminEvents() {
  const [, setLocation] = useLocation();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showOrdersDialog, setShowOrdersDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/admin/events"],
    staleTime: 0, // Sempre busca dados frescos
    refetchOnMount: true, // Revalida quando componente monta
    refetchOnWindowFocus: true, // Revalida quando janela ganha foco
  });

  const { data: eventOrders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/admin/events", selectedEvent?.id, "orders"],
    enabled: !!selectedEvent?.id && showOrdersDialog,
    staleTime: 0, // Sempre busca dados frescos para pedidos
    refetchOnMount: true,
  });

  const toggleEventMutation = useMutation({
    mutationFn: async ({ eventId, available }: { eventId: number; available: boolean }) => {
      const response = await apiRequest("PATCH", `/api/admin/events/${eventId}/toggle`, { available });
      return response.json();
    },
    onSuccess: () => {
      // Invalidação abrangente para garantir reatividade completa
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] }); // Lista pública de eventos
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] }); // Estatísticas do dashboard
      toast({
        title: "Sucesso",
        description: "Status do evento alterado com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao alterar status do evento",
        variant: "destructive",
      });
    },
  });

  const handleToggleEvent = (event: Event) => {
    toggleEventMutation.mutate({
      eventId: event.id,
      available: !event.available,
    });
  };

  const handleViewOrders = (event: Event) => {
    setSelectedEvent(event);
    setShowOrdersDialog(true);
  };

  const getEventStats = (event: Event) => {
    const orders = eventOrders;
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum: number, order: any) => sum + Number(order.totalCost), 0);
    const totalKits = orders.reduce((sum: number, order: any) => sum + order.kitQuantity, 0);
    
    return { totalOrders, totalRevenue, totalKits };
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-800">Administração de Eventos</h1>
            <p className="text-sm sm:text-base text-neutral-600">Gerencie eventos, visualize pedidos e controle disponibilidade</p>
          </div>
          <Button
            onClick={() => setLocation("/admin/events/new")}
            className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Evento
          </Button>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {eventsLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-lg"></div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4">
            {(events || []).map((event: Event) => (
              <Card key={event.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary/20">
                <CardHeader className="pb-3">
                  <div className="space-y-3">
                    {/* Mobile-first header layout */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Calendar className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base sm:text-lg text-gray-900 leading-tight">{event.name}</CardTitle>
                          <p className="text-xs sm:text-sm text-gray-500 mt-1">{formatDate(event.date)} • {event.city}, {event.state}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleEvent(event)}
                        disabled={toggleEventMutation.isPending}
                        className="h-8 w-8 p-0 flex-shrink-0"
                      >
                        {event.available ? (
                          <ToggleRight className="w-5 h-5 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-gray-400" />
                        )}
                      </Button>
                    </div>
                    
                    {/* Badges row - better mobile layout */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge 
                        variant={event.status === 'ativo' ? "default" : "secondary"}
                        className={
                          event.status === 'ativo' 
                            ? "bg-green-100 text-green-800 hover:bg-green-200" 
                            : event.status === 'fechado_pedidos'
                            ? "bg-orange-100 text-orange-800"
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {event.status === 'ativo' 
                          ? "Ativo" 
                          : event.status === 'fechado_pedidos'
                          ? "Fechado"
                          : "Inativo"
                        }
                      </Badge>
                      {event.stockEnabled && (
                        <Badge variant="outline" className="text-xs">
                          {event.currentOrders || 0}/{event.maxOrders || '∞'}
                        </Badge>
                      )}
                      {event.isOfficial && (
                        <Badge
                          variant="outline"
                          className="bg-gradient-to-r from-yellow-50 to-amber-50 border-amber-200 text-amber-700 font-medium text-xs"
                          data-testid="badge-official-partnership-admin"
                        >
                          ⭐ Oficial
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {/* Location and pricing info - mobile optimized */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
                        <DollarSign className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="font-medium">
                          {event.pricingType === "fixed" && event.fixedPrice ? (
                            `${formatCurrency(Number(event.fixedPrice))}`
                          ) : event.pricingType === "distance" ? (
                            "Por Distância"
                          ) : event.pricingType === "cep_zones" ? (
                            "Zonas de CEP"
                          ) : (
                            "Não definido"
                          )}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            event.pricingType === "fixed" ? "border-green-200 text-green-700" :
                            event.pricingType === "distance" ? "border-blue-200 text-blue-700" :
                            event.pricingType === "cep_zones" ? "border-purple-200 text-purple-700" :
                            "border-gray-200 text-gray-700"
                          }`}
                        >
                          {event.pricingType === "fixed" ? "Fixo" : 
                           event.pricingType === "distance" ? "Distância" :
                           event.pricingType === "cep_zones" ? "CEP" : "?"}
                        </Badge>
                      </div>
                    </div>

                    {event.donationRequired && (
                      <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-sm text-orange-800">
                          <strong>Doação Obrigatória:</strong> {event.donationDescription}
                          {event.donationAmount && ` - ${formatCurrency(Number(event.donationAmount))}`}
                        </p>
                      </div>
                    )}

                    {/* Actions - mobile-first responsive layout */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="grid grid-cols-3 sm:flex gap-2">
                        <EventDetailsModal 
                          event={event}
                          trigger={
                            <Button variant="outline" size="sm" className="text-xs">
                              <Eye className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                              <span className="hidden sm:inline">Detalhes</span>
                            </Button>
                          }
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => setLocation(`/admin/events/${event.id}/edit`)}
                        >
                          <Edit className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                          <span className="hidden sm:inline">Editar</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => handleViewOrders(event)}
                        >
                          <Package className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                          <span className="hidden sm:inline">Pedidos</span>
                        </Button>
                      </div>
                      <div className="text-xs text-gray-400 text-right sm:text-left">
                        ID: {event.id}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Orders Dialog */}
      <Dialog open={showOrdersDialog} onOpenChange={setShowOrdersDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] w-[95vw] sm:w-full overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg pr-8">Pedidos: {selectedEvent?.name}</DialogTitle>
            <DialogDescription className="text-sm">
              Pedidos realizados para este evento
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4">
              {/* Event Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <Card>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Package className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-neutral-600">Pedidos</p>
                        <p className="text-lg sm:text-xl font-bold">{getEventStats(selectedEvent).totalOrders}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Users className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-neutral-600">Kits</p>
                        <p className="text-lg sm:text-xl font-bold">{getEventStats(selectedEvent).totalKits}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-neutral-600">Faturamento</p>
                        <p className="text-lg sm:text-xl font-bold">{formatCurrency(getEventStats(selectedEvent).totalRevenue)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Orders Table */}
              {ordersLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 bg-gray-100 animate-pulse rounded"></div>
                  ))}
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  {/* Mobile-friendly table with horizontal scroll */}
                  <div className="overflow-x-auto">
                    <Table className="min-w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[120px]">Pedido</TableHead>
                          <TableHead className="min-w-[150px]">Cliente</TableHead>
                          <TableHead className="min-w-[60px]">Kits</TableHead>
                          <TableHead className="min-w-[80px]">Total</TableHead>
                          <TableHead className="min-w-[100px]">Status</TableHead>
                          <TableHead className="min-w-[90px]">Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(eventOrders || []).map((order: any) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium text-sm">{order.orderNumber}</TableCell>
                            <TableCell className="text-sm">{order.customer?.name || "N/A"}</TableCell>
                            <TableCell className="text-sm">{order.kitQuantity}</TableCell>
                            <TableCell className="text-sm">{formatCurrency(Number(order.totalCost))}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={order.status === "confirmed" ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {order.status === "confirmed" ? "Confirmado" : order.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {(!eventOrders || eventOrders.length === 0) && (
                    <div className="p-6 sm:p-8 text-center text-neutral-500">
                      <p className="text-sm sm:text-base">Nenhum pedido encontrado para este evento</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      </AdminLayout>
  );
}


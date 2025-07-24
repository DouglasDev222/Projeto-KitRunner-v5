import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminLayout } from "@/components/admin-layout";
import { AdminAuth } from "@/components/admin-auth";
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showOrdersDialog, setShowOrdersDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const authStatus = localStorage.getItem("adminAuthenticated");
    setIsAuthenticated(authStatus === "true");
  }, []);

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["admin", "events"],
    queryFn: async () => {
      const response = await fetch("/api/admin/events");
      if (!response.ok) throw new Error("Erro ao carregar eventos");
      return response.json();
    },
  });

  const { data: eventOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ["admin", "event-orders", selectedEvent?.id],
    queryFn: async () => {
      if (!selectedEvent?.id) return [];
      const response = await fetch(`/api/admin/events/${selectedEvent.id}/orders`);
      if (!response.ok) throw new Error("Erro ao carregar pedidos do evento");
      return response.json();
    },
    enabled: !!selectedEvent?.id && showOrdersDialog,
  });

  const toggleEventMutation = useMutation({
    mutationFn: async ({ eventId, available }: { eventId: number; available: boolean }) => {
      const response = await fetch(`/api/admin/events/${eventId}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available }),
      });
      if (!response.ok) throw new Error("Erro ao alterar status do evento");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "events"] });
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
    const orders = eventOrders || [];
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum: number, order: any) => sum + Number(order.totalCost), 0);
    const totalKits = orders.reduce((sum: number, order: any) => sum + order.kitQuantity, 0);
    
    return { totalOrders, totalRevenue, totalKits };
  };

  if (!isAuthenticated) {
    return <AdminAuth onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-neutral-800">Administração de Eventos</h1>
          <p className="text-neutral-600">Gerencie eventos, visualize pedidos e controle disponibilidade</p>
        </div>
        <Button
          onClick={() => setLocation("/admin/events/new")}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Evento
        </Button>
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
              <Card key={event.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <CardTitle className="text-lg">{event.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={event.available ? "default" : "secondary"}>
                        {event.available ? "Ativo" : "Inativo"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleEvent(event)}
                        disabled={toggleEventMutation.isPending}
                      >
                        {event.available ? (
                          <ToggleRight className="w-5 h-5 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm text-neutral-600">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(event.date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-neutral-600">
                      <MapPin className="w-4 h-4" />
                      <span>{event.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-neutral-600">
                      <span className="font-medium">{event.city} - {event.state}</span>
                    </div>
                    {event.fixedPrice && (
                      <div className="flex items-center gap-2 text-sm text-neutral-600">
                        <DollarSign className="w-4 h-4" />
                        <span>Preço: {formatCurrency(Number(event.fixedPrice))}</span>
                      </div>
                    )}
                  </div>

                  {event.donationRequired && (
                    <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-sm text-orange-800">
                        <strong>Doação Obrigatória:</strong> {event.donationDescription}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocation(`/admin/events/${event.id}/edit`)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewOrders(event)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Pedidos
                      </Button>
                    </div>
                    <div className="text-sm text-neutral-500">
                      ID: {event.id}
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
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pedidos do Evento: {selectedEvent?.name}</DialogTitle>
            <DialogDescription>
              Visualize todos os pedidos realizados para este evento
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4">
              {/* Event Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Package className="w-6 h-6 text-blue-600" />
                      <div>
                        <p className="text-sm text-neutral-600">Total de Pedidos</p>
                        <p className="text-xl font-bold">{getEventStats(selectedEvent).totalOrders}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Users className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="text-sm text-neutral-600">Total de Kits</p>
                        <p className="text-xl font-bold">{getEventStats(selectedEvent).totalKits}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-6 h-6 text-orange-600" />
                      <div>
                        <p className="text-sm text-neutral-600">Faturamento</p>
                        <p className="text-xl font-bold">{formatCurrency(getEventStats(selectedEvent).totalRevenue)}</p>
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
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número do Pedido</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Kits</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(eventOrders || []).map((order: any) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.orderNumber}</TableCell>
                          <TableCell>{order.customer?.name || "N/A"}</TableCell>
                          <TableCell>{order.kitQuantity}</TableCell>
                          <TableCell>{formatCurrency(Number(order.totalCost))}</TableCell>
                          <TableCell>
                            <Badge variant={order.status === "confirmed" ? "default" : "secondary"}>
                              {order.status === "confirmed" ? "Confirmado" : order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(order.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {(!eventOrders || eventOrders.length === 0) && (
                    <div className="p-8 text-center text-neutral-500">
                      Nenhum pedido encontrado para este evento
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


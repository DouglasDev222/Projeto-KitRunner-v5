import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, Calendar, MapPin, ChevronRight, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  customerIdentificationSchema,
  type CustomerIdentification,
  type Order,
  type Kit,
} from "@shared/schema";
import { formatCPF, isValidCPF } from "@/lib/cpf-validator";
import { formatCurrency, formatDate } from "@/lib/brazilian-formatter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { getStatusBadge } from "@/lib/status-utils";
import { useToast } from "@/hooks/use-toast";
import { Footer } from "@/components/footer";

export default function MyOrders() {
  // ALL hooks must be at the very top, before any conditional logic
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [customer, setCustomer] = useState(null);
  const [showOrders, setShowOrders] = useState(false);
  const [lastKnownOrders, setLastKnownOrders] = useState<Order[] | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<CustomerIdentification>({
    resolver: zodResolver(customerIdentificationSchema),
    defaultValues: {
      cpf: "",
      birthDate: "",
    },
  });

  const effectiveCustomer = user || customer;

  const { data: orders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/customers", effectiveCustomer?.id, "orders"],
    enabled: !!effectiveCustomer?.id && (isAuthenticated || showOrders),
    staleTime: 0, // Always fetch fresh data to detect admin changes
    refetchOnMount: true, // Refetch when component mounts
  });

  // Effect to detect status changes and notify user
  useEffect(() => {
    if (orders && orders.length > 0 && lastKnownOrders) {
      // Compare current orders with last known orders to detect status changes
      const statusChanges: { orderNumber: string, oldStatus: string, newStatus: string }[] = [];

      orders.forEach(currentOrder => {
        const previousOrder = lastKnownOrders.find(o => o.id === currentOrder.id);
        if (previousOrder && previousOrder.status !== currentOrder.status) {
          statusChanges.push({
            orderNumber: currentOrder.orderNumber,
            oldStatus: previousOrder.status,
            newStatus: currentOrder.status
          });
        }
      });

      // Show notifications for status changes
      if (statusChanges.length > 0) {
        statusChanges.forEach(change => {
          console.log('📋 Status updated for order', change.orderNumber, 'from', change.oldStatus, 'to', change.newStatus);
          toast({
            title: "Status do pedido atualizado",
            description: `Pedido ${change.orderNumber} foi atualizado para: ${getStatusText(change.newStatus)}`,
            variant: "default",
          });
        });
      }
    }

    // Update last known orders after checking for changes
    if (orders) {
      setLastKnownOrders([...orders]);
    }
  }, [orders, lastKnownOrders, toast]);

  // Helper function to convert status to readable text
  const getStatusText = (status: string) => {
    const statusMap = {
      'pending_payment': 'Aguardando Pagamento',
      'payment_approved': 'Pagamento Aprovado',
      'confirmed': 'Confirmado',
      'in_production': 'Em Produção',
      'ready_for_pickup': 'Pronto para Retirada',
      'in_transit': 'Em Trânsito',
      'delivered': 'Entregue',
      'cancelled': 'Cancelado'
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  const identifyMutation = useMutation({
    mutationFn: async (data: CustomerIdentification) => {
      const response = await apiRequest(
        "POST",
        "/api/customers/identify",
        data,
      );
      return response.json();
    },
    onSuccess: (customerData) => {
      // Invalidate relevant caches for customer identification
      queryClient.invalidateQueries({
        queryKey: ["/api/customers", customerData.id, "orders"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/customers", customerData.id, "addresses"],
      });

      setCustomer(customerData);
      setShowOrders(true);
    },
    onError: () => {
      form.setError("root", {
        message:
          "Cliente não encontrado. Verifique seu CPF e data de nascimento.",
      });
    },
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !showOrders && !customer) {
      sessionStorage.setItem("loginReturnPath", "/my-orders");
      setLocation("/login");
    }
  }, [isLoading, isAuthenticated, showOrders, customer, setLocation]);

  // Handler functions
  const onSubmit = (data: CustomerIdentification) => {
    const cleanCPF = data.cpf.replace(/\D/g, "");
    if (!isValidCPF(cleanCPF)) {
      form.setError("cpf", { message: "CPF inválido" });
      return;
    }
    identifyMutation.mutate({ ...data, cpf: cleanCPF });
  };

  const handleOrderClick = (orderNumber: string) => {
    setLocation(`/orders/${orderNumber}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <Header showBackButton onBack={() => setLocation("/profile")} />
        <div className="p-4 text-center">
          <p className="text-neutral-600">Carregando...</p>
        </div>
        <Footer />
      </div>
    );
  }

  // Redirect state
  if (!isAuthenticated && !showOrders && !customer) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <Header showBackButton onBack={() => setLocation("/profile")} />
        <div className="p-4 text-center">
          <p className="text-neutral-600">Redirecionando para login...</p>
        </div>
        <Footer />
      </div>
    );
  }

  // Authenticated or identified customer view
  if (isAuthenticated || (showOrders && customer)) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
        <Header showBackButton onBack={() => setLocation("/profile")} />
        <div className="p-4 flex-grow">
          <div className="flex items-center mb-6">
            <User className="w-6 h-6 text-primary mr-2" />
            <div>
              <h2 className="text-xl font-bold text-neutral-800">
                {effectiveCustomer!.name}
              </h2>
              <p className="text-sm text-neutral-600">
                {formatCPF(effectiveCustomer!.cpf)}
              </p>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-neutral-800 mb-4">
            Meus Pedidos
          </h3>

          {ordersLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 bg-gray-200 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : orders && Array.isArray(orders) && orders.length > 0 ? (
            <div className="space-y-4">
              {orders
                .sort(
                  (a: Order, b: Order) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime(),
                )
                .map((order: Order) => (
                  <Card
                    key={order.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleOrderClick(order.orderNumber)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-semibold text-neutral-800">
                              #{order.orderNumber}
                            </p>
                            {getStatusBadge(order.status)}
                          </div>

                          {/* Event name - more prominent */}
                          <div className="mb-2">
                            <p className="font-medium text-neutral-800 text-sm">
                              {order.event?.name ||
                                `Evento ID: ${order.eventId}` ||
                                "Evento não identificado"}
                            </p>
                          </div>

                          {/* Kit quantity and date on same line */}
                          <div className="flex items-center justify-between text-sm text-neutral-600 mb-2">
                            <div className="flex items-center">
                              <Package className="w-4 h-4 mr-1" />
                              {order.kitQuantity} kit
                              {order.kitQuantity > 1 ? "s" : ""}
                            </div>
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {(() => {
                                try {
                                  const dateStr = order.createdAt
                                    ? (typeof order.createdAt === "string"
                                        ? order.createdAt
                                        : new Date(
                                            order.createdAt,
                                          ).toISOString()
                                      ).split("T")[0]
                                    : new Date().toISOString().split("T")[0];
                                  return formatDate(dateStr);
                                } catch {
                                  return formatDate(
                                    new Date().toISOString().split("T")[0],
                                  );
                                }
                              })()}
                            </div>
                          </div>

                          <p className="text-lg font-bold text-primary">
                            {formatCurrency(parseFloat(order.totalCost))}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-neutral-400 ml-4" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Package className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                <p className="text-neutral-600">Nenhum pedido encontrado</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setLocation("/eventos")}
                >
                  Fazer Novo Pedido
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
        <Footer />
      </div>
    );
  }

  // Guest identification form
  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
      <Header showBackButton onBack={() => setLocation("/eventos")} />
      <div className="p-4 flex-grow">
        <h2 className="text-2xl font-bold text-neutral-800 mb-2">
          Meus Pedidos
        </h2>
        <p className="text-neutral-600 mb-6">
          Digite seu CPF e data de nascimento para acessar seus pedidos
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="cpf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="000.000.000-00"
                      value={formatCPF(field.value)}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="birthDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Nascimento</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" placeholder="DD/MM/AAAA" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.formState.errors.root && (
              <div className="text-red-500 text-sm text-center">
                {form.formState.errors.root.message}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={identifyMutation.isPending}
            >
              {identifyMutation.isPending
                ? "Verificando..."
                : "Acessar Pedidos"}
            </Button>
          </form>
        </Form>
      </div>
      <Footer />
    </div>
  );
}
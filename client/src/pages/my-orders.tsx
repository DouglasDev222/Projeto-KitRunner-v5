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
import { Package, Calendar, MapPin, ChevronRight, User, ChevronLeft, ChevronDown } from "lucide-react";
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
import { useIsMobile } from "@/hooks/use-mobile";

export default function MyOrders() {
  // ALL hooks must be at the very top, before any conditional logic
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [customer, setCustomer] = useState(null);
  const [showOrders, setShowOrders] = useState(false);
  const [lastKnownOrders, setLastKnownOrders] = useState<Order[] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const ORDERS_PER_PAGE = 5;

  const form = useForm<CustomerIdentification>({
    resolver: zodResolver(customerIdentificationSchema),
    defaultValues: {
      cpf: "",
      birthDate: "",
    },
  });

  const effectiveCustomer = user || customer;

  const { data: ordersData, isLoading: ordersLoading } = useQuery<{
    orders: Order[];
    total: number;
    hasMore: boolean;
  }>({
    queryKey: ["/api/customers", effectiveCustomer?.id, "orders", currentPage],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/customers/${effectiveCustomer!.id}/orders?page=${currentPage}&limit=${ORDERS_PER_PAGE}`
      );
      return response.json();
    },
    enabled: !!effectiveCustomer?.id && (isAuthenticated || showOrders),
    staleTime: 0,
    refetchOnMount: true,
  });

  const orders = ordersData?.orders || [];
  const hasMore = ordersData?.hasMore || false;
  const totalOrders = ordersData?.total || 0;

  // Update all orders when new page data arrives
  useEffect(() => {
    if (currentPage === 1 && orders) {
      // First page - replace all orders
      setAllOrders([...orders]);
    } else if (orders && orders.length > 0) {
      // Subsequent pages - append new orders
      setAllOrders(prev => {
        const existingIds = new Set(prev.map(o => o.id));
        const newOrders = orders.filter(o => !existingIds.has(o.id));
        return [...prev, ...newOrders];
      });
    }
  }, [orders, currentPage]);

  // Effect to detect status changes and notify user
  useEffect(() => {
    if (allOrders && allOrders.length > 0 && lastKnownOrders) {
      const statusChanges: { orderNumber: string, oldStatus: string, newStatus: string }[] = [];

      allOrders.forEach(currentOrder => {
        const previousOrder = lastKnownOrders.find(o => o.id === currentOrder.id);
        if (previousOrder && previousOrder.status !== currentOrder.status) {
          statusChanges.push({
            orderNumber: currentOrder.orderNumber,
            oldStatus: previousOrder.status,
            newStatus: currentOrder.status
          });
        }
      });

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

    if (allOrders) {
      setLastKnownOrders([...allOrders]);
    }
  }, [allOrders, toast]);

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

  const handleLoadMore = () => {
    setCurrentPage(prev => prev + 1);
  };

  const displayedOrders = allOrders
    .sort(
      (a: Order, b: Order) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime(),
    );

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen page-with-footer">
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
      <div className="max-w-md mx-auto bg-white min-h-screen page-with-footer">
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
      <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col page-with-footer">
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

          {currentPage === 1 && ordersLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-24 bg-gray-200 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : displayedOrders && displayedOrders.length > 0 ? (
            <div className="space-y-4">
              {displayedOrders.map((order: Order) => (
                <Card
                  key={order.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleOrderClick(order.orderNumber)}
                  data-testid={`card-order-${order.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-neutral-800" data-testid={`text-order-number-${order.id}`}>
                            #{order.orderNumber}
                          </p>
                          {getStatusBadge(order.status, isMobile)}
                        </div>

                        {/* Event name - more prominent */}
                        <div className="mb-2">
                          <p className="font-medium text-neutral-800 text-sm" data-testid={`text-event-name-${order.id}`}>
                            {(order as any).event?.name ||
                              `Evento ID: ${order.eventId}` ||
                              "Evento não identificado"}
                          </p>
                        </div>

                        {/* Kit quantity and date on same line */}
                        <div className="flex items-center justify-between text-sm text-neutral-600 mb-2">
                          <div className="flex items-center">
                            <Package className="w-4 h-4 mr-1" />
                            <span data-testid={`text-kit-quantity-${order.id}`}>
                              {order.kitQuantity} kit
                              {order.kitQuantity > 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            <span data-testid={`text-order-date-${order.id}`}>
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
                            </span>
                          </div>
                        </div>

                        <p className="text-lg font-bold text-primary" data-testid={`text-order-total-${order.id}`}>
                          {formatCurrency(parseFloat(order.totalCost))}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-neutral-400 ml-4" />
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {/* Load More Button */}
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={ordersLoading}
                    className="w-full"
                    data-testid="button-load-more"
                  >
                    {ordersLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                        Carregando...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <ChevronDown className="w-4 h-4 mr-2" />
                        Carregar mais ({totalOrders - displayedOrders.length} restantes)
                      </div>
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Package className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                <p className="text-neutral-600" data-testid="text-no-orders">Nenhum pedido encontrado</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setLocation("/eventos")}
                  data-testid="button-new-order"
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
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col page-with-footer">
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
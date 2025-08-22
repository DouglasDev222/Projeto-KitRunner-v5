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
import { Package, Calendar, MapPin, ChevronRight, User, ChevronLeft, ChevronDown, Home, Plus } from "lucide-react";
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
  const totalOrders = ordersData?.total || 0;
  const totalPages = Math.ceil(totalOrders / ORDERS_PER_PAGE);

  // Effect to track order changes (disabled to prevent infinite loops)
  // TODO: Implement proper status change detection later
  useEffect(() => {
    // Simple tracking without comparison to avoid infinite loops
    if (orders && orders.length > 0 && !lastKnownOrders) {
      setLastKnownOrders([...orders]);
    }
  }, [orders, lastKnownOrders]);

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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + maxPagesToShow - 1);
      
      if (end - start < maxPagesToShow - 1) {
        start = Math.max(1, end - maxPagesToShow + 1);
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  const displayedOrders = orders
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
      <>
        {/* Mobile Version */}
        <div className="lg:hidden max-w-md mx-auto bg-white min-h-screen flex flex-col page-with-footer">
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
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex flex-col items-center pt-6 space-y-4">
                    {/* Page info */}
                    <p className="text-sm text-neutral-600" data-testid="text-page-info">
                      Página {currentPage} de {totalPages} ({totalOrders} pedidos no total)
                    </p>
                    
                    {/* Page controls */}
                    <div className="flex items-center space-x-2">
                      {/* Previous button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrevPage}
                        disabled={currentPage === 1 || ordersLoading}
                        data-testid="button-previous-page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      
                      {/* Page numbers */}
                      {getPageNumbers().map((pageNum) => (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          disabled={ordersLoading}
                          data-testid={`button-page-${pageNum}`}
                        >
                          {pageNum}
                        </Button>
                      ))}
                      
                      {/* Next button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages || ordersLoading}
                        data-testid="button-next-page"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
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

        {/* Desktop Version */}
        <div className="hidden lg:block min-h-screen bg-gray-50">
          {/* Desktop Header */}
          <nav className="bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-8">
              <div className="flex items-center justify-between h-16">
                {/* Logo */}
                <div className="flex items-center">
                  <img src="/logo.webp" alt="KitRunner" className="h-10 w-auto" />
                </div>

                {/* Navigation Links */}
                <div className="flex items-center space-x-8">
                  <Button
                    variant="ghost"
                    onClick={() => setLocation("/")}
                    className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-lg transition-colors"
                  >
                    <Home className="w-4 h-4" />
                    <span>Início</span>
                  </Button>

                  <Button
                    variant="ghost"
                    className="flex items-center space-x-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-lg font-medium"
                  >
                    <Package className="w-4 h-4" />
                    <span>Pedidos</span>
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={() => setLocation("/eventos")}
                    className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-lg transition-colors"
                  >
                    <Package className="w-4 h-4" />
                    <span>Eventos</span>
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={() => setLocation("/profile")}
                    className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-lg transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span>Perfil</span>
                  </Button>
                </div>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <div className="max-w-6xl mx-auto pt-16 pb-8 px-8">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Left Column - Customer Info */}
              <div className="lg:col-span-2 lg:pr-8">
                <div className="flex items-center mb-6">
                  <Package className="w-8 h-8 text-purple-600 mr-3" />
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Meus Pedidos</h1>
                    <p className="text-lg text-gray-600 mt-2">Acompanhe o status dos seus pedidos de kits</p>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <h3 className="font-semibold text-xl text-gray-900 mb-4">Informações do Cliente</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <User className="w-5 h-5 text-purple-600" />
                      <span className="text-gray-700 font-medium">{effectiveCustomer!.name}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Package className="w-5 h-5 text-purple-600" />
                      <span className="text-gray-700">{formatCPF(effectiveCustomer!.cpf)}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <MapPin className="w-5 h-5 text-purple-600" />
                      <span className="text-gray-700">{totalOrders} pedidos no total</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-3">Ações Rápidas</h4>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => setLocation("/profile")}
                      >
                        <User className="w-4 h-4 mr-2" />
                        Ver Perfil
                      </Button>
                      <Button
                        className="w-full justify-start bg-purple-600 hover:bg-purple-700"
                        onClick={() => setLocation("/eventos")}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Fazer Novo Pedido
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Orders List */}
              <div className="lg:col-span-3">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900">Lista de Pedidos</h2>
                    {totalOrders > 0 && (
                      <p className="text-gray-600 mt-2">
                        Página {currentPage} de {totalPages} • {totalOrders} pedidos no total
                      </p>
                    )}
                  </div>

                  <div className="p-6">
                    {ordersLoading ? (
                      <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className="h-32 bg-gray-200 rounded-lg animate-pulse"
                          />
                        ))}
                      </div>
                    ) : displayedOrders && displayedOrders.length > 0 ? (
                      <div className="space-y-4">
                        {displayedOrders.map((order: Order) => (
                          <Card
                            key={order.id}
                            className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-purple-500"
                            onClick={() => handleOrderClick(order.orderNumber)}
                            data-testid={`card-order-${order.id}`}
                          >
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-3">
                                    <div>
                                      <p className="text-xl font-bold text-gray-900" data-testid={`text-order-number-${order.id}`}>
                                        #{order.orderNumber}
                                      </p>
                                      <p className="text-sm text-gray-600 mt-1">
                                        Pedido realizado em {(() => {
                                          try {
                                            const dateStr = order.createdAt
                                              ? (typeof order.createdAt === "string"
                                                  ? order.createdAt
                                                  : new Date(order.createdAt).toISOString()
                                                ).split("T")[0]
                                              : new Date().toISOString().split("T")[0];
                                            return formatDate(dateStr);
                                          } catch {
                                            return formatDate(new Date().toISOString().split("T")[0]);
                                          }
                                        })()}
                                      </p>
                                    </div>
                                    {getStatusBadge(order.status, false)}
                                  </div>

                                  <div className="mb-4">
                                    <p className="text-lg font-semibold text-gray-800" data-testid={`text-event-name-${order.id}`}>
                                      {(order as any).event?.name ||
                                        `Evento ID: ${order.eventId}` ||
                                        "Evento não identificado"}
                                    </p>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-6 text-gray-600">
                                      <div className="flex items-center">
                                        <Package className="w-5 h-5 mr-2" />
                                        <span data-testid={`text-kit-quantity-${order.id}`}>
                                          {order.kitQuantity} kit{order.kitQuantity > 1 ? "s" : ""}
                                        </span>
                                      </div>
                                    </div>
                                    <p className="text-2xl font-bold text-purple-600" data-testid={`text-order-total-${order.id}`}>
                                      {formatCurrency(parseFloat(order.totalCost))}
                                    </p>
                                  </div>
                                </div>
                                <ChevronRight className="w-6 h-6 text-gray-400 ml-6" />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        
                        {/* Desktop Pagination Controls */}
                        {totalPages > 1 && (
                          <div className="flex flex-col items-center pt-8 space-y-4">
                            <div className="flex items-center space-x-3">
                              <Button
                                variant="outline"
                                onClick={handlePrevPage}
                                disabled={currentPage === 1 || ordersLoading}
                                data-testid="button-previous-page"
                                className="px-6"
                              >
                                <ChevronLeft className="w-4 h-4 mr-2" />
                                Anterior
                              </Button>
                              
                              {getPageNumbers().map((pageNum) => (
                                <Button
                                  key={pageNum}
                                  variant={currentPage === pageNum ? "default" : "outline"}
                                  onClick={() => handlePageChange(pageNum)}
                                  disabled={ordersLoading}
                                  data-testid={`button-page-${pageNum}`}
                                  className={currentPage === pageNum ? "bg-purple-600 hover:bg-purple-700" : ""}
                                >
                                  {pageNum}
                                </Button>
                              ))}
                              
                              <Button
                                variant="outline"
                                onClick={handleNextPage}
                                disabled={currentPage === totalPages || ordersLoading}
                                data-testid="button-next-page"
                                className="px-6"
                              >
                                Próximo
                                <ChevronRight className="w-4 h-4 ml-2" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum pedido encontrado</h3>
                        <p className="text-gray-600 mb-6">Você ainda não fez nenhum pedido</p>
                        <Button
                          className="bg-purple-600 hover:bg-purple-700"
                          onClick={() => setLocation("/eventos")}
                          data-testid="button-new-order"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Fazer Primeiro Pedido
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
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
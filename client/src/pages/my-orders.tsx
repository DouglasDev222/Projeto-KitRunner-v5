import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, Calendar, MapPin, ChevronRight, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { customerIdentificationSchema, type CustomerIdentification, type Order, type Kit } from "@shared/schema";
import { formatCPF, isValidCPF } from "@/lib/cpf-validator";
import { formatCurrency, formatDate } from "@/lib/brazilian-formatter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";

// Status translation function
const getStatusLabel = (status: string): string => {
  const statusMap: Record<string, string> = {
    'confirmed': 'Confirmado',
    'pending': 'Pendente',
    'processing': 'Processando',
    'shipped': 'Enviado',
    'delivered': 'Entregue',
    'cancelled': 'Cancelado'
  };
  return statusMap[status] || status;
};

export default function MyOrders() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [customer, setCustomer] = useState(null);
  const [showOrders, setShowOrders] = useState(false);

  // Use effect to handle redirection to avoid React warning
  useEffect(() => {
    if (!isAuthenticated && !showOrders && !customer) {
      setLocation("/login");
    }
  }, [isAuthenticated, showOrders, customer, setLocation]);

  // If user is not authenticated, show loading while redirecting
  if (!isAuthenticated && !showOrders && !customer) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <Header showBackButton onBack={() => setLocation("/")} />
        <div className="p-4 text-center">
          <p className="text-neutral-600">Redirecionando para login...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated, use that, otherwise require login
  const effectiveCustomer = user || customer;

  const form = useForm<CustomerIdentification>({
    resolver: zodResolver(customerIdentificationSchema),
    defaultValues: {
      cpf: "",
      birthDate: "",
    },
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["orders", effectiveCustomer?.id],
    queryFn: async () => {
      const response = await fetch(`/api/customers/${effectiveCustomer!.id}/orders`);
      return response.json();
    },
    enabled: !!effectiveCustomer?.id && (isAuthenticated || showOrders),
  });

  const identifyMutation = useMutation({
    mutationFn: async (data: CustomerIdentification) => {
      const response = await apiRequest("POST", "/api/customers/identify", data);
      return response.json();
    },
    onSuccess: (customerData) => {
      setCustomer(customerData);
      setShowOrders(true);
    },
    onError: () => {
      form.setError("root", {
        message: "Cliente não encontrado. Verifique seu CPF e data de nascimento.",
      });
    },
  });

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

  // If authenticated, skip login form
  if (isAuthenticated || (showOrders && customer)) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <Header showBackButton onBack={() => setLocation("/")} />
        <div className="p-4">
          <div className="flex items-center mb-6">
            <User className="w-6 h-6 text-primary mr-2" />
            <div>
              <h2 className="text-xl font-bold text-neutral-800">{effectiveCustomer!.name}</h2>
              <p className="text-sm text-neutral-600">{formatCPF(effectiveCustomer!.cpf)}</p>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-neutral-800 mb-4">Meus Pedidos</h3>

          {ordersLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : orders && orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order: Order) => (
                <Card 
                  key={order.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleOrderClick(order.orderNumber)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-neutral-800">#{order.orderNumber}</p>
                          <Badge 
                            variant="default" 
                            className="bg-secondary hover:bg-secondary/80"
                          >
                            {getStatusLabel(order.status)}
                          </Badge>
                        </div>
                        <div className="flex items-center text-sm text-neutral-600 mb-1">
                          <Package className="w-4 h-4 mr-2" />
                          {order.kitQuantity} kit{order.kitQuantity > 1 ? 's' : ''}
                        </div>
                        <div className="flex items-center text-sm text-neutral-600 mb-2">
                          <Calendar className="w-4 h-4 mr-2" />
                          {formatDate(typeof order.createdAt === 'string' ? order.createdAt.split('T')[0] : new Date(order.createdAt as any).toISOString().split('T')[0])}
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
                  onClick={() => setLocation("/")}
                >
                  Fazer Novo Pedido
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      <Header showBackButton onBack={() => setLocation("/")} />
      <div className="p-4">
        <h2 className="text-2xl font-bold text-neutral-800 mb-2">Meus Pedidos</h2>
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
                    <Input
                      {...field}
                      type="date"
                      placeholder="DD/MM/AAAA"
                    />
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
              {identifyMutation.isPending ? "Verificando..." : "Acessar Pedidos"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminLayout } from "@/components/admin-layout";
import { AdminAuth } from "@/components/admin-auth";
import { Users, Package, Calendar, Plus, DollarSign } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatDate } from "@/lib/brazilian-formatter";
import { formatCPF } from "@/lib/cpf-validator";
import type { Customer, Order, Event } from "@shared/schema";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const authStatus = localStorage.getItem("adminAuthenticated");
    setIsAuthenticated(authStatus === "true");
  }, []);

  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ["admin", "customers"],
    queryFn: async () => {
      const response = await fetch("/api/admin/customers");
      return response.json();
    },
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: async () => {
      const response = await fetch("/api/admin/orders");
      return response.json();
    },
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["admin", "events"],
    queryFn: async () => {
      const response = await fetch("/api/admin/events");
      return response.json();
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const response = await fetch("/api/admin/stats");
      return response.json();
    },
  });

  if (!isAuthenticated) {
    return <AdminAuth onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-neutral-800">Dashboard</h1>
          <p className="text-neutral-600">Visão geral do sistema</p>
        </div>
        <Button
          onClick={() => setLocation("/admin/events/new")}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Evento
        </Button>
      </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-neutral-600">Total Clientes</p>
                  <p className="text-2xl font-bold text-neutral-900">{stats?.totalCustomers || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Package className="w-8 h-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-neutral-600">Total Pedidos</p>
                  <p className="text-2xl font-bold text-neutral-900">{stats?.totalOrders || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="w-8 h-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-neutral-600">Eventos Ativos</p>
                  <p className="text-2xl font-bold text-neutral-900">{stats?.activeEvents || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="w-8 h-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-neutral-600">Faturamento</p>
                  <p className="text-2xl font-bold text-neutral-900">
                    {formatCurrency(stats?.totalRevenue || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="customers" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="customers">Clientes</TabsTrigger>
            <TabsTrigger value="orders">Pedidos</TabsTrigger>
            <TabsTrigger value="events">Eventos</TabsTrigger>
          </TabsList>

          {/* Customers Tab */}
          <TabsContent value="customers" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Clientes Cadastrados</CardTitle>
              </CardHeader>
              <CardContent>
                {customersLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-100 animate-pulse rounded"></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(customers || []).map((customer: Customer) => (
                      <div key={customer.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h3 className="font-medium text-neutral-800">{customer.name}</h3>
                          <div className="flex gap-4 text-sm text-neutral-600 mt-1">
                            <span>CPF: {formatCPF(customer.cpf)}</span>
                            <span>Email: {customer.email}</span>
                            <span>Telefone: {customer.phone}</span>
                          </div>
                        </div>
                        <div className="text-sm text-neutral-500">
                          {new Date(customer.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Pedidos Realizados</CardTitle>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-20 bg-gray-100 animate-pulse rounded"></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(orders || []).map((order: Order & { customer: Customer; event: Event }) => (
                      <div key={order.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary">{order.orderNumber}</Badge>
                            <span className="font-medium">{order.customer?.name}</span>
                          </div>
                          <Badge variant={order.status === "confirmed" ? "default" : "secondary"}>
                            {order.status === "confirmed" ? "Confirmado" : order.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-neutral-600">
                          <div>
                            <span className="font-medium">Evento:</span> {order.event?.name}
                          </div>
                          <div>
                            <span className="font-medium">Kits:</span> {order.kitQuantity}
                          </div>
                          <div>
                            <span className="font-medium">Total:</span> {formatCurrency(Number(order.totalCost))}
                          </div>
                          <div>
                            <span className="font-medium">Data:</span> {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Eventos</CardTitle>
                  <Button
                    onClick={() => setLocation("/admin/events/new")}
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Evento
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {eventsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-24 bg-gray-100 animate-pulse rounded"></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(events || []).map((event: Event) => (
                      <div key={event.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-neutral-800">{event.name}</h3>
                          <Badge variant={event.available ? "default" : "secondary"}>
                            {event.available ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-neutral-600">
                          <div>
                            <span className="font-medium">Data:</span> {formatDate(event.date)}
                          </div>
                          <div>
                            <span className="font-medium">Local:</span> {event.location}
                          </div>
                          <div>
                            <span className="font-medium">Cidade:</span> {event.city} - {event.state}
                          </div>
                          {event.fixedPrice && (
                            <div>
                              <span className="font-medium">Preço Fixo:</span> {formatCurrency(Number(event.fixedPrice))}
                            </div>
                          )}
                          {event.donationRequired && (
                            <div>
                              <span className="font-medium">Doação:</span> {event.donationDescription}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </AdminLayout>
  );
}
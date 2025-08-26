import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";
import { CalendarIcon } from "lucide-react";
import { AdminLayout } from "@/components/admin-layout";
import { 
  Users, 
  Package, 
  Calendar as CalendarIcon2, 
  Plus, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Download,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3
} from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatDate } from "@/lib/brazilian-formatter";
import { getStatusBadge } from "@/lib/status-utils";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from "recharts";
import type { Customer, Order, Event } from "@shared/schema";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const statusColors = {
  confirmed: '#10B981',
  awaiting_payment: '#F59E0B',
  cancelled: '#EF4444',
  in_transit: '#3B82F6',
  delivered: '#059669'
};

interface StatsData {
  totalCustomers?: number;
  totalOrders?: number;
  activeEvents?: number;
  totalRevenue?: number;
  confirmedOrders?: number;
  awaitingPayment?: number;
  cancelledOrders?: number;
  inTransitOrders?: number;
  deliveredOrders?: number;
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  
  // Definir período padrão de 1 mês
  const getDefaultDateRange = (): DateRange => {
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { from: monthAgo, to: now };
  };

  const [customDateRange, setCustomDateRange] = useState<DateRange>(getDefaultDateRange());

  const getDateRange = () => {
    const startDate = customDateRange.from?.toISOString().split('T')[0] || '';
    const endDate = customDateRange.to?.toISOString().split('T')[0] || '';
    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();

  const { data: stats = {}, isLoading: statsLoading } = useQuery<StatsData>({
    queryKey: ["/api/admin/stats", { status: "all", startDate, endDate }],
    enabled: !!startDate && !!endDate,
  });

  // Calcular período anterior para comparação
  const getPreviousPeriod = () => {
    if (!customDateRange.from || !customDateRange.to) return { startDate: '', endDate: '' };
    
    const currentFrom = customDateRange.from;
    const currentTo = customDateRange.to;
    const diffTime = currentTo.getTime() - currentFrom.getTime();
    
    const previousTo = new Date(currentFrom.getTime() - 1);
    const previousFrom = new Date(previousTo.getTime() - diffTime);
    
    return {
      startDate: previousFrom.toISOString().split('T')[0],
      endDate: previousTo.toISOString().split('T')[0]
    };
  };

  const previousPeriod = getPreviousPeriod();

  const { data: previousStats = {} } = useQuery<StatsData>({
    queryKey: ["/api/admin/stats", { status: "all", startDate: previousPeriod.startDate, endDate: previousPeriod.endDate }],
    enabled: !!previousPeriod.startDate && !!previousPeriod.endDate,
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/admin/orders", { status: "all", startDate, endDate }],
    enabled: !!startDate && !!endDate,
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/admin/events"],
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/admin/customers"],
  });

  // Processar dados para gráficos
  const processOrdersForChart = () => {
    const ordersArray = Array.isArray(orders) ? orders : [];
    const ordersByDate = ordersArray.reduce((acc: any, order: any) => {
      const date = new Date(order.createdAt).toLocaleDateString('pt-BR');
      if (!acc[date]) {
        acc[date] = { date, pedidos: 0, faturamento: 0 };
      }
      acc[date].pedidos += 1;
      acc[date].faturamento += Number(order.totalCost) || 0;
      return acc;
    }, {});

    return Object.values(ordersByDate)
      .sort((a: any, b: any) => new Date(a.date.split('/').reverse().join('-')).getTime() - new Date(b.date.split('/').reverse().join('-')).getTime())
      .slice(-7); // Últimos 7 dias ordenados corretamente
  };

  const processStatusData = () => {
    const ordersArray = Array.isArray(orders) ? orders : [];
    const statusCount = ordersArray.reduce((acc: any, order: any) => {
      const status = order.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(statusCount).map(([name, value]) => ({
      name: name === 'confirmed' ? 'Confirmados' :
            name === 'awaiting_payment' ? 'Aguardando Pagamento' :
            name === 'cancelled' ? 'Cancelados' :
            name === 'in_transit' ? 'Em Trânsito' :
            name === 'delivered' ? 'Entregues' : name,
      value,
      color: statusColors[name as keyof typeof statusColors] || '#8884D8'
    }));
  };

  const chartData = processOrdersForChart();
  const statusData = processStatusData();

  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const formatPercentageChange = (current: number, previous: number) => {
    const change = getPercentageChange(current, previous);
    const isPositive = change >= 0;
    return {
      value: Math.abs(change).toFixed(1),
      isPositive,
      icon: isPositive ? ArrowUpRight : ArrowDownRight,
      color: isPositive ? 'text-green-600' : 'text-red-600'
    };
  };

  return (
    <AdminLayout>
      {/* Header com Filtros */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Visão geral e análise do sistema</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Popover open={showCustomPicker} onOpenChange={setShowCustomPicker}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[200px] justify-start">
                <CalendarIcon className="w-4 h-4 mr-2" />
                {customDateRange.from && customDateRange.to ? (
                  `${customDateRange.from.toLocaleDateString('pt-BR')} - ${customDateRange.to.toLocaleDateString('pt-BR')}`
                ) : (
                  'Selecionar Período'
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={customDateRange}
                onSelect={(range) => {
                  if (range) {
                    setCustomDateRange(range);
                    if (range?.from && range?.to) {
                      setShowCustomPicker(false);
                    }
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="sm" onClick={() => setLocation('/admin/reports')}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          
          <Button onClick={() => setLocation("/admin/events/new")} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            Novo Evento
          </Button>
        </div>
      </div>

      {/* Cards de Estatísticas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Clientes</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {statsLoading ? '...' : (stats.totalCustomers || 0)}
                </p>
                <div className="flex items-center mt-2 text-sm">
                  {(() => {
                    const change = formatPercentageChange(stats.totalCustomers || 0, previousStats.totalCustomers || 0);
                    const Icon = change.icon;
                    return (
                      <>
                        <Icon className={`w-4 h-4 mr-1 ${change.color}`} />
                        <span className={change.color}>{change.isPositive ? '+' : '-'}{change.value}%</span>
                        <span className="text-gray-500 ml-1">vs período anterior</span>
                      </>
                    );
                  })()}
                </div>
              </div>
              <div className="p-3 bg-blue-500 rounded-full">
                <Users className="w-8 h-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Pedidos</p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                  {statsLoading ? '...' : (stats.totalOrders || 0)}
                </p>
                <div className="flex items-center mt-2 text-sm">
                  {(() => {
                    const change = formatPercentageChange(stats.totalOrders || 0, previousStats.totalOrders || 0);
                    const Icon = change.icon;
                    return (
                      <>
                        <Icon className={`w-4 h-4 mr-1 ${change.color}`} />
                        <span className={change.color}>{change.isPositive ? '+' : '-'}{change.value}%</span>
                        <span className="text-gray-500 ml-1">vs período anterior</span>
                      </>
                    );
                  })()}
                </div>
              </div>
              <div className="p-3 bg-green-500 rounded-full">
                <Package className="w-8 h-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Eventos Ativos</p>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                  {statsLoading ? '...' : (stats.activeEvents || 0)}
                </p>
                <div className="flex items-center mt-2 text-sm">
                  {(() => {
                    const change = formatPercentageChange(stats.activeEvents || 0, previousStats.activeEvents || 0);
                    const Icon = change.icon;
                    return (
                      <>
                        <Icon className={`w-4 h-4 mr-1 ${change.color}`} />
                        <span className={change.color}>{change.isPositive ? '+' : '-'}{change.value}%</span>
                        <span className="text-gray-500 ml-1">vs período anterior</span>
                      </>
                    );
                  })()}
                </div>
              </div>
              <div className="p-3 bg-purple-500 rounded-full">
                <CalendarIcon2 className="w-8 h-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Faturamento</p>
                <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                  {statsLoading ? '...' : formatCurrency(stats.totalRevenue || 0)}
                </p>
                <div className="flex items-center mt-2 text-sm">
                  {(() => {
                    const change = formatPercentageChange(stats.totalRevenue || 0, previousStats.totalRevenue || 0);
                    const Icon = change.icon;
                    return (
                      <>
                        <Icon className={`w-4 h-4 mr-1 ${change.color}`} />
                        <span className={change.color}>{change.isPositive ? '+' : '-'}{change.value}%</span>
                        <span className="text-gray-500 ml-1">vs período anterior</span>
                      </>
                    );
                  })()}
                </div>
              </div>
              <div className="p-3 bg-orange-500 rounded-full">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards de Status dos Pedidos */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.confirmedOrders || 0}</p>
            <p className="text-sm opacity-90">Confirmados</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-0">
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.awaitingPayment || 0}</p>
            <p className="text-sm opacity-90">Aguardando</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-4 text-center">
            <Package className="w-8 h-8 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.inTransitOrders || 0}</p>
            <p className="text-sm opacity-90">Em Trânsito</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0">
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.deliveredOrders || 0}</p>
            <p className="text-sm opacity-90">Entregues</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0">
          <CardContent className="p-4 text-center">
            <XCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.cancelledOrders || 0}</p>
            <p className="text-sm opacity-90">Cancelados</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Pedidos por Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="pedidos" 
                  stroke="#3B82F6" 
                  fill="url(#colorPedidos)" 
                />
                <defs>
                  <linearGradient id="colorPedidos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Status dos Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={(entry) => entry.name}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabelas Resumidas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Pedidos Recentes
              </span>
              <Button variant="ghost" size="sm" onClick={() => setLocation('/admin/orders')}>
                <Eye className="w-4 h-4 mr-1" />
                Ver Todos
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ordersLoading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg"></div>
                ))
              ) : (
                Array.isArray(orders) && orders.slice(0, 5).map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{order.orderNumber}</Badge>
                        <span className="font-medium text-sm">{order.customer?.name}</span>
                        {getStatusBadge(order.status)}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {order.event?.name} • {formatCurrency(Number(order.totalCost))}
                      </p>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                Eventos Ativos
              </span>
              <Button variant="ghost" size="sm" onClick={() => setLocation('/admin/events')}>
                <Eye className="w-4 h-4 mr-1" />
                Ver Todos
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {eventsLoading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg"></div>
                ))
              ) : (
                events.slice(0, 5).map((event: Event) => (
                  <div key={event.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-medium text-sm">{event.name}</h4>
                        <Badge variant={event.available ? "default" : "secondary"}>
                          {event.available ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {formatDate(event.date)} • {event.city}, {event.state}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
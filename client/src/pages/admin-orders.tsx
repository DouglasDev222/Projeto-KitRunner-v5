import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AdminLayout } from "@/components/admin-layout";
// Sistema novo: AdminRouteGuard protege esta página
import { OrderStatusHistory } from "@/components/order-status-history";
import { 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Mail,
  Calendar,
  MapPin,
  User,
  Package,
  DollarSign,
  ChevronDown,
  ExternalLink,
  FileText,
  Download,
  FileSpreadsheet,
  MessageCircle
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate } from "@/lib/brazilian-formatter";
import { formatCPF } from "@/lib/cpf-validator";
import { useToast } from "@/hooks/use-toast";
import { statusOptions, getStatusBadge } from "@/lib/status-utils";
import { EmailConfirmationModal } from "@/components/admin/EmailConfirmationModal";
import { WhatsAppModal } from "@/components/admin/WhatsAppModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis
} from "@/components/ui/pagination";

interface OrderFilters {
  status: string;
  eventId?: number;
  orderNumber?: string;
  customerName?: string;
  startDate?: string;
  endDate?: string;
}

const paymentMethodLabels: { [key: string]: string } = {
  credit: 'Cartão de Crédito',
  debit: 'Cartão de Débito',
  pix: 'PIX',
};

export default function AdminOrders() {
  // Sistema novo: AdminRouteGuard já protege
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppOrder, setWhatsAppOrder] = useState<any>(null);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [filters, setFilters] = useState<OrderFilters>({
    status: 'all'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [bulkStatusModalOpen, setBulkStatusModalOpen] = useState(false);
  const [bulkNewStatus, setBulkNewStatus] = useState("");
  const [sendBulkEmails, setSendBulkEmails] = useState(false);
  const [emailConfirmationModal, setEmailConfirmationModal] = useState<{
    isOpen: boolean;
    orderId: number;
    orderNumber: string;
    customerName: string;
    newStatus: string;
  }>({
    isOpen: false,
    orderId: 0,
    orderNumber: "",
    customerName: "",
    newStatus: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Aggressive body style cleanup to prevent modal blocking
  useEffect(() => {
    const forceBodyCleanup = () => {
      document.body.style.removeProperty('pointer-events');
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('padding-right');
      document.body.classList.remove('pointer-events-none');
    };

    // Create a mutation observer to watch for unwanted body styles
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.target === document.body) {
          const body = mutation.target as HTMLElement;
          
          // If pointer-events: none is detected and no modals are open, remove it
          if (!emailConfirmationModal.isOpen && !showOrderDialog) {
            if (body.style.pointerEvents === 'none') {
              forceBodyCleanup();
            }
          }
        }
      });
    });

    // Start observing body for style changes
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['style', 'class']
    });

    // Initial cleanup
    forceBodyCleanup();

    // Cleanup on component unmount
    return () => {
      observer.disconnect();
      forceBodyCleanup();
    };
  }, []);

  // Monitor modal states and cleanup if needed
  useEffect(() => {
    if (!emailConfirmationModal.isOpen && !showOrderDialog) {
      // If no modals are open, ensure body is clean
      const cleanup = () => {
        document.body.style.removeProperty('pointer-events');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('padding-right');
      };
      
      // Multiple cleanup attempts
      cleanup();
      setTimeout(cleanup, 50);
      setTimeout(cleanup, 150);
    }
  }, [emailConfirmationModal.isOpen, showOrderDialog]);

  // Sistema novo: AdminRouteGuard já protege - não precisa de verificação

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ["/api/admin/orders", { 
      page: currentPage, 
      pageSize: pageSize,
      paginated: true,
      ...filters 
    }],
  });

  const orders = ordersData?.orders || [];
  const totalPages = ordersData?.totalPages || 1;
  const totalOrders = ordersData?.total || 0;

  const { data: events } = useQuery({
    queryKey: ["/api/admin/events"],
  });

  const { data: eventsForReports } = useQuery({
    queryKey: ["/api/admin/reports/events"],
  });

  const { data: orderStats } = useQuery({
    queryKey: ["/api/admin/stats"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status, sendEmail }: { orderId: number; status: string; sendEmail: boolean }) => {
      const adminToken = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status, sendEmail }),
      });
      if (!response.ok) throw new Error('Erro ao atualizar status');
      return response.json();
    },
    onSuccess: (_, variables) => {
      // Close modal first
      closeEmailConfirmationModal();
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      
      // Show toast
      toast({
        title: "Status atualizado com sucesso!",
        description: variables.sendEmail 
          ? "O status do pedido foi atualizado e o cliente foi notificado por email." 
          : "O status do pedido foi atualizado sem envio de email.",
      });
    },
    onError: () => {
      // Close modal on error too
      closeEmailConfirmationModal();
      
      toast({
        title: "Erro ao atualizar status",
        description: "Não foi possível atualizar o status do pedido.",
        variant: "destructive",
      });
    },
  });

  // Bulk status change mutation
  const bulkStatusMutation = useMutation({
    mutationFn: async ({ orderIds, newStatus, sendEmails }: { orderIds: number[]; newStatus: string; sendEmails: boolean }) => {
      const adminToken = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/orders/bulk-status-change', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ orderIds, newStatus, sendEmails }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar status em massa');
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Close modal and clear selections
      setBulkStatusModalOpen(false);
      setSelectedOrders([]);
      setBulkNewStatus("");
      setSendBulkEmails(false);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      
      // Show detailed success toast
      toast({
        title: "Alteração em massa concluída!",
        description: `${data.successCount} pedidos atualizados com sucesso. ${data.emailsSent ? `${data.emailsSent} e-mails enviados.` : 'Nenhum e-mail foi enviado.'}`,
      });

      // Show partial failure warning if any
      if (data.errors && data.errors.length > 0) {
        setTimeout(() => {
          toast({
            title: "Algumas atualizações falharam",
            description: `${data.errors.length} pedidos não puderam ser atualizados.`,
            variant: "destructive",
          });
        }, 2000);
      }
    },
    onError: (error: any) => {
      setBulkStatusModalOpen(false);
      
      toast({
        title: "Erro na alteração em massa",
        description: error.message || "Não foi possível atualizar os pedidos selecionados.",
        variant: "destructive",
      });
    },
  });

  // Query for individual order details
  const { data: selectedOrderData, refetch: refetchOrderDetails } = useQuery({
    queryKey: [`/api/admin/orders/${selectedOrderId}`],
    enabled: false, // Only fetch when explicitly called
  });

  const handleViewOrder = async (orderId: number) => {
    try {
      setSelectedOrderId(orderId);
      const result = await queryClient.fetchQuery({
        queryKey: [`/api/admin/orders/${orderId}`],
      });
      setSelectedOrder(result);
      setShowOrderDialog(true);
    } catch (error) {
      toast({
        title: "Erro ao carregar pedido",
        description: "Não foi possível carregar os detalhes do pedido.",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = (orderId: number, newStatus: string) => {
    // Close order details modal if open to prevent overlay conflicts
    if (showOrderDialog) {
      setShowOrderDialog(false);
    }
    
    // Find the order to get customer name and order number
    const order = orders.find((o: any) => o.id === orderId);
    if (order) {
      setEmailConfirmationModal({
        isOpen: true,
        orderId,
        orderNumber: order.orderNumber,
        customerName: order.customer.name,
        newStatus,
      });
    }
  };

  const handleConfirmStatusChange = (sendEmail: boolean) => {
    updateStatusMutation.mutate({ 
      orderId: emailConfirmationModal.orderId, 
      status: emailConfirmationModal.newStatus,
      sendEmail 
    });
  };

  // Close email confirmation modal properly
  const closeEmailConfirmationModal = () => {
    setEmailConfirmationModal({ 
      isOpen: false, 
      orderId: 0, 
      orderNumber: "", 
      customerName: "", 
      newStatus: "" 
    });
    
    // Aggressive cleanup of body styles that might be left behind by modal
    const forceCleanup = () => {
      document.body.style.removeProperty('pointer-events');
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('padding-right');
      document.body.classList.remove('pointer-events-none');
    };
    
    // Multiple cleanup attempts with different timings
    forceCleanup();
    setTimeout(forceCleanup, 10);
    setTimeout(forceCleanup, 50);
    setTimeout(forceCleanup, 150);
    setTimeout(forceCleanup, 300);
  };

  const resetFilters = () => {
    setFilters({ status: 'all' });
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSelectOrder = (orderId: number, checked: boolean) => {
    setSelectedOrders(prev => 
      checked ? [...prev, orderId] : prev.filter(id => id !== orderId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedOrders(checked ? orders.map((order: any) => order.id) : []);
  };

  // Get the event for selected orders (all must be from same event)
  const getSelectedOrdersEvent = () => {
    if (selectedOrders.length === 0) return null;
    const selectedOrdersData = orders.filter((order: any) => selectedOrders.includes(order.id));
    const eventIds = Array.from(new Set(selectedOrdersData.map((order: any) => order.eventId)));
    return eventIds.length === 1 ? selectedOrdersData[0]?.event : null;
  };

  // Check if all selected orders are from the same event
  const canPerformBulkOperation = () => {
    if (selectedOrders.length === 0) return false;
    const selectedOrdersData = orders.filter((order: any) => selectedOrders.includes(order.id));
    const eventIds = Array.from(new Set(selectedOrdersData.map((order: any) => order.eventId)));
    return eventIds.length === 1;
  };

  const handleBulkStatusChange = () => {
    if (!canPerformBulkOperation()) {
      toast({
        title: "Seleção inválida",
        description: "Todos os pedidos selecionados devem ser do mesmo evento.",
        variant: "destructive",
      });
      return;
    }
    setBulkStatusModalOpen(true);
  };

  const handleConfirmBulkStatusChange = () => {
    if (!bulkNewStatus) {
      toast({
        title: "Status obrigatório",
        description: "Selecione o novo status para os pedidos.",
        variant: "destructive",
      });
      return;
    }

    bulkStatusMutation.mutate({
      orderIds: selectedOrders,
      newStatus: bulkNewStatus,
      sendEmails: sendBulkEmails,
    });
  };

  // WhatsApp modal functions
  const handleOpenWhatsApp = (order: any) => {
    setWhatsAppOrder(order);
    setShowWhatsAppModal(true);
  };

  const handleCloseWhatsApp = () => {
    setShowWhatsAppModal(false);
    setWhatsAppOrder(null);
  };

  // Label generation functions
  const handleGenerateLabel = async (orderId: number, orderNumber: string) => {
    try {
      const response = await apiRequest('GET', `/api/admin/orders/${orderId}/label`);
      if (!response.ok) {
        throw new Error('Erro ao gerar etiqueta');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `etiqueta-${orderNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Etiqueta gerada com sucesso",
        description: `Etiqueta do pedido ${orderNumber} foi baixada`,
      });
    } catch (error) {
      toast({
        title: "Erro ao gerar etiqueta",
        description: "Não foi possível gerar a etiqueta do pedido",
        variant: "destructive",
      });
    }
  };

  const handleGenerateEventLabels = async (eventId: number, eventName: string) => {
    try {
      const response = await apiRequest('GET', `/api/admin/events/${eventId}/labels`);
      if (!response.ok) {
        throw new Error('Erro ao gerar etiquetas');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `etiquetas-${eventName.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Etiquetas geradas com sucesso",
        description: `Etiquetas do evento ${eventName} foram baixadas`,
      });
    } catch (error) {
      toast({
        title: "Erro ao gerar etiquetas",
        description: "Não foi possível gerar as etiquetas do evento",
        variant: "destructive",
      });
    }
  };

  const handleGenerateKitsReport = async (eventId: number, eventName: string) => {
    try {
      const response = await apiRequest('GET', `/api/admin/reports/kits/${eventId}`);
      if (!response.ok) {
        throw new Error('Erro ao gerar relatório');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || `relatorio-kits-${eventName.replace(/[^a-zA-Z0-9]/g, '-')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Relatório de kits gerado com sucesso",
        description: `Relatório do evento ${eventName} foi baixado`,
      });
    } catch (error) {
      toast({
        title: "Erro ao gerar relatório",
        description: "Não foi possível gerar o relatório de kits",
        variant: "destructive",
      });
    }
  };

  // Sistema novo: AdminRouteGuard já protege - não precisa de verificação

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-800">Gerenciamento de Pedidos</h1>
            <p className="text-neutral-600">Visualize, gerencie e acompanhe todos os pedidos</p>
          </div>
          <div className="flex gap-2">
            {events && events.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Etiquetas por Evento
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {events.map((event: any) => (
                    <DropdownMenuItem
                      key={event.id}
                      onClick={() => handleGenerateEventLabels(event.id, event.name)}
                    >
                      {event.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {eventsForReports && eventsForReports.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Relatório de Kits
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {eventsForReports.map((event: any) => (
                    <DropdownMenuItem
                      key={event.id}
                      onClick={() => handleGenerateKitsReport(event.id, event.name)}
                    >
                      {event.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Statistics Cards */}
        {orderStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total</p>
                    <p className="text-2xl font-bold">{orderStats.totalOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Confirmados</p>
                    <p className="text-2xl font-bold">{orderStats.confirmedOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Aguardando</p>
                    <p className="text-2xl font-bold">{orderStats.awaitingPayment}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Cancelados</p>
                    <p className="text-2xl font-bold">{orderStats.cancelledOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Em Trânsito</p>
                    <p className="text-2xl font-bold">{orderStats.inTransitOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Entregues</p>
                    <p className="text-2xl font-bold">{orderStats.deliveredOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Receita</p>
                    <p className="text-2xl font-bold">{formatCurrency(orderStats.totalRevenue)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters({ ...filters, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Evento</label>
                <Select
                  value={filters.eventId?.toString() || 'all'}
                  onValueChange={(value) => setFilters({ 
                    ...filters, 
                    eventId: value === 'all' ? undefined : parseInt(value) 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os eventos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os eventos</SelectItem>
                    {events?.map((event: any) => (
                      <SelectItem key={event.id} value={event.id.toString()}>
                        {event.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Número do Pedido</label>
                <Input
                  placeholder="Ex: KR202400123"
                  value={filters.orderNumber || ''}
                  onChange={(e) => setFilters({ ...filters, orderNumber: e.target.value })}
                />
              </div>

              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={resetFilters}
                  className="w-full"
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Pedidos ({orders?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : orders?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum pedido encontrado com os filtros aplicados.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* Bulk Actions Bar */}
                {selectedOrders.length > 0 && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-blue-700">
                        {selectedOrders.length} pedido{selectedOrders.length > 1 ? 's' : ''} selecionado{selectedOrders.length > 1 ? 's' : ''}
                      </span>
                      {getSelectedOrdersEvent() && (
                        <span className="text-sm text-blue-600">
                          Evento: {getSelectedOrdersEvent().name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={bulkNewStatus} onValueChange={setBulkNewStatus}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Novo status" />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.filter(status => status.value !== 'all').map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        onClick={handleBulkStatusChange}
                        disabled={!bulkNewStatus || !canPerformBulkOperation()}
                        size="sm"
                      >
                        Aplicar Alterações
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setSelectedOrders([]);
                          setBulkNewStatus("");
                        }}
                        size="sm"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedOrders.length === orders.length && orders.length > 0}
                          onCheckedChange={handleSelectAll}
                          aria-label="Selecionar todos"
                        />
                      </TableHead>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Evento</TableHead>
                      <TableHead>Kits</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders?.map((order: any) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedOrders.includes(order.id)}
                            onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
                            aria-label={`Selecionar pedido ${order.orderNumber}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>
                            <p className="font-mono text-sm">{order.orderNumber}</p>
                            <p className="text-xs text-gray-500">{paymentMethodLabels[order.paymentMethod] || order.paymentMethod}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.customer.name}</p>
                            <p className="text-sm text-gray-500">{formatCPF(order.customer.cpf)}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.event.name}</p>
                            <p className="text-sm text-gray-500">{order.event.city}, {order.event.state}</p>
                          </div>
                        </TableCell>
                        <TableCell>{order.kitQuantity}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(Number(order.totalCost))}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell className="text-sm">{formatDate(order.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewOrder(order.id)}
                              title="Ver detalhes do pedido"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGenerateLabel(order.id, order.orderNumber)}
                              title="Gerar etiqueta de entrega"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenWhatsApp(order)}
                              title="Enviar mensagem WhatsApp"
                              data-testid={`button-whatsapp-${order.id}`}
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const phone = order.customer?.phone?.replace(/\D/g, '');
                                if (phone) {
                                  window.open(`https://api.whatsapp.com/send?phone=55${phone}`, '_blank');
                                }
                              }}
                              title="Abrir WhatsApp direto"
                              data-testid={`button-whatsapp-direct-${order.id}`}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" title="Alterar status do pedido">
                                  <Edit className="h-4 w-4" />
                                  <ChevronDown className="h-3 w-3 ml-1" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                {statusOptions.slice(1).map((status) => (
                                  <DropdownMenuItem
                                    key={status.value}
                                    onClick={() => handleStatusChange(order.id, status.value)}
                                    disabled={updateStatusMutation.isPending}
                                  >
                                    {status.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, totalOrders)} de {totalOrders} pedidos
                    </div>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            href="#" 
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage > 1) handlePageChange(currentPage - 1);
                            }}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                          />
                        </PaginationItem>
                        
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                handlePageChange(page);
                              }}
                              isActive={currentPage === page}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        
                        <PaginationItem>
                          <PaginationNext 
                            href="#" 
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage < totalPages) handlePageChange(currentPage + 1);
                            }}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Details Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={(open) => {
        setShowOrderDialog(open);
        // Clear selected order when dialog closes
        if (!open) {
          setSelectedOrder(null);
          setSelectedOrderId(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto z-[90]">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido</DialogTitle>
            <DialogDescription>
              Informações completas do pedido {selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Informações do Pedido
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Número:</span> {selectedOrder.orderNumber}</p>
                      <div><span className="font-medium">Status:</span> {getStatusBadge(selectedOrder.status)}</div>
                      <p><span className="font-medium">Data:</span> {formatDate(selectedOrder.createdAt)}</p>
                      <p><span className="font-medium">Kits:</span> {selectedOrder.kitQuantity}</p>
                      <p><span className="font-medium">Pagamento:</span> {paymentMethodLabels[selectedOrder.paymentMethod]}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Cliente
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Nome:</span> {selectedOrder.customer?.name || 'N/A'}</p>
                      <p><span className="font-medium">CPF:</span> {selectedOrder.customer?.cpf ? formatCPF(selectedOrder.customer.cpf) : 'N/A'}</p>
                      <p><span className="font-medium">Email:</span> {selectedOrder.customer?.email || 'N/A'}</p>
                      <p><span className="font-medium">Telefone:</span> {selectedOrder.customer?.phone || 'N/A'}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Valores
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Entrega:</span> {formatCurrency(Number(selectedOrder.deliveryCost))}</p>
                      <p><span className="font-medium">Kits Extras:</span> {formatCurrency(Number(selectedOrder.extraKitsCost))}</p>
                      <p><span className="font-medium">Doação:</span> {formatCurrency(Number(selectedOrder.donationCost))}</p>
                      {Number(selectedOrder.discountAmount) > 0 && (
                        <>
                          <p><span className="font-medium">Desconto:</span> <span className="text-green-600">-{formatCurrency(Number(selectedOrder.discountAmount))}</span></p>
                          {selectedOrder.couponCode && (
                            <p><span className="font-medium">Cupom:</span> <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{selectedOrder.couponCode}</span></p>
                          )}
                        </>
                      )}
                      <p className="border-t pt-2"><span className="font-medium">Total:</span> <span className="font-bold">{formatCurrency(Number(selectedOrder.totalCost))}</span></p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Event and Address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Evento
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Nome:</span> {selectedOrder.event?.name || 'N/A'}</p>
                      <p><span className="font-medium">Data:</span> {selectedOrder.event?.date ? formatDate(selectedOrder.event.date) : 'N/A'}</p>
                      <p><span className="font-medium">Local:</span> {selectedOrder.event?.location || 'N/A'}</p>
                      <p><span className="font-medium">Cidade:</span> {selectedOrder.event?.city ? `${selectedOrder.event.city}, ${selectedOrder.event?.state}` : 'N/A'}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Endereço de Entrega
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Endereço:</span> {selectedOrder.address?.street ? `${selectedOrder.address.street}, ${selectedOrder.address.number}` : 'N/A'}</p>
                      {selectedOrder.address?.complement && (
                        <p><span className="font-medium">Complemento:</span> {selectedOrder.address.complement}</p>
                      )}
                      <p><span className="font-medium">Bairro:</span> {selectedOrder.address?.neighborhood || 'N/A'}</p>
                      <p><span className="font-medium">Cidade:</span> {selectedOrder.address?.city ? `${selectedOrder.address.city}, ${selectedOrder.address?.state}` : 'N/A'}</p>
                      <p><span className="font-medium">CEP:</span> {selectedOrder.address?.zipCode ? selectedOrder.address.zipCode.replace(/(\d{5})(\d{3})/, '$1-$2') : 'N/A'}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Kits Details */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Detalhes dos Kits ({selectedOrder.kits?.length || 0})
                  </h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>CPF</TableHead>
                          <TableHead>Tamanho da Camiseta</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrder.kits?.map((kit: any, index: number) => (
                          <TableRow key={kit.id || index}>
                            <TableCell className="font-medium">{kit.name}</TableCell>
                            <TableCell>{formatCPF(kit.cpf)}</TableCell>
                            <TableCell>{kit.shirtSize}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Order Status History */}
              <OrderStatusHistory orderId={selectedOrder.id} showTitle={true} isAdminContext={true} />

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button variant="outline">
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar Email
                </Button>
                <Button variant="outline">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver Detalhes Completos
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Email Confirmation Modal */}
      <EmailConfirmationModal
        isOpen={emailConfirmationModal.isOpen}
        onClose={closeEmailConfirmationModal}
        onConfirm={handleConfirmStatusChange}
        orderNumber={emailConfirmationModal.orderNumber}
        newStatus={emailConfirmationModal.newStatus}
        customerName={emailConfirmationModal.customerName}
        isLoading={updateStatusMutation.isPending}
      />

      {/* Bulk Status Change Modal */}
      <Dialog open={bulkStatusModalOpen} onOpenChange={setBulkStatusModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Status em Massa</DialogTitle>
            <DialogDescription>
              Confirme a alteração de status para {selectedOrders.length} pedido{selectedOrders.length > 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Summary */}
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium">Pedidos selecionados:</span> {selectedOrders.length}
              </div>
              {getSelectedOrdersEvent() && (
                <div className="text-sm">
                  <span className="font-medium">Evento:</span> {getSelectedOrdersEvent().name}
                </div>
              )}
              <div className="text-sm">
                <span className="font-medium">Novo status:</span> {statusOptions.find(s => s.value === bulkNewStatus)?.label || bulkNewStatus}
              </div>
            </div>

            {/* Email option */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendBulkEmails"
                checked={sendBulkEmails}
                onCheckedChange={(checked) => setSendBulkEmails(checked as boolean)}
              />
              <label
                htmlFor="sendBulkEmails"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Enviar e-mails de notificação aos clientes
              </label>
            </div>

            {sendBulkEmails && (
              <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
                <Mail className="h-4 w-4 inline mr-2" />
                Os clientes receberão um e-mail informando sobre a mudança de status dos seus pedidos.
              </div>
            )}

            {/* Progress indicator */}
            {bulkStatusMutation.isPending && (
              <div className="space-y-2">
                <div className="text-sm text-gray-600">Processando alterações...</div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setBulkStatusModalOpen(false);
                setBulkNewStatus("");
                setSendBulkEmails(false);
              }}
              disabled={bulkStatusMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmBulkStatusChange}
              disabled={!bulkNewStatus || bulkStatusMutation.isPending}
            >
              {bulkStatusMutation.isPending ? "Processando..." : "Confirmar Alteração"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Modal */}
      <WhatsAppModal
        isOpen={showWhatsAppModal}
        onClose={handleCloseWhatsApp}
        order={whatsAppOrder}
      />
    </AdminLayout>
  );
}
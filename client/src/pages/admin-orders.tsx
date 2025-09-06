import { useState, useEffect } from "react";
import { useLocation } from "wouter";
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
  MessageCircle,
  ChevronUp,
  Phone,
  Clock,
  X
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
import { cn } from "@/lib/utils";

interface OrderFilters {
  status: string;
  eventId?: number;
  searchTerm?: string;
  customerName?: string;
  startDate?: string;
  endDate?: string;
  dateFilter?: 'today' | 'week' | 'month' | 'all';
}

const paymentMethodLabels: { [key: string]: string } = {
  credit: 'Cartão de Crédito',
  debit: 'Cartão de Débito',
  pix: 'PIX',
};

export default function AdminOrders() {
  // Sistema novo: AdminRouteGuard já protege
  const [, setLocation] = useLocation();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppOrder, setWhatsAppOrder] = useState<any>(null);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [filters, setFilters] = useState<OrderFilters>(() => {
    // 🇧🇷 TIMEZONE FIX: Use Brazilian timezone for initial filter setup
    const now = new Date();
    const nowBrazil = new Date(now.getTime() - (3 * 60 * 60 * 1000));
    const monthAgo = new Date(nowBrazil.getTime() - 30 * 24 * 60 * 60 * 1000);
    return {
      status: 'all',
      dateFilter: 'month',
      startDate: monthAgo.toISOString().split('T')[0],
      endDate: nowBrazil.toISOString().split('T')[0]
    };
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [bulkStatusModalOpen, setBulkStatusModalOpen] = useState(false);
  const [bulkNewStatus, setBulkNewStatus] = useState("");
  const [sendBulkEmails, setSendBulkEmails] = useState(false);
  const [sendBulkWhatsApp, setSendBulkWhatsApp] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [singleExpandedCard, setSingleExpandedCard] = useState<number | null>(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
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
  
  // Mobile full-screen states
  const [mobileOrderDetailsOpen, setMobileOrderDetailsOpen] = useState(false);
  const [mobileWhatsAppOpen, setMobileWhatsAppOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [lastOrderCount, setLastOrderCount] = useState<number>(0);
  const [hasNotificationPermission, setHasNotificationPermission] = useState<boolean>(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Request notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        setHasNotificationPermission(true);
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          setHasNotificationPermission(permission === 'granted');
        });
      }
    }
  }, []);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Enhanced body style cleanup to prevent modal overlay blocking
  useEffect(() => {
    const forceBodyCleanup = () => {
      document.body.style.removeProperty('pointer-events');
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('padding-right');
      document.body.classList.remove('pointer-events-none');
      
      // Also clean up any potential overlay issues from React portals
      const dialogs = document.querySelectorAll('[role="dialog"]');
      dialogs.forEach(dialog => {
        const backdrop = dialog.parentElement;
        if (backdrop && backdrop.style.pointerEvents === 'none') {
          backdrop.style.removeProperty('pointer-events');
        }
      });
    };

    // Create a mutation observer to watch for unwanted body styles
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.target === document.body) {
          const body = mutation.target as HTMLElement;
          
          // If pointer-events: none is detected and no modals are open, remove it
          if (!emailConfirmationModal.isOpen && !showOrderDialog && !bulkStatusModalOpen && !showWhatsAppModal) {
            if (body.style.pointerEvents === 'none') {
              setTimeout(forceBodyCleanup, 100); // Delay to prevent interference
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
  }, [emailConfirmationModal.isOpen, showOrderDialog, bulkStatusModalOpen, showWhatsAppModal]);

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

  // Função para tocar som de notificação
  const playNotificationSound = () => {
    try {
      // Criar um tom de notificação usando Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Tom agudo e agradável para notificação
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);

      // Volume e duração
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Não foi possível reproduzir som de notificação:', error);
    }
  };

  // Sistema novo: AdminRouteGuard já protege - não precisa de verificação

  // Reatividade: Query com polling automático para detectar novos pedidos
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ["/api/admin/orders", { 
      page: currentPage, 
      pageSize: pageSize,
      paginated: true,
      ...filters 
    }],
    // Polling a cada 30 segundos para detectar novos pedidos
    refetchInterval: 30000,
    // Configurações de reatividade conforme SOLUCAO_REATIVIDADE_IMPLEMENTADA.md
    staleTime: 0, // Sempre buscar dados frescos
    refetchOnMount: true, // Revalida quando componente monta
    refetchOnWindowFocus: true, // Revalida quando janela ganha foco
  });

  // Detectar novos pedidos e exibir notificação com som
  useEffect(() => {
    if (ordersData && typeof ordersData === 'object' && 'total' in ordersData) {
      const currentTotal = (ordersData as any).total;
      
      // Só verificar novos pedidos se estivermos vendo todos os pedidos (sem filtros ativos)
      const hasActiveFilters = filters.status !== 'all' || 
                              filters.eventId || 
                              filters.searchTerm || 
                              filters.customerName ||
                              filters.dateFilter !== 'month';
      
      // Se já temos um total anterior, o atual é maior E não há filtros ativos, há novos pedidos
      if (lastOrderCount > 0 && currentTotal > lastOrderCount && !hasActiveFilters) {
        const newOrdersCount = currentTotal - lastOrderCount;
        
        // Tocar som de notificação
        playNotificationSound();
        
        // Exibir toast de notificação
        toast({
          title: "🆕 Novos pedidos recebidos!",
          description: `${newOrdersCount} novo${newOrdersCount > 1 ? 's' : ''} pedido${newOrdersCount > 1 ? 's' : ''} chegou${newOrdersCount > 1 ? 'ram' : ''}`,
          duration: 5000,
        });

        // Exibir notificação do navegador se permitido
        if (hasNotificationPermission && typeof window !== 'undefined' && 'Notification' in window) {
          try {
            // Tentar usar Service Worker notification se disponível (para PWA/mobile)
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
              navigator.serviceWorker.ready.then(registration => {
                registration.showNotification('KitRunner - Novos Pedidos', {
                  body: `${newOrdersCount} novo${newOrdersCount > 1 ? 's' : ''} pedido${newOrdersCount > 1 ? 's' : ''} recebido${newOrdersCount > 1 ? 's' : ''}!`,
                  icon: '/favicon.ico',
                  tag: 'new-orders',
                  badge: '/favicon.ico'
                });
              }).catch(() => {
                // Fallback para notificação simples se Service Worker falhar
                console.log('Service Worker notification failed, using simple notification');
              });
            } else {
              // Fallback para desktop/browsers normais
              new Notification('KitRunner - Novos Pedidos', {
                body: `${newOrdersCount} novo${newOrdersCount > 1 ? 's' : ''} pedido${newOrdersCount > 1 ? 's' : ''} recebido${newOrdersCount > 1 ? 's' : ''}!`,
                icon: '/favicon.ico',
                tag: 'new-orders'
              });
            }
          } catch (error) {
            console.log('Notification failed:', error);
          }
        }

        // Invalidar caches relacionados conforme padrão de reatividade
        queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
        queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      }
      
      // Só atualizar contagem se não há filtros ativos (para não perder a referência real)
      if (!hasActiveFilters) {
        setLastOrderCount(currentTotal);
      }
    }
  }, [ordersData, lastOrderCount, hasNotificationPermission, toast, queryClient, filters]);

  const orders = (ordersData as any)?.orders || [];
  const totalPages = (ordersData as any)?.totalPages || 1;
  const totalOrders = (ordersData as any)?.total || 0;

  const { data: events } = useQuery({
    queryKey: ["/api/admin/events"],
  });


  const { data: orderStats } = useQuery({
    queryKey: ["/api/admin/stats", filters],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status, sendEmail, sendWhatsApp }: { orderId: number; status: string; sendEmail: boolean; sendWhatsApp: boolean }) => {
      const adminToken = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status, sendEmail, sendWhatsApp }),
      });
      if (!response.ok) throw new Error('Erro ao atualizar status');
      return response.json();
    },
    onSuccess: (_, variables) => {
      // Close modal first
      closeEmailConfirmationModal();
      
      // Reatividade: Invalidação abrangente conforme SOLUCAO_REATIVIDADE_IMPLEMENTADA.md
      // 1. Invalidar cache específico da entidade
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders", variables.orderId] });
      
      // 2. Invalidar lista geral da entidade
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      
      // 3. Invalidar caches relacionados (ex: stats, dashboards)
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      
      // 4. Se afeta outras entidades, invalidar também
      queryClient.invalidateQueries({ queryKey: ["/api/events"] }); // Pode afetar estatísticas do evento
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] }); // Pode afetar dados do cliente
      
      // Show toast
      const notificationsSent = [];
      if (variables.sendEmail) notificationsSent.push("email");
      if (variables.sendWhatsApp) notificationsSent.push("WhatsApp");
      
      toast({
        title: "Status atualizado com sucesso!",
        description: notificationsSent.length > 0
          ? `O status do pedido foi atualizado e o cliente foi notificado por ${notificationsSent.join(" e ")}.`
          : "O status do pedido foi atualizado sem envio de notificações.",
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
    mutationFn: async ({ orderIds, newStatus, sendEmails, sendWhatsApp }: { orderIds: number[]; newStatus: string; sendEmails: boolean; sendWhatsApp: boolean }) => {
      const adminToken = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/orders/bulk-status-change', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ orderIds, newStatus, sendEmails, sendWhatsApp }),
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
      setSendBulkWhatsApp(false);
      
      // Reatividade: Invalidação abrangente conforme SOLUCAO_REATIVIDADE_IMPLEMENTADA.md
      // 1. Invalidar lista geral da entidade
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      
      // 2. Invalidar caches relacionados (ex: stats, dashboards)
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      
      // 3. Se afeta outras entidades, invalidar também
      queryClient.invalidateQueries({ queryKey: ["/api/events"] }); // Pode afetar estatísticas do evento
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] }); // Pode afetar dados do cliente
      
      // Show detailed success toast
      const notifications = [];
      if (data.emailsSent) notifications.push(`${data.emailsSent} e-mails`);
      if (data.whatsAppSent) notifications.push(`${data.whatsAppSent} mensagens WhatsApp`);
      
      toast({
        title: "Alteração em massa concluída!",
        description: `${data.successCount} pedidos atualizados com sucesso. ${
          notifications.length > 0 
            ? `${notifications.join(' e ')} enviados.`
            : 'Nenhuma notificação foi enviada.'
        }`,
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
      
      if (isMobile) {
        setMobileOrderDetailsOpen(true);
      } else {
        setShowOrderDialog(true);
      }
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

  const handleConfirmStatusChange = (sendEmail: boolean, sendWhatsApp: boolean) => {
    updateStatusMutation.mutate({ 
      orderId: emailConfirmationModal.orderId, 
      status: emailConfirmationModal.newStatus,
      sendEmail,
      sendWhatsApp 
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
    setFilters({ 
      status: 'all', 
      dateFilter: 'month'
    });
    setCurrentPage(1);
  };

  // Date filter functions - 🇧🇷 TIMEZONE FIX: Use Brazilian timezone for filters
  const getBrazilianDate = () => {
    const now = new Date();
    // Brazil is UTC-3, so we subtract 3 hours from UTC
    return new Date(now.getTime() - (3 * 60 * 60 * 1000));
  };

  const getDateFilterDates = (filter: 'today' | 'week' | 'month' | 'all') => {
    const nowBrazil = getBrazilianDate();
    
    switch (filter) {
      case 'today':
        const today = nowBrazil.toISOString().split('T')[0];
        return { startDate: today, endDate: today };
        
      case 'week':
        const weekAgo = new Date(nowBrazil.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { 
          startDate: weekAgo.toISOString().split('T')[0], 
          endDate: nowBrazil.toISOString().split('T')[0] 
        };
        
      case 'month':
        const monthAgo = new Date(nowBrazil.getTime() - 30 * 24 * 60 * 60 * 1000);
        return { 
          startDate: monthAgo.toISOString().split('T')[0], 
          endDate: nowBrazil.toISOString().split('T')[0] 
        };
        
      case 'all':
      default:
        return { startDate: undefined, endDate: undefined };
    }
  };

  const setDateFilter = (dateFilter: 'today' | 'week' | 'month' | 'all') => {
    const dates = getDateFilterDates(dateFilter);
    setFilters({ 
      ...filters, 
      dateFilter,
      startDate: dates.startDate,
      endDate: dates.endDate
    });
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(Number(newPageSize));
    setCurrentPage(1); // Reset to first page when changing page size
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
      sendWhatsApp: sendBulkWhatsApp,
    });
  };

  // Card expansion functions for mobile
  const isCardExpanded = (orderId: number) => {
    return isMobile ? singleExpandedCard === orderId : expandedCards.has(orderId);
  };

  const toggleCardExpansion = (orderId: number) => {
    // Use single card expansion for mobile - close others when opening a new one
    if (isMobile) {
      setSingleExpandedCard(prev => prev === orderId ? null : orderId);
    } else {
      // Keep the original logic for desktop (multiple cards can be open)
      setExpandedCards(prev => {
        const newSet = new Set(prev);
        if (newSet.has(orderId)) {
          newSet.delete(orderId);
        } else {
          newSet.add(orderId);
        }
        return newSet;
      });
    }
  };

  // WhatsApp modal functions
  const handleOpenWhatsApp = (order: any) => {
    setWhatsAppOrder(order);
    
    if (isMobile) {
      setMobileWhatsAppOpen(true);
    } else {
      setShowWhatsAppModal(true);
    }
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


  // Sistema novo: AdminRouteGuard já protege - não precisa de verificação

  return (
    <AdminLayout>
      <div className="admin-container space-y-2 sm:space-y-4 lg:space-y-6 px-2 sm:px-4 max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-800 truncate">Gerenciamento de Pedidos</h1>
            <p className="text-sm sm:text-base text-neutral-600">Visualize, gerencie e acompanhe todos os pedidos</p>
          </div>
          <div className="hidden sm:flex flex-wrap gap-2 justify-end flex-shrink-0">
            <Button 
              variant="outline" 
              className="gap-1 sm:gap-2 px-2 sm:px-3 flex-shrink-0"
              onClick={() => setLocation('/admin/reports')}
            >
              <Download className="h-4 w-4" />
              <span>Gerar Etiquetas</span>
            </Button>
          </div>
        </div>

        {/* Date Filter Buttons - Unified Design */}
        <div className="mb-2">
          <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg w-fit">
            <Button
              variant={filters.dateFilter === 'today' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDateFilter('today')}
              className="h-7 px-3 text-xs font-medium"
            >
              Hoje
            </Button>
            <Button
              variant={filters.dateFilter === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDateFilter('week')}
              className="h-7 px-3 text-xs font-medium"
            >
              7 Dias
            </Button>
            <Button
              variant={filters.dateFilter === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDateFilter('month')}
              className="h-7 px-3 text-xs font-medium"
            >
              30 Dias
            </Button>
            <Button
              variant={filters.dateFilter === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDateFilter('all')}
              className="h-7 px-3 text-xs font-medium"
            >
              Todos
            </Button>
          </div>
        </div>

        {/* Statistics Cards - Mobile shows only 2 essential */}
        {(orderStats as any) ? (
          <>
            {/* Mobile: Total, Confirmed and Revenue - Stacked */}
            <div className="flex flex-col gap-2 sm:hidden">
              <Card>
                <CardContent className="p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <p className="text-xs font-medium text-gray-600">Total de Pedidos</p>
                    </div>
                    <p className="text-base font-bold">{(orderStats as any).totalOrders}</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0"></div>
                      <p className="text-xs font-medium text-gray-600">Pedidos Confirmados</p>
                    </div>
                    <p className="text-base font-bold">{(orderStats as any).confirmedOrders}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <p className="text-xs font-medium text-gray-600">Total em Valor</p>
                    </div>
                    <p className="text-base font-bold">{formatCurrency((orderStats as any).totalRevenue)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Desktop: All statistics */}
            <div className="hidden sm:grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Package className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total</p>
                      <p className="text-2xl font-bold">{(orderStats as any).totalOrders}</p>
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
                      <p className="text-2xl font-bold">{(orderStats as any).confirmedOrders}</p>
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
                      <p className="text-2xl font-bold">{(orderStats as any).awaitingPayment}</p>
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
                      <p className="text-2xl font-bold">{(orderStats as any).cancelledOrders}</p>
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
                      <p className="text-2xl font-bold">{(orderStats as any).inTransitOrders}</p>
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
                      <p className="text-2xl font-bold">{(orderStats as any).deliveredOrders}</p>
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
                      <p className="text-2xl font-bold">{formatCurrency((orderStats as any).totalRevenue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <>
            {/* Mobile Loading Skeleton */}
            <div className="flex flex-col gap-2 sm:hidden">
              <Card>
                <CardContent className="p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="h-4 w-4 bg-gray-200 rounded animate-pulse flex-shrink-0"></div>
                      <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="h-4 w-8 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-gray-200 rounded-full animate-pulse flex-shrink-0"></div>
                      <div className="h-3 w-28 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="h-4 w-8 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="h-4 w-4 bg-gray-200 rounded animate-pulse flex-shrink-0"></div>
                      <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Desktop Loading Skeleton */}
            <div className="hidden sm:grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {[...Array(7)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                      <div>
                        <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-2"></div>
                        <div className="h-6 w-8 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Mobile: Filters First, Then Search */}
        <div className="sm:hidden space-y-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="text-sm text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
            >
              <Filter className="h-4 w-4" />
              Filtros avançados
              {filtersExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={resetFilters}
              className="text-xs px-3"
            >
              <Search className="h-3 w-3 mr-1" />
              Limpar
            </Button>
          </div>
          
          {filtersExpanded && (
            <Card className="w-full">
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select
                      value={filters.status}
                      onValueChange={(value) => setFilters({ ...filters, status: value })}
                    >
                      <SelectTrigger className="h-10 w-full">
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

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Evento</label>
                    <Select
                      value={filters.eventId?.toString() || 'all'}
                      onValueChange={(value) => setFilters({ 
                        ...filters, 
                        eventId: value === 'all' ? undefined : parseInt(value) 
                      })}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder="Todos os eventos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os eventos</SelectItem>
                        {Array.isArray(events) && events.map((event: any) => (
                          <SelectItem key={event.id} value={event.id.toString()}>
                            {event.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Buscar Pedidos</label>
            <Input
              placeholder="Nome, CPF, nº pedido..."
              value={filters.searchTerm || ''}
              onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
              className="h-10 w-full"
              data-testid="input-search-general"
            />
          </div>
        </div>

        {/* Desktop: Filters - Keep as is */}
        <Card className="hidden sm:block w-full max-w-full">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 w-full">
              <div className="space-y-2 min-w-0">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters({ ...filters, status: value })}
                >
                  <SelectTrigger className="h-10 w-full">
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

              <div className="space-y-2 min-w-0">
                <label className="text-sm font-medium">Evento</label>
                <Select
                  value={filters.eventId?.toString() || 'all'}
                  onValueChange={(value) => setFilters({ 
                    ...filters, 
                    eventId: value === 'all' ? undefined : parseInt(value) 
                  })}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Todos os eventos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os eventos</SelectItem>
                    {Array.isArray(events) && events.map((event: any) => (
                      <SelectItem key={event.id} value={event.id.toString()}>
                        {event.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 min-w-0">
                <label className="text-sm font-medium">Buscar</label>
                <Input
                  placeholder="Nome, CPF, nº pedido..."
                  value={filters.searchTerm || ''}
                  onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                  className="h-10 w-full"
                  data-testid="input-search-general"
                />
              </div>

              <div className="flex items-end min-w-0">
                <Button 
                  variant="outline" 
                  onClick={resetFilters}
                  className="w-full h-10"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card className="w-full max-w-full">
          <CardHeader>
            <CardTitle>Pedidos ({orders?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 overflow-hidden">
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
              <div className="w-full max-w-full overflow-hidden">
                {/* Bulk Actions Bar - Mobile Optimized */}
                {selectedOrders.length > 0 && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-sm font-medium text-blue-700">
                          {selectedOrders.length} pedido{selectedOrders.length > 1 ? 's' : ''} selecionado{selectedOrders.length > 1 ? 's' : ''}
                        </span>
                        {getSelectedOrdersEvent() && (
                          <div className="text-sm text-blue-600 truncate">
                            Evento: {getSelectedOrdersEvent().name}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Select value={bulkNewStatus} onValueChange={setBulkNewStatus}>
                          <SelectTrigger className="w-full sm:w-48 h-10">
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
                        <div className="flex gap-2">
                          <Button 
                            onClick={handleBulkStatusChange}
                            disabled={!bulkNewStatus || !canPerformBulkOperation()}
                            size="sm"
                            className="flex-1 sm:flex-none"
                          >
                            Aplicar
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => {
                              setSelectedOrders([]);
                              setBulkNewStatus("");
                            }}
                            size="sm"
                            className="flex-1 sm:flex-none"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mobile Cards View */}
                <div className="block lg:hidden space-y-3 mobile-card-container w-full max-w-full overflow-x-hidden">
                  {/* Select All Control for Mobile */}
                  {orders?.length > 0 && (
                    <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 border border-gray-200 rounded-lg w-full max-w-full">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Checkbox
                          checked={selectedOrders.length === orders.length && orders.length > 0}
                          onCheckedChange={handleSelectAll}
                          aria-label="Selecionar todos os pedidos"
                          className="flex-shrink-0"
                        />
                        <span className="text-xs sm:text-sm font-medium text-gray-700 truncate">
                          Selecionar todos ({orders.length})
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {selectedOrders.length} sel.
                      </span>
                    </div>
                  )}
                  {Array.isArray(orders) && orders.map((order: any) => (
                    <Card key={order.id} className="relative w-full max-w-full overflow-x-hidden">
                      <CardContent className="p-0 w-full max-w-full overflow-x-hidden">
                        {/* Card Header - Always Visible */}
                        <div 
                          className="p-2 sm:p-3 lg:p-4 cursor-pointer select-none w-full max-w-full"
                          onClick={() => toggleCardExpansion(order.id)}
                        >
                          <div className="flex items-start justify-between w-full max-w-full">
                            <div className="flex-1 min-w-0 max-w-full overflow-hidden">
                              <div className="flex items-center gap-1 sm:gap-2 mb-2 w-full overflow-hidden">
                                <Checkbox
                                  checked={selectedOrders.includes(order.id)}
                                  onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
                                  aria-label={`Selecionar pedido ${order.orderNumber}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-shrink-0"
                                />
                                <span className="font-mono text-xs font-medium flex-shrink-0 min-w-0 truncate">{order.orderNumber}</span>
                                <div className="flex-shrink-0 ml-auto">{getStatusBadge(order.status)}</div>
                              </div>
                              <div className="space-y-1 w-full max-w-full overflow-hidden">
                                <p className="font-medium text-gray-900 truncate text-sm">{order.customer.name}</p>
                                <p className="text-xs text-gray-600 truncate">{order.event.name}</p>
                                <div className="flex items-center justify-between w-full overflow-hidden">
                                  <span className="text-sm sm:text-base font-bold text-green-600 flex-shrink-0">
                                    {formatCurrency(Number(order.totalCost))}
                                  </span>
                                  <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                                    <Package className="h-3 w-3" />
                                    <span>{order.kitQuantity}</span>
                                    <Clock className="h-3 w-3 ml-1" />
                                    <span className="hidden sm:inline">{formatDate(order.createdAt)}</span>
                                    <span className="sm:hidden">{formatDate(order.createdAt).split(' ')[0]}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="ml-1 sm:ml-2 flex items-center flex-shrink-0">
                              {isCardExpanded(order.id) ? (
                                <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                              ) : (
                                <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expanded Actions - Mobile */}
                        {isCardExpanded(order.id) && (
                          <div className="border-t px-3 sm:px-4 pb-4 w-full max-w-full overflow-hidden">
                            <div className="mt-4 space-y-3 w-full overflow-hidden">
                              {/* Customer & Event Details */}
                              <div className="grid grid-cols-1 gap-3 text-sm w-full overflow-hidden">
                                <div className="flex items-center gap-2 w-full overflow-hidden">
                                  <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                  <span className="font-medium truncate flex-1">{order.customer.name}</span>
                                  <span className="text-gray-600 flex-shrink-0 text-xs">{formatCPF(order.customer.cpf)}</span>
                                </div>
                                <div className="flex items-center gap-2 w-full overflow-hidden">
                                  <Phone className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                  <span className="text-gray-600 truncate">{order.customer.phone}</span>
                                </div>
                                <div className="flex items-center gap-2 w-full overflow-hidden">
                                  <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                  <span className="text-gray-600 truncate flex-1">{order.event.name}</span>
                                  <span className="text-gray-600 text-xs flex-shrink-0">{order.event.city}</span>
                                </div>
                                <div className="flex items-center gap-2 w-full overflow-hidden">
                                  <DollarSign className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                  <span className="text-gray-600 truncate">{paymentMethodLabels[order.paymentMethod] || order.paymentMethod}</span>
                                </div>
                              </div>

                              {/* Action Buttons - Mobile Optimized */}
                              <div className="pt-3 border-t w-full max-w-full overflow-hidden">
                                <div className="grid grid-cols-2 gap-1 sm:gap-2 w-full">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewOrder(order.id)}
                                    className="justify-center sm:justify-start w-full text-xs sm:text-sm h-8 px-2 sm:px-3"
                                  >
                                    <Eye className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                                    <span className="hidden sm:inline truncate">Ver Detalhes</span>
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleGenerateLabel(order.id, order.orderNumber)}
                                    className="justify-center sm:justify-start w-full text-xs sm:text-sm h-8 px-2 sm:px-3"
                                  >
                                    <FileText className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                                    <span className="hidden sm:inline truncate">Etiqueta</span>
                                  </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-1 sm:gap-2 mt-1 sm:mt-2 w-full">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenWhatsApp(order)}
                                    className="justify-center sm:justify-start w-full text-xs sm:text-sm h-8 px-2 sm:px-3"
                                    data-testid={`button-whatsapp-${order.id}`}
                                  >
                                    <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                                    <span className="hidden sm:inline truncate">WhatsApp</span>
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
                                    className="justify-center sm:justify-start w-full text-xs sm:text-sm h-8 px-2 sm:px-3"
                                    data-testid={`button-whatsapp-direct-${order.id}`}
                                  >
                                    <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                                    <span className="hidden sm:inline truncate">Abrir Zap</span>
                                  </Button>
                                </div>
                              </div>

                              {/* Status Change - Mobile Optimized */}
                              <div className="pt-2 border-t">
                                <Select onValueChange={(value) => handleStatusChange(order.id, value)}>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Alterar status..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {statusOptions.slice(1).map((status) => (
                                      <SelectItem key={status.value} value={status.value}>
                                        {status.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block desktop-table-container relative overflow-x-auto">
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
                      {Array.isArray(orders) && orders.map((order: any) => (
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
                </div>
                
                {/* Pagination Controls and Page Size Selector */}
                <div className="mt-6 space-y-4">
                  {/* Page Size Selector and Status Text */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    {/* Page Size Selector */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground whitespace-nowrap">Itens por página:</span>
                      <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                        <SelectTrigger className="w-16 h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Status Text */}
                    <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-right">
                      <span className="hidden sm:inline">
                        Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, totalOrders)} de {totalOrders} pedidos
                      </span>
                      <span className="sm:hidden">
                        Página {currentPage} de {totalPages}
                      </span>
                    </div>
                  </div>
                  
                  {/* Pagination - Mobile Optimized */}
                  {totalPages > 1 && (
                    <div className="flex justify-center">
                      <Pagination>
                        <PaginationContent className="flex-wrap gap-1">
                          <PaginationItem>
                            <PaginationPrevious 
                              href="#" 
                              onClick={(e) => {
                                e.preventDefault();
                                if (currentPage > 1) handlePageChange(currentPage - 1);
                              }}
                              className={cn(
                                currentPage === 1 ? "pointer-events-none opacity-50" : "",
                                "text-xs sm:text-sm px-2 sm:px-4"
                              )}
                            />
                          </PaginationItem>
                          
                          {/* Smart page display - show fewer on mobile */}
                          {(() => {
                            const maxPagesShown = 5; // Limit for mobile
                            const maxPagesShownMobile = 3;
                            const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 640;
                            const currentMaxPages = isSmallScreen ? maxPagesShownMobile : maxPagesShown;
                            
                            let startPage = Math.max(1, currentPage - Math.floor(currentMaxPages / 2));
                            let endPage = Math.min(totalPages, startPage + currentMaxPages - 1);
                            
                            // Adjust start page if we're near the end
                            if (endPage - startPage + 1 < currentMaxPages) {
                              startPage = Math.max(1, endPage - currentMaxPages + 1);
                            }
                            
                            const pages = [];
                            
                            // Add first page and ellipsis if needed
                            if (startPage > 1) {
                              pages.push(
                                <PaginationItem key={1}>
                                  <PaginationLink
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handlePageChange(1);
                                    }}
                                    className="w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm"
                                  >
                                    1
                                  </PaginationLink>
                                </PaginationItem>
                              );
                              
                              if (startPage > 2) {
                                pages.push(
                                  <PaginationItem key="ellipsis-start">
                                    <PaginationEllipsis className="w-8 h-8 sm:w-9 sm:h-9" />
                                  </PaginationItem>
                                );
                              }
                            }
                            
                            // Add visible page numbers
                            for (let i = startPage; i <= endPage; i++) {
                              pages.push(
                                <PaginationItem key={i}>
                                  <PaginationLink
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handlePageChange(i);
                                    }}
                                    isActive={currentPage === i}
                                    className="w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm"
                                  >
                                    {i}
                                  </PaginationLink>
                                </PaginationItem>
                              );
                            }
                            
                            // Add ellipsis and last page if needed
                            if (endPage < totalPages) {
                              if (endPage < totalPages - 1) {
                                pages.push(
                                  <PaginationItem key="ellipsis-end">
                                    <PaginationEllipsis className="w-8 h-8 sm:w-9 sm:h-9" />
                                  </PaginationItem>
                                );
                              }
                              
                              pages.push(
                                <PaginationItem key={totalPages}>
                                  <PaginationLink
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handlePageChange(totalPages);
                                    }}
                                    className="w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm"
                                  >
                                    {totalPages}
                                  </PaginationLink>
                                </PaginationItem>
                              );
                            }
                            
                            return pages;
                          })()}
                          
                          <PaginationItem>
                            <PaginationNext 
                              href="#" 
                              onClick={(e) => {
                                e.preventDefault();
                                if (currentPage < totalPages) handlePageChange(currentPage + 1);
                              }}
                              className={cn(
                                currentPage === totalPages ? "pointer-events-none opacity-50" : "",
                                "text-xs sm:text-sm px-2 sm:px-4"
                              )}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </div>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto z-[100] w-[95vw] sm:w-full mx-auto bg-white">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-lg">Detalhes do Pedido</DialogTitle>
            <DialogDescription className="text-sm">
              Informações completas do pedido {selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4 lg:space-y-6">
              {/* Order Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                      {selectedOrder.cepZoneName && (
                        <p><span className="font-medium">Zona de Entrega:</span> <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-mono">{selectedOrder.cepZoneName}</span></p>
                      )}
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
                  {/* Mobile: Cards, Desktop: Table */}
                  <div className="block lg:hidden space-y-3">
                    {selectedOrder.kits?.map((kit: any, index: number) => (
                      <Card key={index} className="p-3">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="font-medium">Kit #{index + 1}</span>
                            <Badge variant="secondary">{kit.shirtSize}</Badge>
                          </div>
                          <p><span className="font-medium">Nome:</span> {kit.name || kit.participantName || 'N/A'}</p>
                          <p><span className="font-medium">CPF:</span> {(kit.cpf || kit.participantCpf) ? formatCPF(kit.cpf || kit.participantCpf) : 'N/A'}</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                  
                  <div className="hidden lg:block overflow-x-auto">
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
                            <TableCell className="font-medium">{kit.name || kit.participantName || 'N/A'}</TableCell>
                            <TableCell>{(kit.cpf || kit.participantCpf) ? formatCPF(kit.cpf || kit.participantCpf) : 'N/A'}</TableCell>
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

            {/* WhatsApp option - Only show for specific statuses */}
            {(bulkNewStatus === 'em_transito' || bulkNewStatus === 'entregue') && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sendBulkWhatsApp"
                  checked={sendBulkWhatsApp}
                  onCheckedChange={(checked) => setSendBulkWhatsApp(checked as boolean)}
                />
                <label
                  htmlFor="sendBulkWhatsApp"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Enviar mensagens no WhatsApp
                </label>
              </div>
            )}

            {(sendBulkEmails || sendBulkWhatsApp) && (
              <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
                {sendBulkEmails && sendBulkWhatsApp ? (
                  <>
                    <Mail className="h-4 w-4 inline mr-2" />
                    Os clientes receberão notificações por e-mail e WhatsApp sobre a mudança de status.
                  </>
                ) : sendBulkEmails ? (
                  <>
                    <Mail className="h-4 w-4 inline mr-2" />
                    Os clientes receberão um e-mail informando sobre a mudança de status dos seus pedidos.
                  </>
                ) : sendBulkWhatsApp ? (
                  <>
                    <MessageCircle className="h-4 w-4 inline mr-2" />
                    Os clientes receberão uma mensagem no WhatsApp informando sobre a mudança de status.
                  </>
                ) : null}
                
                {(bulkNewStatus === 'em_transito' || bulkNewStatus === 'entregue') && (
                  <p className="text-xs mt-2">
                    💡 WhatsApp disponível para status "Em Trânsito" e "Entregue"
                  </p>
                )}
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
                setSendBulkWhatsApp(false);
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

      {/* WhatsApp Modal - Desktop only */}
      {!isMobile && (
        <WhatsAppModal
          isOpen={showWhatsAppModal}
          onClose={handleCloseWhatsApp}
          order={whatsAppOrder}
        />
      )}

      {/* Mobile Full-Screen Order Details */}
      {mobileOrderDetailsOpen && (
        <div className="fixed inset-0 bg-white z-[200] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Detalhes do Pedido</h2>
              <p className="text-sm text-muted-foreground">
                {selectedOrder?.orderNumber}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setMobileOrderDetailsOpen(false);
                setSelectedOrder(null);
                setSelectedOrderId(null);
              }}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          {selectedOrder && (
            <div className="p-4 space-y-6">
              {/* Order Summary Cards */}
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
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
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
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
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
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
                      <div className="pt-2 border-t">
                        <p className="font-semibold text-lg"><span className="font-medium">Total:</span> {formatCurrency(Number(selectedOrder.totalCost))}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Delivery Address */}
              {selectedOrder.address && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Endereço de Entrega
                    </h3>
                    <div className="text-sm space-y-1">
                      <p>{selectedOrder.address.street}, {selectedOrder.address.number}</p>
                      {selectedOrder.address.complement && <p>Complemento: {selectedOrder.address.complement}</p>}
                      <p>{selectedOrder.address.neighborhood}</p>
                      <p>{selectedOrder.address.city} - {selectedOrder.address.state}</p>
                      <p>CEP: {selectedOrder.address.zipCode}</p>
                      {selectedOrder.cepZoneName && (
                        <p><span className="font-medium text-gray-600">Zona de Entrega:</span> <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-mono">{selectedOrder.cepZoneName}</span></p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Kit Details */}
              {selectedOrder.kits && selectedOrder.kits.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Detalhes dos Kits ({selectedOrder.kits.length})
                    </h3>
                    <div className="space-y-3">
                      {selectedOrder.kits.map((kit: any, index: number) => (
                        <div key={index} className="border rounded-lg p-3 bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-medium text-sm">Kit #{index + 1}</span>
                            <Badge variant="secondary" className="text-xs">{kit.shirtSize || 'N/A'}</Badge>
                          </div>
                          <div className="space-y-1 text-sm">
                            <p>
                              <span className="font-medium text-gray-600">Nome:</span><br />
                              <span className="text-gray-900">{kit.name || kit.participantName || 'N/A'}</span>
                            </p>
                            <p>
                              <span className="font-medium text-gray-600">CPF:</span><br />
                              <span className="text-gray-900 font-mono">{(kit.cpf || kit.participantCpf) ? formatCPF(kit.cpf || kit.participantCpf) : 'N/A'}</span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Order Status History */}
              <OrderStatusHistory orderId={selectedOrder.id} showTitle={true} isAdminContext={true} />

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-4 border-t">
                <Button variant="outline" className="w-full">
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar Email
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setMobileOrderDetailsOpen(false);
                    handleOpenWhatsApp(selectedOrder);
                  }}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mobile Full-Screen WhatsApp */}
      {mobileWhatsAppOpen && (
        <div className="fixed inset-0 bg-white z-[200] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">WhatsApp</h2>
              <p className="text-sm text-muted-foreground">
                {whatsAppOrder?.customer?.name}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileWhatsAppOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="p-4">
            <WhatsAppModal
              isOpen={true}
              onClose={() => setMobileWhatsAppOpen(false)}
              order={whatsAppOrder}
              isMobile={true}
            />
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
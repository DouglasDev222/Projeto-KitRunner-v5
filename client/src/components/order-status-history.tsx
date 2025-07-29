import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, User, Bot, Settings } from 'lucide-react';
import { getStatusBadge } from '@/lib/status-utils';
import { format } from 'date-fns';

interface OrderStatusHistory {
  id: number;
  orderId: number;
  previousStatus: string | null;
  newStatus: string;
  changedBy: string;
  changedByName: string | null;
  reason: string | null;
  createdAt: string;
}

interface OrderStatusHistoryProps {
  orderId?: number;
  orderNumber?: string;
  showTitle?: boolean;
  isAdminContext?: boolean;
}

export function OrderStatusHistory({ orderId, orderNumber, showTitle = true, isAdminContext = false }: OrderStatusHistoryProps) {
  const { data: historyData, isLoading, error } = useQuery({
    queryKey: isAdminContext && orderId 
      ? [`/api/admin/orders/${orderId}/status-history`]
      : orderId 
        ? ['/api/orders', orderId, 'status-history'] 
        : ['/api/orders/number', orderNumber, 'status-history'],
    enabled: Boolean(orderId || orderNumber),
  });

  const getChangeIcon = (changedBy: string) => {
    switch (changedBy) {
      case 'mercadopago':
        return <Bot className="h-4 w-4 text-blue-500" />;
      case 'admin':
        return <User className="h-4 w-4 text-green-500" />;
      case 'system':
        return <Settings className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getChangerName = (changedBy: string, changedByName: string | null) => {
    if (changedByName) return changedByName;
    
    switch (changedBy) {
      case 'mercadopago':
        return 'Mercado Pago';
      case 'admin':
        return 'Administrador';
      case 'system':
        return 'Sistema';
      default:
        return 'Sistema';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          {showTitle && <CardTitle>Histórico de Status</CardTitle>}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-3 animate-pulse">
                <div className="w-4 h-4 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          {showTitle && <CardTitle>Histórico de Status</CardTitle>}
        </CardHeader>
        <CardContent>
          <p className="text-red-500 text-sm">Erro ao carregar histórico de status</p>
        </CardContent>
      </Card>
    );
  }

  const history: OrderStatusHistory[] = historyData?.history || [];

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          {showTitle && <CardTitle>Histórico de Status</CardTitle>}
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm">Nenhuma mudança de status registrada</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-[14px] mb-[14px] rounded-lg border bg-card text-card-foreground shadow-sm">
      <CardHeader>
        {showTitle && <CardTitle>Histórico de Status</CardTitle>}
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {history.map((entry, index) => (
            <div key={entry.id} className="relative">
              {/* Timeline line */}
              {index < history.length - 1 && (
                <div className="absolute left-6 top-8 bottom-0 w-0.5 bg-gray-200" />
              )}
              
              <div className="flex items-start space-x-4">
                {/* Icon */}
                <div className="flex-shrink-0 w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center border">
                  {getChangeIcon(entry.changedBy)}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="flex items-center space-x-2">
                    {entry.previousStatus && (
                      <>
                        {getStatusBadge(entry.previousStatus)}
                        <span className="text-gray-400">→</span>
                      </>
                    )}
                    {getStatusBadge(entry.newStatus)}
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    {format(new Date(entry.createdAt), 'dd/MM/yyyy HH:mm')}
                  </div>
                  
                  {entry.reason && entry.reason.toLowerCase().includes('pagamento') && (
                    <div className="text-sm text-green-600 font-medium">
                      Pagamento aprovado
                    </div>
                  )}
                </div>
              </div>
              
              {index < history.length - 1 && <Separator className="mt-6" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
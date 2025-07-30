import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Mail, RefreshCw, Send, AlertCircle, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EmailLog {
  id: number;
  orderId?: number;
  customerId?: number;
  emailType: string;
  recipientEmail: string;
  subject: string;
  status: 'sent' | 'failed' | 'delivered' | 'bounced';
  sendgridMessageId?: string;
  errorMessage?: string;
  sentAt: string;
  deliveredAt?: string;
}

interface EmailLogsResponse {
  success: boolean;
  logs: EmailLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export function AdminEmailLogs() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: emailLogs, isLoading, error, refetch } = useQuery<EmailLogsResponse>({
    queryKey: ['/api/admin/email-logs', { page, searchTerm, statusFilter, typeFilter }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('emailType', typeFilter);
      
      const response = await fetch(`/api/admin/email-logs?${params}`);
      if (!response.ok) throw new Error('Erro ao buscar logs');
      return response.json();
    }
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      sent: { variant: 'default', icon: Send, label: 'Enviado' },
      delivered: { variant: 'default', icon: CheckCircle, label: 'Entregue' },
      failed: { variant: 'destructive', icon: AlertCircle, label: 'Falhou' },
      bounced: { variant: 'destructive', icon: AlertCircle, label: 'Rejeitado' }
    };
    
    const config = variants[status] || variants.sent;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getEmailTypeBadge = (type: string) => {
    const types: Record<string, string> = {
      order_confirmation: 'Confirmação de Pedido',
      status_update: 'Atualização de Status',
      test_email: 'Email de Teste'
    };
    
    return (
      <Badge variant="outline">
        {types[type] || type}
      </Badge>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Logs de Email</h1>
            <p className="text-muted-foreground">
              Monitore todos os emails enviados pelo sistema
            </p>
          </div>
          <Button onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar por email</label>
                <Input
                  placeholder="email@exemplo.com"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="sent">Enviado</SelectItem>
                    <SelectItem value="delivered">Entregue</SelectItem>
                    <SelectItem value="failed">Falhou</SelectItem>
                    <SelectItem value="bounced">Rejeitado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Email</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="order_confirmation">Confirmação</SelectItem>
                    <SelectItem value="status_update">Atualização</SelectItem>
                    <SelectItem value="test_email">Teste</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Ações</label>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setTypeFilter('all');
                    setPage(1);
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Emails Enviados
              {emailLogs && (
                <Badge variant="secondary">
                  {emailLogs.logs.length} de {emailLogs.pagination.total}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                Carregando logs...
              </div>
            )}
            
            {error && (
              <div className="text-center py-8 text-destructive">
                Erro ao carregar logs de email
              </div>
            )}
            
            {emailLogs && emailLogs.logs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum log encontrado
              </div>
            )}
            
            {emailLogs && emailLogs.logs.length > 0 && (
              <div className="space-y-4">
                {emailLogs.logs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {getEmailTypeBadge(log.emailType)}
                          {getStatusBadge(log.status)}
                        </div>
                        <h3 className="font-medium">{log.subject}</h3>
                        <p className="text-sm text-muted-foreground">
                          Para: {log.recipientEmail}
                        </p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>
                          {formatDistanceToNow(new Date(log.sentAt), {
                            addSuffix: true,
                            locale: ptBR
                          })}
                        </p>
                        {log.orderId && (
                          <p>Pedido #{log.orderId}</p>
                        )}
                      </div>
                    </div>
                    
                    {log.errorMessage && (
                      <div className="bg-destructive/10 text-destructive p-3 rounded text-sm">
                        <strong>Erro:</strong> {log.errorMessage}
                      </div>
                    )}
                    
                    {log.sendgridMessageId && (
                      <div className="text-xs text-muted-foreground">
                        ID SendGrid: {log.sendgridMessageId}
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Paginação */}
                {emailLogs.pagination.total > 20 && (
                  <div className="flex items-center justify-between pt-4">
                    <Button
                      variant="outline"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Página {page} de {Math.ceil(emailLogs.pagination.total / 20)}
                    </span>
                    <Button
                      variant="outline"
                      disabled={page >= Math.ceil(emailLogs.pagination.total / 20)}
                      onClick={() => setPage(page + 1)}
                    >
                      Próxima
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
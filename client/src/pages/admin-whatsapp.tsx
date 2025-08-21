import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminLayout } from "@/components/admin-layout";
import { 
  MessageCircle, 
  QrCode, 
  Send, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock,
  Phone,
  Loader2,
  AlertCircle,
  Plus,
  Edit,
  Trash,
  Star,
  StarOff,
  Settings,
  MessageSquare,
  History,
  Copy,
  Save,
  Eye
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatDate } from "@/lib/brazilian-formatter";

interface WhatsAppConnection {
  connected: boolean;
  connectionStatus?: string;
  qrCode?: string;
  qrCodeType?: string;
  message?: string;
  description?: string;
  error?: string;
}

interface WhatsAppTemplate {
  id: number;
  name: string;
  type: 'order_status' | 'custom' | 'notification';
  status?: string;
  content: string;
  description?: string;
  isActive: boolean;
  isDefault: boolean;
  placeholders?: string[];
  createdAt: string;
  updatedAt: string;
}

interface WhatsAppMessage {
  id: number;
  phoneNumber: string;
  message: string;
  status: 'pending' | 'sent' | 'failed';
  sentAt?: string;
  errorMessage?: string;
}

interface WhatsAppPlaceholder {
  key: string;
  description: string;
}

interface TemplateResponse {
  success: boolean;
  template?: WhatsAppTemplate;
  templates?: WhatsAppTemplate[];
  error?: string;
  message?: string;
}

interface MessagesResponse {
  success: boolean;
  messages?: WhatsAppMessage[];
  error?: string;
}

export default function AdminWhatsApp() {
  const [activeTab, setActiveTab] = useState("connection");
  const [templateContent, setTemplateContent] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("");
  
  // Estados do novo sistema de templates
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    type: "custom" as "order_status" | "custom" | "notification",
    status: "",
    content: "",
    description: "",
    quickSend: false
  });
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<WhatsAppTemplate | null>(null);
  const [testingTemplate, setTestingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [testTemplateData, setTestTemplateData] = useState({
    phoneNumber: "",
    cliente: "João Silva",
    evento: "Maratona de João Pessoa",
    qtd_kits: "2",
    lista_kits: "1. João Silva - Tamanho: M\n2. Maria Silva - Tamanho: P",
    data_entrega: "15/12/2024",
    numero_pedido: "KR2024123456"
  });
  const [selectedTemplateForTest, setSelectedTemplateForTest] = useState<WhatsAppTemplate | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch connection status
  const { data: connection, isLoading: connectionLoading, refetch: refetchConnection } = useQuery<WhatsAppConnection>({
    queryKey: ["/api/admin/whatsapp/connection"],
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.connected ? false : 10000;
    }
  });

  // Fetch new templates system
  const { data: templatesResponse, isLoading: templatesLoading, refetch: refetchTemplates } = useQuery<TemplateResponse>({
    queryKey: ["/api/admin/whatsapp/templates"]
  });

  // Fetch template (legacy system compatibility)
  const { data: legacyTemplate, isLoading: templateLoading } = useQuery({
    queryKey: ["/api/admin/whatsapp/template"]
  });

  // Fetch message history
  const { data: messagesResponse, isLoading: messagesLoading } = useQuery<MessagesResponse>({
    queryKey: ["/api/admin/whatsapp/messages"]
  });

  // Fetch placeholders
  const { data: placeholders } = useQuery<WhatsAppPlaceholder[]>({
    queryKey: ["/api/admin/whatsapp/placeholders"]
  });

  // Mutations
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        throw new Error('Token de administrador não encontrado');
      }
      
      const response = await fetch("/api/admin/whatsapp/test", { 
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify({})
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "Sucesso" : "Erro",
        description: data.message,
        variant: data.success ? "default" : "destructive"
      });
    }
  });

  const sendTestMessageMutation = useMutation({
    mutationFn: async ({ phone, message }: { phone: string; message: string }) => {
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        throw new Error('Token de administrador não encontrado');
      }
      
      const response = await fetch("/api/admin/whatsapp/send-test", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify({ phoneNumber: phone, message })
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "Mensagem Enviada" : "Erro",
        description: data.message,
        variant: data.success ? "default" : "destructive"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/whatsapp/messages"] });
    }
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: typeof newTemplate) => {
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        throw new Error('Token de administrador não encontrado');
      }
      
      const response = await fetch("/api/admin/whatsapp/templates", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify(templateData)
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "Template Criado" : "Erro",
        description: data.message || data.error,
        variant: data.success ? "default" : "destructive"
      });
      if (data.success) {
        setIsTemplateModalOpen(false);
        setNewTemplate({ name: "", type: "custom", status: "", content: "", description: "", quickSend: false });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/whatsapp/templates"] });
      }
    }
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, ...templateData }: { id: number } & typeof newTemplate) => {
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        throw new Error('Token de administrador não encontrado');
      }
      
      const response = await fetch(`/api/admin/whatsapp/templates/${id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify(templateData)
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "Template Atualizado" : "Erro",
        description: data.message || data.error,
        variant: data.success ? "default" : "destructive"
      });
      if (data.success) {
        setIsTemplateModalOpen(false);
        setEditingTemplate(null);
        queryClient.invalidateQueries({ queryKey: ["/api/admin/whatsapp/templates"] });
      }
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        throw new Error('Token de administrador não encontrado');
      }
      
      const response = await fetch(`/api/admin/whatsapp/templates/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${adminToken}`
        }
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "Template Deletado" : "Erro",
        description: data.message || data.error,
        variant: data.success ? "default" : "destructive"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/whatsapp/templates"] });
    }
  });

  const activateTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        throw new Error('Token de administrador não encontrado');
      }
      
      const response = await fetch(`/api/admin/whatsapp/templates/${id}/activate`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${adminToken}`
        }
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "Template Ativado" : "Erro",
        description: data.message || data.error,
        variant: data.success ? "default" : "destructive"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/whatsapp/templates"] });
    }
  });

  const testTemplateMutation = useMutation({
    mutationFn: async ({ templateId, phoneNumber, testData }: { templateId: number; phoneNumber: string; testData: any }) => {
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        throw new Error('Token de administrador não encontrado');
      }
      
      const response = await fetch(`/api/admin/whatsapp/templates/${templateId}/test`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify({ phoneNumber, testData })
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "Template Testado" : "Erro",
        description: data.message || data.error,
        variant: data.success ? "default" : "destructive"
      });
      if (data.success) {
        setTestingTemplate(null);
        queryClient.invalidateQueries({ queryKey: ["/api/admin/whatsapp/messages"] });
      }
    }
  });

  const seedTemplatesMutation = useMutation({
    mutationFn: async () => {
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        throw new Error('Token de administrador não encontrado');
      }
      
      const response = await fetch("/api/admin/whatsapp/templates/seed", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${adminToken}`
        }
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "Templates Criados" : "Erro",
        description: data.message || data.error,
        variant: data.success ? "default" : "destructive"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/whatsapp/templates"] });
    }
  });

  const deactivateTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        throw new Error('Token de administrador não encontrado');
      }
      
      const response = await fetch(`/api/admin/whatsapp/templates/${id}/deactivate`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${adminToken}`
        }
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "Template Desativado" : "Erro",
        description: data.message || data.error,
        variant: data.success ? "default" : "destructive"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/whatsapp/templates"] });
    }
  });

  const handleEditTemplate = (template: WhatsAppTemplate) => {
    setEditingTemplate(template);
    setNewTemplate({
      name: template.name,
      type: template.type,
      status: template.status || "",
      content: template.content,
      description: template.description || "",
      quickSend: template.quickSend || false
    });
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = () => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, ...newTemplate });
    } else {
      createTemplateMutation.mutate(newTemplate);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'disconnected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'order_status': return 'Status do Pedido';
      case 'custom': return 'Personalizado';
      case 'notification': return 'Notificação';
      default: return type;
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'confirmado': return 'Confirmado';
      case 'aguardando_pagamento': return 'Aguardando Pagamento';
      case 'kits_sendo_retirados': return 'Kits Sendo Retirados';
      case 'em_transito': return 'Em Trânsito';
      case 'entregue': return 'Entregue';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">WhatsApp</h1>
            <p className="text-muted-foreground">
              Gerencie a integração do WhatsApp, templates de mensagens e histórico
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={`${getStatusColor(connection?.connectionStatus || 'disconnected')} text-white border-0`}
            >
              {connection?.connected ? "Conectado" : "Desconectado"}
            </Badge>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="connection" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Conexão
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="testing" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Testes
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          {/* Conexão Tab */}
          <TabsContent value="connection" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Status da Conexão
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {connectionLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verificando conexão...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">
                          Status: {connection?.connected ? "Conectado" : "Desconectado"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {connection?.message}
                        </p>
                      </div>
                      <Button onClick={() => refetchConnection()}>
                        Verificar Status
                      </Button>
                    </div>

                    {connection?.qrCode && (
                      <div className="flex flex-col items-center space-y-4 p-4 bg-muted rounded-lg">
                        <p className="font-medium">Escaneie o QR Code para conectar:</p>
                        <img 
                          src={connection.qrCode} 
                          alt="QR Code WhatsApp" 
                          className="w-64 h-64 border rounded-lg"
                        />
                        <p className="text-sm text-muted-foreground text-center">
                          Use seu celular para escanear este código no WhatsApp Web
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button 
                        onClick={() => testConnectionMutation.mutate()}
                        disabled={testConnectionMutation.isPending}
                        variant="outline"
                      >
                        {testConnectionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Testar Conexão
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Gerenciar Templates
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => seedTemplatesMutation.mutate()}
                      variant="outline"
                      disabled={seedTemplatesMutation.isPending}
                    >
                      {seedTemplatesMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Criar Templates Padrão
                    </Button>
                    <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
                      <DialogTrigger asChild>
                        <Button onClick={() => {
                          setEditingTemplate(null);
                          setNewTemplate({ name: "", type: "custom", status: "", content: "", description: "", quickSend: false });
                        }}>
                          <Plus className="h-4 w-4 mr-2" />
                          Novo Template
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>
                            {editingTemplate ? "Editar Template" : "Novo Template"}
                          </DialogTitle>
                          <DialogDescription>
                            Configure o template de mensagem do WhatsApp
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="name">Nome do Template</Label>
                              <Input
                                id="name"
                                placeholder="Ex: Confirmação de Pedido"
                                value={newTemplate.name}
                                onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="type">Tipo</Label>
                              <Select 
                                value={newTemplate.type} 
                                onValueChange={(value: any) => setNewTemplate({...newTemplate, type: value})}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="order_status">Status do Pedido</SelectItem>
                                  <SelectItem value="custom">Personalizado</SelectItem>
                                  <SelectItem value="notification">Notificação</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          {newTemplate.type === "order_status" && (
                            <div className="space-y-2">
                              <Label htmlFor="status">Status do Pedido</Label>
                              <Select 
                                value={newTemplate.status} 
                                onValueChange={(value) => setNewTemplate({...newTemplate, status: value})}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="confirmado">Confirmado</SelectItem>
                                  <SelectItem value="aguardando_pagamento">Aguardando Pagamento</SelectItem>
                                  <SelectItem value="kits_sendo_retirados">Kits Sendo Retirados</SelectItem>
                                  <SelectItem value="em_transito">Em Trânsito</SelectItem>
                                  <SelectItem value="entregue">Entregue</SelectItem>
                                  <SelectItem value="cancelado">Cancelado</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          
                          <div className="space-y-2">
                            <Label htmlFor="description">Descrição</Label>
                            <Input
                              id="description"
                              placeholder="Descrição opcional do template"
                              value={newTemplate.description}
                              onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                            />
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="quickSend"
                              checked={newTemplate.quickSend}
                              onCheckedChange={(checked) => setNewTemplate({...newTemplate, quickSend: !!checked})}
                            />
                            <Label htmlFor="quickSend" className="text-sm">
                              Envio Rápido
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              (Aparece como botão de envio rápido no modal WhatsApp)
                            </p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="content">Conteúdo do Template</Label>
                            <Textarea
                              id="content"
                              placeholder="Digite o conteúdo da mensagem..."
                              value={newTemplate.content}
                              onChange={(e) => setNewTemplate({...newTemplate, content: e.target.value})}
                              className="min-h-[200px]"
                            />
                            <p className="text-xs text-muted-foreground">
                              Use placeholders como: {"{{cliente}}"}, {"{{evento}}"}, {"{{qtd_kits}}"}, {"{{numero_pedido}}"}
                            </p>
                          </div>
                        </div>
                        
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsTemplateModalOpen(false)}>
                            Cancelar
                          </Button>
                          <Button 
                            onClick={handleSaveTemplate}
                            disabled={!newTemplate.name || !newTemplate.content}
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Salvar Template
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {templatesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : templatesResponse?.templates && Array.isArray(templatesResponse.templates) && templatesResponse.templates.length > 0 ? (
                  <div className="space-y-4">
                    {templatesResponse.templates.map((template) => (
                      <Card key={template.id} className="relative">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{template.name}</h3>
                                {template.isDefault && (
                                  <Badge variant="secondary" className="flex items-center gap-1">
                                    <Star className="h-3 w-3" />
                                    Padrão
                                  </Badge>
                                )}
                                <Badge variant="outline">
                                  {getTypeLabel(template.type)}
                                </Badge>
                                {template.status && (
                                  <Badge variant="outline">
                                    {getStatusLabel(template.status)}
                                  </Badge>
                                )}
                                {template.quickSend && (
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                    ⚡ Envio Rápido
                                  </Badge>
                                )}
                              </div>
                              {template.description && (
                                <p className="text-sm text-muted-foreground">
                                  {template.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPreviewTemplate(template)}
                                title="Visualizar"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setTestingTemplate(template);
                                  setTestTemplateData(prev => ({ ...prev, phoneNumber: "" }));
                                }}
                                title="Testar Template"
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditTemplate(template)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {/* Botões de Padrão - apenas para order_status */}
                              {template.type === 'order_status' && (
                                <>
                                  {template.isDefault ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deactivateTemplateMutation.mutate(template.id)}
                                      disabled={deactivateTemplateMutation.isPending}
                                      title="Remover como Padrão"
                                    >
                                      <StarOff className="h-4 w-4" />
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => activateTemplateMutation.mutate(template.id)}
                                      disabled={activateTemplateMutation.isPending || !template.status}
                                      title={!template.status ? "Template precisa ter um status para ser padrão" : "Marcar como Padrão"}
                                    >
                                      <Star className="h-4 w-4" />
                                    </Button>
                                  )}
                                </>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={template.isDefault}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Deletar Template</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja deletar o template "{template.name}"? Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteTemplateMutation.mutate(template.id)}>
                                      Deletar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-muted p-3 rounded-lg">
                            <p className="text-sm font-mono whitespace-pre-wrap">
                              {template.content.substring(0, 200)}{template.content.length > 200 ? "..." : ""}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground mb-4">Nenhum template encontrado</p>
                    <Button onClick={() => seedTemplatesMutation.mutate()}>
                      Criar Templates Padrão
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Testes Tab */}
          <TabsContent value="testing" className="space-y-6">
            {/* Testar Template Específico */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Testar Template
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="templateSelect">Selecionar Template</Label>
                  <Select 
                    value={selectedTemplateForTest?.id.toString() || ""} 
                    onValueChange={(value) => {
                      const template = templatesResponse?.templates?.find(t => t.id.toString() === value);
                      setSelectedTemplateForTest(template || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um template para testar" />
                    </SelectTrigger>
                    <SelectContent>
                      {templatesResponse?.templates?.map((template) => (
                        <SelectItem key={template.id} value={template.id.toString()}>
                          {template.name} ({getTypeLabel(template.type)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedTemplateForTest && (
                  <div className="space-y-4 p-4 bg-muted rounded-lg">
                    <h4 className="font-medium">Preview do Template:</h4>
                    <p className="text-sm font-mono whitespace-pre-wrap bg-background p-3 rounded border">
                      {selectedTemplateForTest.content}
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Número do WhatsApp"
                        value={testTemplateData.phoneNumber}
                        onChange={(e) => setTestTemplateData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                        className="flex-1"
                      />
                      <Button
                        onClick={() => {
                          if (selectedTemplateForTest && testTemplateData.phoneNumber) {
                            setTestingTemplate(selectedTemplateForTest);
                          } else {
                            toast({
                              title: "Erro",
                              description: "Selecione um template e insira o número",
                              variant: "destructive"
                            });
                          }
                        }}
                        disabled={!selectedTemplateForTest || !testTemplateData.phoneNumber}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Testar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mensagem Personalizada */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Enviar Mensagem Personalizada
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="testPhone">Número de Telefone</Label>
                    <Input
                      id="testPhone"
                      placeholder="(83) 98765-4321"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="testMessage">Mensagem</Label>
                  <Textarea
                    id="testMessage"
                    placeholder="Digite sua mensagem de teste..."
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
                <Button
                  onClick={() => sendTestMessageMutation.mutate({ phone: testPhone, message: testMessage })}
                  disabled={!testPhone || !testMessage || sendTestMessageMutation.isPending}
                >
                  {sendTestMessageMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Enviar Teste
                </Button>
              </CardContent>
            </Card>

            {/* Placeholders Card */}
            {placeholders && Array.isArray(placeholders) && placeholders.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Copy className="h-5 w-5" />
                    Placeholders Disponíveis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {placeholders.map((placeholder) => (
                      <div key={placeholder.key} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <code className="font-mono text-sm">{"{{" + placeholder.key + "}}"}</code>
                          <p className="text-xs text-muted-foreground mt-1">{placeholder.description}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(`{{${placeholder.key}}}`);
                            toast({ title: "Copiado!", description: "Placeholder copiado para a área de transferência" });
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Histórico Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Histórico de Mensagens
                </CardTitle>
              </CardHeader>
              <CardContent>
                {messagesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : messagesResponse?.messages && Array.isArray(messagesResponse.messages) && messagesResponse.messages.length > 0 ? (
                  <div className="space-y-4">
                    {messagesResponse.messages.map((message) => (
                      <div key={message.id} className="flex items-start gap-3 p-4 border rounded-lg">
                        <div className="flex-shrink-0">
                          {message.status === 'sent' ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : message.status === 'failed' ? (
                            <XCircle className="h-5 w-5 text-red-500" />
                          ) : (
                            <Clock className="h-5 w-5 text-yellow-500" />
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{message.phoneNumber}</span>
                            </div>
                            <Badge variant={message.status === 'sent' ? 'default' : message.status === 'failed' ? 'destructive' : 'secondary'}>
                              {message.status === 'sent' ? 'Enviado' : message.status === 'failed' ? 'Erro' : 'Pendente'}
                            </Badge>
                          </div>
                          <p className="text-sm bg-muted p-3 rounded whitespace-pre-wrap">
                            {message.message}
                          </p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              {message.sentAt ? `Enviado em ${formatDate(message.sentAt)}` : 'Não enviado'}
                            </span>
                            {message.errorMessage && (
                              <span className="text-red-500">Erro: {message.errorMessage}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma mensagem enviada ainda</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Preview Modal */}
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Preview: {previewTemplate?.name}</DialogTitle>
              <DialogDescription>
                {previewTemplate?.description}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Tipo: </span>
                  {previewTemplate && getTypeLabel(previewTemplate.type)}
                </div>
                {previewTemplate?.status && (
                  <div>
                    <span className="font-medium">Status: </span>
                    {getStatusLabel(previewTemplate.status)}
                  </div>
                )}
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Conteúdo:</h4>
                <p className="whitespace-pre-wrap font-mono text-sm">
                  {previewTemplate?.content}
                </p>
              </div>
              {previewTemplate?.placeholders && previewTemplate.placeholders.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Placeholders:</h4>
                  <div className="flex flex-wrap gap-2">
                    {previewTemplate.placeholders.map((placeholder) => (
                      <Badge key={placeholder} variant="outline">
                        {"{{" + placeholder + "}}"}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Template Test Modal */}
        <Dialog open={!!testingTemplate} onOpenChange={() => setTestingTemplate(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Testar Template: {testingTemplate?.name}</DialogTitle>
              <DialogDescription>
                Preencha os dados de teste para enviar o template
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="testPhone">Número do WhatsApp</Label>
                <Input
                  id="testPhone"
                  placeholder="(83) 98765-4321"
                  value={testTemplateData.phoneNumber}
                  onChange={(e) => setTestTemplateData({...testTemplateData, phoneNumber: e.target.value})}
                />
              </div>
              
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <h4 className="font-medium">Dados de Teste (Placeholders):</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cliente">Cliente</Label>
                    <Input
                      id="cliente"
                      value={testTemplateData.cliente}
                      onChange={(e) => setTestTemplateData({...testTemplateData, cliente: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="evento">Evento</Label>
                    <Input
                      id="evento"
                      value={testTemplateData.evento}
                      onChange={(e) => setTestTemplateData({...testTemplateData, evento: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qtd_kits">Quantidade de Kits</Label>
                    <Input
                      id="qtd_kits"
                      value={testTemplateData.qtd_kits}
                      onChange={(e) => setTestTemplateData({...testTemplateData, qtd_kits: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numero_pedido">Número do Pedido</Label>
                    <Input
                      id="numero_pedido"
                      value={testTemplateData.numero_pedido}
                      onChange={(e) => setTestTemplateData({...testTemplateData, numero_pedido: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="data_entrega">Data de Entrega</Label>
                    <Input
                      id="data_entrega"
                      value={testTemplateData.data_entrega}
                      onChange={(e) => setTestTemplateData({...testTemplateData, data_entrega: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lista_kits">Lista de Kits</Label>
                  <Textarea
                    id="lista_kits"
                    value={testTemplateData.lista_kits}
                    onChange={(e) => setTestTemplateData({...testTemplateData, lista_kits: e.target.value})}
                    className="min-h-[80px]"
                  />
                </div>
              </div>
              
              {testingTemplate && (
                <div className="bg-background border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Preview da Mensagem:</h4>
                  <p className="whitespace-pre-wrap text-sm font-mono bg-muted p-3 rounded">
                    {testingTemplate.content
                      .replace(/\{\{cliente\}\}/g, testTemplateData.cliente)
                      .replace(/\{\{evento\}\}/g, testTemplateData.evento)
                      .replace(/\{\{qtd_kits\}\}/g, testTemplateData.qtd_kits)
                      .replace(/\{\{lista_kits\}\}/g, testTemplateData.lista_kits)
                      .replace(/\{\{data_entrega\}\}/g, testTemplateData.data_entrega)
                      .replace(/\{\{numero_pedido\}\}/g, testTemplateData.numero_pedido)
                    }
                  </p>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setTestingTemplate(null)}>
                Cancelar
              </Button>
              <Button 
                onClick={() => {
                  if (testingTemplate) {
                    testTemplateMutation.mutate({
                      templateId: testingTemplate.id,
                      phoneNumber: testTemplateData.phoneNumber,
                      testData: {
                        cliente: testTemplateData.cliente,
                        evento: testTemplateData.evento,
                        qtd_kits: testTemplateData.qtd_kits,
                        lista_kits: testTemplateData.lista_kits,
                        data_entrega: testTemplateData.data_entrega,
                        numero_pedido: testTemplateData.numero_pedido
                      }
                    });
                  }
                }}
                disabled={!testTemplateData.phoneNumber || testTemplateMutation.isPending}
              >
                {testTemplateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                <Send className="h-4 w-4 mr-2" />
                Enviar Teste
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
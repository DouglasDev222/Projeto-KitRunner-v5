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
  AlertCircle
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/brazilian-formatter";

interface WhatsAppConnection {
  connected: boolean;
  qrCode?: string;
  message?: string;
}

interface WhatsAppTemplate {
  id: number;
  content: string;
  isActive: boolean;
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

export default function AdminWhatsApp() {
  const [activeTab, setActiveTab] = useState("connection");
  const [templateContent, setTemplateContent] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch connection status
  const { data: connection, isLoading: connectionLoading, refetch: refetchConnection } = useQuery<WhatsAppConnection>({
    queryKey: ["/api/admin/whatsapp/connection"],
    refetchInterval: connection?.connected ? false : 10000, // Poll every 10s if not connected
  });

  // Fetch template
  const { data: templateResponse, isLoading: templateLoading } = useQuery({
    queryKey: ["/api/admin/whatsapp/template"],
  });

  // Fetch message history
  const { data: messagesResponse, isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/admin/whatsapp/messages"],
  });

  // Fetch placeholders
  const { data: placeholdersResponse } = useQuery<{ placeholders: WhatsAppPlaceholder[] }>({
    queryKey: ["/api/admin/whatsapp/placeholders"],
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/whatsapp/test', {
        method: 'POST',
        credentials: 'include'
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Sucesso",
          description: "Conexão WhatsApp testada com sucesso!",
        });
      } else {
        toast({
          title: "Erro",
          description: data.error || "Erro ao testar conexão",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao testar conexão WhatsApp",
        variant: "destructive",
      });
    }
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch('/api/admin/whatsapp/template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content })
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Sucesso",
          description: "Template atualizado com sucesso!",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/whatsapp/template"] });
      } else {
        toast({
          title: "Erro",
          description: data.error || "Erro ao atualizar template",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar template",
        variant: "destructive",
      });
    }
  });

  // Send test message mutation
  const sendTestMutation = useMutation({
    mutationFn: async ({ phoneNumber, message }: { phoneNumber: string; message: string }) => {
      const response = await fetch('/api/admin/whatsapp/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phoneNumber, message })
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Sucesso",
          description: "Mensagem de teste enviada com sucesso!",
        });
        setTestPhone("");
        setTestMessage("");
        queryClient.invalidateQueries({ queryKey: ["/api/admin/whatsapp/messages"] });
      } else {
        toast({
          title: "Erro",
          description: data.error || "Erro ao enviar mensagem",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao enviar mensagem de teste",
        variant: "destructive",
      });
    }
  });

  // Load template content when data arrives
  useEffect(() => {
    if (templateResponse?.template?.content) {
      setTemplateContent(templateResponse.template.content);
    }
  }, [templateResponse]);

  const handleUpdateTemplate = () => {
    if (!templateContent.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira o conteúdo do template",
        variant: "destructive",
      });
      return;
    }
    updateTemplateMutation.mutate(templateContent);
  };

  const handleSendTest = () => {
    if (!testPhone.trim() || !testMessage.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha telefone e mensagem",
        variant: "destructive",
      });
      return;
    }
    sendTestMutation.mutate({ phoneNumber: testPhone, message: testMessage });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Enviado</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Falhou</Badge>;
      case 'pending':
      default:
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-neutral-800">WhatsApp</h1>
          <p className="text-neutral-600">Gerenciar integração WhatsApp</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="connection">Conexão</TabsTrigger>
          <TabsTrigger value="template">Template</TabsTrigger>
          <TabsTrigger value="test">Teste</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        {/* Connection Tab */}
        <TabsContent value="connection">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Status da Conexão WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent>
              {connectionLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="ml-2">Verificando conexão...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${connection?.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="font-medium">
                      Status: {connection?.connected ? 'Conectado' : 'Desconectado'}
                    </span>
                  </div>

                  {connection?.message && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-blue-800">{connection.message}</p>
                    </div>
                  )}

                  {connection?.qrCode && !connection.connected && (
                    <div className="space-y-3">
                      <h3 className="font-medium">Escaneie o QR Code para conectar:</h3>
                      <div className="bg-white p-4 border rounded-lg text-center">
                        <img 
                          src={`data:image/png;base64,${connection.qrCode}`} 
                          alt="QR Code WhatsApp" 
                          className="mx-auto max-w-xs"
                        />
                      </div>
                      <p className="text-sm text-neutral-600">
                        Abra o WhatsApp no seu celular e escaneie este código
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button 
                      onClick={() => refetchConnection()}
                      disabled={connectionLoading}
                      variant="outline"
                    >
                      {connectionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Atualizar Status
                    </Button>
                    <Button 
                      onClick={() => testConnectionMutation.mutate()}
                      disabled={testConnectionMutation.isPending || !connection?.connected}
                    >
                      {testConnectionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Testar Conexão
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Template Tab */}
        <TabsContent value="template">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Template de Mensagem
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {templateLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="ml-2">Carregando template...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="template">Conteúdo do Template</Label>
                    <Textarea
                      id="template"
                      value={templateContent}
                      onChange={(e) => setTemplateContent(e.target.value)}
                      placeholder="Digite o template da mensagem..."
                      rows={8}
                      className="mt-1"
                    />
                  </div>

                  <div className="bg-blue-50 p-4 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">Placeholders Disponíveis:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {placeholdersResponse?.placeholders?.map((placeholder) => (
                        <div key={placeholder.key} className="flex items-center gap-2">
                          <code className="bg-blue-100 px-2 py-1 rounded text-blue-800">
                            {placeholder.key}
                          </code>
                          <span className="text-blue-700">{placeholder.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button 
                    onClick={handleUpdateTemplate}
                    disabled={updateTemplateMutation.isPending}
                    className="w-full"
                  >
                    {updateTemplateMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Salvar Template
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test Tab */}
        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Teste de Mensagem
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="testPhone">Número de Telefone</Label>
                  <Input
                    id="testPhone"
                    type="tel"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="mt-1"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Formato: (11) 99999-9999 ou 5511999999999
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="testMessage">Mensagem de Teste</Label>
                <Textarea
                  id="testMessage"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Digite a mensagem de teste..."
                  rows={4}
                  className="mt-1"
                />
              </div>

              <Button 
                onClick={handleSendTest}
                disabled={sendTestMutation.isPending || !connection?.connected}
                className="w-full"
              >
                {sendTestMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Enviar Mensagem de Teste
              </Button>

              {!connection?.connected && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                  <span className="text-yellow-800 text-sm">
                    WhatsApp deve estar conectado para enviar mensagens
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Histórico de Mensagens
              </CardTitle>
            </CardHeader>
            <CardContent>
              {messagesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="ml-2">Carregando histórico...</span>
                </div>
              ) : messagesResponse?.messages?.length > 0 ? (
                <div className="space-y-3">
                  {messagesResponse.messages.map((message: WhatsAppMessage) => (
                    <div key={message.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-neutral-500" />
                          <span className="font-medium">{message.phoneNumber}</span>
                        </div>
                        {getStatusBadge(message.status)}
                      </div>
                      <p className="text-sm text-neutral-700 mb-2">{message.message}</p>
                      <div className="flex justify-between text-xs text-neutral-500">
                        <span>
                          {message.sentAt ? formatDate(message.sentAt) : 'Não enviado'}
                        </span>
                        {message.errorMessage && (
                          <span className="text-red-600">{message.errorMessage}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-neutral-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma mensagem enviada ainda</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
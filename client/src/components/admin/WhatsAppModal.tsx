import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/brazilian-formatter";
import { MessageCircle, Send, Clock, CheckCircle, XCircle, User, Phone, Calendar } from "lucide-react";
import type { WhatsappTemplate, WhatsappMessage } from "@shared/schema";

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
}

export function WhatsAppModal({ isOpen, onClose, order }: WhatsAppModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [customMessage, setCustomMessage] = useState("");
  const [previewContent, setPreviewContent] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch WhatsApp templates
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/admin/whatsapp/templates'],
    enabled: isOpen
  });

  // Fetch message history for this order
  const { data: messageHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['/api/admin/whatsapp/messages', order?.id],
    enabled: isOpen && !!order?.id
  });

  // Send WhatsApp message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { orderId: number; templateId?: number; customMessage?: string }) => {
      return apiRequest('POST', '/api/admin/whatsapp/send-message', data);
    },
    onSuccess: () => {
      toast({
        title: "Mensagem enviada!",
        description: "A mensagem WhatsApp foi enviada com sucesso.",
      });
      // Refresh message history
      queryClient.invalidateQueries({ queryKey: ['/api/admin/whatsapp/messages', order?.id] });
      // Reset form
      setSelectedTemplateId("");
      setCustomMessage("");
      setPreviewContent("");
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message || "Erro interno do servidor",
        variant: "destructive",
      });
    }
  });

  // Update preview when template or custom message changes
  useEffect(() => {
    if (selectedTemplateId) {
      const template = (templates as any)?.templates?.find((t: WhatsappTemplate) => t.id.toString() === selectedTemplateId);
      if (template && order) {
        // Replace placeholders with actual order data
        let content = template.content;
        content = content.replace(/\{customerName\}/g, order.customer?.name || 'Cliente');
        content = content.replace(/\{orderNumber\}/g, order.orderNumber || '');
        content = content.replace(/\{eventName\}/g, order.event?.name || '');
        content = content.replace(/\{eventDate\}/g, order.event?.date ? formatDate(order.event.date) : '');
        content = content.replace(/\{eventLocation\}/g, order.event?.location || '');
        content = content.replace(/\{kitQuantity\}/g, order.kitQuantity?.toString() || '1');
        content = content.replace(/\{totalCost\}/g, `R$ ${Number(order.totalCost || 0).toFixed(2).replace('.', ',')}`);
        content = content.replace(/\{deliveryAddress\}/g, order.address ? 
          `${order.address.street}, ${order.address.number} - ${order.address.neighborhood}, ${order.address.city}/${order.address.state}` : 
          'Endereço não disponível'
        );
        setPreviewContent(content);
      }
    } else if (customMessage) {
      setPreviewContent(customMessage);
    } else {
      setPreviewContent("");
    }
  }, [selectedTemplateId, customMessage, templates, order]);

  const handleSendMessage = () => {
    if (!selectedTemplateId && !customMessage.trim()) {
      toast({
        title: "Atenção",
        description: "Selecione um template ou digite uma mensagem personalizada.",
        variant: "destructive",
      });
      return;
    }

    const data: { orderId: number; templateId?: number; customMessage?: string } = {
      orderId: order.id
    };

    if (selectedTemplateId) {
      data.templateId = parseInt(selectedTemplateId);
    } else if (customMessage.trim()) {
      data.customMessage = customMessage.trim();
    }

    sendMessageMutation.mutate(data);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'sent':
        return 'Enviada';
      case 'error':
        return 'Erro';
      case 'pending':
      default:
        return 'Pendente';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Enviar WhatsApp - Pedido {order?.orderNumber}
          </DialogTitle>
          <DialogDescription>
            Envie uma mensagem WhatsApp para o cliente usando templates ou mensagem personalizada
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Send Message */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Enviar Mensagem
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Customer Info */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-gray-600" />
                    <span className="font-medium">{order?.customer?.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-3 w-3" />
                    <span>{order?.customer?.phone}</span>
                  </div>
                </div>

                {/* Quick Send Buttons */}
                {!templatesLoading && (templates as any)?.templates?.filter((t: WhatsappTemplate) => t.quickSend).length > 0 && (
                  <div className="space-y-2">
                    <Label>Envio Rápido</Label>
                    <div className="flex flex-wrap gap-2">
                      {(templates as any).templates
                        .filter((template: WhatsappTemplate) => template.quickSend)
                        .map((template: WhatsappTemplate) => (
                          <Button
                            key={template.id}
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              const data = {
                                orderId: order.id,
                                templateId: template.id
                              };
                              sendMessageMutation.mutate(data);
                            }}
                            disabled={sendMessageMutation.isPending}
                            data-testid={`button-quick-send-${template.id}`}
                          >
                            {sendMessageMutation.isPending ? "..." : template.name}
                          </Button>
                        ))
                      }
                    </div>
                    <div className="text-xs text-gray-500">
                      Clique para enviar rapidamente usando um template pré-definido
                    </div>
                  </div>
                )}

                {/* Template Selection */}
                <div className="space-y-2">
                  <Label htmlFor="template-select">Selecionar Template</Label>
                  <Select 
                    value={selectedTemplateId} 
                    onValueChange={(value) => {
                      setSelectedTemplateId(value);
                      setCustomMessage(""); // Clear custom message when template is selected
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templatesLoading ? (
                        <SelectItem value="loading" disabled>Carregando...</SelectItem>
                      ) : (
                        (templates as any)?.templates?.map((template: WhatsappTemplate) => (
                          <SelectItem key={template.id} value={template.id.toString()}>
                            {template.name} {template.status && `(${template.status})`}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Message */}
                <div className="space-y-2">
                  <Label htmlFor="custom-message">Ou mensagem personalizada</Label>
                  <Textarea
                    id="custom-message"
                    placeholder="Digite sua mensagem personalizada..."
                    value={customMessage}
                    onChange={(e) => {
                      setCustomMessage(e.target.value);
                      setSelectedTemplateId(""); // Clear template when custom message is typed
                    }}
                    rows={4}
                  />
                </div>

                {/* Preview */}
                {previewContent && (
                  <div className="space-y-2">
                    <Label>Pré-visualização</Label>
                    <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                      <div className="whitespace-pre-wrap text-sm">{previewContent}</div>
                    </div>
                  </div>
                )}

                {/* Send Button */}
                <Button
                  onClick={handleSendMessage}
                  disabled={sendMessageMutation.isPending || (!selectedTemplateId && !customMessage.trim())}
                  className="w-full"
                  data-testid="button-send-whatsapp"
                >
                  {sendMessageMutation.isPending ? "Enviando..." : "Enviar Mensagem"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Message History */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Histórico de Mensagens
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  {historyLoading ? (
                    <div className="text-center py-4">Carregando histórico...</div>
                  ) : (messageHistory as any)?.messages?.length > 0 ? (
                    <div className="space-y-3">
                      {(messageHistory as any).messages.map((message: WhatsappMessage) => (
                        <div key={message.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(message.status)}
                              <Badge variant={message.status === 'sent' ? 'default' : message.status === 'error' ? 'destructive' : 'secondary'}>
                                {getStatusLabel(message.status)}
                              </Badge>
                            </div>
                            <span className="text-xs text-gray-500">
                              {formatDate(message.createdAt.toString())}
                            </span>
                          </div>
                          <div className="text-sm bg-gray-50 p-2 rounded">
                            {message.messageContent}
                          </div>
                          {message.errorMessage && (
                            <div className="text-xs text-red-600 mt-1 italic">
                              Erro: {message.errorMessage}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p>Nenhuma mensagem enviada ainda</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
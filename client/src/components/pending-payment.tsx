import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Clock, QrCode, Copy, RefreshCw, CreditCard } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/brazilian-formatter";
import type { Order } from "@shared/schema";

interface PendingPaymentProps {
  order: Order;
  onPaymentSuccess: () => void;
  onPaymentError: (error: string) => void;
}

interface PaymentStatus {
  orderStatus: string;
  paymentMethod: string;
  totalAmount: number;
  pix?: {
    qrCodeBase64?: string;
    pixCopyPaste?: string;
    expirationDate?: string;
    isExpired: boolean;
    isTimedOut: boolean;
    canRenew: boolean;
  };
  mercadoPagoStatus?: string;
}

export function PendingPayment({ order, onPaymentSuccess, onPaymentError }: PendingPaymentProps) {
  const [isPolling, setIsPolling] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get payment status
  const { data: paymentStatus, refetch: refetchPaymentStatus } = useQuery<PaymentStatus>({
    queryKey: ["/api/orders", order.orderNumber, "payment-status"],
    refetchInterval: isPolling ? 3000 : false, // Poll every 3 seconds when active
  });

  // Renew PIX mutation
  const renewPixMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/orders/${order.orderNumber}/renew-pix`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao renovar PIX');
      }

      return data;
    },
    onSuccess: (data) => {
      console.log('🎯 PIX renewal response:', data);

      if (data.success) {
        // Trigger refetch of payment status to get updated PIX data
        refetchPaymentStatus();
        toast({ title: "PIX renovado com sucesso!" });
      } else {
        toast({ 
          title: "Erro ao renovar PIX", 
          description: data.message || "Erro desconhecido",
          variant: "destructive" 
        });
      }
    },
    onError: (error: any) => {
      console.error('❌ PIX renewal error:', error);

      const errorMessage = error.message || "Tente novamente em alguns instantes";

      toast({ 
        title: "Erro ao renovar PIX", 
        description: errorMessage,
        variant: "destructive" 
      });
    }
  });



  // Calculate time remaining for order timeout (24 hours)
  useEffect(() => {
    if (order.paymentCreatedAt || order.createdAt) {
      const calculateTimeRemaining = () => {
        const createdAt = new Date(order.paymentCreatedAt || order.createdAt);
        const timeout = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000); // 24 hours
        const now = new Date();
        const diff = timeout.getTime() - now.getTime();

        if (diff <= 0) {
          setTimeRemaining("Expirado");
          setIsPolling(false);
          return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeRemaining(`${hours}h ${minutes}m`);
      };

      calculateTimeRemaining();
      const interval = setInterval(calculateTimeRemaining, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [order.paymentCreatedAt, order.createdAt]);

  // Start polling when component mounts if payment is PIX
  useEffect(() => {
    if (order.paymentMethod === "pix" && order.status === "aguardando_pagamento") {
      setIsPolling(true);
    }

    return () => setIsPolling(false);
  }, [order.paymentMethod, order.status]);

  // Copy PIX code to clipboard
  const copyPixCode = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Código PIX copiado!" });
    }).catch(() => {
      toast({ 
        title: "Erro ao copiar", 
        description: "Tente selecionar e copiar manualmente",
        variant: "destructive" 
      });
    });
  };

  if (!paymentStatus) {
    return (
      <Card className="mx-2 my-4">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const { pix } = paymentStatus;

  return (
    <div className="w-full max-w-full my-4">
      <Card className="border-orange-200 bg-orange-50 overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center text-orange-800">
            <Clock className="w-5 h-5 mr-2" />
            Pagamento Pendente
          </CardTitle>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Badge variant="outline" className="bg-orange-100 text-orange-800">
              Aguardando pagamento
            </Badge>
            {timeRemaining && timeRemaining !== "Expirado" && (
              <span className="text-sm text-orange-700">
                Expira em: <strong>{timeRemaining}</strong>
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Order timeout warning */}
          {pix?.isTimedOut ? (
            <div className="flex items-start p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-red-800">Tempo limite expirado</p>
                <p className="text-sm text-red-700">
                  Este pedido foi cancelado automaticamente após 24 horas sem pagamento.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* PIX Payment Section */}
              {order.paymentMethod === "pix" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-neutral-800">Pagamento PIX</h3>
                    <Badge variant="outline">
                      {formatCurrency(parseFloat(order.totalCost))}
                    </Badge>
                  </div>

                  {pix?.isExpired || !pix?.qrCodeBase64 ? (
                    // PIX Expired - Show renewal options
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-center mb-3">
                          <Clock className="w-5 h-5 text-yellow-600 mr-2" />
                          <h4 className="font-medium text-yellow-800">QR Code PIX Expirado</h4>
                        </div>
                        <p className="text-sm text-yellow-700 mb-4">
                          O QR code PIX expirou (30 minutos). Escolha uma opção para continuar:
                        </p>

                        <div className="space-y-3">
                          <Button
                            onClick={() => renewPixMutation.mutate()}
                            disabled={renewPixMutation.isPending || !pix?.canRenew}
                            className="w-full"
                          >
                            {renewPixMutation.isPending ? (
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <QrCode className="w-4 h-4 mr-2" />
                            )}
                            Gerar novo PIX
                          </Button>

                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-700">
                              <strong>Quer pagar de outra forma?</strong><br />
                              Para usar cartão de crédito ou débito, você precisará fazer um novo pedido.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // PIX Active - Show QR Code
                    <div className="space-y-4">
                      {/* QR Code Container */}
                      <div className="bg-white border border-neutral-200 rounded-lg p-6">
                        <div className="flex flex-col items-center">
                          {pix.qrCodeBase64 && (
                            <img 
                              src={`data:image/png;base64,${pix.qrCodeBase64}`}
                              alt="QR Code PIX"
                              className="w-48 h-48 mb-4"
                            />
                          )}
                          <p className="text-sm text-center text-neutral-600 mb-2">
                            Escaneie o código com o app do seu banco
                          </p>
                          {pix.expirationDate && (
                            <p className="text-xs text-neutral-500">
                              Válido até: {new Date(pix.expirationDate).toLocaleString('pt-BR')}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Copy/Paste Code */}
                      {pix.pixCopyPaste && (
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-neutral-800">
                            Ou copie e cole o código PIX:
                          </p>
                          <div className="bg-neutral-100 border border-neutral-200 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 text-xs font-mono break-all text-neutral-700">
                                {pix.pixCopyPaste}
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyPixCode(pix.pixCopyPaste!)}
                                className="flex-shrink-0"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      <Separator />

                      {/* Alternative Payment Notice */}
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start">
                          <CreditCard className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-blue-800 mb-1">Quer pagar de outra forma?</p>
                            <p className="text-sm text-blue-700">
                              Este pedido foi criado para pagamento PIX. Para usar cartão de crédito ou débito, você precisará fazer um novo pedido.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
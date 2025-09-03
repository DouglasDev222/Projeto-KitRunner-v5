import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, MailX, MessageCircle } from "lucide-react";

interface EmailConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (sendEmail: boolean, sendWhatsApp: boolean) => void;
  orderNumber: string;
  newStatus: string;
  customerName: string;
  isLoading?: boolean;
}

export function EmailConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  orderNumber,
  newStatus,
  customerName,
  isLoading = false,
}: EmailConfirmationModalProps) {
  const [sendEmail, setSendEmail] = useState(true);
  const [sendWhatsApp, setSendWhatsApp] = useState(false);
  // Fix body pointer-events issue with aggressive cleanup
  useEffect(() => {
    const forceCleanup = () => {
      // Remove all problematic styles from body
      document.body.style.removeProperty('pointer-events');
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('padding-right');
      
      // Also ensure body classes don't block interactions
      document.body.classList.remove('pointer-events-none');
    };

    if (!isOpen) {
      // Immediate cleanup
      forceCleanup();
      
      // Multiple cleanup attempts to ensure it sticks
      const timers = [
        setTimeout(forceCleanup, 50),
        setTimeout(forceCleanup, 150),
        setTimeout(forceCleanup, 300)
      ];
      
      return () => timers.forEach(clearTimeout);
    }

    // Monitor for unwanted styles during modal lifetime
    const observer = new MutationObserver(() => {
      if (!isOpen && (document.body.style.pointerEvents === 'none' || 
          document.body.style.pointerEvents === 'none')) {
        forceCleanup();
      }
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['style', 'class']
    });

    return () => {
      observer.disconnect();
      forceCleanup();
    };
  }, [isOpen]);

  const getStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string } = {
      confirmado: "Confirmado",
      aguardando_pagamento: "Aguardando Pagamento", 
      cancelado: "Cancelado",
      kits_sendo_retirados: "Kits sendo Retirados",
      em_transito: "Em Trânsito",
      entregue: "Entregue",
    };
    return statusMap[status] || status;
  };

  // Detectar se o status permite WhatsApp (em_transito e entregue)
  const canSendWhatsApp = () => {
    return newStatus === 'em_transito' || newStatus === 'entregue';
  };

  // Reset checkboxes when modal opens
  useEffect(() => {
    if (isOpen) {
      setSendEmail(true);
      setSendWhatsApp(canSendWhatsApp());
    }
  }, [isOpen, newStatus]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && !isLoading) {
        onClose();
      }
    }}>
      <DialogContent 
        className="max-w-lg w-[95vw] max-h-[90vh] z-[100] p-4 sm:p-6" 
        aria-describedby="email-confirmation-description"
        onPointerDownOutside={(e) => {
          if (isLoading) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (isLoading) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader className="space-y-2 pb-2">
          <DialogTitle className="text-lg font-semibold">Confirmar Alteração de Status</DialogTitle>
          <DialogDescription id="email-confirmation-description" className="text-sm text-gray-600">
            Você está alterando o status do pedido <strong>{orderNumber}</strong> de{" "}
            <strong className="break-words">{customerName}</strong> para <strong>{getStatusLabel(newStatus)}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-sm text-gray-600">
            Escolha as notificações que deseja enviar para o cliente:
          </p>

          {/* Email Option */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="send-email"
              checked={sendEmail}
              onCheckedChange={(checked) => setSendEmail(checked as boolean)}
              disabled={isLoading}
              className="mt-0.5"
            />
            <label
              htmlFor="send-email"
              className="text-sm font-medium leading-5 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center"
            >
              <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
              Enviar email de notificação
            </label>
          </div>

          {/* WhatsApp Option - Only show for specific statuses */}
          {canSendWhatsApp() && (
            <div className="flex items-start space-x-3">
              <Checkbox
                id="send-whatsapp"
                checked={sendWhatsApp}
                onCheckedChange={(checked) => setSendWhatsApp(checked as boolean)}
                disabled={isLoading}
                className="mt-0.5"
              />
              <label
                htmlFor="send-whatsapp"
                className="text-sm font-medium leading-5 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center"
              >
                <MessageCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                Enviar mensagem no WhatsApp
              </label>
            </div>
          )}

          {/* Info message */}
          {(sendEmail || sendWhatsApp) && (
            <div className="bg-blue-50 p-2.5 rounded-md text-sm text-blue-700">
              <p className="leading-5">
                {sendEmail && sendWhatsApp 
                  ? "O cliente receberá notificações por email e WhatsApp."
                  : sendEmail 
                  ? "O cliente receberá uma notificação por email."
                  : sendWhatsApp
                  ? "O cliente receberá uma mensagem no WhatsApp."
                  : ""
                }
              </p>
              {canSendWhatsApp() && (
                <p className="text-xs mt-1.5 opacity-80">
                  💡 WhatsApp disponível para status "Em Trânsito" e "Entregue"
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-3 border-t">
          <Button
            variant="outline"
            onClick={() => {
              onConfirm(false, false);
            }}
            disabled={isLoading}
            className="w-full sm:w-auto text-sm h-9"
          >
            <MailX className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">Apenas mudar status</span>
          </Button>
          <Button
            onClick={() => {
              onConfirm(sendEmail, sendWhatsApp);
            }}
            disabled={isLoading || (!sendEmail && !sendWhatsApp)}
            className="w-full sm:w-auto text-sm h-9"
          >
            {sendEmail && sendWhatsApp ? (
              <>
                <MessageCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="truncate">Confirmar com notificações</span>
              </>
            ) : sendEmail ? (
              <>
                <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="truncate">Confirmar com email</span>
              </>
            ) : sendWhatsApp ? (
              <>
                <MessageCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="truncate">Confirmar com WhatsApp</span>
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="truncate">Confirmar</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, MailX } from "lucide-react";

interface EmailConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (sendEmail: boolean) => void;
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && !isLoading) {
        onClose();
      }
    }}>
      <DialogContent 
        className="sm:max-w-md z-[100]" 
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
        <DialogHeader>
          <DialogTitle>Confirmar Alteração de Status</DialogTitle>
          <DialogDescription id="email-confirmation-description">
            Você está alterando o status do pedido <strong>{orderNumber}</strong> de{" "}
            <strong>{customerName}</strong> para <strong>{getStatusLabel(newStatus)}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-gray-600 mb-4">
            Deseja enviar um email de notificação para o cliente sobre esta alteração?
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onConfirm(false);
            }}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            <MailX className="h-4 w-4 mr-2" />
            Não, apenas mudar status
          </Button>
          <Button
            onClick={() => {
              onConfirm(true);
            }}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            <Mail className="h-4 w-4 mr-2" />
            Sim, enviar email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
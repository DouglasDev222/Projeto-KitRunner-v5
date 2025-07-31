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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar Alteração de Status</DialogTitle>
          <DialogDescription>
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
            onClick={() => onConfirm(false)}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            <MailX className="h-4 w-4 mr-2" />
            Não, apenas mudar status
          </Button>
          <Button
            onClick={() => onConfirm(true)}
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
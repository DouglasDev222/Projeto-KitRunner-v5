
import React from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface LoadingModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
}

export function LoadingModal({ isOpen, title = "Gerando Relatório", message = "Por favor, aguarde enquanto o relatório está sendo processado..." }: LoadingModalProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md" hideCloseButton>
        <div className="flex flex-col items-center justify-center space-y-6 py-8">
          <LoadingSpinner size="lg" />
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
          <div className="text-xs text-muted-foreground">
            Este processo pode levar alguns segundos...
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, Mail, Phone } from "lucide-react";

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SupportModal({ isOpen, onClose }: SupportModalProps) {
  const handleWhatsAppClick = () => {
    const phoneNumber = "5583981302961";
    const message = "Olá! Preciso de suporte através do aplicativo KitRunner.";
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
    onClose();
  };

  const handleEmailClick = () => {
    const email = "contato@kitrunner.com.br";
    const subject = "Suporte - KitRunner";
    const body = "Olá! Preciso de suporte através do aplicativo KitRunner.";
    const emailUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(emailUrl);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <MessageCircle className="w-5 h-5 text-primary" />
            Suporte KitRunner
          </DialogTitle>
          <DialogDescription>
            Entre em contato conosco através dos canais abaixo. Estamos aqui para ajudar!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* WhatsApp */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-neutral-800">WhatsApp</p>
                    <p className="text-sm text-neutral-600">(83) 98130-2961</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleWhatsAppClick}
                >
                  <MessageCircle className="w-4 h-4 mr-1" />
                  Conversar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Email */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-neutral-800">Email</p>
                    <p className="text-sm text-neutral-600">contato@kitrunner.com.br</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleEmailClick}
                >
                  <Mail className="w-4 h-4 mr-1" />
                  Enviar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Horário de Atendimento */}
          <Card className="bg-neutral-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-neutral-800">Horário de Atendimento</p>
                  <p className="text-sm text-neutral-600">Segunda a Sexta: 8h às 18h</p>
                  <p className="text-sm text-neutral-600">Sábado: 8h às 12h</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

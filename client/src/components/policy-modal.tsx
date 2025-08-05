import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  type: 'register' | 'order';
}

export function PolicyModal({ isOpen, onClose, title, content, type }: PolicyModalProps) {
  const getTypeLabel = (type: string) => {
    return type === 'register' ? 'Termos de Cadastro' : 'Política de Pedidos';
  };

  const getTypeBadgeVariant = (type: string) => {
    return type === 'register' ? 'default' : 'secondary';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-lg">
            {title}
            <Badge variant={getTypeBadgeVariant(type)}>
              {getTypeLabel(type)}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] w-full">
          <div className="pr-4">
            <div 
              dangerouslySetInnerHTML={{ __html: content }}
              className="prose max-w-none text-sm leading-relaxed"
            />
          </div>
        </ScrollArea>
        
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose} className="bg-primary hover:bg-primary/90">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
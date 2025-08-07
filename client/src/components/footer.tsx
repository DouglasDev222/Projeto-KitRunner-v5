import { Button } from "@/components/ui/button";
import { Package, User, Calendar } from "lucide-react";
import { useLocation } from "wouter";

export function Footer() {
  const [, setLocation] = useLocation();

  return (
    <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 p-4">
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1 flex items-center gap-2"
          onClick={() => {
            sessionStorage.setItem("loginReturnPath", "/my-orders");
            setLocation("/my-orders");
          }}
        >
          <Package className="w-4 h-4" />
          Pedidos
        </Button>
        <Button
          variant="outline"
          className="flex-1 flex items-center gap-2"
          onClick={() => setLocation("/events")}
        >
          <Calendar className="w-4 h-4" />
          Eventos
        </Button>
        <Button
          variant="outline"
          className="flex-1 flex items-center gap-2"
          onClick={() => setLocation("/profile")}
        >
          <User className="w-4 h-4" />
          Perfil
        </Button>
      </div>
    </div>
  );
}
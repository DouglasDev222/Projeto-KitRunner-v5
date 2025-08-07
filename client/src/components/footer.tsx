import { Button } from "@/components/ui/button";
import { Package, User, Calendar } from "lucide-react";
import { useLocation } from "wouter";

export function Footer() {
  const [location, setLocation] = useLocation();

  // Função para verificar se uma rota está ativa
  const isRouteActive = (routes: string[]) => {
    return routes.some(route => {
      if (route === '/eventos') {
        return location === '/eventos' || location.startsWith('/events/');
      }
      if (route === '/my-orders') {
        return location === '/my-orders' || location.startsWith('/orders/');
      }
      if (route === '/profile') {
        return location === '/profile' || location.startsWith('/profile/');
      }
      return location === route;
    });
  };

  return (
    <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 p-4">
      <div className="flex gap-2">
        <Button
          variant={isRouteActive(['/my-orders']) ? "default" : "outline"}
          className={`flex-1 flex items-center gap-2 ${
            isRouteActive(['/my-orders']) 
              ? "bg-primary text-primary-foreground" 
              : ""
          }`}
          onClick={() => {
            sessionStorage.setItem("loginReturnPath", "/my-orders");
            setLocation("/my-orders");
          }}
        >
          <Package className="w-4 h-4" />
          Pedidos
        </Button>
        <Button
          variant={isRouteActive(['/eventos']) ? "default" : "outline"}
          className={`flex-1 flex items-center gap-2 ${
            isRouteActive(['/eventos']) 
              ? "bg-primary text-primary-foreground" 
              : ""
          }`}
          onClick={() => setLocation("/eventos")}
        >
          <Calendar className="w-4 h-4" />
          Eventos
        </Button>
        <Button
          variant={isRouteActive(['/profile']) ? "default" : "outline"}
          className={`flex-1 flex items-center gap-2 ${
            isRouteActive(['/profile']) 
              ? "bg-primary text-primary-foreground" 
              : ""
          }`}
          onClick={() => setLocation("/profile")}
        >
          <User className="w-4 h-4" />
          Perfil
        </Button>
      </div>
    </div>
  );
}
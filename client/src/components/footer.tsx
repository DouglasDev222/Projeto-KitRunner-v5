import { Button } from "@/components/ui/button";
import { Package, User, Calendar } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";

export function Footer() {
  const [location, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

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
          variant="outline"
          className={`flex-1 flex items-center gap-2 ${
            isRouteActive(['/eventos']) 
              ? "bg-white text-purple-600 border-purple-600" 
              : ""
          }`}
          onClick={() => setLocation("/eventos")}
        >
          <Calendar className="w-4 h-4" />
          Eventos
        </Button>
        <Button
          variant="outline"
          className={`flex-1 flex items-center gap-2 ${
            isRouteActive(['/my-orders']) 
              ? "bg-white text-purple-600 border-purple-600" 
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
          variant="outline"
          className={`flex-1 flex items-center gap-2 ${
            isRouteActive(['/profile']) 
              ? "bg-white text-purple-600 border-purple-600" 
              : ""
          }`}
          onClick={() => {
            if (isAuthenticated) {
              setLocation("/profile");
            } else {
              sessionStorage.setItem("loginReturnPath", "/profile");
              setLocation("/login");
            }
          }}
        >
          <User className="w-4 h-4" />
          {isAuthenticated ? "Perfil" : "Entrar"}
        </Button>
      </div>
    </div>
  );
}
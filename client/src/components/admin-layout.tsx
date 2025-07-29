import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAdminAuth } from "@/contexts/admin-auth-context";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { 
  Menu, 
  Home, 
  Users, 
  Calendar, 
  Package, 
  BarChart3,
  LogOut,
  Settings,
  Shield
} from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { admin, logout } = useAdminAuth();

  const menuItems = [
    { icon: Home, label: "Dashboard", href: "/admin" },
    { icon: Calendar, label: "Eventos", href: "/admin/events" },
    { icon: Users, label: "Clientes", href: "/admin/customers" },
    { icon: Package, label: "Pedidos", href: "/admin/orders" },
    { icon: BarChart3, label: "Relatórios", href: "/admin/reports" },
    ...(admin?.role === 'super_admin' ? [
      { icon: Settings, label: "Usuários", href: "/admin/users" },
    ] : []),
  ];

  const handleLogout = async () => {
    await logout();
    window.location.href = '/admin/login';
  };

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`${mobile ? 'w-full' : 'w-64'} bg-white border-r border-gray-200 h-full flex flex-col`}>
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800">Painel Admin</h2>
        {admin && (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-gray-600">Bem-vindo, {admin.fullName}</p>
            <Badge variant={admin.role === 'super_admin' ? 'default' : 'secondary'}>
              {admin.role === 'super_admin' ? (
                <>
                  <Shield className="mr-1 h-3 w-3" />
                  Super Admin
                </>
              ) : (
                'Administrador'
              )}
            </Badge>
          </div>
        )}
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <li key={item.href}>
                <Link href={item.href}>
                  <div
                    className={`flex items-center p-3 rounded-lg transition-colors cursor-pointer ${
                      isActive 
                        ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                    onClick={() => mobile && setSidebarOpen(false)}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.label}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-gray-200 space-y-2">
        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Fazer Logout
        </Button>
        <Link href="/">
          <Button variant="ghost" className="w-full justify-start">
            <Home className="w-4 h-4 mr-2" />
            Voltar ao Site
          </Button>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Painel Admin</h1>
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Menu className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <Sidebar mobile />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="flex">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        
        {/* Main Content */}
        <div className="flex-1 lg:ml-0">
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
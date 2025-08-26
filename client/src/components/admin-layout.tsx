import React, { useState } from "react";
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
  Shield,
  MapPin,
  Gift,
  FileText,
  MessageCircle,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Mail,
  Megaphone,
  CreditCard,
  UserCog,
  Database,
  FileCheck,
  Bell,
  Smartphone
} from "lucide-react";

interface MenuSubItem {
  icon: any;
  label: string;
  href: string;
  superAdminOnly?: boolean;
}

interface MenuItem {
  icon: any;
  label: string;
  href?: string;
  children?: MenuSubItem[];
  superAdminOnly?: boolean;
}

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  const { admin, logout } = useAdminAuth();

  const menuItems: MenuItem[] = [
    { 
      icon: Home, 
      label: "Dashboard", 
      href: "/dashboard" 
    },
    { 
      icon: Package, 
      label: "Pedidos", 
      href: "/admin",
      children: [
        { icon: Package, label: "Todos os Pedidos", href: "/admin/orders" },
        { icon: FileCheck, label: "Relatórios", href: "/admin/reports" }
      ]
    },
    { 
      icon: Calendar, 
      label: "Eventos", 
      href: "/admin/events" 
    },
    { 
      icon: Users, 
      label: "Clientes", 
      href: "/admin/customers" 
    },
    { 
      icon: Gift, 
      label: "Promoções", 
      children: [
        { icon: Gift, label: "Cupons", href: "/admin/coupons" },
        { icon: CreditCard, label: "Desconto", href: "/admin/discounts" }
      ]
    },
    { 
      icon: MessageCircle, 
      label: "Comunicação", 
      children: [
        { icon: Smartphone, label: "WhatsApp", href: "/admin/whatsapp" },
        { icon: Mail, label: "Logs de Email", href: "/admin/email-logs" },
        { icon: Shield, label: "Teste Email", href: "/admin/email-test" },
        { icon: Bell, label: "Notificações", href: "/admin/notifications" }
      ]
    },
    { 
      icon: Settings, 
      label: "Configurações", 
      children: [
        { icon: MapPin, label: "Zonas CEP", href: "/admin/cep-zones" },
        { icon: FileText, label: "Políticas", href: "/admin/policies" },
        { icon: Database, label: "Sistema", href: "/admin/system" },
        { icon: UserCog, label: "Usuários", href: "/admin/users", superAdminOnly: true }
      ]
    }
  ];

  const handleLogout = async () => {
    await logout();
    window.location.href = '/admin/login';
  };

  const toggleMenu = (label: string) => {
    setExpandedMenus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(label)) {
        newSet.delete(label);
      } else {
        newSet.add(label);
      }
      return newSet;
    });
  };

  const isMenuExpanded = (label: string) => expandedMenus.has(label);

  const isActiveRoute = (href?: string, children?: MenuSubItem[]) => {
    if (href && location === href) return true;
    if (children) {
      return children.some(child => location === child.href);
    }
    return false;
  };

  const shouldShowMenuItem = (item: MenuItem | MenuSubItem) => {
    if (item.superAdminOnly && admin?.role !== 'super_admin') {
      return false;
    }
    return true;
  };

  // Auto-expand menus that contain the active route
  React.useEffect(() => {
    menuItems.forEach(item => {
      if (item.children && item.children.some(child => location === child.href)) {
        setExpandedMenus(prev => new Set([...Array.from(prev), item.label]));
      }
    });
  }, [location]);

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => {
    const sidebarWidth = mobile ? 'w-full' : (sidebarCollapsed ? 'w-16' : 'w-64');
    
    return (
      <div className={`${sidebarWidth} h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {(!sidebarCollapsed || mobile) && (
              <h2 className="text-xl font-bold text-gray-800">Admin</h2>
            )}
            {!mobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1 h-8 w-8"
              >
                {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            )}
          </div>
          
          {/* User Info */}
          {admin && (!sidebarCollapsed || mobile) && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-gray-600 truncate">Olá, {admin.fullName}</p>
              <Badge variant={admin.role === 'super_admin' ? 'default' : 'secondary'} className="text-xs">
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
        
        {/* Navigation */}
        <nav className="flex-1 p-2 overflow-y-auto">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              if (!shouldShowMenuItem(item)) return null;
              
              const Icon = item.icon;
              const isActive = isActiveRoute(item.href, item.children);
              const hasChildren = item.children && item.children.length > 0;
              const isExpanded = isMenuExpanded(item.label);
              
              return (
                <li key={item.label}>
                  {/* Main Menu Item */}
                  <div className="relative">
                    {item.href ? (
                      <Link href={item.href}>
                        <div
                          className={`flex items-center p-3 rounded-lg transition-all duration-300 cursor-pointer group ${
                            isActive 
                              ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700 shadow-sm' 
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                          onClick={() => mobile && setSidebarOpen(false)}
                        >
                          <Icon className={`${sidebarCollapsed ? 'w-5 h-5' : 'w-5 h-5 mr-3'} transition-all duration-300`} />
                          {(!sidebarCollapsed || mobile) && (
                            <>
                              <span className="flex-1 font-medium">{item.label}</span>
                              {hasChildren && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleMenu(item.label);
                                  }}
                                  className="p-1 hover:bg-gray-200 rounded"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </Link>
                    ) : (
                      <button
                        className={`w-full flex items-center p-3 rounded-lg transition-all duration-300 cursor-pointer ${
                          isActive 
                            ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700 shadow-sm' 
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                        onClick={() => {
                          if (hasChildren) {
                            toggleMenu(item.label);
                          }
                          mobile && setSidebarOpen(false);
                        }}
                      >
                        <Icon className={`${sidebarCollapsed ? 'w-5 h-5' : 'w-5 h-5 mr-3'} transition-all duration-300`} />
                        {(!sidebarCollapsed || mobile) && (
                          <>
                            <span className="flex-1 font-medium text-left">{item.label}</span>
                            {hasChildren && (
                              <div className="p-1">
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  
                  {/* Submenu */}
                  {hasChildren && isExpanded && (!sidebarCollapsed || mobile) && (
                    <ul className="mt-1 ml-4 space-y-1 border-l-2 border-gray-100 pl-4">
                      {item.children!.filter(shouldShowMenuItem).map((subItem) => {
                        const SubIcon = subItem.icon;
                        const isSubActive = location === subItem.href;
                        
                        return (
                          <li key={subItem.href}>
                            <Link href={subItem.href}>
                              <div
                                className={`flex items-center p-2 rounded-lg transition-all duration-300 cursor-pointer ${
                                  isSubActive 
                                    ? 'bg-blue-100 text-blue-800 font-medium' 
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                                }`}
                                onClick={() => mobile && setSidebarOpen(false)}
                              >
                                <SubIcon className="w-4 h-4 mr-3" />
                                <span className="text-sm">{subItem.label}</span>
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-200 space-y-2 mt-auto">
          <Button 
            variant="destructive" 
            className={`w-full ${sidebarCollapsed && !mobile ? 'px-2' : 'justify-start'} transition-all duration-300`}
            onClick={handleLogout}
          >
            <LogOut className={`w-4 h-4 ${(!sidebarCollapsed || mobile) ? 'mr-2' : ''}`} />
            {(!sidebarCollapsed || mobile) && 'Logout'}
          </Button>
          <Link href="/eventos">
            <Button 
              variant="ghost" 
              className={`w-full ${sidebarCollapsed && !mobile ? 'px-2' : 'justify-start'} transition-all duration-300`}
            >
              <Home className={`w-4 h-4 ${(!sidebarCollapsed || mobile) ? 'mr-2' : ''}`} />
              {(!sidebarCollapsed || mobile) && 'Site'}
            </Button>
          </Link>
        </div>
      </div>
    );
  };

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
        <div className="hidden lg:block fixed left-0 top-0 z-40">
          <Sidebar />
        </div>
        
        {/* Main Content */}
        <div className={`flex-1 transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
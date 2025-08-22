import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Package, LogOut, MapPin, Edit3, Plus, Home, MessageCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { formatCPF } from "@/lib/cpf-validator";
import { formatZipCode, formatPhone } from "@/lib/brazilian-formatter";
import { useToast } from "@/hooks/use-toast";
import type { Address, Customer } from "@shared/schema";
import { Footer } from "@/components/footer";
import { SupportModal } from "@/components/support-modal";


export default function Profile() {
  const [, setLocation] = useLocation();
  const { user, logout, isAuthenticated, isLoading, updateUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

  // Query to fetch fresh user data from server to detect admin changes
  const { data: serverUserData } = useQuery<Customer>({
    queryKey: ["/api/customers", user?.id],
    enabled: !!user?.id,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true, // Refetch when component mounts
  });

  // Effect to update user context if server data differs from local data
  useEffect(() => {
    if (serverUserData && user && serverUserData.id === user.id) {
      // Compare key fields to detect changes made by admin
      const hasChanges = (
        serverUserData.name !== user.name ||
        serverUserData.email !== user.email ||
        serverUserData.phone !== user.phone ||
        serverUserData.birthDate !== user.birthDate
      );

      if (hasChanges) {
        console.log('🔄 Detected changes, updating user data');
        updateUser(serverUserData);

        // Clear any user edit flags without showing notifications
        localStorage.removeItem('user_just_edited_profile');
      }
    }
  }, [serverUserData, user, updateUser]);

  const { data: addresses } = useQuery({
    queryKey: ["/api/customers", user?.id, "addresses"],
    enabled: !!user?.id,
    refetchOnMount: true, // Always refetch addresses on mount
  });

  const { data: addressCount } = useQuery({
    queryKey: ["/api/customers", user?.id, "addresses", "count"],
    enabled: !!user?.id,
    refetchOnMount: true, // Always refetch count on mount
  });

  // Check if user has reached address limit (2 addresses)
  const hasReachedAddressLimit = addressCount ? (addressCount as { count: number }).count >= 2 : false;

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  // Use effect to handle redirection to avoid React warning
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      sessionStorage.setItem("loginReturnPath", "/profile");
      setLocation("/login");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  // Show loading while auth context is initializing
  if (isLoading) {
    return (
      <>
        {/* Mobile Loading */}
        <div className="lg:hidden max-w-md mx-auto bg-white min-h-screen">
          <Header showBackButton onBack={() => setLocation("/eventos")} />
          <div className="p-4 text-center">
            <p className="text-neutral-600">Carregando...</p>
          </div>
        </div>

        {/* Desktop Loading */}
        <div className="hidden lg:block min-h-screen bg-gray-50">
          {/* Desktop Header Skeleton */}
          <nav className="bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center">
                  <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="flex items-center space-x-8">
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                  <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                  <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </nav>

          {/* Main Content Skeleton */}
          <div className="max-w-6xl mx-auto pt-16 pb-8 px-8">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Left Column Skeleton */}
              <div className="lg:col-span-2 lg:pr-8">
                <div className="flex items-center mb-6 animate-pulse">
                  <div className="w-8 h-8 bg-gray-200 rounded mr-3" />
                  <div>
                    <div className="h-8 bg-gray-200 rounded mb-2 w-32" />
                    <div className="h-5 bg-gray-200 rounded w-48" />
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded mb-4 w-40" />
                  <div className="space-y-3 mb-6">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center space-x-3">
                        <div className="w-5 h-5 bg-gray-200 rounded" />
                        <div className="h-4 bg-gray-200 rounded flex-1" />
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <div className="h-5 bg-gray-200 rounded mb-3 w-32" />
                    <div className="space-y-2">
                      <div className="h-10 bg-gray-200 rounded" />
                      <div className="h-10 bg-gray-200 rounded" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column Skeleton */}
              <div className="lg:col-span-3">
                <div className="space-y-8">
                  {/* Personal Data Card Skeleton */}
                  <div className="bg-white rounded-lg shadow-lg animate-pulse">
                    <div className="p-8 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-6 h-6 bg-gray-200 rounded mr-3" />
                          <div className="h-6 bg-gray-200 rounded w-32" />
                        </div>
                        <div className="h-10 w-32 bg-gray-200 rounded" />
                      </div>
                    </div>
                    <div className="p-8">
                      <div className="grid grid-cols-2 gap-6">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i}>
                            <div className="h-4 bg-gray-200 rounded mb-2 w-24" />
                            <div className="h-5 bg-gray-200 rounded w-32" />
                          </div>
                        ))}
                        <div className="col-span-2">
                          <div className="h-4 bg-gray-200 rounded mb-2 w-16" />
                          <div className="h-5 bg-gray-200 rounded w-48" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Addresses Card Skeleton */}
                  <div className="bg-white rounded-lg shadow-lg animate-pulse">
                    <div className="p-8 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-6 h-6 bg-gray-200 rounded mr-3" />
                          <div className="h-6 bg-gray-200 rounded w-40" />
                        </div>
                        <div className="h-10 w-40 bg-gray-200 rounded" />
                      </div>
                    </div>
                    <div className="p-8">
                      <div className="grid grid-cols-1 gap-6">
                        {[1, 2].map((i) => (
                          <div key={i} className="border border-gray-200 rounded-lg p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="h-6 w-16 bg-gray-200 rounded" />
                                <div className="h-6 w-16 bg-gray-200 rounded" />
                              </div>
                              <div className="h-8 w-8 bg-gray-200 rounded" />
                            </div>
                            <div className="space-y-2">
                              <div className="h-4 bg-gray-200 rounded" />
                              <div className="h-4 bg-gray-200 rounded w-3/4" />
                              <div className="h-4 bg-gray-200 rounded w-1/2" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Support and Logout Card Skeleton */}
                  <div className="bg-white rounded-lg shadow-lg animate-pulse">
                    <div className="p-8">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="h-12 bg-gray-200 rounded" />
                        <div className="h-12 bg-gray-200 rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // If not authenticated, show loading while redirecting
  if (!isAuthenticated) {
    return (
      <>
        {/* Mobile Loading */}
        <div className="lg:hidden max-w-md mx-auto bg-white min-h-screen">
          <Header showBackButton onBack={() => setLocation("/eventos")} />
          <div className="p-4 text-center">
            <p className="text-neutral-600">Redirecionando para login...</p>
          </div>
        </div>

        {/* Desktop Loading */}
        <div className="hidden lg:block min-h-screen bg-gray-50">
          <nav className="bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center">
                  <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="flex items-center space-x-8">
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                  <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                  <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </nav>
          <div className="max-w-6xl mx-auto pt-16 pb-8 px-8">
            <div className="text-center">
              <p className="text-gray-600">Redirecionando para login...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Mobile Version */}
      <div className="lg:hidden max-w-md mx-auto bg-white min-h-screen pb-20 page-with-footer">
        <Header showBackButton onBack={() => setLocation("/eventos")} />
        <div className="p-4">
          <div className="flex items-center mb-6">
            <User className="w-8 h-8 text-primary mr-3" />
            <div>
              <h2 className="text-2xl font-bold text-neutral-800">Meu Perfil</h2>
              <p className="text-sm text-neutral-600">Gerencie suas informações</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <Button
              variant="outline"
              className="h-12 flex items-center justify-center gap-2"
              onClick={() => setLocation("/my-orders")}
            >
              <Package className="w-5 h-5" />
              <span>Pedidos</span>
            </Button>
            <Button
              className="h-12 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90"
              onClick={() => setLocation("/eventos")}
            >
              <Plus className="w-5 h-5" />
              <span>Fazer Novo Pedido</span>
            </Button>
          </div>

          {/* User Data Section */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Meus Dados
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setLocation("/profile/edit")}
                >
                  <Edit3 className="w-4 h-4 mr-1" />
                  Editar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-neutral-600">Nome</p>
                <p className="font-medium text-neutral-800">{user?.name}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-600">CPF</p>
                <p className="font-medium text-neutral-800">{formatCPF(user?.cpf || "")}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-600">Data de Nascimento</p>
                <p className="font-medium text-neutral-800">
                  {user?.birthDate ? new Date(user.birthDate + 'T00:00:00').toLocaleDateString('pt-BR') : ''}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-600">Telefone</p>
                <p className="font-medium text-neutral-800">{formatPhone(user?.phone || "")}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-600">Email</p>
                <p className="font-medium text-neutral-800">{user?.email}</p>
              </div>
            </CardContent>
          </Card>

          {/* Addresses Section */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Endereços
                </CardTitle>
                {!hasReachedAddressLimit && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLocation("/profile/address/new?from=profile")}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {(addresses as Address[] | undefined) && (addresses as Address[]).length > 0 ? (
                <div className="space-y-4">
                  {(addresses as Address[]).map((address: Address) => (
                    <div key={address.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{address.label}</Badge>
                          {address.isDefault && (
                            <Badge variant="default" className="bg-primary">
                              Padrão
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setLocation(`/profile/address/${address.id}/edit?from=profile`)}
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm text-neutral-600 space-y-1">
                        <p>{address.street}, {address.number}</p>
                        {address.complement && <p>{address.complement}</p>}
                        <p>{address.neighborhood}</p>
                        <p>{address.city} - {address.state}</p>
                        <p>CEP: {formatZipCode(address.zipCode)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <MapPin className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
                  <p className="text-neutral-600 mb-4">Nenhum endereço cadastrado</p>
                  {!hasReachedAddressLimit && (
                    <Button
                      variant="outline"
                      onClick={() => setLocation("/profile/address/new?from=profile")}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Primeiro Endereço
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Support and Logout Section */}
          <div className="space-y-4">
            <Separator />

            <Button
              variant="outline"
              className="w-full flex items-center justify-start gap-3 h-12 text-primary border-primary/20 hover:bg-primary/5"
              onClick={() => setIsSupportModalOpen(true)}
            >
              <MessageCircle className="w-5 h-5" />
              <span>Suporte</span>
            </Button>

            <Button
              variant="outline"
              className="w-full flex items-center justify-start gap-3 h-12 text-red-600 border-red-200 hover:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
              <span>Sair</span>
            </Button>
          </div>
        </div>
        <Footer />
        <SupportModal 
          isOpen={isSupportModalOpen} 
          onClose={() => setIsSupportModalOpen(false)} 
        />
      </div>

      {/* Desktop Version */}
      <div className="hidden lg:block min-h-screen bg-gray-50">
        {/* Desktop Header */}
        <nav className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex items-center">
                <img src="/logo.webp" alt="KitRunner" className="h-10 w-auto" />
              </div>

              {/* Navigation Links */}
              <div className="flex items-center space-x-8">
                <Button
                  variant="ghost"
                  onClick={() => setLocation("/")}
                  className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-lg transition-colors"
                >
                  <Home className="w-4 h-4" />
                  <span>Início</span>
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => {
                    sessionStorage.setItem("loginReturnPath", "/my-orders");
                    setLocation("/my-orders");
                  }}
                  className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-lg transition-colors"
                >
                  <Package className="w-4 h-4" />
                  <span>Pedidos</span>
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setLocation("/eventos")}
                  className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-lg transition-colors"
                >
                  <Package className="w-4 h-4" />
                  <span>Eventos</span>
                </Button>

                <Button
                  variant="ghost"
                  className="flex items-center space-x-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-lg font-medium"
                >
                  <User className="w-4 h-4" />
                  <span>Perfil</span>
                </Button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto pt-16 pb-8 px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Left Column - Profile Info */}
            <div className="lg:col-span-2 lg:pr-8">
              <div className="flex items-center mb-6">
                <User className="w-8 h-8 text-purple-600 mr-3" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Meu Perfil</h1>
                  <p className="text-lg text-gray-600 mt-2">Gerencie suas informações pessoais e endereços de entrega</p>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <h3 className="font-semibold text-xl text-gray-900 mb-4">Informações do Usuário</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5 text-purple-600" />
                    <span className="text-gray-700 font-medium">{user?.name}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Package className="w-5 h-5 text-purple-600" />
                    <span className="text-gray-700">{formatCPF(user?.cpf || "")}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-5 h-5 text-purple-600" />
                    <span className="text-gray-700">{addressCount ? (addressCount as { count: number }).count : 0} endereços cadastrados</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3">Ações Rápidas</h4>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setLocation("/my-orders")}
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Ver Meus Pedidos
                    </Button>
                    <Button
                      className="w-full justify-start bg-purple-600 hover:bg-purple-700"
                      onClick={() => setLocation("/eventos")}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Fazer Novo Pedido
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Content */}
            <div className="lg:col-span-3">
              <div className="space-y-8">
                {/* User Data Section */}
                <Card className="shadow-lg">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl flex items-center">
                        <User className="w-6 h-6 mr-3 text-purple-600" />
                        Dados Pessoais
                      </CardTitle>
                      <Button
                        variant="outline"
                        onClick={() => setLocation("/profile/edit")}
                        className="hover:bg-purple-50 hover:border-purple-200"
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Editar Dados
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Nome Completo</p>
                        <p className="text-lg text-gray-900">{user?.name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">CPF</p>
                        <p className="text-lg text-gray-900">{formatCPF(user?.cpf || "")}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Data de Nascimento</p>
                        <p className="text-lg text-gray-900">
                          {user?.birthDate ? new Date(user.birthDate + 'T00:00:00').toLocaleDateString('pt-BR') : ''}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Telefone</p>
                        <p className="text-lg text-gray-900">{formatPhone(user?.phone || "")}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm font-medium text-gray-600 mb-2">E-mail</p>
                        <p className="text-lg text-gray-900">{user?.email}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Addresses Section */}
                <Card className="shadow-lg">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl flex items-center">
                        <MapPin className="w-6 h-6 mr-3 text-purple-600" />
                        Endereços de Entrega
                      </CardTitle>
                      {!hasReachedAddressLimit && (
                        <Button
                          variant="outline"
                          onClick={() => setLocation("/profile/address/new?from=profile")}
                          className="hover:bg-purple-50 hover:border-purple-200"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Adicionar Endereço
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-8">
                    {(addresses as Address[] | undefined) && (addresses as Address[]).length > 0 ? (
                      <div className="grid grid-cols-1 gap-6">
                        {(addresses as Address[]).map((address: Address) => (
                          <div key={address.id} className="border border-gray-200 rounded-lg p-6 hover:border-purple-200 transition-colors">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <Badge variant="secondary" className="text-sm">{address.label}</Badge>
                                {address.isDefault && (
                                  <Badge variant="default" className="bg-purple-600 text-sm">
                                    Padrão
                                  </Badge>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setLocation(`/profile/address/${address.id}/edit?from=profile`)}
                                className="hover:bg-purple-50"
                              >
                                <Edit3 className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="text-gray-700 space-y-1">
                              <p className="font-medium">{address.street}, {address.number}</p>
                              {address.complement && <p>{address.complement}</p>}
                              <p>{address.neighborhood}</p>
                              <p>{address.city} - {address.state}</p>
                              <p>CEP: {formatZipCode(address.zipCode)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum endereço cadastrado</h3>
                        <p className="text-gray-600 mb-6">Adicione um endereço para facilitar suas entregas</p>
                        {!hasReachedAddressLimit && (
                          <Button
                            onClick={() => setLocation("/profile/address/new?from=profile")}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar Primeiro Endereço
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Support and Logout Section */}
                <Card className="shadow-lg">
                  <CardContent className="p-8">
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        variant="outline"
                        className="h-12 flex items-center justify-center gap-3 text-purple-600 border-purple-200 hover:bg-purple-50"
                        onClick={() => setIsSupportModalOpen(true)}
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span>Suporte</span>
                      </Button>

                      <Button
                        variant="outline"
                        className="h-12 flex items-center justify-center gap-3 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={handleLogout}
                      >
                        <LogOut className="w-5 h-5" />
                        <span>Sair</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>

        <SupportModal 
          isOpen={isSupportModalOpen} 
          onClose={() => setIsSupportModalOpen(false)} 
        />
      </div>
    </>
  );
}
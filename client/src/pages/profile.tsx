import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Package, LogOut, MapPin, Edit3, Plus, Home } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { formatCPF } from "@/lib/cpf-validator";
import { formatZipCode } from "@/lib/brazilian-formatter";
import type { Address } from "@shared/schema";


export default function Profile() {
  const [, setLocation] = useLocation();
  const { user, logout, isAuthenticated } = useAuth();

  const { data: addresses } = useQuery({
    queryKey: ["addresses", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/customers/${user?.id}/addresses`);
      return response.json();
    },
    enabled: !!user?.id,
  });

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  // Use effect to handle redirection to avoid React warning
  useEffect(() => {
    if (!isAuthenticated) {
      sessionStorage.setItem("loginReturnPath", "/profile");
      setLocation("/login");
    }
  }, [isAuthenticated, setLocation]);

  // If not authenticated, show loading while redirecting
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <Header showBackButton onBack={() => setLocation("/")} />
        <div className="p-4 text-center">
          <p className="text-neutral-600">Redirecionando para login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen pb-20">
      <Header showBackButton onBack={() => setLocation("/")} />
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
            onClick={() => setLocation("/")}
          >
            <Plus className="w-5 h-5" />
            <span>Fazer Novo Pedido</span>
          </Button>
        </div>

        {/* User Data Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <User className="w-5 h-5 mr-2" />
              Meus Dados
            </CardTitle>
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
              <p className="font-medium text-neutral-800">{user?.birthDate}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-600">Telefone</p>
              <p className="font-medium text-neutral-800">{user?.phone}</p>
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
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLocation("/profile/address/new")}
              >
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {addresses && addresses.length > 0 ? (
              <div className="space-y-4">
                {addresses.map((address: Address) => (
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
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setLocation(`/profile/address/${address.id}/edit`)}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
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
                <Button 
                  variant="outline" 
                  onClick={() => setLocation("/profile/address/new")}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Primeiro Endereço
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Logout Section */}
        <div className="space-y-4">
          <Separator />

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
    </div>
  );
}
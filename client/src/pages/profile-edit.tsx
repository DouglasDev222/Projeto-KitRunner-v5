import { useState } from "react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Save, AlertTriangle, Package, Home, LogOut, Calendar } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customerProfileEditSchema } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useIsMobile } from "@/hooks/use-mobile";

type ProfileEditFormData = z.infer<typeof customerProfileEditSchema>;

export default function ProfileEdit() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading, updateUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMobile = useIsMobile();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<ProfileEditFormData>({
    resolver: zodResolver(customerProfileEditSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      birthDate: user?.birthDate || "",
    }
  });

  // Update form when user data loads
  useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        email: user.email,
        phone: user.phone,
        birthDate: user.birthDate,
      });
    }
  }, [user, reset]);

  // Use effect to handle redirection
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      sessionStorage.setItem("loginReturnPath", "/profile/edit");
      setLocation("/login");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileEditFormData) => {
      // Get user data from localStorage and encode as base64 token
      const savedUser = localStorage.getItem('kitrunner_user');
      if (!savedUser) {
        throw new Error('Usuário não encontrado. Faça login novamente.');
      }
      
      // Create base64 token from user data (same format expected by server)
      const token = btoa(savedUser);
      
      const response = await fetch(`/api/customers/${user?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar perfil');
      }

      return response.json();
    },
    onSuccess: (updatedCustomer) => {
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso!",
        variant: "default",
      });

      // Update auth context with new user data for immediate UI refresh
      if (updatedCustomer) {
        updateUser(updatedCustomer);
      }

      // Comprehensive cache invalidation following reactividade solution pattern
      queryClient.invalidateQueries({ queryKey: ["/api/customers", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] }); // General customers cache
      queryClient.invalidateQueries({ queryKey: ["customer", user?.id] }); // Legacy support
      queryClient.invalidateQueries({ queryKey: ["/api/customers", user?.id, "addresses"] }); // Address data
      queryClient.invalidateQueries({ queryKey: ["/api/customers", user?.id, "orders"] }); // Orders data
      
      // Navigate back to profile
      setLocation("/profile");
    },
    onError: (error: any) => {
      console.error('Profile update error:', error);
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message || "Ocorreu um erro ao atualizar suas informações. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = async (data: ProfileEditFormData) => {
    setIsSubmitting(true);
    try {
      await updateProfileMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading while auth context is initializing
  if (isLoading) {
    return (
      <>
        {/* Mobile Loading */}
        <div className="lg:hidden max-w-md mx-auto bg-white min-h-screen">
          <Header showBackButton onBack={() => setLocation("/profile")} />
          <div className="p-4 text-center">
            <p className="text-neutral-600">Carregando...</p>
          </div>
        </div>

        {/* Desktop Loading */}
        <div className="hidden lg:block min-h-screen bg-gray-50">
          {/* Desktop Header Skeleton */}
          <nav className="bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-8">
              <div className="flex items-center justify-between h-16 animate-pulse">
                <div className="flex items-center">
                  <div className="h-10 w-32 bg-gray-200 rounded" />
                </div>
                <div className="flex items-center space-x-8">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-8 w-20 bg-gray-200 rounded" />
                  ))}
                </div>
              </div>
            </div>
          </nav>

          {/* Main Content Skeleton */}
          <div className="max-w-6xl mx-auto pt-16 pb-8 px-8">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Left Column - Information Skeleton (2/5) */}
              <div className="lg:col-span-2 lg:pr-8">
                <div className="sticky top-24 animate-pulse">
                  <div className="flex items-center mb-8">
                    <div className="w-12 h-12 bg-gray-200 rounded mr-4" />
                    <div>
                      <div className="h-8 bg-gray-200 rounded mb-2 w-40" />
                      <div className="h-6 bg-gray-200 rounded w-60" />
                    </div>
                  </div>

                  {/* Security Info Card Skeleton */}
                  <div className="border-amber-200 bg-amber-50 shadow-lg rounded-lg p-8 mb-6">
                    <div className="flex items-start gap-4">
                      <div className="w-6 h-6 bg-amber-200 rounded flex-shrink-0" />
                      <div className="flex-1">
                        <div className="h-6 bg-amber-200 rounded mb-3 w-48" />
                        <div className="space-y-2">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="h-4 bg-amber-200 rounded w-full" />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions Card Skeleton */}
                  <div className="shadow-lg rounded-lg p-8 bg-white">
                    <div className="h-6 bg-gray-200 rounded mb-4 w-32" />
                    <div className="space-y-3">
                      {[1, 2].map((i) => (
                        <div key={i} className="h-12 bg-gray-200 rounded w-full" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Form Skeleton (3/5) */}
              <div className="lg:col-span-3">
                <div className="shadow-lg rounded-lg bg-white">
                  <div className="p-10 pb-6 animate-pulse">
                    <div className="flex items-center mb-2">
                      <div className="w-6 h-6 bg-gray-200 rounded mr-3" />
                      <div className="h-8 bg-gray-200 rounded w-48" />
                    </div>
                    <div className="h-4 bg-gray-200 rounded w-64" />
                  </div>
                  <div className="p-10 pt-0 animate-pulse">
                    {/* Form Grid Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Name Field */}
                      <div className="md:col-span-2">
                        <div className="h-5 bg-gray-200 rounded mb-2 w-32" />
                        <div className="h-12 bg-gray-200 rounded" />
                      </div>

                      {/* Email and Phone Fields */}
                      <div>
                        <div className="h-5 bg-gray-200 rounded mb-2 w-16" />
                        <div className="h-12 bg-gray-200 rounded" />
                      </div>
                      <div>
                        <div className="h-5 bg-gray-200 rounded mb-2 w-20" />
                        <div className="h-12 bg-gray-200 rounded" />
                      </div>

                      {/* Birth Date and CPF Fields */}
                      <div>
                        <div className="h-5 bg-gray-200 rounded mb-2 w-40" />
                        <div className="h-12 bg-gray-200 rounded" />
                      </div>
                      <div>
                        <div className="h-5 bg-gray-200 rounded mb-2 w-32" />
                        <div className="h-12 bg-gray-100 rounded" />
                      </div>
                    </div>

                    {/* Submit Button Skeleton */}
                    <div className="pt-10">
                      <div className="h-14 bg-gray-200 rounded w-full" />
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
          <Header showBackButton onBack={() => setLocation("/profile")} />
          <div className="p-4 text-center">
            <p className="text-neutral-600">Redirecionando para login...</p>
          </div>
        </div>

        {/* Desktop Loading */}
        <div className="hidden lg:block min-h-screen bg-gray-50">
          <nav className="bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-8">
              <div className="flex items-center justify-between h-16 animate-pulse">
                <div className="flex items-center">
                  <div className="h-10 w-32 bg-gray-200 rounded" />
                </div>
                <div className="flex items-center space-x-8">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-8 w-20 bg-gray-200 rounded" />
                  ))}
                </div>
              </div>
            </div>
          </nav>

          <div className="max-w-6xl mx-auto pt-16 pb-8 px-8">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              <div className="lg:col-span-2 lg:pr-8">
                <div className="text-center animate-pulse">
                  <div className="h-8 bg-gray-200 rounded mb-4 w-48 mx-auto" />
                  <div className="h-4 bg-gray-200 rounded w-32 mx-auto" />
                </div>
              </div>
              <div className="lg:col-span-3">
                <div className="shadow-lg rounded-lg bg-white p-10 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded mb-4 w-40" />
                  <div className="h-4 bg-gray-200 rounded w-60" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (isMobile) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen pb-20">
        <Header showBackButton onBack={() => setLocation("/profile")} />
        <div className="p-4">
          <div className="flex items-center mb-6">
            <User className="w-8 h-8 text-primary mr-3" />
            <div>
              <h2 className="text-2xl font-bold text-neutral-800">Editar Perfil</h2>
              <p className="text-sm text-neutral-600">Altere suas informações pessoais</p>
            </div>
          </div>

          {/* Security Notice */}
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">Informações de Segurança</p>
                  <p>O CPF não pode ser alterado por motivos de segurança. Entre em contato com o suporte se precisar alterar esta informação.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Edit Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <User className="w-5 h-5 mr-2" />
                Informações Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Name Field */}
                <div>
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    type="text"
                    {...register("name")}
                    className={errors.name ? "border-red-500" : ""}
                    placeholder="Seu nome completo"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                  )}
                </div>

                {/* Email Field */}
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    className={errors.email ? "border-red-500" : ""}
                    placeholder="seu@email.com"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                  )}
                </div>

                {/* Phone Field */}
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    {...register("phone")}
                    className={errors.phone ? "border-red-500" : ""}
                    placeholder="(83) 99999-9999"
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
                  )}
                </div>

                {/* Birth Date Field */}
                <div>
                  <Label htmlFor="birthDate">Data de Nascimento</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    {...register("birthDate")}
                    className={errors.birthDate ? "border-red-500" : ""}
                  />
                  {errors.birthDate && (
                    <p className="text-red-500 text-sm mt-1">{errors.birthDate.message}</p>
                  )}
                </div>

                {/* CPF Field (Read-only) */}
                <div>
                  <Label htmlFor="cpf">CPF (não editável)</Label>
                  <Input
                    id="cpf"
                    type="text"
                    value={user?.cpf ? `${user.cpf.slice(0, 3)}.${user.cpf.slice(3, 6)}.${user.cpf.slice(6, 9)}-${user.cpf.slice(9)}` : ''}
                    disabled
                    className="bg-neutral-100 text-neutral-600"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Por motivos de segurança, o CPF não pode ser alterado
                  </p>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting || updateProfileMutation.isPending}
                  >
                    {isSubmitting || updateProfileMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Salvar Alterações
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Desktop Version
  return (
    <div className="hidden lg:block min-h-screen bg-gray-50">
      {/* Desktop Header */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <a href="/eventos">
                <img src="/logo.webp" alt="KitRunner" className="h-10 w-auto" />
              </a>
            </div>

            {/* Navigation Links */}
            <div className="flex items-center space-x-8">
              <Button
                variant="ghost"
                onClick={() => setLocation("/eventos")}
                className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-lg transition-colors"
              >
                <Calendar className="w-4 h-4" />
                <span>Eventos</span>
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
                onClick={() => setLocation("/profile")}
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
          {/* Left Column - Information (2/5) */}
          <div className="lg:col-span-2 lg:pr-8">
            <div className="sticky top-24">
              <div className="flex items-center mb-8">
                <User className="w-12 h-12 text-purple-600 mr-4" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Editar Perfil</h1>
                  <p className="text-gray-600 mt-2">Atualize suas informações pessoais de forma segura</p>
                </div>
              </div>

              {/* Security Info Card */}
              <Card className="border-amber-200 bg-amber-50 shadow-lg">
                <CardContent className="p-8">
                  <div className="flex items-start gap-4">
                    <AlertTriangle className="w-6 h-6 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-amber-800 text-lg mb-3">Informações de Segurança</h3>
                      <div className="text-amber-700 space-y-2">
                        <p>• O CPF não pode ser alterado por motivos de segurança</p>
                        <p>• Suas informações são protegidas e criptografadas</p>
                        <p>• Entre em contato com o suporte para alterações especiais</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="mt-6 shadow-lg">
                <CardContent className="p-8">
                  <h3 className="font-semibold text-gray-900 text-lg mb-4">Ações Rápidas</h3>
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      onClick={() => setLocation("/profile")}
                      className="w-full justify-start text-left"
                    >
                      <User className="w-4 h-4 mr-3" />
                      Voltar ao Perfil
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setLocation("/profile")}
                      className="w-full justify-start text-left"
                    >
                      <Home className="w-4 h-4 mr-3" />
                      Ver Endereços
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column - Form (3/5) */}
          <div className="lg:col-span-3">
            <Card className="shadow-lg">
              <CardHeader className="p-10 pb-6">
                <CardTitle className="text-2xl flex items-center">
                  <User className="w-6 h-6 mr-3" />
                  Informações Pessoais
                </CardTitle>
                <p className="text-gray-600 mt-2">Atualize seus dados pessoais abaixo</p>
              </CardHeader>
              <CardContent className="p-10 pt-0">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                  {/* Form Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Name Field */}
                    <div className="md:col-span-2">
                      <Label htmlFor="name" className="text-base font-medium">Nome Completo</Label>
                      <Input
                        id="name"
                        type="text"
                        {...register("name")}
                        className={`h-12 text-base mt-2 ${errors.name ? "border-red-500" : ""}`}
                        placeholder="Seu nome completo"
                      />
                      {errors.name && (
                        <p className="text-red-500 text-sm mt-2">{errors.name.message}</p>
                      )}
                    </div>

                    {/* Email Field */}
                    <div>
                      <Label htmlFor="email" className="text-base font-medium">E-mail</Label>
                      <Input
                        id="email"
                        type="email"
                        {...register("email")}
                        className={`h-12 text-base mt-2 ${errors.email ? "border-red-500" : ""}`}
                        placeholder="seu@email.com"
                      />
                      {errors.email && (
                        <p className="text-red-500 text-sm mt-2">{errors.email.message}</p>
                      )}
                    </div>

                    {/* Phone Field */}
                    <div>
                      <Label htmlFor="phone" className="text-base font-medium">Telefone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        {...register("phone")}
                        className={`h-12 text-base mt-2 ${errors.phone ? "border-red-500" : ""}`}
                        placeholder="(83) 99999-9999"
                      />
                      {errors.phone && (
                        <p className="text-red-500 text-sm mt-2">{errors.phone.message}</p>
                      )}
                    </div>

                    {/* Birth Date Field */}
                    <div>
                      <Label htmlFor="birthDate" className="text-base font-medium">Data de Nascimento</Label>
                      <Input
                        id="birthDate"
                        type="date"
                        {...register("birthDate")}
                        className={`h-12 text-base mt-2 ${errors.birthDate ? "border-red-500" : ""}`}
                      />
                      {errors.birthDate && (
                        <p className="text-red-500 text-sm mt-2">{errors.birthDate.message}</p>
                      )}
                    </div>

                    {/* CPF Field (Read-only) */}
                    <div>
                      <Label htmlFor="cpf" className="text-base font-medium">CPF (não editável)</Label>
                      <Input
                        id="cpf"
                        type="text"
                        value={user?.cpf ? `${user.cpf.slice(0, 3)}.${user.cpf.slice(3, 6)}.${user.cpf.slice(6, 9)}-${user.cpf.slice(9)}` : ''}
                        disabled
                        className="bg-gray-100 text-gray-600 h-12 text-base mt-2"
                      />
                      <p className="text-sm text-gray-500 mt-2">
                        Por motivos de segurança, o CPF não pode ser alterado
                      </p>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-6">
                    <Button
                      type="submit"
                      className="w-full h-14 text-base font-medium"
                      disabled={isSubmitting || updateProfileMutation.isPending}
                    >
                      {isSubmitting || updateProfileMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
                          Salvando Alterações...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5 mr-3" />
                          Salvar Alterações
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
import { useState } from "react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Save, AlertTriangle } from "lucide-react";
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

type ProfileEditFormData = z.infer<typeof customerProfileEditSchema>;

export default function ProfileEdit() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      // Update the auth context and invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/customers", user?.id] });
      
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
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <Header showBackButton onBack={() => setLocation("/profile")} />
        <div className="p-4 text-center">
          <p className="text-neutral-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show loading while redirecting
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <Header showBackButton onBack={() => setLocation("/profile")} />
        <div className="p-4 text-center">
          <p className="text-neutral-600">Redirecionando para login...</p>
        </div>
      </div>
    );
  }

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
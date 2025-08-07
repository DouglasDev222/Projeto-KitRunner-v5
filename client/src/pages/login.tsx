import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  customerIdentificationSchema,
  type CustomerIdentification,
} from "@shared/schema";
import { formatCPF, isValidCPF } from "@/lib/cpf-validator";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";

// Função para formatar data brasileira (DD/MM/AAAA)
const formatBrazilianDate = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
  return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
};

// Função para converter data brasileira para formato ISO
const brazilianToIsoDate = (brazilianDate: string): string => {
  const numbers = brazilianDate.replace(/\D/g, "");
  if (numbers.length === 8) {
    const day = numbers.slice(0, 2);
    const month = numbers.slice(2, 4);
    const year = numbers.slice(4, 8);
    return `${year}-${month}-${day}`;
  }
  return "";
};

// Função para converter data ISO para formato brasileiro
const isoToBrazilianDate = (isoDate: string): string => {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
};

export default function Login() {
  const [, setLocation] = useLocation();
  const { login, isAuthenticated } = useAuth();
  const [hasRedirected, setHasRedirected] = useState(false);
  const [formattedBirthDate, setFormattedBirthDate] = useState("");

  // Handle URL redirect parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectParam = urlParams.get("redirect");
    if (redirectParam) {
      sessionStorage.setItem("loginReturnPath", redirectParam);
    }
  }, []);

  // If already authenticated, redirect immediately (only for page load, not after manual login)
  useEffect(() => {
    if (isAuthenticated && !hasRedirected) {
      const returnPath = sessionStorage.getItem("loginReturnPath");
      if (returnPath) {
        sessionStorage.removeItem("loginReturnPath");
        setLocation(returnPath);
      } else {
        setLocation("/profile");
      }
      setHasRedirected(true);
    }
  }, [isAuthenticated, setLocation, hasRedirected]);

  const form = useForm<CustomerIdentification>({
    resolver: zodResolver(customerIdentificationSchema),
    defaultValues: {
      cpf: "",
      birthDate: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: CustomerIdentification) => {
      const response = await apiRequest(
        "POST",
        "/api/customers/identify",
        data,
      );
      if (!response.ok) {
        throw new Error("Customer not found");
      }
      return response.json();
    },
    onSuccess: (customer) => {
      // Mark that we've manually logged in to prevent double redirect
      setHasRedirected(true);

      // Get return path before calling login
      const returnPath = sessionStorage.getItem("loginReturnPath");
      sessionStorage.removeItem("loginReturnPath");

      login(customer);

      // Navigate after a small delay to ensure state is updated
      setTimeout(() => {
        if (returnPath) {
          setLocation(returnPath);
        } else {
          setLocation("/profile");
        }
      }, 50);
    },
    onError: () => {
      form.setError("root", {
        message: "CPF não encontrado ou data de nascimento incorreta.",
      });
    },
  });

  const onSubmit = (data: CustomerIdentification) => {
    const cleanCPF = data.cpf.replace(/\D/g, "");
    if (!isValidCPF(cleanCPF)) {
      form.setError("cpf", { message: "CPF inválido" });
      return;
    }
    
    // Converter data brasileira para formato ISO
    const isoDate = brazilianToIsoDate(formattedBirthDate);
    if (!isoDate) {
      form.setError("birthDate", { message: "Data de nascimento inválida" });
      return;
    }
    
    loginMutation.mutate({ ...data, cpf: cleanCPF, birthDate: isoDate });
  };

  const handleRegister = () => {
    // Clear form and go to events to start registration flow
    setLocation("/register");
  };

  const handleCreateAccount = () => {
    // Use the current CPF value if available for registration
    const currentCpf = form.getValues("cpf");
    if (currentCpf) {
      sessionStorage.setItem("registrationCpf", currentCpf);
    }
    setLocation("/register");
  };

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      <Header showBackButton onBack={() => setLocation("/")} />
      <div className="p-4">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <LogIn className="w-12 h-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">Fazer Login</CardTitle>
            <p className="text-neutral-600">
              Digite seu CPF e data de nascimento para acessar sua conta
            </p>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="cpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="000.000.000-00"
                          value={formatCPF(field.value)}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "");
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Nascimento</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="DD/MM/AAAA"
                          value={formattedBirthDate}
                          onChange={(e) => {
                            const formatted = formatBrazilianDate(e.target.value);
                            setFormattedBirthDate(formatted);
                            // Atualizar o campo do formulário com a data ISO para validação
                            const isoDate = brazilianToIsoDate(formatted);
                            field.onChange(isoDate);
                          }}
                          maxLength={10}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.formState.errors.root && (
                  <div className="text-red-500 text-sm text-center mb-4">
                    {form.formState.errors.root.message}
                    <div className="mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={handleCreateAccount}
                      >
                        <User className="w-4 h-4 mr-2" />
                        Criar Conta com este CPF
                      </Button>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center">
              <p className="text-sm text-neutral-600 mb-4">
                Ainda não tem uma conta?
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleRegister}
              >
                <User className="w-4 h-4 mr-2" />
                Fazer Primeiro Acesso
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

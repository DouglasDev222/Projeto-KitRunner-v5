import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon, AlertTriangle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useState, useEffect } from "react";
import { customerIdentificationSchema, type CustomerIdentification, type Customer } from "@shared/schema";
import { formatCPF, isValidCPF } from "@/lib/cpf-validator";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";

export default function CustomerIdentification() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();

  // If user is already authenticated, skip to address confirmation
  useEffect(() => {
    if (isAuthenticated && user) {
      sessionStorage.setItem("customerData", JSON.stringify(user));
      setLocation(`/events/${id}/address`);
    }
  }, [isAuthenticated, user, id, setLocation]);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<CustomerIdentification>({
    resolver: zodResolver(customerIdentificationSchema),
    defaultValues: {
      cpf: "",
      birthDate: "",
    },
  });

  const identifyMutation = useMutation({
    mutationFn: async (data: CustomerIdentification) => {
      const response = await apiRequest("POST", "/api/customers/identify", data);
      return response.json();
    },
    onSuccess: (customer: Customer) => {
      // Store customer data in sessionStorage for next steps
      sessionStorage.setItem("customerData", JSON.stringify(customer));
      setLocation(`/events/${id}/address`);
    },
    onError: (error: any) => {
      if (error.status === 404) {
        // Show registration option if customer not found
        setError("Cliente não encontrado. Você pode se cadastrar clicando em 'Novo Cadastro'.");
      } else {
        setError(error.message || "Erro ao identificar cliente");
      }
    },
  });

  const onSubmit = (data: CustomerIdentification) => {
    setError(null);
    
    // Validate CPF
    if (!isValidCPF(data.cpf)) {
      setError("CPF inválido. Verifique os números digitados.");
      return;
    }

    identifyMutation.mutate(data);
  };

  const handleCPFChange = (value: string) => {
    const formatted = formatCPF(value);
    form.setValue("cpf", formatted);
  };

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      <Header showBackButton onBack={() => setLocation(`/events/${id}`)} />
      <div className="p-4">
        <h2 className="text-2xl font-bold text-neutral-800 mb-2">Identificação</h2>
        <p className="text-neutral-600 mb-6">Para sua segurança, precisamos confirmar seus dados</p>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="cpf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="000.000.000-00"
                      {...field}
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
                      type="date"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Card className="bg-neutral-50">
              <CardContent className="p-4">
                <div className="flex items-center mb-2">
                  <InfoIcon className="w-5 h-5 text-primary mr-2" />
                  <span className="text-sm font-medium text-neutral-800">Importante</span>
                </div>
                <p className="text-sm text-neutral-600">
                  Utilizamos os dados cadastrados na inscrição do evento para validar sua identidade e buscar seu endereço de entrega.
                </p>
              </CardContent>
            </Card>
            
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button 
              type="submit" 
              className="w-full bg-primary text-white hover:bg-primary/90"
              size="lg"
              disabled={identifyMutation.isPending}
            >
              {identifyMutation.isPending ? "Verificando..." : "Confirmar Identificação"}
            </Button>
            
            <div className="mt-4 text-center">
              <p className="text-sm text-neutral-600 mb-2">Ainda não tem cadastro?</p>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setLocation(`/events/${id}/register`)}
              >
                Novo Cadastro
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}

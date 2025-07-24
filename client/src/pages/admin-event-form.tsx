import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { AdminLayout } from "@/components/admin-layout";
import { AdminAuth } from "@/components/admin-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, DollarSign } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminEventCreationSchema, type AdminEventCreation } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const brazilianStates = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export default function AdminEventForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const authStatus = localStorage.getItem("adminAuthenticated");
    setIsAuthenticated(authStatus === "true");
  }, []);

  const form = useForm<AdminEventCreation>({
    resolver: zodResolver(adminEventCreationSchema),
    defaultValues: {
      name: "",
      date: "",
      location: "",
      city: "",
      state: "PB",
      pickupZipCode: "",
      fixedPrice: "",
      extraKitPrice: "8.00",
      donationRequired: false,
      donationAmount: "",
      donationDescription: "",
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: AdminEventCreation) => {
      const response = await apiRequest("POST", "/api/admin/events", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Evento criado com sucesso!",
        description: "O evento foi adicionado ao sistema.",
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "events"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      setLocation("/admin");
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar evento",
        description: error.message || "Ocorreu um erro ao criar o evento.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AdminEventCreation) => {
    createEventMutation.mutate(data);
  };

  const watchDonationRequired = form.watch("donationRequired");

  if (!isAuthenticated) {
    return <AdminAuth onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <AdminLayout>
      <div className="flex items-center mb-6">
        <Calendar className="w-8 h-8 text-primary mr-3" />
        <div>
          <h2 className="text-2xl font-bold text-neutral-800">Novo Evento</h2>
          <p className="text-neutral-600">Adicione um novo evento ao sistema</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações do Evento</CardTitle>
        </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Evento</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Maratona de São Paulo 2024" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data do Evento</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Local do Evento</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Parque do Ibirapuera" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cidade</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: São Paulo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {brazilianStates.map((state) => (
                                <SelectItem key={state} value={state}>
                                  {state}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="pickupZipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP de Retirada</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="00000000"
                            maxLength={8}
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, "");
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          CEP onde os kits serão retirados (somente números)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Pricing Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">Configuração de Preços</h3>
                  </div>

                  <FormField
                    control={form.control}
                    name="fixedPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço Fixo (Opcional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="0.00"
                            type="number"
                            step="0.01"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Se definido, será usado como preço base ao invés do cálculo por distância
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="extraKitPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço por Kit Extra</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="8.00"
                            type="number"
                            step="0.01"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Valor cobrado por cada kit adicional além do primeiro
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Donation Settings */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="donationRequired"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Doação Obrigatória
                          </FormLabel>
                          <FormDescription>
                            Marque se este evento requer doação para retirada do kit
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  {watchDonationRequired && (
                    <>
                      <FormField
                        control={form.control}
                        name="donationDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descrição da Doação</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ex: 1 kg de alimento não perecível"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="donationAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor da Doação</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="0.00"
                                type="number"
                                step="0.01"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Valor em reais equivalente à doação
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>

                <div className="flex gap-4 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation("/admin")}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createEventMutation.isPending}
                    className="flex-1"
                  >
                    {createEventMutation.isPending ? "Criando..." : "Criar Evento"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
    </AdminLayout>
  );
}
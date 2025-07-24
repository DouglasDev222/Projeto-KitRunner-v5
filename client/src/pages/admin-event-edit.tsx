import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminLayout } from "@/components/admin-layout";
import { AdminAuth } from "@/components/admin-auth";
import { ArrowLeft, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Event } from "@shared/schema";

const eventSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  date: z.string().min(1, "Data é obrigatória"),
  location: z.string().min(1, "Local é obrigatório"),
  city: z.string().min(1, "Cidade é obrigatória"),
  state: z.string().min(1, "Estado é obrigatório"),
  pickupZipCode: z.string().min(8, "CEP é obrigatório"),
  fixedPrice: z.string().optional(),
  extraKitPrice: z.string().default("8.00"),
  donationRequired: z.boolean().default(false),
  donationAmount: z.string().optional(),
  donationDescription: z.string().optional(),
  available: z.boolean().default(true),
});

type EventFormData = z.infer<typeof eventSchema>;

export default function AdminEventEdit() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const authStatus = localStorage.getItem("adminAuthenticated");
    setIsAuthenticated(authStatus === "true");
  }, []);

  const { data: event, isLoading } = useQuery({
    queryKey: ["admin", "event", id],
    queryFn: async () => {
      const response = await fetch(`/api/admin/events/${id}`);
      if (!response.ok) throw new Error("Erro ao carregar evento");
      return response.json();
    },
    enabled: !!id,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
  });

  const donationRequired = watch("donationRequired");

  useEffect(() => {
    if (event) {
      reset({
        name: event.name,
        date: event.date,
        location: event.location,
        city: event.city,
        state: event.state,
        pickupZipCode: event.pickupZipCode,
        fixedPrice: event.fixedPrice || "",
        extraKitPrice: event.extraKitPrice || "8.00",
        donationRequired: event.donationRequired || false,
        donationAmount: event.donationAmount || "",
        donationDescription: event.donationDescription || "",
        available: event.available,
      });
    }
  }, [event, reset]);

  const updateEventMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      const response = await fetch(`/api/admin/events/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao atualizar evento");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "events"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "event", id] });
      toast({
        title: "Sucesso",
        description: "Evento atualizado com sucesso!",
      });
      setLocation("/admin/events");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar evento",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EventFormData) => {
    updateEventMutation.mutate(data);
  };

  if (!isAuthenticated) {
    return <AdminAuth onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 animate-pulse rounded"></div>
          <div className="h-96 bg-gray-200 animate-pulse rounded"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation("/admin/events")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-neutral-800">Editar Evento</h1>
          <p className="text-neutral-600">Modifique as informações do evento</p>
        </div>
      </div>

      <Card className="max-w-4xl">
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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"].map((state) => (
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

              {/* Donation Configuration */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-semibold">Configuração de Doação</h3>
                </div>

                <FormField
                  control={form.control}
                  name="donationRequired"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Doação Obrigatória
                        </FormLabel>
                        <FormDescription>
                          Marque se este evento exige uma doação
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {donationRequired && (
                  <>
                    <FormField
                      control={form.control}
                      name="donationAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor da Doação</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="10.00"
                              type="number"
                              step="0.01"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                  </>
                )}
              </div>

              {/* Event Status */}
              <FormField
                control={form.control}
                name="available"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Evento Disponível
                      </FormLabel>
                      <FormDescription>
                        Controla se o evento aparece para os usuários
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={updateEventMutation.isPending}
                  className="min-w-32"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateEventMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}


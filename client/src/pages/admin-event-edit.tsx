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
import { CepZonePricing } from "@/components/admin/CepZonePricing";
// Sistema novo: AdminRouteGuard já protege esta página
import { ArrowLeft, Save, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Event } from "@shared/schema";

const eventSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  date: z.string().min(1, "Data é obrigatória"),
  location: z.string().min(1, "Local é obrigatório"),
  city: z.string().min(1, "Cidade é obrigatória"),
  state: z.string().min(1, "Estado é obrigatório"),
  pickupZipCode: z.string().min(8, "CEP é obrigatório"),
  pricingType: z.enum(["distance", "fixed", "cep_zones"]).default("distance"),
  fixedPrice: z.string().optional(),
  extraKitPrice: z.string().default("8.00"),
  donationRequired: z.boolean().default(false),
  donationAmount: z.string().optional(),
  donationDescription: z.string().optional(),
  available: z.boolean().default(true),
  status: z.enum(["ativo", "inativo", "fechado_pedidos"]).default("ativo"),
  stockEnabled: z.boolean().default(false),
  maxOrders: z.number().optional(),
  currentOrders: z.number().default(0),
}).refine((data) => {
  if (data.pricingType === "fixed") {
    if (!data.fixedPrice || data.fixedPrice.trim() === "") {
      return false;
    }
    const price = parseFloat(data.fixedPrice);
    return !isNaN(price) && price > 0;
  }
  return true;
}, {
  message: "Preço fixo é obrigatório e deve ser maior que zero quando o tipo de precificação for 'Preço Fixo'",
  path: ["fixedPrice"]
});

type EventFormData = z.infer<typeof eventSchema>;

export default function AdminEventEdit() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cepZonePrices, setCepZonePrices] = useState<Record<number, string>>({});

  const { data: event, isLoading } = useQuery({
    queryKey: ["admin", "event", id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/admin/events/${id}`);
      return response.json();
    },
    enabled: !!id,
  });

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: "",
      date: "",
      location: "",
      city: "",
      state: "",
      pickupZipCode: "",
      pricingType: "distance",
      fixedPrice: "",
      extraKitPrice: "8.00",
      donationRequired: false,
      donationAmount: "",
      donationDescription: "",
      available: true,
      status: "ativo",
      stockEnabled: false,
      maxOrders: undefined,
      currentOrders: 0,
    },
  });

  const donationRequired = form.watch("donationRequired");
  const watchPricingType = form.watch("pricingType");
  const watchStockEnabled = form.watch("stockEnabled");

  useEffect(() => {
    if (event) {
      form.reset({
        name: event.name,
        date: event.date,
        location: event.location,
        city: event.city,
        state: event.state,
        pickupZipCode: event.pickupZipCode,
        pricingType: event.pricingType || "distance", // Usa o tipo real do banco de dados
        fixedPrice: event.fixedPrice || "",
        extraKitPrice: event.extraKitPrice || "8.00",
        donationRequired: event.donationRequired || false,
        donationAmount: event.donationAmount || "",
        donationDescription: event.donationDescription || "",
        available: event.available,
        status: event.status || "ativo",
        stockEnabled: event.stockEnabled || false,
        maxOrders: event.maxOrders || undefined,
        currentOrders: event.currentOrders || 0,
      });
    }
  }, [event, form]);

  const updateEventMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      // Include pricingType in the data sent to API
      const finalData = {
        ...data,
        // Handle decimal fields - convert empty strings to null
        fixedPrice: data.pricingType === "fixed" && data.fixedPrice && data.fixedPrice.trim() !== "" ? data.fixedPrice : null,
        extraKitPrice: data.extraKitPrice && data.extraKitPrice.trim() !== "" ? data.extraKitPrice : "8.00",
        donationAmount: data.donationAmount && data.donationAmount.trim() !== "" ? data.donationAmount : null,
        // Ensure description is null if empty
        donationDescription: data.donationDescription && data.donationDescription.trim() !== "" ? data.donationDescription : null,
      };
      
      const response = await apiRequest("PUT", `/api/admin/events/${id}`, finalData);
      const eventData = await response.json();
      
      // If the event uses CEP zones pricing and has custom prices, save them
      if (data.pricingType === "cep_zones" && Object.keys(cepZonePrices).length > 0) {
        const customPrices = Object.entries(cepZonePrices)
          .filter(([_, price]) => price && price.trim() !== '')
          .map(([cepZoneId, price]) => ({
            cepZoneId: parseInt(cepZoneId),
            price
          }));
        
        if (customPrices.length > 0) {
          try {
            await apiRequest("PUT", `/api/admin/events/${id}/cep-zone-prices`, {
              customPrices
            });
          } catch (error) {
            console.error('Erro ao salvar preços personalizados:', error);
            // Don't fail the entire operation if custom prices fail
          }
        }
      }
      
      return eventData;
    },
    onSuccess: () => {
      // Comprehensive cache invalidation for event updates
      queryClient.invalidateQueries({ queryKey: ["admin", "events"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "event", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] }); // Public events list
      queryClient.invalidateQueries({ queryKey: ["/api/events", id] }); // Specific event
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] }); // Dashboard stats
      
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

  // Sistema novo: autenticação removida (AdminRouteGuard já protege)

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
                  name="pricingType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Precificação</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="distance">Calculado por Distância</SelectItem>
                          <SelectItem value="fixed">Preço Fixo</SelectItem>
                          <SelectItem value="cep_zones">Zonas CEP</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Escolha como o preço base será calculado para este evento
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchPricingType === "fixed" && (
                  <FormField
                    control={form.control}
                    name="fixedPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço Fixo</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="0.00"
                            type="number"
                            step="0.01"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Valor fixo em reais para o kit base deste evento
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

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

              {/* CEP Zone Pricing Configuration - Show when cep_zones is selected */}
              <CepZonePricing
                eventId={id ? parseInt(id) : undefined}
                isVisible={watchPricingType === "cep_zones"}
                onPricesChange={setCepZonePrices}
                className="mt-4"
              />

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

              {/* Status e Controle de Estoque */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-semibold">Status e Controle de Estoque</h3>
                </div>
                
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status do Evento</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ativo">Ativo - Disponível para pedidos</SelectItem>
                          <SelectItem value="inativo">Inativo - Temporariamente indisponível</SelectItem>
                          <SelectItem value="fechado_pedidos">Fechado para pedidos</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Controla a disponibilidade do evento para novos pedidos
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="stockEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-base">
                          Habilitar Controle de Estoque
                        </FormLabel>
                        <FormDescription>
                          Ativa limite máximo de pedidos para este evento
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {watchStockEnabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="maxOrders"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Limite Máximo de Kits</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="100"
                              type="number"
                              min="1"
                              value={field.value || ''}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                            />
                          </FormControl>
                          <FormDescription>
                            Número máximo de kits que podem ser vendidos
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="currentOrders"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kits Vendidos Atualmente</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              value={field.value || 0}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormDescription>
                            Número atual de kits já vendidos (somente leitura)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="available"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Evento Visível (Compatibilidade)
                        </FormLabel>
                        <FormDescription>
                          Mantém compatibilidade com sistema antigo
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
              </div>

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


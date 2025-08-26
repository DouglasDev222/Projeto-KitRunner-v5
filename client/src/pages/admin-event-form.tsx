import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { AdminLayout } from "@/components/admin-layout";
import { CepZonePricing } from "@/components/admin/CepZonePricing";
// Sistema novo: AdminRouteGuard protege esta página
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
  const [createdEventId, setCreatedEventId] = useState<number | null>(null);
  const [cepZonePrices, setCepZonePrices] = useState<Record<number, string>>({});
  // Sistema novo: AdminRouteGuard já protege

  // Sistema novo: AdminRouteGuard já protege - não precisa de verificação

  const form = useForm<AdminEventCreation>({
    resolver: zodResolver(adminEventCreationSchema),
    defaultValues: {
      name: "",
      date: "",
      location: "",
      city: "",
      state: "PB",
      pickupZipCode: "",
      pricingType: "distance",
      fixedPrice: "",
      extraKitPrice: "8.00",
      donationRequired: false,
      donationAmount: "",
      donationDescription: "",
      description: "**Importante:**\n\nPara utilizar nosso serviço, você precisa estar devidamente inscrito no evento através da página oficial da organização. Após a inscrição, basta solicitar a retirada conosco com seu número de inscrição e dados necessários.\n\n**Este é um serviço independente, sem vínculo com a organização do evento. Nossa missão é facilitar sua experiência!**",
      status: "ativo",
      stockEnabled: false,
      maxOrders: undefined,
      currentOrders: 0,
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: AdminEventCreation) => {
      const response = await apiRequest("POST", "/api/admin/events", data);
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
            await apiRequest("PUT", `/api/admin/events/${eventData.id}/cep-zone-prices`, {
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
    onSuccess: (data) => {
      toast({
        title: "Evento criado com sucesso!",
        description: "O evento foi adicionado ao sistema.",
      });
      // Comprehensive cache invalidation for new events
      queryClient.invalidateQueries({ queryKey: ["admin", "events"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] }); // Public events list
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] }); // Dashboard stats
      
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
    console.log("🚀 Submitting event data:", JSON.stringify(data, null, 2));
    createEventMutation.mutate(data);
  };

  const watchDonationRequired = form.watch("donationRequired");
  const watchPricingType = form.watch("pricingType");
  const watchStockEnabled = form.watch("stockEnabled");

  // Sistema novo: AdminRouteGuard já protege - não precisa de verificação

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
                          <Select onValueChange={field.onChange} value={field.value}>
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

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição do Evento</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Descrição que será exibida na página do evento..."
                            className="min-h-[120px] text-blue-800"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Texto que será exibido na seção de informações importantes do evento. Use **texto** para negrito.
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
                  isVisible={watchPricingType === "cep_zones"}
                  onPricesChange={setCepZonePrices}
                  className="mt-4"
                />

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

                {/* Status e Controle de Estoque */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Status e Controle de Estoque</h3>
                  
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status do Evento</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
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
                    <FormField
                      control={form.control}
                      name="maxOrders"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Limite Máximo de Pedidos</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="100"
                              type="number"
                              min="1"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                            />
                          </FormControl>
                          <FormDescription>
                            Número máximo de pedidos que podem ser aceitos neste evento
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
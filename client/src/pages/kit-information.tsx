
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Heart } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useParams } from "wouter";
import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { kitInformationSchema, kitSchema, type KitInformation } from "@shared/schema";
import { formatCPF, isValidCPF } from "@/lib/cpf-validator";
import { formatCurrency } from "@/lib/brazilian-formatter";
import { formatCep } from "@/lib/cep-zones-client";
import { calculatePricing, formatPricingBreakdown } from "@/lib/pricing-calculator";
import { useAuth } from "@/lib/auth-context";

type KitFormData = z.infer<typeof kitInformationSchema>;

export default function KitInformation() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [isInitialized, setIsInitialized] = useState(false);
  const { isAuthenticated, user } = useAuth();

  const form = useForm<KitFormData>({
    resolver: zodResolver(kitInformationSchema),
    defaultValues: {
      kitQuantity: 1,
      kits: [{ name: "", cpf: "", shirtSize: "" }],
    },
    mode: "onChange"
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "kits",
  });

  const { data: event } = useQuery<any>({
    queryKey: ["/api/events", id],
    enabled: !!id
  });

  // Função para atualizar kits
  const updateKitFields = useCallback((quantity: number) => {
    try {
      const currentKits = form.getValues("kits") || [];
      const newKits = Array.from({ length: quantity }, (_, index) => {
        if (index < currentKits.length && currentKits[index]) {
          return currentKits[index];
        }
        return { name: "", cpf: "", shirtSize: "" };
      });
      
      replace(newKits);
      form.setValue("kitQuantity", quantity, { shouldValidate: false });
    } catch (error) {
      console.warn("Error updating kit fields:", error);
    }
  }, [form, replace]);

  // Inicialização sem persistência automática
  useEffect(() => {
    // Sempre começar com formulário limpo
    form.reset({
      kitQuantity: 1,
      kits: [{ name: "", cpf: "", shirtSize: "" }]
    });
    setSelectedQuantity(1);
    setIsInitialized(true);
  }, [id, form]); // Dependente do ID do evento para resetar quando mudar

  // Effect para atualizar kits quando a quantidade muda
  useEffect(() => {
    if (isInitialized && selectedQuantity > 0) {
      updateKitFields(selectedQuantity);
    }
  }, [selectedQuantity, isInitialized, updateKitFields]);

  // Dados da sessão (sem helper complexo)
  const customer = (() => {
    try {
      const data = sessionStorage.getItem("customerData");
      return data ? JSON.parse(data) : (user || {});
    } catch {
      return user || {};
    }
  })();
  
  const selectedAddress = (() => {
    try {
      const data = sessionStorage.getItem("selectedAddress");
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  })();
  
  // SECURITY FIX: Removed calculatedCosts from sessionStorage (critical vulnerability)
  // This fixes VULNERABILIDADE_SESSIONSTORAGE_PRICING.md
  // Pricing will be securely calculated on payment page via server API

  // Authentication and data validation
  useEffect(() => {
    if (!isAuthenticated && !customer?.id) {
      sessionStorage.setItem("loginReturnPath", `/events/${id}/address`);
      setLocation("/login");
      return;
    }

    if (!selectedAddress?.id) {
      setLocation(`/events/${id}/address`);
      return;
    }

    // Ensure customer data is in session for next steps
    if (isAuthenticated && user && !sessionStorage.getItem("customerData")) {
      try {
        sessionStorage.setItem("customerData", JSON.stringify(user));
      } catch (error) {
        console.warn("Error saving customer data to session:", error);
      }
    }
  }, [isAuthenticated, user?.id, customer?.id, selectedAddress?.id, id, setLocation]);

  // SECURITY FIX: Basic pricing display only (not used for actual payment calculations)
  // Real pricing will be calculated securely on server in payment page
  const pricing = event ? {
    baseCost: event.fixedPrice ? Number(event.fixedPrice) : 0,
    deliveryCost: event.fixedPrice ? 0 : 18.50, // Display estimate only
    extraKitsCost: selectedQuantity > 1 && event.extraKitPrice ? (selectedQuantity - 1) * Number(event.extraKitPrice) : 0,
    donationAmount: event.donationRequired && event.donationAmount ? Number(event.donationAmount) * selectedQuantity : 0,
    totalCost: 0 // Will be calculated properly on payment page
  } : null;

  // Update total cost for display
  if (pricing) {
    pricing.totalCost = pricing.baseCost + pricing.deliveryCost + pricing.extraKitsCost + pricing.donationAmount;
  }

  // Submit handler - salva dados apenas quando enviar
  const onSubmit = useCallback((data: KitFormData) => {
    try {
      // Limpar dados antigos antes de salvar novos
      sessionStorage.removeItem("kitData");
      sessionStorage.setItem("kitData", JSON.stringify(data));
      setLocation(`/events/${id}/payment`);
    } catch (error) {
      console.warn("Error saving kit data:", error);
      setLocation(`/events/${id}/payment`);
    }
  }, [id, setLocation]);

  // Loading state
  if (!isInitialized || !event) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <Header showBackButton onBack={() => setLocation(`/events/${id}/address`)} />
        <div className="p-4">
          <p className="text-center text-neutral-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      <Header showBackButton onBack={() => setLocation(`/events/${id}/address`)} />
      <div className="p-4">
        <h2 className="text-2xl font-bold text-neutral-800 mb-2">Informações dos Kits</h2>
        <p className="text-neutral-600 mb-6">Informe os dados para cada kit que deseja retirar</p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Kit Quantity Selector */}
            <div className="mb-4">
              <Label htmlFor="kitQuantity" className="text-sm font-medium text-neutral-700 mb-2 block">
                Quantidade de Kits
              </Label>
              <Select
                value={selectedQuantity.toString()}
                onValueChange={(value) => {
                  const newQuantity = parseInt(value);
                  if (newQuantity > 0 && newQuantity <= 5) {
                    setSelectedQuantity(newQuantity);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a quantidade" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} Kit{num > 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Kit Forms */}
            <div className="space-y-4">
              {fields && fields.length > 0 ? fields.map((field, index) => (
                <Card key={field.id}>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg text-neutral-800 mb-3">Kit {index + 1}</h3>
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name={`kits.${index}.name`}
                        render={({ field: fieldProps }) => (
                          <FormItem>
                            <FormLabel>Nome Completo</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome do atleta" {...fieldProps} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`kits.${index}.cpf`}
                        render={({ field: fieldProps }) => (
                          <FormItem>
                            <FormLabel>CPF</FormLabel>
                            <FormControl>
                              <Input
                                {...fieldProps}
                                placeholder="000.000.000-00"
                                value={formatCPF(fieldProps.value || "")}
                                onChange={(e) => {
                                  try {
                                    const value = e.target.value.replace(/\D/g, "");
                                    fieldProps.onChange(value);

                                    if (value.length === 11) {
                                      if (!isValidCPF(value)) {
                                        form.setError(`kits.${index}.cpf`, {
                                          type: "manual",
                                          message: "CPF inválido"
                                        });
                                      } else {
                                        form.clearErrors(`kits.${index}.cpf`);
                                      }
                                    }
                                  } catch (error) {
                                    console.warn("Error handling CPF change:", error);
                                  }
                                }}
                                className={
                                  fieldProps.value?.length === 11 && !isValidCPF(fieldProps.value)
                                    ? "border-red-500"
                                    : ""
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`kits.${index}.shirtSize`}
                        render={({ field: fieldProps }) => (
                          <FormItem>
                            <FormLabel>Tamanho da Camiseta</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ex: M, G, GG, XGG, etc."
                                className="uppercase"
                                {...fieldProps}
                                onChange={(e) => {
                                  fieldProps.onChange(e.target.value.toUpperCase());
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <div className="text-center text-neutral-600 py-4">
                  <p>Carregando formulários dos kits...</p>
                </div>
              )}
            </div>

            {/* Cost Summary */}
            {pricing && (
              <Card className="mt-6">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg text-neutral-800 mb-3">Resumo do Pedido</h3>
                  <div className="space-y-2">
                    {pricing.fixedPrice ? (
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center">
                          <Badge variant="secondary" className="mr-2 text-xs">Preço Fixo</Badge>
                          <span className="text-neutral-600">Inclui todos os serviços</span>
                        </div>
                        <span className="font-semibold text-neutral-800">{formatCurrency(pricing.fixedPrice)}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-600">
                          {calculatedCosts?.pricingType === 'cep_zones'
                            ? `Entrega (${calculatedCosts.cepZoneName || 'Zona CEP'})`
                            : `Entrega (${distance.toFixed(1)} km)`
                          }
                        </span>
                        <span className="font-semibold text-neutral-800">{formatCurrency(deliveryPrice)}</span>
                      </div>
                    )}

                    {event?.donationRequired && (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <Heart className="w-3 h-3 text-red-500 mr-1" />
                          <span className="text-neutral-600">Doação: {event.donationDescription} ({selectedQuantity}x)</span>
                        </div>
                        <span className="font-semibold text-neutral-800">{formatCurrency(Number(event.donationAmount || 0) * selectedQuantity)}</span>
                      </div>
                    )}

                    {selectedQuantity > 1 && (
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-600">{selectedQuantity - 1} kit{selectedQuantity > 2 ? 's' : ''} adicional{selectedQuantity > 2 ? 'is' : ''}</span>
                        <span className="font-semibold text-neutral-800">{formatCurrency((selectedQuantity - 1) * Number(event?.extraKitPrice || 8))}</span>
                      </div>
                    )}

                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-lg text-neutral-800">Total</span>
                        <span className="font-bold text-xl text-primary">{formatCurrency(pricing.totalCost || 0)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button
              type="submit"
              className="w-full bg-primary text-white hover:bg-primary/90 mt-6"
              size="lg"
              disabled={!isInitialized || fields.length === 0}
            >
              Continuar para Pagamento
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}

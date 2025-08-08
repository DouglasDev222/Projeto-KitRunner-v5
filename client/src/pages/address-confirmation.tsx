import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Edit3, CheckCircle, Plus, AlertTriangle, Loader2, Info } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useParams } from "wouter";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addressSchema, type Address } from "@shared/schema";

type AddressData = {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  label: string;
  isDefault?: boolean;
};
import { Checkbox } from "@/components/ui/checkbox";
import { formatZipCode } from "@/lib/brazilian-formatter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { z } from "zod";
import { checkCepZone } from "@/lib/cep-zones-client";
import type { Event } from "@shared/schema";

export default function AddressConfirmation() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [cepZoneError, setCepZoneError] = useState<string | null>(null);
  const [isCheckingCepZone, setIsCheckingCepZone] = useState(false);
  const [calculatedCosts, setCalculatedCosts] = useState<any>(null);
  
  // Enhanced state for pricing validation
  const [pricingValidationStatus, setPricingValidationStatus] = useState<'idle' | 'validating' | 'validated' | 'failed'>('idle');
  const [forcePricingRecheck, setForcePricingRecheck] = useState(false);
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  
  // Get customer data from sessionStorage or auth context
  const customerData = sessionStorage.getItem("customerData");
  const customer = authUser || (customerData ? JSON.parse(customerData) : null);
  
  // Fetch customer addresses
  const { data: addresses, isLoading } = useQuery({
    queryKey: ["/api/customers", customer?.id, "addresses"],
    enabled: !!customer?.id,
  });

  // Get address count for limit checking
  const { data: addressCount } = useQuery({
    queryKey: ["/api/customers", customer?.id, "addresses", "count"],
    enabled: !!customer?.id,
  });

  // Check if user has reached address limit (2 addresses)
  const hasReachedAddressLimit = (addressCount as { count: number } | undefined)?.count ? 
    (addressCount as { count: number }).count >= 2 : false;

  // Fetch event data to determine pricing type
  const { data: event } = useQuery<Event>({
    queryKey: ["/api/events", id],
  });
  
  const addressFormSchema = addressSchema.extend({
    isDefault: z.boolean().optional(),
  });
  
  type AddressFormData = z.infer<typeof addressFormSchema>;

  const form = useForm<AddressFormData>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: {
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "PB",
      zipCode: "",
      label: "Casa",
      isDefault: false,
    },
  });
  
  const updateAddressMutation = useMutation({
    mutationFn: async (data: AddressData) => {
      if (!selectedAddress) return;
      const response = await apiRequest("PUT", `/api/addresses/${selectedAddress.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      // Comprehensive cache invalidation for address updates
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customer?.id, "addresses"] });
      queryClient.invalidateQueries({ queryKey: ["addresses", customer?.id] }); // Legacy support
      queryClient.invalidateQueries({ queryKey: ["/api/addresses"] }); // General addresses
      setIsEditing(false);
    },
  });
  
  useEffect(() => {
    if (!customer) {
      // Redirect to login with proper return path
      sessionStorage.setItem("loginReturnPath", `/events/${id}/address`);
      setLocation(`/login`);
    }
  }, [customer, id, setLocation]);
  
  // Force pricing recheck on page reload/mount
  useEffect(() => {
    if (event?.pricingType === 'cep_zones') {
      setForcePricingRecheck(true);
      setPricingValidationStatus('idle');
      setCalculatedCosts(null);
      setCepZoneError(null);
    }
  }, [event?.pricingType]);

  useEffect(() => {
    if (addresses && Array.isArray(addresses) && addresses.length > 0) {
      // Auto-select the default address or the first one
      const defaultAddress = addresses.find((addr: Address) => addr.isDefault) || addresses[0];
      setSelectedAddress(defaultAddress);
      form.reset({
        street: defaultAddress.street,
        number: defaultAddress.number,
        complement: defaultAddress.complement || "",
        neighborhood: defaultAddress.neighborhood,
        city: defaultAddress.city,
        state: defaultAddress.state,
        zipCode: defaultAddress.zipCode,
        label: defaultAddress.label
      });
      
      // Enhanced: Always force validation on address load, regardless of cache
      (async () => {
        console.log('🔄 Page loaded - forcing pricing validation for address:', defaultAddress.zipCode);
        setPricingValidationStatus('validating');
        setCalculatedCosts(null); // Clear any cached costs
        try {
          const result = await handleAddressSelectSecure(defaultAddress);
          if (result?.validated) {
            setPricingValidationStatus('validated');
          } else {
            setPricingValidationStatus('failed');
          }
        } catch (error) {
          console.error('❌ Failed to validate pricing on page load:', error);
          setPricingValidationStatus('failed');
        }
      })();
    }
  }, [addresses, form, event?.pricingType]);
  
  // Enhanced secure address selection with validation
  const handleAddressSelectSecure = async (address: Address) => {
    console.log('🔄 handleAddressSelectSecure called for:', address.zipCode);
    setSelectedAddress(address);
    form.reset({
      street: address.street,
      number: address.number,
      complement: address.complement || "",
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      label: address.label
    });
    setIsEditing(false);
    
    // Reset pricing validation states - always start fresh
    setPricingValidationStatus('validating');
    setCepZoneError(null);
    setCalculatedCosts(null);
    
    // Store address BEFORE pricing calculation
    sessionStorage.setItem('selectedAddress', JSON.stringify(address));
    
    // Calculate real delivery costs based on event pricing type
    const result = await calculateDeliveryCosts(address);
    console.log('✅ handleAddressSelectSecure completed with result:', result?.validated);
    return result;
  };

  const handleAddressSelect = async (address: Address) => {
    await handleAddressSelectSecure(address);
  };
  
  // Enhanced delivery costs calculation with proper validation
  const calculateDeliveryCosts = async (address: Address) => {
      console.log('🔄 calculateDeliveryCosts called for CEP:', address.zipCode, 'Event type:', event?.pricingType);
      try {
        // Check if event uses CEP zones pricing
        if (event?.pricingType === 'cep_zones') {
          setIsCheckingCepZone(true);
          setCepZoneError(null);
          
          // Force fresh API call - ignore any cached data
          console.log("🔍 FORCING fresh CEP zone check for:", address.zipCode, "with event ID:", id);
          const cepResult = await checkCepZone(address.zipCode, parseInt(id!));
          console.log("📊 CEP zone result:", cepResult);
          setIsCheckingCepZone(false);
          
          if (cepResult.found && cepResult.price !== undefined) {
            const calculatedCosts = {
              deliveryPrice: cepResult.price,
              cepZoneName: cepResult.zoneName,
              pricingType: 'cep_zones',
              validated: true
            };
            sessionStorage.setItem('calculatedCosts', JSON.stringify(calculatedCosts));
            setCalculatedCosts(calculatedCosts);
            setPricingValidationStatus('validated');
            return calculatedCosts;
          } else {
            // CEP not found in any zone - show error and block flow
            const errorMessage = cepResult.error || 'CEP não encontrado nas zonas de entrega';
            setCepZoneError(errorMessage);
            const calculatedCosts = {
              deliveryPrice: 0,
              error: errorMessage,
              pricingType: 'cep_zones',
              validated: false
            };
            sessionStorage.setItem('calculatedCosts', JSON.stringify(calculatedCosts));
            setCalculatedCosts(calculatedCosts);
            setPricingValidationStatus('failed');
            return calculatedCosts;
          }
        } else {
          // Use distance-based calculation API for distance/fixed pricing
          const response = await fetch("/api/delivery/calculate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customerId: customer?.id,
              eventId: parseInt(id!),
              kitQuantity: 1,
              customerZipCode: address.zipCode
            })
          });

          if (response.ok) {
            const data = await response.json();
            const calculatedCosts = {
              deliveryPrice: data.deliveryCost,
              distance: data.distance,
              pricingType: event?.pricingType || 'distance',
              validated: true
            };
            sessionStorage.setItem('calculatedCosts', JSON.stringify(calculatedCosts));
            setCalculatedCosts(calculatedCosts);
            setPricingValidationStatus('validated');
            return calculatedCosts;
          } else {
            // Fallback to default values if API fails
            const calculatedCosts = {
              deliveryPrice: 18.50,
              distance: 12.5,
              pricingType: 'distance',
              validated: true
            };
            sessionStorage.setItem('calculatedCosts', JSON.stringify(calculatedCosts));
            setCalculatedCosts(calculatedCosts);
            setPricingValidationStatus('validated');
            return calculatedCosts;
          }
        }
      } catch (error) {
        // For CEP zones events, don't fallback - show error
        if (event?.pricingType === 'cep_zones') {
          const errorMessage = 'Erro ao verificar zona de entrega. Tente novamente.';
          setCepZoneError(errorMessage);
          setPricingValidationStatus('failed');
          const calculatedCosts = {
            deliveryPrice: 0,
            error: errorMessage,
            pricingType: 'cep_zones',
            validated: false
          };
          setCalculatedCosts(calculatedCosts);
          return calculatedCosts;
        } else {
          // Fallback only for non-CEP zone events
          const calculatedCosts = {
            deliveryPrice: 18.50,
            distance: 12.5,
            pricingType: 'distance',
            validated: true
          };
          sessionStorage.setItem('calculatedCosts', JSON.stringify(calculatedCosts));
          setCalculatedCosts(calculatedCosts);
          setPricingValidationStatus('validated');
          return calculatedCosts;
        }
      }
  };
  
  const handleEditAddress = () => {
    setIsEditing(true);
  };
  
  const handleSaveAddress = (data: AddressData) => {
    updateAddressMutation.mutate(data);
  };
  
  const handleCancelEdit = () => {
    if (selectedAddress) {
      form.reset({
        street: selectedAddress.street,
        number: selectedAddress.number,
        complement: selectedAddress.complement || "",
        neighborhood: selectedAddress.neighborhood,
        city: selectedAddress.city,
        state: selectedAddress.state,
        zipCode: selectedAddress.zipCode,
        label: selectedAddress.label
      });
    }
    setIsEditing(false);
  };
  
  // Enhanced secure confirmation with explicit pricing validation
  const handleConfirmAddress = async () => {
    if (!selectedAddress) {
      return;
    }

    // For CEP zone events, force revalidation before allowing advance
    if (event?.pricingType === 'cep_zones') {
      // If not validated or still validating, force new validation
      if (pricingValidationStatus !== 'validated' || isCheckingCepZone) {
        setPricingValidationStatus('validating');
        try {
          const result = await calculateDeliveryCosts(selectedAddress);
          if (!result?.validated || (result as any)?.error) {
            // Block advance - pricing validation failed
            return;
          }
        } catch (error) {
          console.error('Failed to validate pricing:', error);
          setCepZoneError('Erro ao validar precificação. Tente novamente.');
          return;
        }
      }
      
      // Final check - ensure no errors and pricing is validated
      if (cepZoneError || pricingValidationStatus !== 'validated' || !calculatedCosts?.validated) {
        return;
      }
    }

    // Store selected address and proceed only after validation
    sessionStorage.setItem("selectedAddress", JSON.stringify(selectedAddress));
    setLocation(`/events/${id}/kits`);
  };

  // Enhanced validation for user continuation
  const canContinue = !cepZoneError && 
    !isCheckingCepZone &&
    pricingValidationStatus === 'validated' &&
    (calculatedCosts?.validated === true) &&
    (calculatedCosts?.deliveryPrice > 0 || calculatedCosts?.pricingType !== 'cep_zones');
  
  const handleZipCodeChange = (value: string) => {
    const formatted = value.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2');
    form.setValue("zipCode", formatted);
  };
  
  // Determine back navigation based on authentication status
  const getBackNavigation = () => {
    if (authUser) {
      // If user is authenticated, go back to event details
      return () => setLocation(`/events/${id}`);
    } else {
      // If not authenticated, go back to identification
      return () => setLocation(`/events/${id}/identify`);
    }
  };

  if (!customer) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <Header showBackButton onBack={getBackNavigation()} />
        <div className="p-4">
          <p className="text-center text-neutral-600">Carregando...</p>
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <Header showBackButton onBack={getBackNavigation()} />
        <div className="p-4">
          <p className="text-center text-neutral-600">Carregando endereços...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      <Header showBackButton onBack={getBackNavigation()} />
      <div className="p-4">
        <div className="flex items-center mb-4">
          <MapPin className="w-6 h-6 text-primary mr-2" />
          <h2 className="text-2xl font-bold text-neutral-800">Confirmar Endereço</h2>
        </div>
        <p className="text-neutral-600 mb-6">Confirme o endereço de entrega para os kits</p>
        
        

        {/* Enhanced Loading States */}
        {(isCheckingCepZone || pricingValidationStatus === 'validating') && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
              <span className="text-sm text-yellow-800">
                {isCheckingCepZone ? 'Verificando zona de entrega...' : 'Validando precificação...'}
              </span>
            </div>
          </div>
        )}

        {/* CEP Zone Error */}
        {cepZoneError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-1">CEP não disponível para entrega</div>
              <div className="text-sm">CEP não atendido nas zonas disponíveis. Se acha que isso pode ser um erro, entre em contato conosco.</div>
            </AlertDescription>
          </Alert>
        )}

        {/* CEP Zone Success Display */}
        {calculatedCosts?.pricingType === 'cep_zones' && calculatedCosts.cepZoneName && !cepZoneError && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                Zona de entrega: {calculatedCosts.cepZoneName}
              </span>
            </div>
            <p className="text-sm text-green-700">
              Taxa de entrega: R$ {calculatedCosts.deliveryPrice?.toFixed(2).replace('.', ',')}
            </p>
          </div>
        )}
        
        {/* Address Selection */}
        {addresses && Array.isArray(addresses) && addresses.length > 1 && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg text-neutral-800 mb-3">Escolher Endereço</h3>
              <div className="space-y-2">
                {(addresses as Address[]).map((address: Address) => (
                  <Button
                    key={address.id}
                    variant="outline"
                    className={`w-full text-left justify-start h-auto p-3 ${
                      selectedAddress?.id === address.id 
                        ? "border-primary border-2 bg-white text-black" 
                        : "border-gray-200 bg-white text-black hover:bg-gray-50"
                    }`}
                    onClick={() => {
                      setPricingValidationStatus('validating');
                      handleAddressSelect(address);
                    }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <div className="flex items-center">
                          <Badge variant="secondary" className="mr-2">
                            {address.label}
                          </Badge>
                          {address.isDefault && (
                            <Badge variant="outline" className="text-xs">
                              Padrão
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-left mt-1">
                          {address.street}, {address.number}
                          {address.complement && `, ${address.complement}`}
                        </p>
                        <p className="text-sm text-neutral-600 text-left">
                          {address.neighborhood}, {address.city} - {address.state}
                        </p>
                      </div>
                      {selectedAddress?.id === address.id && (
                        <CheckCircle className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Address Details */}
        {selectedAddress && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg text-neutral-800">Endereço de Entrega</h3>
                {!isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditAddress}
                    className="flex items-center"
                  >
                    <Edit3 className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                )}
              </div>
              
              {isEditing ? (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSaveAddress)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="street"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>Rua</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome da rua" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número</FormLabel>
                            <FormControl>
                              <Input placeholder="123" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="complement"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Complemento</FormLabel>
                            <FormControl>
                              <Input placeholder="Apto 45" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="neighborhood"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bairro</FormLabel>
                            <FormControl>
                              <Input placeholder="Centro" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cidade</FormLabel>
                            <FormControl>
                              <Input placeholder="João Pessoa" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="zipCode"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>CEP</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="58000-000"
                                {...field}
                                onChange={(e) => handleZipCodeChange(e.target.value)}
                                maxLength={9}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="isDefault"
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
                              Definir como endereço padrão
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        className="flex-1 bg-primary text-white hover:bg-primary/90"
                        disabled={updateAddressMutation.isPending}
                      >
                        {updateAddressMutation.isPending ? "Salvando..." : "Salvar"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancelEdit}
                        disabled={updateAddressMutation.isPending}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Badge variant="secondary" className="mr-2">
                      {selectedAddress.label}
                    </Badge>
                    {selectedAddress.isDefault && (
                      <Badge variant="outline" className="text-xs">
                        Padrão
                      </Badge>
                    )}
                  </div>
                  <p className="text-neutral-800 font-medium">{customer.name}</p>
                  <p className="text-neutral-600">
                    {selectedAddress.street}, {selectedAddress.number}
                    {selectedAddress.complement && `, ${selectedAddress.complement}`}
                  </p>
                  <p className="text-neutral-600">{selectedAddress.neighborhood}</p>
                  <p className="text-neutral-600">{selectedAddress.city} - {selectedAddress.state}</p>
                  <p className="text-neutral-600">{formatZipCode(selectedAddress.zipCode)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Add New Address Button - with limit validation */}
        <div className="mb-6">
          {hasReachedAddressLimit ? (
            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription>
                Você atingiu o limite máximo de 2 endereços. Mas você pode editar endereços existentes em seu perfil.
              </AlertDescription>
            </Alert>
          ) : (
            <Button 
              variant="outline"
              onClick={() => setLocation(`/events/${id}/address/new?from=event&eventId=${id}`)}
              className="w-full flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar Novo Endereço
            </Button>
          )}
        </div>
        
        <Button 
          className="w-full bg-primary text-white hover:bg-primary/90" 
          size="lg"
          onClick={handleConfirmAddress}
          disabled={!selectedAddress || isEditing || !canContinue || pricingValidationStatus === 'validating'}
        >
          {pricingValidationStatus === 'validating' || isCheckingCepZone ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Validando...
            </div>
          ) : cepZoneError ? 'CEP não disponível' : 'Confirmar Endereço'}
        </Button>
      </div>
    </div>
  );
}
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
import { MapPin, Edit3, CheckCircle, Plus, AlertTriangle, Loader2, Info, ArrowLeft } from "lucide-react";
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
    return result;
  };

  const handleAddressSelect = async (address: Address) => {
    await handleAddressSelectSecure(address);
  };
  
  // Enhanced delivery costs calculation with proper validation
  const calculateDeliveryCosts = async (address: Address) => {
      try {
        // Check if event uses CEP zones pricing
        if (event?.pricingType === 'cep_zones') {
          setIsCheckingCepZone(true);
          setCepZoneError(null);
          
          try {
            // Force fresh API call - ignore any cached data
            const cepResult = await checkCepZone(address.zipCode, parseInt(id!));
            setIsCheckingCepZone(false);
            
            if (cepResult.found && cepResult.price !== undefined) {
              const calculatedCosts = {
                deliveryPrice: cepResult.price,
                cepZoneName: cepResult.zoneName,
                pricingType: 'cep_zones',
                validated: true
              };
              // Store for display purposes only (real calculation happens on payment page)
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
              // Store error state for display purposes
              sessionStorage.setItem('calculatedCosts', JSON.stringify(calculatedCosts));
              setCalculatedCosts(calculatedCosts);
              setPricingValidationStatus('failed');
              return calculatedCosts;
            }
          } catch (cepError) {
            // Ensure loading state is cleared on CEP check error
            setIsCheckingCepZone(false);
            setCepZoneError('Erro ao verificar CEP. Tente novamente.');
            setPricingValidationStatus('failed');
            return {
              deliveryPrice: 0,
              error: 'Erro ao verificar CEP',
              pricingType: 'cep_zones',
              validated: false
            };
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
            // Store for display purposes only
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
            // Store fallback for display purposes
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
      <>
        {/* Mobile Loading */}
        <div className="lg:hidden max-w-md mx-auto bg-white min-h-screen">
          <Header showBackButton onBack={getBackNavigation()} />
          <div className="p-4">
            <p className="text-center text-neutral-600">Carregando endereços...</p>
          </div>
        </div>

        {/* Desktop Loading */}
        <div className="hidden lg:block min-h-screen bg-gray-50">
          {/* Desktop Header Skeleton */}
          <nav className="bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-6xl mx-auto px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center">
                  <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="flex items-center space-x-8">
                  <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                  <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </nav>

          {/* Main Content Skeleton */}
          <main className="max-w-6xl mx-auto px-8 py-12">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
              {/* Left Column - Form Skeleton */}
              <div className="lg:col-span-3">
                <div className="bg-white rounded-xl shadow-lg p-8">
                  {/* Progress Steps Skeleton */}
                  <div className="flex items-center justify-center mb-8 animate-pulse">
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary rounded-full" />
                        <div className="ml-2 h-4 w-16 bg-gray-200 rounded" />
                      </div>
                      <div className="w-8 h-0.5 bg-gray-200" />
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-200 rounded-full" />
                        <div className="ml-2 h-4 w-20 bg-gray-200 rounded" />
                      </div>
                      <div className="w-8 h-0.5 bg-gray-200" />
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-200 rounded-full" />
                        <div className="ml-2 h-4 w-24 bg-gray-200 rounded" />
                      </div>
                    </div>
                  </div>

                  {/* Title Skeleton */}
                  <div className="mb-8 animate-pulse">
                    <div className="h-8 bg-gray-200 rounded mb-4 w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                  </div>

                  {/* Address Cards Skeleton */}
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
                        <div className="flex justify-between items-start mb-3">
                          <div className="h-5 bg-gray-200 rounded w-20" />
                          <div className="h-8 w-16 bg-gray-200 rounded" />
                        </div>
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-full" />
                          <div className="h-4 bg-gray-200 rounded w-3/4" />
                          <div className="h-4 bg-gray-200 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Address Button Skeleton */}
                  <div className="mt-6 animate-pulse">
                    <div className="h-12 bg-gray-200 rounded-lg w-full" />
                  </div>
                </div>
              </div>

              {/* Right Column - Summary Skeleton */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow-lg p-8 animate-pulse sticky top-6">
                  <div className="h-6 bg-gray-200 rounded mb-6" />
                  <div className="space-y-4 mb-8">
                    <div className="h-4 bg-gray-200 rounded w-full" />
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="border-t pt-4">
                      <div className="h-6 bg-gray-200 rounded w-2/3" />
                    </div>
                  </div>
                  <div className="h-14 bg-gray-200 rounded-lg" />
                </div>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }
  
  return (
    <>
      {/* Mobile Version */}
      <div className="lg:hidden max-w-md mx-auto bg-white min-h-screen">
        <Header showBackButton onBack={getBackNavigation()} />
        <div className="p-4">
          {/* Mobile Progress Indicator */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-2 text-xs">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-primary text-white rounded-full flex items-center justify-center text-xs">1</div>
                <span className="ml-1 text-primary font-medium">Endereço</span>
              </div>
              <div className="w-4 h-0.5 bg-neutral-300"></div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-neutral-300 text-neutral-600 rounded-full flex items-center justify-center text-xs">2</div>
                <span className="ml-1 text-neutral-400 text-xs">Retirada</span>
              </div>
              <div className="w-4 h-0.5 bg-neutral-300"></div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-neutral-300 text-neutral-600 rounded-full flex items-center justify-center text-xs">3</div>
                <span className="ml-1 text-neutral-400 text-xs">Pagamento</span>
              </div>
            </div>
          </div>
          
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
            disabled={!selectedAddress || isEditing || !canContinue}
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

      {/* Desktop Version */}
      <div className="hidden lg:block min-h-screen bg-gray-50">
        {/* Simple Back Button */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-8 py-4">
            <Button
              variant="ghost"
              onClick={getBackNavigation()}
              className="flex items-center text-gray-600 hover:text-purple-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto py-8 px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Progress & Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 sticky top-8">
                <div className="flex items-center mb-4">
                  <MapPin className="w-6 h-6 text-purple-600 mr-3" />
                  <h3 className="text-xl font-semibold text-gray-900">Confirmar Endereço</h3>
                </div>
                <p className="text-gray-600 mb-6">Confirme o endereço de entrega para os kits</p>
                
                {/* Progress Indicator */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-sm">
                    <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs mr-3">✓</div>
                    <span className="text-gray-700">Evento selecionado</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs mr-3">2</div>
                    <span className="font-medium text-gray-900">Confirmar endereço</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-6 h-6 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-xs mr-3">3</div>
                    <span className="text-gray-500">Informações de Retirada</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-6 h-6 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-xs mr-3">4</div>
                    <span className="text-gray-500">Pagamento</span>
                  </div>
                </div>

                {/* Action Button */}
                <div className="space-y-3">
                  <Button 
                    className="w-full bg-purple-600 text-white hover:bg-purple-700" 
                    size="lg"
                    onClick={handleConfirmAddress}
                    disabled={!selectedAddress || isEditing || !canContinue}
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
            </div>

            {/* Right Column - Content */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-8">Confirmar seu endereço de entrega</h2>
                
                {/* Enhanced Loading States */}
                {(isCheckingCepZone || pricingValidationStatus === 'validating') && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-yellow-600" />
                      <span className="text-yellow-800 font-medium">
                        {isCheckingCepZone ? 'Verificando zona de entrega...' : 'Validando precificação...'}
                      </span>
                    </div>
                  </div>
                )}

                {/* CEP Zone Error */}
                {cepZoneError && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium mb-1">CEP não disponível para entrega</div>
                      <div className="text-sm">CEP não atendido nas zonas disponíveis. Se acha que isso pode ser um erro, entre em contato conosco.</div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* CEP Zone Success Display */}
                {calculatedCosts?.pricingType === 'cep_zones' && calculatedCosts.cepZoneName && !cepZoneError && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <MapPin className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-800">
                        Zona de entrega: {calculatedCosts.cepZoneName}
                      </span>
                    </div>
                    <p className="text-green-700">
                      Taxa de entrega: R$ {calculatedCosts.deliveryPrice?.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                )}

                {/* Address Selection/Display for Desktop */}
                {addresses && Array.isArray(addresses) && addresses.length > 0 && (
                  <div className="mb-6">
                    {addresses.length > 1 ? (
                      <>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Escolher Endereço</h3>
                        <div className="space-y-3">
                          {(addresses as Address[]).map((address: Address) => (
                            <div key={address.id} className={`border-2 rounded-lg p-4 transition-all cursor-pointer ${
                              selectedAddress?.id === address.id 
                                ? "border-purple-600 bg-purple-50" 
                                : "border-gray-200 bg-white hover:bg-gray-50"
                            }`}
                            onClick={() => {
                              setPricingValidationStatus('validating');
                              handleAddressSelect(address);
                            }}>
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center mb-2">
                                    <Badge variant="secondary" className="mr-2">
                                      {address.label}
                                    </Badge>
                                    {address.isDefault && (
                                      <Badge variant="outline" className="text-xs">
                                        Padrão
                                      </Badge>
                                    )}
                                    {selectedAddress?.id === address.id && (
                                      <CheckCircle className="w-5 h-5 text-purple-600 ml-2" />
                                    )}
                                  </div>
                                  <p className="text-gray-900 font-medium">{customer.name}</p>
                                  <p className="text-gray-700">
                                    {address.street}, {address.number}
                                    {address.complement && `, ${address.complement}`}
                                  </p>
                                  <p className="text-gray-700">{address.neighborhood}</p>
                                  <p className="text-gray-700">{address.city} - {address.state}</p>
                                  <p className="text-gray-700">{formatZipCode(address.zipCode)}</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setLocation(`/profile/address/${address.id}/edit?from=event&eventId=${id}`);
                                    }}
                                    className="flex items-center"
                                  >
                                    <Edit3 className="w-4 h-4 mr-1" />
                                    Editar
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Endereço de Entrega</h3>
                        {selectedAddress && (
                          <div className="border-2 border-purple-600 bg-purple-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center mb-2">
                                  <Badge variant="secondary" className="mr-2">
                                    {selectedAddress.label}
                                  </Badge>
                                  {selectedAddress.isDefault && (
                                    <Badge variant="outline" className="text-xs">
                                      Padrão
                                    </Badge>
                                  )}
                                  <CheckCircle className="w-5 h-5 text-purple-600 ml-2" />
                                </div>
                                <p className="text-gray-900 font-medium">{customer.name}</p>
                                <p className="text-gray-700">
                                  {selectedAddress.street}, {selectedAddress.number}
                                  {selectedAddress.complement && `, ${selectedAddress.complement}`}
                                </p>
                                <p className="text-gray-700">{selectedAddress.neighborhood}</p>
                                <p className="text-gray-700">{selectedAddress.city} - {selectedAddress.state}</p>
                                <p className="text-gray-700">{formatZipCode(selectedAddress.zipCode)}</p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setLocation(`/profile/address/${selectedAddress.id}/edit?from=event&eventId=${id}`)}
                                  className="flex items-center"
                                >
                                  <Edit3 className="w-4 h-4 mr-1" />
                                  Editar
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}


                {/* Add New Address Button */}
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
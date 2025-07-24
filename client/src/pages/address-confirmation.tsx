import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Edit3, CheckCircle, Plus } from "lucide-react";
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
import { z } from "zod";

export default function AddressConfirmation() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const queryClient = useQueryClient();
  
  // Get customer data from sessionStorage
  const customerData = sessionStorage.getItem("customerData");
  const customer = customerData ? JSON.parse(customerData) : null;
  
  // Fetch customer addresses
  const { data: addresses, isLoading } = useQuery({
    queryKey: ["addresses", customer?.id],
    queryFn: async () => {
      const response = await fetch(`/api/customers/${customer.id}/addresses`);
      return response.json();
    },
    enabled: !!customer?.id,
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
      queryClient.invalidateQueries({ queryKey: ["addresses", customer?.id] });
      setIsEditing(false);
    },
  });
  
  useEffect(() => {
    if (!customer) {
      setLocation(`/events/${id}/identify`);
    }
  }, [customer, id, setLocation]);
  
  useEffect(() => {
    if (addresses && addresses.length > 0) {
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
      
      // Automatically calculate delivery costs for the default address
      handleAddressSelect(defaultAddress);
    }
  }, [addresses, form]);
  
  const handleAddressSelect = (address: Address) => {
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
    
    // Store address and calculate delivery costs
    sessionStorage.setItem('selectedAddress', JSON.stringify(address));
    
    // Calculate real delivery costs based on ZIP codes
    const calculateDeliveryCosts = async () => {
      try {
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
            distance: data.distance
          };
          sessionStorage.setItem('calculatedCosts', JSON.stringify(calculatedCosts));
        } else {
          // Fallback to default values if API fails
          const calculatedCosts = {
            deliveryPrice: 18.50,
            distance: 12.5
          };
          sessionStorage.setItem('calculatedCosts', JSON.stringify(calculatedCosts));
        }
      } catch (error) {
        // Fallback to default values if request fails
        const calculatedCosts = {
          deliveryPrice: 18.50,
          distance: 12.5
        };
        sessionStorage.setItem('calculatedCosts', JSON.stringify(calculatedCosts));
      }
    };

    calculateDeliveryCosts();
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
  
  const handleConfirmAddress = () => {
    if (selectedAddress) {
      // Store selected address in session storage
      sessionStorage.setItem("selectedAddress", JSON.stringify(selectedAddress));
      setLocation(`/events/${id}/kits`);
    }
  };
  
  const handleZipCodeChange = (value: string) => {
    const formatted = value.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2');
    form.setValue("zipCode", formatted);
  };
  
  if (!customer) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <Header showBackButton onBack={() => setLocation(`/events/${id}/identify`)} />
        <div className="p-4">
          <p className="text-center text-neutral-600">Carregando...</p>
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <Header showBackButton onBack={() => setLocation(`/events/${id}/identify`)} />
        <div className="p-4">
          <p className="text-center text-neutral-600">Carregando endereços...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      <Header showBackButton onBack={() => setLocation(`/events/${id}/identify`)} />
      <div className="p-4">
        <div className="flex items-center mb-4">
          <MapPin className="w-6 h-6 text-primary mr-2" />
          <h2 className="text-2xl font-bold text-neutral-800">Confirmar Endereço</h2>
        </div>
        <p className="text-neutral-600 mb-6">Confirme o endereço de entrega para os kits</p>
        
        {/* Address Selection */}
        {addresses && addresses.length > 1 && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg text-neutral-800 mb-3">Escolher Endereço</h3>
              <div className="space-y-2">
                {addresses.map((address: Address) => (
                  <Button
                    key={address.id}
                    variant={selectedAddress?.id === address.id ? "default" : "outline"}
                    className="w-full text-left justify-start h-auto p-3"
                    onClick={() => handleAddressSelect(address)}
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
        
        {/* Add New Address Button */}
        <div className="mb-6">
          <Button 
            variant="outline"
            onClick={() => setLocation(`/events/${id}/address/new`)}
            className="w-full flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Adicionar Novo Endereço
          </Button>
        </div>
        
        <Button 
          className="w-full bg-primary text-white hover:bg-primary/90" 
          size="lg"
          onClick={handleConfirmAddress}
          disabled={!selectedAddress || isEditing}
        >
          Confirmar Endereço
        </Button>
      </div>
    </div>
  );
}
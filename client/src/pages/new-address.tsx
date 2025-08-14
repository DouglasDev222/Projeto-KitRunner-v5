import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, Package, User, MapPin } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useParams, useSearch } from "wouter";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { addressSchema, type AddressData } from "@shared/schema";
import { formatZipCode } from "@/lib/brazilian-formatter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { z } from "zod";

const addressFormSchema = addressSchema.extend({
  isDefault: z.boolean().optional(),
});

type AddressFormData = z.infer<typeof addressFormSchema>;

export default function NewAddress() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const search = useSearch();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  
  // Parse query parameters for navigation context
  const searchParams = new URLSearchParams(search);
  const from = searchParams.get('from'); // 'profile' or 'event'
  const eventId = searchParams.get('eventId'); // for event context
  
  // Determine correct navigation target based on context
  const getNavigationTarget = () => {
    if (from === 'event' && eventId) {
      return `/events/${eventId}/address`;
    } else if (from === 'profile') {
      return '/profile';
    } else if (from === 'event' && id && id.match(/^\d+$/)) {
      // Only treat ID as event ID if explicitly coming from event context
      return `/events/${id}/address`;
    } else {
      // Default to profile for all other cases (including address editing)
      return '/profile';
    }
  };
  
  // Get customer data - prefer auth user, fallback to session
  const customerData = sessionStorage.getItem("customerData");
  const sessionCustomer = customerData ? JSON.parse(customerData) : null;
  const customer = user || sessionCustomer;

  // Check if this is an edit operation by looking at the route pattern
  const isEditRoute = window.location.pathname.includes('/edit');
  
  // For editing, get existing address data (only if this is an edit route)
  const { data: existingAddress } = useQuery({
    queryKey: ["/api/addresses", id],
    enabled: Boolean(id && id.match(/^\d+$/) && isEditRoute),
  });

  // Get address count for limit checking (only for new addresses)
  const { data: addressCount } = useQuery({
    queryKey: ["/api/customers", customer?.id, "addresses", "count"],
    enabled: Boolean(customer?.id && !isEditing),
  });

  // Check if user has reached address limit (2 addresses)
  const hasReachedAddressLimit = !isEditing && (addressCount as { count: number } | undefined)?.count >= 2;

  useEffect(() => {
    if (existingAddress && isEditRoute) {
      setIsEditing(true);
      form.reset({
        street: existingAddress.street,
        number: existingAddress.number,
        complement: existingAddress.complement || "",
        neighborhood: existingAddress.neighborhood,
        city: existingAddress.city,
        state: existingAddress.state,
        zipCode: existingAddress.zipCode,
        label: existingAddress.label,
        isDefault: existingAddress.isDefault,
      });
    } else {
      // Ensure we're in creation mode for new address routes
      setIsEditing(false);
    }
  }, [existingAddress, isEditRoute]);

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

  const saveAddressMutation = useMutation({
    mutationFn: async (data: AddressFormData) => {
      const { isDefault, ...addressData } = data;
      
      if (isEditing && existingAddress) {
        // Update existing address
        const response = await apiRequest("PUT", `/api/addresses/${existingAddress.id}`, {
          ...addressData,
          isDefault: isDefault || false,
        });
        return response.json();
      } else {
        // Create new address
        const response = await apiRequest("POST", `/api/customers/${customer.id}/addresses`, {
          ...addressData,
          isDefault: isDefault || false,
        });
        return response.json();
      }
    },
    onSuccess: () => {
      // Invalidate multiple cache keys to ensure proper updates
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customer?.id, "addresses"] });
      queryClient.invalidateQueries({ queryKey: ["addresses", customer?.id] }); // Legacy support
      queryClient.invalidateQueries({ queryKey: ["/api/addresses"] }); // General addresses
      setLocation(getNavigationTarget());
    },
  });

  useEffect(() => {
    if (!customer) {
      if (from === 'event' && eventId) {
        // Event flow - redirect to login with proper return path
        sessionStorage.setItem("loginReturnPath", `/events/${eventId}/address`);
        setLocation("/login");
      } else if (from === 'event' && id && id.match(/^\d+$/)) {
        // Legacy event flow - only if explicitly from event context
        sessionStorage.setItem("loginReturnPath", `/events/${id}/address`);
        setLocation("/login");
      } else {
        // Profile flow or default - includes address editing
        setLocation("/profile");
      }
    }
  }, [customer, id, setLocation, isEditing, from, eventId]);

  const onSubmit = (data: AddressFormData) => {
    saveAddressMutation.mutate(data);
  };

  const handleCancel = () => {
    setLocation(getNavigationTarget());
  };

  // If trying to create a new address but limit is reached, show message
  if (hasReachedAddressLimit) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <Header showBackButton onBack={handleCancel} />
        <div className="p-4">
          <h2 className="text-2xl font-bold text-neutral-800 mb-2">Limite Atingido</h2>
          <p className="text-neutral-600 mb-6">
            Você já possui o número máximo de endereços permitidos (2). 
            Para adicionar um novo endereço, você deve primeiro excluir um dos endereços existentes.
          </p>
          
          <Button 
            onClick={handleCancel}
            className="w-full"
            variant="outline"
          >
            Voltar para Perfil
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Version */}
      <div className="lg:hidden max-w-md mx-auto bg-white min-h-screen">
        <Header showBackButton onBack={handleCancel} />
        <div className="p-4">
          <h2 className="text-2xl font-bold text-neutral-800 mb-2">
            {isEditing ? "Editar Endereço" : "Novo Endereço"}
          </h2>
          <p className="text-neutral-600 mb-6">
            {isEditing ? "Edite as informações do endereço" : "Adicione um novo endereço de entrega"}
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Identificação do Endereço</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma opção" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Casa">Casa</SelectItem>
                        <SelectItem value="Trabalho">Trabalho</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="00000-000"
                        value={formatZipCode(field.value)}
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
                name="street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rua</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nome da rua" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="123" />
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
                        <Input {...field} placeholder="Apto 101" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="neighborhood"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bairro</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nome do bairro" />
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
                        <Input {...field} placeholder="Cidade" />
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
                          <SelectItem value="PB">Paraíba</SelectItem>
                          <SelectItem value="SP">São Paulo</SelectItem>
                          <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                          <SelectItem value="MG">Minas Gerais</SelectItem>
                          <SelectItem value="BA">Bahia</SelectItem>
                          <SelectItem value="PR">Paraná</SelectItem>
                          <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                          <SelectItem value="PE">Pernambuco</SelectItem>
                          <SelectItem value="CE">Ceará</SelectItem>
                          <SelectItem value="PA">Pará</SelectItem>
                          <SelectItem value="GO">Goiás</SelectItem>
                          <SelectItem value="SC">Santa Catarina</SelectItem>
                          <SelectItem value="MA">Maranhão</SelectItem>
                          <SelectItem value="ES">Espírito Santo</SelectItem>
                          <SelectItem value="MT">Mato Grosso</SelectItem>
                          <SelectItem value="MS">Mato Grosso do Sul</SelectItem>
                          <SelectItem value="DF">Distrito Federal</SelectItem>
                          <SelectItem value="AL">Alagoas</SelectItem>
                          <SelectItem value="RN">Rio Grande do Norte</SelectItem>
                          <SelectItem value="SE">Sergipe</SelectItem>
                          <SelectItem value="PI">Piauí</SelectItem>
                          <SelectItem value="TO">Tocantins</SelectItem>
                          <SelectItem value="AC">Acre</SelectItem>
                          <SelectItem value="AM">Amazonas</SelectItem>
                          <SelectItem value="AP">Amapá</SelectItem>
                          <SelectItem value="RO">Rondônia</SelectItem>
                          <SelectItem value="RR">Roraima</SelectItem>
                        </SelectContent>
                      </Select>
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

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleCancel}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={saveAddressMutation.isPending}
                >
                  {saveAddressMutation.isPending ? "Salvando..." : (isEditing ? "Atualizar Endereço" : "Salvar Endereço")}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>

      {/* Desktop Version */}
      <div className="hidden lg:block min-h-screen bg-gray-50">
        {/* Desktop Header */}
        <nav className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex items-center">
                <img src="/logo.webp" alt="KitRunner" className="h-10 w-auto" />
              </div>

              {/* Navigation Links */}
              <div className="flex items-center space-x-8">
                <Button
                  variant="ghost"
                  onClick={() => setLocation("/")}
                  className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-lg transition-colors"
                >
                  <Home className="w-4 h-4" />
                  <span>Início</span>
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setLocation("/my-orders")}
                  className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-lg transition-colors"
                >
                  <Package className="w-4 h-4" />
                  <span>Pedidos</span>
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setLocation("/eventos")}
                  className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-lg transition-colors"
                >
                  <Package className="w-4 h-4" />
                  <span>Eventos</span>
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setLocation("/profile")}
                  className="flex items-center space-x-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-lg font-medium"
                >
                  <User className="w-4 h-4" />
                  <span>Perfil</span>
                </Button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto pt-16 pb-8 px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Left Column - Information (2/5) */}
            <div className="lg:col-span-2 lg:pr-8">
              <div className="sticky top-24">
                <div className="flex items-center mb-8">
                  <MapPin className="w-12 h-12 text-purple-600 mr-4" />
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                      {isEditing ? "Editar Endereço" : "Novo Endereço"}
                    </h1>
                    <p className="text-gray-600 mt-2">
                      {isEditing ? "Atualize as informações do seu endereço" : "Adicione um novo endereço de entrega"}
                    </p>
                  </div>
                </div>

                {/* Info Card */}
                <Card className="border-blue-200 bg-blue-50 shadow-lg">
                  <CardContent className="p-8">
                    <div className="flex items-start gap-4">
                      <MapPin className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-blue-800 text-lg mb-3">Dicas para Endereços</h3>
                        <div className="text-blue-700 space-y-2">
                          <p>• Certifique-se de que o CEP está correto</p>
                          <p>• Inclua referências no complemento se necessário</p>
                          <p>• Você pode ter até 2 endereços cadastrados</p>
                          <p>• O endereço padrão será selecionado automaticamente</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="mt-6 shadow-lg">
                  <CardContent className="p-8">
                    <h3 className="font-semibold text-gray-900 text-lg mb-4">Ações Rápidas</h3>
                    <div className="space-y-3">
                      <Button
                        variant="outline"
                        onClick={handleCancel}
                        className="w-full justify-start text-left"
                      >
                        <User className="w-4 h-4 mr-3" />
                        Voltar ao Perfil
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setLocation("/eventos")}
                        className="w-full justify-start text-left"
                      >
                        <Package className="w-4 h-4 mr-3" />
                        Ver Eventos
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Right Column - Form (3/5) */}
            <div className="lg:col-span-3">
              <Card className="shadow-lg">
                <CardHeader className="p-10 pb-6">
                  <CardTitle className="text-2xl flex items-center">
                    <MapPin className="w-6 h-6 mr-3" />
                    Informações do Endereço
                  </CardTitle>
                  <p className="text-gray-600 mt-2">Preencha os dados do endereço abaixo</p>
                </CardHeader>
                <CardContent className="p-10 pt-0">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                      {/* Form Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Label Field */}
                        <div>
                          <FormField
                            control={form.control}
                            name="label"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium">Identificação</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-12 text-base mt-2">
                                      <SelectValue placeholder="Selecione uma opção" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Casa">Casa</SelectItem>
                                    <SelectItem value="Trabalho">Trabalho</SelectItem>
                                    <SelectItem value="Outro">Outro</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* CEP Field */}
                        <div>
                          <FormField
                            control={form.control}
                            name="zipCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium">CEP</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="00000-000"
                                    className="h-12 text-base mt-2"
                                    value={formatZipCode(field.value)}
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
                        </div>

                        {/* State Field */}
                        <div>
                          <FormField
                            control={form.control}
                            name="state"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium">Estado</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-12 text-base mt-2">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="PB">Paraíba</SelectItem>
                                    <SelectItem value="SP">São Paulo</SelectItem>
                                    <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                                    <SelectItem value="MG">Minas Gerais</SelectItem>
                                    <SelectItem value="BA">Bahia</SelectItem>
                                    <SelectItem value="PR">Paraná</SelectItem>
                                    <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                                    <SelectItem value="PE">Pernambuco</SelectItem>
                                    <SelectItem value="CE">Ceará</SelectItem>
                                    <SelectItem value="PA">Pará</SelectItem>
                                    <SelectItem value="GO">Goiás</SelectItem>
                                    <SelectItem value="SC">Santa Catarina</SelectItem>
                                    <SelectItem value="MA">Maranhão</SelectItem>
                                    <SelectItem value="ES">Espírito Santo</SelectItem>
                                    <SelectItem value="MT">Mato Grosso</SelectItem>
                                    <SelectItem value="MS">Mato Grosso do Sul</SelectItem>
                                    <SelectItem value="DF">Distrito Federal</SelectItem>
                                    <SelectItem value="AL">Alagoas</SelectItem>
                                    <SelectItem value="RN">Rio Grande do Norte</SelectItem>
                                    <SelectItem value="SE">Sergipe</SelectItem>
                                    <SelectItem value="PI">Piauí</SelectItem>
                                    <SelectItem value="TO">Tocantins</SelectItem>
                                    <SelectItem value="AC">Acre</SelectItem>
                                    <SelectItem value="AM">Amazonas</SelectItem>
                                    <SelectItem value="AP">Amapá</SelectItem>
                                    <SelectItem value="RO">Rondônia</SelectItem>
                                    <SelectItem value="RR">Roraima</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Street Field - Full width */}
                        <div className="md:col-span-3">
                          <FormField
                            control={form.control}
                            name="street"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium">Rua</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="Nome da rua" 
                                    className="h-12 text-base mt-2"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Number and Complement */}
                        <div>
                          <FormField
                            control={form.control}
                            name="number"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium">Número</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="123" 
                                    className="h-12 text-base mt-2"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div>
                          <FormField
                            control={form.control}
                            name="complement"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium">Complemento</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="Apto 101" 
                                    className="h-12 text-base mt-2"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Neighborhood and City */}
                        <div>
                          <FormField
                            control={form.control}
                            name="neighborhood"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium">Bairro</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="Nome do bairro" 
                                    className="h-12 text-base mt-2"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="md:col-span-2">
                          <FormField
                            control={form.control}
                            name="city"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium">Cidade</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="Cidade" 
                                    className="h-12 text-base mt-2"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Default Address Checkbox - Full width */}
                        <div className="md:col-span-3">
                          <FormField
                            control={form.control}
                            name="isDefault"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-4">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="text-base font-medium">
                                    Definir como endereço padrão
                                  </FormLabel>
                                  <p className="text-sm text-gray-500">
                                    Este endereço será selecionado automaticamente em novos pedidos
                                  </p>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Submit Buttons */}
                      <div className="flex gap-6 pt-6">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 h-14 text-base font-medium"
                          onClick={handleCancel}
                        >
                          Cancelar
                        </Button>
                        <Button 
                          type="submit" 
                          className="flex-1 h-14 text-base font-medium"
                          disabled={saveAddressMutation.isPending}
                        >
                          {saveAddressMutation.isPending ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
                              Salvando...
                            </>
                          ) : (
                            <>
                              <MapPin className="w-5 h-5 mr-3" />
                              {isEditing ? "Atualizar Endereço" : "Salvar Endereço"}
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
    } else if (id && id.match(/^\d+$/) && !isEditing) {
      // Legacy behavior: if id is numeric and not editing, assume event flow
      return `/events/${id}/address`;
    } else {
      // Default to profile for editing or no clear context
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
      } else if (id && id.match(/^\d+$/) && !isEditing) {
        // Legacy event flow
        sessionStorage.setItem("loginReturnPath", `/events/${id}/address`);
        setLocation("/login");
      } else {
        // Profile flow or default
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

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
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
  );
}
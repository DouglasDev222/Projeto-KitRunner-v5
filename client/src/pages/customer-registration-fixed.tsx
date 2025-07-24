import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, MapPin, Plus, Trash2 } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useState } from "react";
import { customerRegistrationSchema, type CustomerRegistration } from "@shared/schema";
import { formatCPF, isValidCPF } from "@/lib/cpf-validator";
import { apiRequest } from "@/lib/queryClient";

export default function CustomerRegistration() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<CustomerRegistration>({
    resolver: zodResolver(customerRegistrationSchema),
    defaultValues: {
      name: "",
      cpf: "",
      birthDate: "",
      email: "",
      phone: "",
      addresses: [
        {
          label: "Casa",
          street: "",
          number: "",
          complement: "",
          neighborhood: "",
          city: "",
          state: "PB",
          zipCode: "",
          isDefault: true,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "addresses",
  });

  const registerMutation = useMutation({
    mutationFn: async (data: CustomerRegistration) => {
      const response = await apiRequest("POST", "/api/customers/register", data);
      return response.json();
    },
    onSuccess: (data) => {
      // Store customer data in sessionStorage for next steps
      sessionStorage.setItem("customerData", JSON.stringify(data.customer));
      sessionStorage.setItem("customerAddresses", JSON.stringify(data.addresses));
      setLocation(`/events/${id}/address`);
    },
    onError: (error: any) => {
      setError(error.message || "Erro ao registrar cliente");
    },
  });

  const onSubmit = (data: CustomerRegistration) => {
    setError(null);
    
    registerMutation.mutate(data);
  };

  const handleZipCodeChange = (value: string, index: number) => {
    const formatted = value.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2');
    form.setValue(`addresses.${index}.zipCode`, formatted);
  };

  const handlePhoneChange = (value: string) => {
    const formatted = value.replace(/\D/g, '').replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');
    form.setValue("phone", formatted);
  };

  const addAddress = () => {
    append({
      label: "Trabalho",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "PB",
      zipCode: "",
      isDefault: false,
    });
  };

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      <Header showBackButton />
      <div className="p-4">
        <div className="flex items-center mb-4">
          <UserPlus className="w-6 h-6 text-primary mr-2" />
          <h2 className="text-2xl font-bold text-neutral-800">Novo Cadastro</h2>
        </div>
        <p className="text-neutral-600 mb-6">Complete seus dados para continuar</p>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Personal Information */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg text-neutral-800 mb-3">Dados Pessoais</h3>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Seu nome completo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="cpf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPF</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="00000000000"
                            {...field}
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
                    name="birthDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Nascimento</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="seu@email.com" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="(11) 99999-9999"
                            {...field}
                            onChange={(e) => handlePhoneChange(e.target.value)}
                            maxLength={15}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Addresses */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg text-neutral-800 flex items-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    Endereços
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAddress}
                    className="flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="border rounded-lg p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <FormField
                          control={form.control}
                          name={`addresses.${index}.label`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel>Rótulo</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Tipo de endereço" />
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
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                            className="ml-2 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name={`addresses.${index}.street`}
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
                          name={`addresses.${index}.number`}
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
                          name={`addresses.${index}.complement`}
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
                          name={`addresses.${index}.neighborhood`}
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
                          name={`addresses.${index}.city`}
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
                          name={`addresses.${index}.zipCode`}
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel>CEP</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="58000-000"
                                  {...field}
                                  onChange={(e) => handleZipCodeChange(e.target.value, index)}
                                  maxLength={9}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button 
              type="submit" 
              className="w-full bg-primary text-white hover:bg-primary/90"
              size="lg"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? "Cadastrando..." : "Finalizar Cadastro"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}


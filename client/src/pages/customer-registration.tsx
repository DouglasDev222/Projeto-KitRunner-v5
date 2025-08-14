import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, MapPin, Plus, Trash2, Calendar, Package, Users, Home } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useState } from "react";
import { customerRegistrationSchema, type CustomerRegistration } from "@shared/schema";
import { formatCPF, isValidCPF } from "@/lib/cpf-validator";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { PolicyAcceptance } from "@/components/policy-acceptance";
import { useAcceptPolicy } from "@/hooks/use-policy";
import { useIsMobile } from "@/hooks/use-mobile";

export default function CustomerRegistration() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const [error, setError] = useState<string | null>(null);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const { login } = useAuth();
  const acceptPolicyMutation = useAcceptPolicy();
  
  // Check if we're in standalone registration mode (no event ID)
  const isStandaloneRegistration = !id;

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
    onSuccess: async (data) => {
      // Record policy acceptance
      try {
        // Get the active register policy and record acceptance
        const policyResponse = await fetch('/api/policies?type=register');
        if (policyResponse.ok) {
          const policyData = await policyResponse.json();
          await acceptPolicyMutation.mutateAsync({
            userId: data.customer.id,
            policyId: policyData.policy.id,
            context: 'register'
          });
        }
      } catch (policyError) {
        console.error('Error recording policy acceptance:', policyError);
        // Continue with registration flow even if policy recording fails
      }

      if (isStandaloneRegistration) {
        // Standalone registration - log in user and go to profile
        login(data.customer);
        setLocation("/profile");
      } else {
        // Event flow registration - store data and continue to address confirmation
        sessionStorage.setItem("customerData", JSON.stringify(data.customer));
        sessionStorage.setItem("customerAddresses", JSON.stringify(data.addresses));
        setLocation(`/events/${id}/address`);
      }
    },
    onError: (error: any) => {
      setError(error.message || "Erro ao registrar cliente");
    },
  });

  const onSubmit = (data: CustomerRegistration) => {
    setError(null);
    
    // Validate policy acceptance
    if (!policyAccepted) {
      setError("É necessário aceitar os termos de cadastro para prosseguir");
      return;
    }
    
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
    // Only allow adding if less than 2 addresses
    if (fields.length < 2) {
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
    }
  };

  const getBackNavigation = () => {
    if (isStandaloneRegistration) {
      return () => setLocation("/login");
    } else {
      return () => setLocation("/login");
    }
  };

  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <Header showBackButton onBack={getBackNavigation()} />
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
                            placeholder="000.000.000-00"
                            {...field}
                            value={formatCPF(field.value)}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, "");
                              field.onChange(value);
                              
                              // Validate CPF if it has 11 digits
                              if (value.length === 11) {
                                if (!isValidCPF(value)) {
                                  form.setError("cpf", {
                                    type: "manual",
                                    message: "CPF inválido"
                                  });
                                } else {
                                  form.clearErrors("cpf");
                                }
                              }
                            }}
                            className={
                              field.value.length === 11 && !isValidCPF(field.value) 
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
                <div className="mb-3">
                  <h3 className="font-semibold text-lg text-neutral-800 flex items-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    Endereços
                  </h3>
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
            
            {/* Policy Acceptance */}
            <Card>
              <CardContent className="p-4">
                <PolicyAcceptance
                  type="register"
                  checked={policyAccepted}
                  onCheckedChange={setPolicyAccepted}
                  required={true}
                />
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
              disabled={registerMutation.isPending || !policyAccepted}
            >
              {registerMutation.isPending ? "Cadastrando..." : "Finalizar Cadastro"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
    );
  }

  // Desktop Layout
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Navigation */}
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
                <Calendar className="w-4 h-4" />
                <span>Início</span>
              </Button>

              <Button
                variant="ghost"
                onClick={() => {
                  sessionStorage.setItem("loginReturnPath", "/my-orders");
                  setLocation("/my-orders");
                }}
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
                <Calendar className="w-4 h-4" />
                <span>Eventos</span>
              </Button>

              <Button
                variant="ghost"
                className="flex items-center space-x-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-lg font-medium"
              >
                <Users className="w-4 h-4" />
                <span>Perfil</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto pt-16 pb-8 px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Header */}
          <div className="lg:pr-8">
            <div className="flex items-center mb-6">
              <UserPlus className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Novo Cadastro</h1>
                <p className="text-gray-600 mt-2">Complete seus dados para continuar</p>
              </div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-6">
              <h3 className="font-semibold text-lg text-purple-900 mb-3">Bem-vindo ao KitRunner!</h3>
              <p className="text-purple-700 mb-4">
                Crie sua conta para ter acesso a todos os eventos disponíveis e gerenciar seus pedidos de kits.
              </p>
              <ul className="space-y-2 text-purple-700">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-purple-600 rounded-full mr-3"></span>
                  Navegue por eventos disponíveis
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-purple-600 rounded-full mr-3"></span>
                  Gerencie múltiplos endereços
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-purple-600 rounded-full mr-3"></span>
                  Acompanhe seus pedidos
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column - Form */}
          <div>
            <Card className="shadow-lg">
              <CardContent className="p-8">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    
                    {/* Personal Information */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg text-gray-900 mb-4">Dados Pessoais</h3>
                      
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700 font-medium">Nome Completo</FormLabel>
                            <FormControl>
                              <Input placeholder="Seu nome completo" {...field} className="h-12" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="cpf"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700 font-medium">CPF</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="000.000.000-00"
                                  {...field}
                                  value={formatCPF(field.value)}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, "");
                                    field.onChange(value);
                                    
                                    if (value.length === 11) {
                                      if (!isValidCPF(value)) {
                                        form.setError("cpf", {
                                          type: "manual",
                                          message: "CPF inválido"
                                        });
                                      } else {
                                        form.clearErrors("cpf");
                                      }
                                    }
                                  }}
                                  className={`h-12 ${
                                    field.value.length === 11 && !isValidCPF(field.value) 
                                      ? "border-red-500" 
                                      : ""
                                  }`}
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
                              <FormLabel className="text-gray-700 font-medium">Data de Nascimento</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} className="h-12" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700 font-medium">E-mail</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="seu@email.com" {...field} className="h-12" />
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
                              <FormLabel className="text-gray-700 font-medium">Telefone</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="(83) 99999-9999"
                                  {...field}
                                  onChange={(e) => handlePhoneChange(e.target.value)}
                                  className="h-12"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Address Information - Simplified for desktop */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg text-gray-900">Endereços</h3>
                        {fields.length < 2 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addAddress}
                            className="flex items-center space-x-2"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Adicionar</span>
                          </Button>
                        )}
                      </div>
                      
                      {fields.map((field, index) => (
                        <Card key={field.id} className="border border-gray-200">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-4">
                              <FormField
                                control={form.control}
                                name={`addresses.${index}.label`}
                                render={({ field }) => (
                                  <FormItem className="flex-1 mr-4">
                                    <FormLabel className="text-gray-700 font-medium">Tipo</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Selecione" />
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
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4">
                              <FormField
                                control={form.control}
                                name={`addresses.${index}.street`}
                                render={({ field }) => (
                                  <FormItem className="col-span-2">
                                    <FormLabel className="text-gray-700 font-medium">Rua</FormLabel>
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
                                    <FormLabel className="text-gray-700 font-medium">Número</FormLabel>
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
                                    <FormLabel className="text-gray-700 font-medium">Complemento</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Apt 101" {...field} />
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
                                    <FormLabel className="text-gray-700 font-medium">Bairro</FormLabel>
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
                                    <FormLabel className="text-gray-700 font-medium">Cidade</FormLabel>
                                    <FormControl>
                                      <Input placeholder="João Pessoa" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mt-4">
                              <FormField
                                control={form.control}
                                name={`addresses.${index}.zipCode`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-gray-700 font-medium">CEP</FormLabel>
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
                              
                              <FormField
                                control={form.control}
                                name={`addresses.${index}.state`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-gray-700 font-medium">Estado</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="PB">Paraíba</SelectItem>
                                        <SelectItem value="PE">Pernambuco</SelectItem>
                                        <SelectItem value="RN">Rio Grande do Norte</SelectItem>
                                        <SelectItem value="CE">Ceará</SelectItem>
                                        <SelectItem value="AL">Alagoas</SelectItem>
                                        <SelectItem value="SE">Sergipe</SelectItem>
                                        <SelectItem value="BA">Bahia</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Policy Acceptance */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <PolicyAcceptance
                        type="register"
                        checked={policyAccepted}
                        onCheckedChange={setPolicyAccepted}
                        required={true}
                      />
                    </div>

                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    
                    <Button 
                      type="submit" 
                      className="w-full h-12 text-lg bg-purple-600 hover:bg-purple-700"
                      disabled={registerMutation.isPending || !policyAccepted}
                    >
                      {registerMutation.isPending ? "Cadastrando..." : "Finalizar Cadastro"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}


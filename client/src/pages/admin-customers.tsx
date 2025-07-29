import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { AdminLayout } from "@/components/admin-layout";
// Sistema novo: AdminRouteGuard protege esta página
import { Users, Plus, Search, Eye, Edit, Trash2, MapPin, Phone, Mail, Calendar } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customerRegistrationSchema, addressSchema, type CustomerRegistration, type Customer, type Address } from "@shared/schema";
import { formatCPF, isValidCPF } from "@/lib/cpf-validator";
import { formatDate, formatPhone, isValidPhone } from "@/lib/brazilian-formatter";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis
} from "@/components/ui/pagination";

// Schema for customer editing
const customerEditSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de nascimento deve estar no formato YYYY-MM-DD"),
});

type CustomerEdit = z.infer<typeof customerEditSchema>;

interface CustomerWithAddresses extends Customer {
  addresses: Address[];
  orderCount?: number;
}

export default function AdminCustomers() {
  // Sistema novo: AdminRouteGuard já protege
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithAddresses | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<CustomerWithAddresses | null>(null);
  const [isAddAddressDialogOpen, setIsAddAddressDialogOpen] = useState(false);
  const [isEditAddressDialogOpen, setIsEditAddressDialogOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const queryClient = useQueryClient();

  // Sistema novo: AdminRouteGuard já protege - não precisa de verificação

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page when searching
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch customers with addresses (paginated)
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ["/api/admin/customers", { 
      page: currentPage, 
      pageSize: pageSize,
      paginated: true,
      search: debouncedSearchTerm 
    }],
  });

  const customers = customersData?.customers || [];
  const totalPages = customersData?.totalPages || 1;
  const totalCustomers = customersData?.total || 0;

  // Create customer form
  const createForm = useForm<CustomerRegistration>({
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

  // Edit customer form
  const editForm = useForm<CustomerEdit>({
    resolver: zodResolver(customerEditSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      birthDate: "",
    },
  });

  // Address form for managing addresses in details modal
  const addressForm = useForm({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "PB",
      zipCode: "",
      isDefault: false,
    },
  });

  const { fields: createAddressFields, append: appendCreateAddress, remove: removeCreateAddress } = useFieldArray({
    control: createForm.control,
    name: "addresses",
  });

  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (data: CustomerRegistration) => {
      const response = await apiRequest("POST", "/api/admin/customers", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
    },
  });

  // Update customer mutation
  const updateCustomerMutation = useMutation({
    mutationFn: async (data: { id: number; customer: CustomerEdit }) => {
      const response = await apiRequest("PUT", `/api/admin/customers/${data.id}`, data.customer);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
      setIsEditDialogOpen(false);
      setSelectedCustomer(null);
    },
  });

  // Delete customer mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/admin/customers/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
      setIsDeleteDialogOpen(false);
      setCustomerToDelete(null);
    },
  });

  // Create address mutation
  const createAddressMutation = useMutation({
    mutationFn: async (data: { customerId: number; address: any }) => {
      const response = await apiRequest("POST", `/api/customers/${data.customerId}/addresses`, data.address);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
      setIsAddAddressDialogOpen(false);
      addressForm.reset();
    },
  });

  // Update address mutation
  const updateAddressMutation = useMutation({
    mutationFn: async (data: { id: number; address: any }) => {
      const response = await apiRequest("PUT", `/api/addresses/${data.id}`, data.address);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
      setIsEditAddressDialogOpen(false);
      setSelectedAddress(null);
      addressForm.reset();
    },
  });

  // Filter customers based on search term
  const filteredCustomers = customers?.filter((customer: any) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.cpf.includes(searchTerm) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleCreateCustomer = (data: CustomerRegistration) => {
    // Extract only numbers from CPF for validation and storage
    const cleanCPF = data.cpf.replace(/\D/g, "");
    const cleanPhone = data.phone.replace(/\D/g, "");
    
    // Validate CPF
    if (!isValidCPF(cleanCPF)) {
      createForm.setError("cpf", { message: "CPF inválido" });
      return;
    }

    // Validate phone
    if (!isValidPhone(cleanPhone)) {
      createForm.setError("phone", { message: "Telefone deve ter 10 ou 11 dígitos" });
      return;
    }

    // Send data with clean CPF and phone (numbers only) to the server
    const cleanData = {
      ...data,
      cpf: cleanCPF,
      phone: cleanPhone
    };
    
    createCustomerMutation.mutate(cleanData);
  };

  const handleEditCustomer = (data: CustomerEdit) => {
    if (!selectedCustomer) return;
    
    // Clean phone number for storage
    const cleanPhone = data.phone.replace(/\D/g, "");
    
    // Validate phone
    if (!isValidPhone(cleanPhone)) {
      editForm.setError("phone", { message: "Telefone deve ter 10 ou 11 dígitos" });
      return;
    }
    
    const cleanData = {
      ...data,
      phone: cleanPhone
    };
    
    updateCustomerMutation.mutate({ id: selectedCustomer.id, customer: cleanData });
  };

  const handleDeleteCustomer = () => {
    if (!customerToDelete) return;
    deleteCustomerMutation.mutate(customerToDelete.id);
  };

  const openEditModal = (customer: any) => {
    setSelectedCustomer(customer);
    editForm.reset({
      name: customer.name,
      email: customer.email,
      phone: formatPhone(customer.phone), // Format phone for display
      birthDate: customer.birthDate,
    });
    setIsEditDialogOpen(true);
  };

  // Edit form phone handlers
  const handleEditPhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    editForm.setValue("phone", formatted);
  };

  const handleEditPhoneBlur = () => {
    const currentValue = editForm.getValues("phone");
    const numbersOnly = currentValue.replace(/\D/g, "");
    editForm.setValue("phone", formatPhone(numbersOnly));
  };

  // Address handlers
  const openAddAddressModal = () => {
    addressForm.reset({
      label: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "PB",
      zipCode: "",
      isDefault: false
    });
    setIsAddAddressDialogOpen(true);
  };

  const openEditAddressModal = (address: Address) => {
    setSelectedAddress(address);
    addressForm.reset({
      label: address.label,
      street: address.street,
      number: address.number,
      complement: address.complement || "",
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      isDefault: address.isDefault
    });
    setIsEditAddressDialogOpen(true);
  };

  const handleCreateAddress = (data: any) => {
    if (!selectedCustomer) return;
    createAddressMutation.mutate({
      customerId: selectedCustomer.id,
      address: data
    });
  };

  const handleUpdateAddress = (data: any) => {
    if (!selectedAddress) return;
    updateAddressMutation.mutate({
      id: selectedAddress.id,
      address: data
    });
  };

  const openDetailsModal = (customer: CustomerWithAddresses) => {
    setSelectedCustomer(customer);
    setIsViewDialogOpen(true);
  };

  const openDeleteDialog = (customer: CustomerWithAddresses) => {
    setCustomerToDelete(customer);
    setIsDeleteDialogOpen(true);
  };

  const handleCPFChange = (value: string) => {
    const formatted = formatCPF(value);
    createForm.setValue("cpf", formatted);
  };

  const handleCPFBlur = () => {
    // When field loses focus, store only numbers but keep visual formatting
    const currentValue = createForm.getValues("cpf");
    const numbersOnly = currentValue.replace(/\D/g, "");
    // Keep the formatted display but prepare numbers for submission
    createForm.setValue("cpf", formatCPF(numbersOnly));
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    createForm.setValue("phone", formatted);
  };

  const handlePhoneBlur = () => {
    // When field loses focus, keep formatting
    const currentValue = createForm.getValues("phone");
    const numbersOnly = currentValue.replace(/\D/g, "");
    createForm.setValue("phone", formatPhone(numbersOnly));
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Sistema novo: AdminRouteGuard já protege - não precisa de verificação

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-800">Gerenciamento de Clientes</h1>
            <p className="text-neutral-600">Visualize, edite e gerencie todos os clientes do sistema</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(handleCreateCustomer)} className="space-y-4">
                  {/* Customer Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Nome completo" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={createForm.control}
                      name="cpf"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPF</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="000.000.000-00"
                              onChange={(e) => handleCPFChange(e.target.value)}
                              onBlur={handleCPFBlur}
                              maxLength={14}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={createForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="email@exemplo.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={createForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="(83) 99999-9999" 
                              onChange={(e) => handlePhoneChange(e.target.value)}
                              onBlur={handlePhoneBlur}
                              maxLength={15}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={createForm.control}
                      name="birthDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Nascimento</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Addresses */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Endereços</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendCreateAddress({
                          label: "",
                          street: "",
                          number: "",
                          complement: "",
                          neighborhood: "",
                          city: "",
                          state: "PB",
                          zipCode: "",
                          isDefault: false,
                        })}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Endereço
                      </Button>
                    </div>

                    {createAddressFields.map((field, index) => (
                      <Card key={field.id} className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium">Endereço {index + 1}</h4>
                          {createAddressFields.length > 1 && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeCreateAddress(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={createForm.control}
                            name={`addresses.${index}.label`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Etiqueta</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Casa, Trabalho, etc." />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={createForm.control}
                            name={`addresses.${index}.zipCode`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>CEP</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="58000-000" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={createForm.control}
                            name={`addresses.${index}.street`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Logradouro</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Rua, Avenida, etc." />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={createForm.control}
                            name={`addresses.${index}.number`}
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
                            control={createForm.control}
                            name={`addresses.${index}.complement`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Complemento</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Apto, Bloco, etc." />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={createForm.control}
                            name={`addresses.${index}.neighborhood`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Bairro</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Centro" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={createForm.control}
                            name={`addresses.${index}.city`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Cidade</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="João Pessoa" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={createForm.control}
                            name={`addresses.${index}.state`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Estado</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="PB" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="mt-4">
                          <FormField
                            control={createForm.control}
                            name={`addresses.${index}.isDefault`}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-2">
                                <FormControl>
                                  <input
                                    type="checkbox"
                                    checked={Boolean(field.value)}
                                    onChange={field.onChange}
                                    className="rounded border-gray-300"
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  Endereço padrão
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>
                      </Card>
                    ))}
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createCustomerMutation.isPending}>
                      {createCustomerMutation.isPending ? "Criando..." : "Criar Cliente"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por nome, CPF ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Loading state */}
        {customersLoading && (
          <div className="text-center py-8">
            <p>Carregando clientes...</p>
          </div>
        )}

        {/* Customer Table */}
        {!customersLoading && (
          <div className="bg-white rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Endereços</TableHead>
                  <TableHead>Pedidos</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer: any) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{formatCPF(customer.cpf)}</TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>{formatPhone(customer.phone)}</TableCell>
                    <TableCell>
                      {customer.addresses && customer.addresses.length > 0 ? (
                        <div className="space-y-1">
                          {customer.addresses.slice(0, 2).map((address: any) => (
                            <div key={address.id} className="text-xs">
                              <span className="font-medium">{address.label}:</span> {address.street}, {address.number}
                            </div>
                          ))}
                          {customer.addresses.length > 2 && (
                            <div className="text-xs text-gray-500">
                              +{customer.addresses.length - 2} mais
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">Sem endereços</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{customer.orderCount || 0}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDetailsModal(customer)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(customer)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 p-4 border-t flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, totalCustomers)} de {totalCustomers} clientes
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage > 1) handlePageChange(currentPage - 1);
                        }}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(page);
                          }}
                          isActive={currentPage === page}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    
                    <PaginationItem>
                      <PaginationNext 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage < totalPages) handlePageChange(currentPage + 1);
                        }}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        )}

        {/* Details Modal */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Cliente</DialogTitle>
            </DialogHeader>
            
            {selectedCustomer && (
              <div className="space-y-6">
                {/* Customer Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Informações Pessoais</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Nome:</span> {selectedCustomer.name}</p>
                      <p><span className="font-medium">CPF:</span> {formatCPF(selectedCustomer.cpf)}</p>
                      <p><span className="font-medium">Email:</span> {selectedCustomer.email}</p>
                      <p><span className="font-medium">Telefone:</span> {formatPhone(selectedCustomer.phone)}</p>
                      <p><span className="font-medium">Data de Nascimento:</span> {formatDate(selectedCustomer.birthDate)}</p>
                      <p><span className="font-medium">Pedidos:</span> {selectedCustomer.orderCount || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Addresses */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">Endereços</h3>
                    <Button variant="outline" size="sm" onClick={openAddAddressModal}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Endereço
                    </Button>
                  </div>
                  
                  {selectedCustomer.addresses && selectedCustomer.addresses.length > 0 ? (
                    <div className="grid gap-4">
                      {selectedCustomer.addresses.map((address) => (
                        <Card key={address.id} className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{address.label}</span>
                                {address.isDefault && <Badge variant="secondary">Padrão</Badge>}
                              </div>
                              <p className="text-sm text-gray-600">
                                {address.street}, {address.number}
                                {address.complement && `, ${address.complement}`}
                              </p>
                              <p className="text-sm text-gray-600">
                                {address.neighborhood}, {address.city}/{address.state}
                              </p>
                              <p className="text-sm text-gray-600">CEP: {address.zipCode}</p>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="outline" size="sm" onClick={() => openEditAddressModal(address)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">Nenhum endereço cadastrado</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-between pt-4 border-t">
                  <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        onClick={() => openDeleteDialog(selectedCustomer)}
                        disabled={(selectedCustomer.orderCount || 0) > 0}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir Cliente
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir o cliente "{selectedCustomer.name}"? 
                          Esta ação não pode ser desfeita.
                          {(selectedCustomer.orderCount || 0) > 0 && (
                            <span className="block mt-2 text-red-600">
                              Este cliente possui {selectedCustomer.orderCount} pedidos associados e não pode ser excluído.
                            </span>
                          )}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteCustomer}
                          disabled={(selectedCustomer.orderCount || 0) > 0}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  
                  <Button onClick={() => setIsViewDialogOpen(false)}>
                    Fechar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Cliente</DialogTitle>
            </DialogHeader>
            
            {selectedCustomer && (
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(handleEditCustomer)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Nome completo" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="email@exemplo.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="(83) 99999-9999"
                              onChange={(e) => handleEditPhoneChange(e.target.value)}
                              onBlur={handleEditPhoneBlur}
                              maxLength={15}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editForm.control}
                      name="birthDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Nascimento</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={updateCustomerMutation.isPending}>
                      {updateCustomerMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </DialogContent>
        </Dialog>

        {/* Add Address Modal */}
        <Dialog open={isAddAddressDialogOpen} onOpenChange={setIsAddAddressDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Adicionar Endereço</DialogTitle>
            </DialogHeader>
            
            <Form {...addressForm}>
              <form onSubmit={addressForm.handleSubmit(handleCreateAddress)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={addressForm.control}
                    name="label"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Endereço</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Casa, Trabalho, etc." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={addressForm.control}
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
                  
                  <FormField
                    control={addressForm.control}
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
                    control={addressForm.control}
                    name="complement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Complemento</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Apto 45, Casa 2, etc." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={addressForm.control}
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
                  
                  <FormField
                    control={addressForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nome da cidade" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={addressForm.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="PB" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={addressForm.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="58000-000" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={addressForm.control}
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

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddAddressDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createAddressMutation.isPending}>
                    {createAddressMutation.isPending ? "Salvando..." : "Adicionar Endereço"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Address Modal */}
        <Dialog open={isEditAddressDialogOpen} onOpenChange={setIsEditAddressDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Endereço</DialogTitle>
            </DialogHeader>
            
            <Form {...addressForm}>
              <form onSubmit={addressForm.handleSubmit(handleUpdateAddress)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={addressForm.control}
                    name="label"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Endereço</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Casa, Trabalho, etc." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={addressForm.control}
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
                  
                  <FormField
                    control={addressForm.control}
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
                    control={addressForm.control}
                    name="complement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Complemento</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Apto 45, Casa 2, etc." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={addressForm.control}
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
                  
                  <FormField
                    control={addressForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nome da cidade" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={addressForm.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="PB" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={addressForm.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="58000-000" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={addressForm.control}
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

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditAddressDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={updateAddressMutation.isPending}>
                    {updateAddressMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
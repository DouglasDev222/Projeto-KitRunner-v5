import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Eye, Archive, Clock, FileText } from "lucide-react";

interface PolicyDocument {
  id: number;
  type: 'register' | 'order';
  title: string;
  content: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PolicyFormData {
  type: 'register' | 'order';
  title: string;
  content: string;
}

export default function AdminPolicies() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyDocument | null>(null);
  const [formData, setFormData] = useState<PolicyFormData>({
    type: 'register',
    title: '',
    content: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: policies = [], isLoading } = useQuery<PolicyDocument[]>({
    queryKey: ['/api/admin/policies'],
  });

  const createPolicyMutation = useMutation({
    mutationFn: async (data: PolicyFormData) => {
      const response = await apiRequest('POST', '/api/admin/policies', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/policies'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Política criada",
        description: "Nova política criada com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar política",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePolicyMutation = useMutation({
    mutationFn: async (data: { id: number; policy: PolicyFormData }) => {
      const response = await apiRequest('PUT', `/api/admin/policies/${data.id}`, data.policy);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/policies'] });
      setIsEditDialogOpen(false);
      setSelectedPolicy(null);
      resetForm();
      toast({
        title: "Política atualizada",
        description: "Política atualizada com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar política",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deactivatePolicyMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/admin/policies/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/policies'] });
      toast({
        title: "Política arquivada",
        description: "Política arquivada com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao arquivar política",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      type: 'register',
      title: '',
      content: ''
    });
  };

  const handleCreate = () => {
    setIsCreateDialogOpen(true);
    resetForm();
  };

  const handleEdit = (policy: PolicyDocument) => {
    setSelectedPolicy(policy);
    setFormData({
      type: policy.type,
      title: policy.title,
      content: policy.content
    });
    setIsEditDialogOpen(true);
  };

  const handleView = (policy: PolicyDocument) => {
    setSelectedPolicy(policy);
    setIsViewDialogOpen(true);
  };

  const handleDeactivate = (policy: PolicyDocument) => {
    if (confirm(`Tem certeza que deseja arquivar a política "${policy.title}"?`)) {
      deactivatePolicyMutation.mutate(policy.id);
    }
  };

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createPolicyMutation.mutate(formData);
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPolicy) {
      updatePolicyMutation.mutate({
        id: selectedPolicy.id,
        policy: formData
      });
    }
  };

  const getTypeLabel = (type: string) => {
    return type === 'register' ? 'Cadastro' : 'Pedido';
  };

  const getTypeBadgeVariant = (type: string) => {
    return type === 'register' ? 'default' : 'secondary';
  };

  const activePolicies = policies.filter(p => p.active);
  const inactivePolicies = policies.filter(p => !p.active);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-800">Termos e Políticas</h1>
            <p className="text-neutral-600">Gerencie termos de uso e políticas de privacidade</p>
          </div>
          <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Nova Política
          </Button>
        </div>

        {/* Active Policies */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Políticas Ativas
          </h2>
          
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-lg"></div>
              ))}
            </div>
          ) : activePolicies.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">Nenhuma política ativa encontrada</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activePolicies.map((policy) => (
                <Card key={policy.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">{policy.title}</CardTitle>
                        <Badge variant={getTypeBadgeVariant(policy.type)}>
                          {getTypeLabel(policy.type)}
                        </Badge>
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Ativa
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleView(policy)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ver
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(policy)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeactivate(policy)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Archive className="w-4 h-4 mr-1" />
                          Arquivar
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-500 gap-4">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Criada: {new Date(policy.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Atualizada: {new Date(policy.updatedAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 line-clamp-3">
                      {policy.content.replace(/<[^>]*>/g, '').substring(0, 200)}...
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Inactive Policies */}
        {inactivePolicies.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Archive className="w-5 h-5" />
              Políticas Arquivadas
            </h2>
            
            <div className="grid gap-4">
              {inactivePolicies.map((policy) => (
                <Card key={policy.id} className="opacity-60">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">{policy.title}</CardTitle>
                        <Badge variant={getTypeBadgeVariant(policy.type)}>
                          {getTypeLabel(policy.type)}
                        </Badge>
                        <Badge variant="outline" className="text-gray-500">
                          Arquivada
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleView(policy)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver
                      </Button>
                    </div>
                    <div className="flex items-center text-sm text-gray-500 gap-4">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Criada: {new Date(policy.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Atualizada: {new Date(policy.updatedAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Create Policy Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Nova Política</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Tipo</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value: 'register' | 'order') => 
                      setFormData(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="register">Termos de Cadastro</SelectItem>
                      <SelectItem value="order">Política de Pedidos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="content">Conteúdo (HTML permitido)</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  rows={15}
                  className="font-mono text-sm"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createPolicyMutation.isPending}
                >
                  {createPolicyMutation.isPending ? 'Criando...' : 'Criar Política'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Policy Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Política</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-type">Tipo</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value: 'register' | 'order') => 
                      setFormData(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="register">Termos de Cadastro</SelectItem>
                      <SelectItem value="order">Política de Pedidos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-title">Título</Label>
                  <Input
                    id="edit-title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-content">Conteúdo (HTML permitido)</Label>
                <Textarea
                  id="edit-content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  rows={15}
                  className="font-mono text-sm"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={updatePolicyMutation.isPending}
                >
                  {updatePolicyMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Policy Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                {selectedPolicy?.title}
                <Badge variant={selectedPolicy ? getTypeBadgeVariant(selectedPolicy.type) : 'default'}>
                  {selectedPolicy ? getTypeLabel(selectedPolicy.type) : ''}
                </Badge>
                <Badge variant="outline" className={selectedPolicy?.active ? "text-green-600 border-green-600" : "text-gray-500"}>
                  {selectedPolicy?.active ? 'Ativa' : 'Arquivada'}
                </Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="prose max-w-none">
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: selectedPolicy?.content || '' 
                }}
                className="border rounded-lg p-4 bg-gray-50"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setIsViewDialogOpen(false)}>
                Fechar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
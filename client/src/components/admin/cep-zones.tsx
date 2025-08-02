import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface CepZone {
  id: number;
  name: string;
  description: string;
  cepStart: string;
  cepEnd: string;
  price: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateCepZoneData {
  name: string;
  description: string;
  cepStart: string;
  cepEnd: string;
  price: string;
}

export default function CepZonesAdmin() {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CreateCepZoneData>({
    name: '',
    description: '',
    cepStart: '',
    cepEnd: '',
    price: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch CEP zones
  const { data: zones, isLoading } = useQuery<{ success: boolean; zones: CepZone[] }>({
    queryKey: ['/api/admin/cep-zones'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Create zone mutation
  const createZoneMutation = useMutation({
    mutationFn: (data: CreateCepZoneData) => 
      apiRequest('/api/admin/cep-zones', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cep-zones'] });
      setIsCreating(false);
      setFormData({ name: '', description: '', cepStart: '', cepEnd: '', price: '' });
      toast({
        title: "Zona criada com sucesso",
        description: "A nova zona CEP foi adicionada ao sistema.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar zona",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    },
  });

  // Update zone mutation
  const updateZoneMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateCepZoneData> }) =>
      apiRequest(`/api/admin/cep-zones/${id}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cep-zones'] });
      setEditingId(null);
      toast({
        title: "Zona atualizada",
        description: "As alterações foram salvas com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar zona",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    },
  });

  // Delete zone mutation
  const deleteZoneMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/admin/cep-zones/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cep-zones'] });
      toast({
        title: "Zona removida",
        description: "A zona CEP foi removida do sistema.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover zona",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateZoneMutation.mutate({ id: editingId, data: formData });
    } else {
      createZoneMutation.mutate(formData);
    }
  };

  const startEdit = (zone: CepZone) => {
    setEditingId(zone.id);
    setFormData({
      name: zone.name,
      description: zone.description,
      cepStart: zone.cepStart,
      cepEnd: zone.cepEnd,
      price: zone.price,
    });
    setIsCreating(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormData({ name: '', description: '', cepStart: '', cepEnd: '', price: '' });
  };

  const formatCep = (cep: string) => {
    return cep.replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Zonas CEP</h2>
          <p className="text-muted-foreground">
            Gerencie as zonas de entrega por código postal
          </p>
        </div>
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nova Zona
          </Button>
        )}
      </div>

      {/* Create/Edit Form */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? 'Editar Zona CEP' : 'Nova Zona CEP'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome da Zona</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: João Pessoa Z1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="price">Preço (R$)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="20.00"
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ex: Centro de João Pessoa"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cepStart">CEP Inicial</Label>
                  <Input
                    id="cepStart"
                    value={formData.cepStart}
                    onChange={(e) => setFormData({ ...formData, cepStart: e.target.value.replace(/\D/g, '') })}
                    placeholder="58000000"
                    maxLength={8}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cepEnd">CEP Final</Label>
                  <Input
                    id="cepEnd"
                    value={formData.cepEnd}
                    onChange={(e) => setFormData({ ...formData, cepEnd: e.target.value.replace(/\D/g, '') })}
                    placeholder="58099999"
                    maxLength={8}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={createZoneMutation.isPending || updateZoneMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {editingId ? 'Atualizar' : 'Criar'} Zona
                </Button>
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Zones List */}
      <div className="grid gap-4">
        {zones?.zones?.map((zone) => (
          <Card key={zone.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{zone.name}</h3>
                    <Badge variant={zone.active ? "default" : "secondary"}>
                      {zone.active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                  {zone.description && (
                    <p className="text-sm text-muted-foreground mb-2">{zone.description}</p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="font-medium">CEP Range:</span> {formatCep(zone.cepStart)} - {formatCep(zone.cepEnd)}
                    </div>
                    <div>
                      <span className="font-medium">Preço:</span> R$ {Number(zone.price).toFixed(2)}
                    </div>
                    <div>
                      <span className="font-medium">Criada em:</span> {new Date(zone.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startEdit(zone)}
                    disabled={editingId === zone.id}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm('Tem certeza que deseja remover esta zona?')) {
                        deleteZoneMutation.mutate(zone.id);
                      }
                    }}
                    disabled={deleteZoneMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )) || []}
        
        {zones?.zones?.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                Nenhuma zona CEP configurada. Clique em "Nova Zona" para começar.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
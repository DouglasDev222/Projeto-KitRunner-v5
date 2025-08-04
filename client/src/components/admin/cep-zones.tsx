import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Save, X, ChevronUp, ChevronDown } from 'lucide-react';
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
  cepRanges: string; // JSON string containing array of ranges
  price: string;
  priority: number; // NOVO CAMPO - Priority for overlap resolution
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateCepZoneData {
  name: string;
  description: string;
  rangesText: string; // Text with ranges in format "58083000...58083500"
  price: string;
  priority: number; // NOVO CAMPO - Priority field
}

export default function CepZonesAdmin() {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CreateCepZoneData>({
    name: '',
    description: '',
    rangesText: '',
    price: '',
    priority: 1
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch CEP zones
  const { data: zonesResponse, isLoading } = useQuery({
    queryKey: ['cep-zones'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/cep-zones');
      return await response.json() as { success: boolean; zones: CepZone[] };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Create zone mutation
  const createZoneMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description: string;
      rangesText: string;
      price: string;
    }) => {
      const response = await apiRequest('POST', '/api/admin/cep-zones', data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cep-zones'] });
      setIsCreating(false);
      setFormData({ name: '', description: '', rangesText: '', price: '', priority: 1 });
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
    mutationFn: async ({ id, data }: { 
      id: number; 
      data: {
        name: string;
        description: string;
        rangesText: string;
        price: string;
        priority?: number;
      }
    }) => {
      const response = await apiRequest('PUT', `/api/admin/cep-zones/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cep-zones'] });
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
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/admin/cep-zones/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cep-zones'] });
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
      // When editing, include priority
      const editData = {
        name: formData.name,
        description: formData.description,
        rangesText: formData.rangesText,
        price: formData.price,
        priority: formData.priority
      };
      updateZoneMutation.mutate({ id: editingId, data: editData });
    } else {
      // When creating, don't include priority (it's automatic)
      const createData = {
        name: formData.name,
        description: formData.description,
        rangesText: formData.rangesText,
        price: formData.price,
      };
      createZoneMutation.mutate(createData);
    }
  };

  const formatRangesFromJson = (cepRanges: string): string => {
    try {
      const ranges = JSON.parse(cepRanges);
      return ranges.map((range: any) => `${range.start}...${range.end}`).join('\n');
    } catch {
      return '';
    }
  };

  const startEdit = (zone: CepZone) => {
    setEditingId(zone.id);
    setFormData({
      name: zone.name,
      description: zone.description,
      rangesText: formatRangesFromJson(zone.cepRanges),
      price: zone.price,
      priority: zone.priority || 1,
    });
    setIsCreating(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormData({ name: '', description: '', rangesText: '', price: '', priority: 1 });
  };

  const formatCep = (cep: string) => {
    return cep.replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  const formatRangeForDisplay = (start: string, end: string) => {
    return `${formatCep(start)} - ${formatCep(end)}`;
  };

  // Priority reordering mutation
  const reorderMutation = useMutation({
    mutationFn: async (zones: Array<{ id: number; priority: number }>) => {
      const response = await apiRequest('PUT', '/api/admin/cep-zones/reorder', { zones });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cep-zones'] });
      toast({
        title: "Prioridades atualizadas",
        description: "A ordem das zonas foi atualizada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao reordenar",
        description: error.message || "Erro ao atualizar prioridades das zonas.",
        variant: "destructive",
      });
    },
  });

  // Move zone priority up or down
  const moveZone = (zoneId: number, direction: 'up' | 'down') => {
    if (!zonesResponse?.zones) return;
    
    const zones = [...zonesResponse.zones].sort((a, b) => a.priority - b.priority);
    const currentIndex = zones.findIndex(z => z.id === zoneId);
    
    if (currentIndex === -1) return;
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === zones.length - 1) return;
    
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    // Swap priorities
    const updates = [
      { id: zones[currentIndex].id, priority: zones[targetIndex].priority },
      { id: zones[targetIndex].id, priority: zones[currentIndex].priority }
    ];
    
    reorderMutation.mutate(updates);
  };

  // Component for priority indicator
  const PriorityIndicator = ({ priority }: { priority: number }) => {
    const getPriorityColor = (p: number) => {
      if (p === 1) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'; // Alta prioridade
      if (p <= 3) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'; // Média prioridade
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'; // Baixa prioridade
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(priority)}`}>
        Prioridade {priority}
      </span>
    );
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
              
              {/* Priority is now automatic - show info only */}
              {!editingId && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-blue-500" />
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Prioridade Automática
                    </p>
                  </div>
                  <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                    Esta zona será automaticamente adicionada na última posição (menor prioridade). 
                    Use os botões de seta para reordenar depois de criada.
                  </p>
                </div>
              )}
              
              {/* Show current priority when editing */}
              {editingId && (
                <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-gray-500" />
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      Prioridade Atual: {formData.priority}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Use os botões de seta na lista para alterar a prioridade desta zona.
                  </p>
                </div>
              )}
              
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ex: Centro de João Pessoa"
                />
              </div>

              <div>
                <Label htmlFor="rangesText">Faixas de CEP</Label>
                <Textarea
                  id="rangesText"
                  value={formData.rangesText}
                  onChange={(e) => setFormData({ ...formData, rangesText: e.target.value })}
                  placeholder="58083000...58083500&#10;58081400...58082815&#10;58084000...58084740"
                  rows={6}
                  className="font-mono text-sm"
                  required
                  />
                <div className="text-sm text-muted-foreground mt-2">
                  <p><strong>Formato:</strong> Uma faixa por linha no formato: CEP_INICIAL...CEP_FINAL</p>
                  <p><strong>Exemplo:</strong></p>
                  <p>58083000...58083500</p>
                  <p>58081400...58082815</p>
                  <p>58084000...58084740</p>
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

      {/* Zones List ordered by priority */}
      <div className="grid gap-4">
        {zonesResponse?.zones
          ?.sort((a, b) => (a.priority || 1) - (b.priority || 1))
          ?.map((zone, index) => {
            const sortedZones = zonesResponse.zones.sort((a, b) => (a.priority || 1) - (b.priority || 1));
            const isFirst = index === 0;
            const isLast = index === sortedZones.length - 1;
            
            return (
          <Card key={zone.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="font-semibold">{zone.name}</h3>
                    <PriorityIndicator priority={zone.priority || 1} />
                    <Badge variant={zone.active ? "default" : "secondary"}>
                      {zone.active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                  {zone.description && (
                    <p className="text-sm text-muted-foreground mb-2">{zone.description}</p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="font-medium">Faixas CEP:</span> 
                      <div className="font-mono text-xs">
                        {formatRangesFromJson(zone.cepRanges).split('\n').map((range, idx) => (
                          <div key={idx}>{range}</div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Preço:</span> R$ {Number(zone.price).toFixed(2)}
                    </div>
                    <div>
                      <span className="font-medium">Prioridade:</span> {zone.priority || 1}
                    </div>
                    <div>
                      <span className="font-medium">Criada em:</span> {new Date(zone.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 ml-4">
                  {/* Priority controls */}
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => moveZone(zone.id, 'up')}
                      disabled={isFirst || reorderMutation.isPending}
                      title="Subir prioridade"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => moveZone(zone.id, 'down')}
                      disabled={isLast || reorderMutation.isPending}
                      title="Descer prioridade"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Action controls */}
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(zone)}
                      disabled={editingId === zone.id}
                      title="Editar zona"
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
                      title="Remover zona"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
            );
          })}
        
        {zonesResponse?.zones?.length === 0 && (
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
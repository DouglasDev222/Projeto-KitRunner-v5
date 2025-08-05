import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, DollarSign, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface CepZonePrice {
  id: number;
  name: string;
  description: string;
  cepRanges: string;
  price: string;
  currentPrice?: string;
  hasCustomPrice?: boolean;
  priority: number;
  active: boolean;
}

interface ApiResponse {
  success: boolean;
  zones: CepZonePrice[];
}

interface EventCepZonePricesProps {
  eventId: number | null;
  isVisible: boolean;
}

export function EventCepZonePrices({ eventId, isVisible }: EventCepZonePricesProps) {
  const [zonePrices, setZonePrices] = useState<Record<number, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const queryClient = useQueryClient();
  
  const { data: zones, isLoading, error } = useQuery({
    queryKey: eventId ? ['/api/events', eventId, 'cep-zone-prices'] : ['/api/admin/cep-zones'],
    enabled: isVisible,
    queryFn: async () => {
      const endpoint = eventId ? `/api/events/${eventId}/cep-zone-prices` : '/api/admin/cep-zones';
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.status}`);
      }
      
      return response.json();
    }
  });
  
  const savePricesMutation = useMutation({
    mutationFn: async (prices: Array<{ cepZoneId: number; price: string }>) => {
      if (!eventId) {
        throw new Error('ID do evento é necessário para salvar preços personalizados');
      }
      
      const response = await fetch(`/api/events/${eventId}/cep-zone-prices`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ zonePrices: prices })
      });
      
      if (!response.ok) {
        throw new Error('Erro ao salvar preços personalizados');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'cep-zone-prices'] });
      setHasChanges(false);
    }
  });
  
  useEffect(() => {
    if (zones) {
      const initialPrices: Record<number, string> = {};
      let zonesList: CepZonePrice[] = [];
      
      // Handle different response formats
      if ((zones as ApiResponse).success && (zones as ApiResponse).zones) {
        // Format from /api/admin/cep-zones
        zonesList = (zones as ApiResponse).zones;
      } else if (Array.isArray(zones)) {
        // Format from /api/events/:id/cep-zone-prices
        zonesList = zones as CepZonePrice[];
      }
      
      if (Array.isArray(zonesList)) {
        zonesList.forEach((zone: CepZonePrice) => {
          initialPrices[zone.id] = zone.currentPrice || zone.price;
        });
        setZonePrices(initialPrices);
        setHasChanges(false);
      }
    }
  }, [zones]);
  
  if (!isVisible) return null;

  const handlePriceChange = (zoneId: number, newPrice: string) => {
    setZonePrices(prev => ({
      ...prev,
      [zoneId]: newPrice
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    const pricesArray = Object.entries(zonePrices).map(([cepZoneId, price]) => ({
      cepZoneId: parseInt(cepZoneId),
      price
    }));
    savePricesMutation.mutate(pricesArray);
  };

  const formatCepRanges = (cepRangesJson: string) => {
    try {
      const ranges = JSON.parse(cepRangesJson);
      return ranges.map((r: any) => 
        `${r.start.substring(0, 5)}-${r.start.substring(5)} até ${r.end.substring(0, 5)}-${r.end.substring(5)}`
      ).join(', ');
    } catch {
      return 'Formato inválido';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Preços Personalizados por Zona CEP
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Carregando zonas CEP...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Preços Personalizados por Zona CEP
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erro ao carregar zonas CEP. Verifique se existem zonas ativas cadastradas.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Handle different response formats
  let zonesList: CepZonePrice[] = [];
  if ((zones as ApiResponse)?.success && (zones as ApiResponse)?.zones) {
    zonesList = (zones as ApiResponse).zones;
  } else if (Array.isArray(zones)) {
    zonesList = zones as CepZonePrice[];
  }

  if (!zonesList || !Array.isArray(zonesList) || zonesList.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Preços Personalizados por Zona CEP
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Nenhuma zona CEP ativa encontrada. Configure as zonas CEP no painel administrativo primeiro.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Preços Personalizados por Zona CEP
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Configure preços específicos para este evento. Se não personalizar, será usado o preço global da zona.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.isArray(zonesList) && zonesList.map((zone: CepZonePrice) => (
          <div key={zone.id} className="flex items-start gap-4 p-4 border rounded-lg bg-card">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Label className="font-semibold text-base">{zone.name}</Label>
                {zone.hasCustomPrice && (
                  <Badge variant="secondary" className="text-xs">
                    Preço Personalizado
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  Prioridade {zone.priority}
                </Badge>
              </div>
              
              {zone.description && (
                <p className="text-sm text-muted-foreground">{zone.description}</p>
              )}
              
              <p className="text-sm font-mono text-muted-foreground">
                <span className="font-semibold">CEPs:</span> {formatCepRanges(zone.cepRanges)}
              </p>
              
              <p className="text-sm">
                <span className="font-semibold">Preço global:</span> R$ {parseFloat(zone.price || zone.currentPrice || '0').toFixed(2)}
              </p>
            </div>
            
            {eventId && (
              <div className="w-32 space-y-2">
                <Label htmlFor={`price-${zone.id}`} className="text-sm font-medium">
                  Preço Personalizado
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                    R$
                  </span>
                  <Input
                    id={`price-${zone.id}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={zonePrices[zone.id] || ''}
                    onChange={(e) => handlePriceChange(zone.id, e.target.value)}
                    placeholder={parseFloat(zone.price || zone.currentPrice || '0').toFixed(2)}
                    className="pl-8"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
        
        {savePricesMutation.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erro ao salvar preços: {(savePricesMutation.error as any)?.message || 'Erro desconhecido'}
            </AlertDescription>
          </Alert>
        )}
        
        {eventId && (
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {hasChanges ? '⚠️ Você tem alterações não salvas' : '✅ Todas as alterações salvas'}
            </p>
            
            <Button 
              onClick={handleSave} 
              disabled={savePricesMutation.isPending || !hasChanges}
              className="min-w-[140px]"
            >
              {savePricesMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Preços
                </>
              )}
            </Button>
          </div>
        )}
        
        {!eventId && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground text-center">
              📋 Preços globais das zonas CEP (somente visualização)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
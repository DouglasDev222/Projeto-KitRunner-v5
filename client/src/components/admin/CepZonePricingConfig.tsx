import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CepZone {
  id: number;
  name: string;
  description: string;
  cepRanges: string;
  price: string;
  priority: number;
  active: boolean;
}

interface CepZonePricingConfigProps {
  onPricesChange: (prices: Record<number, string>) => void;
  prices: Record<number, string>;
}

export function CepZonePricingConfig({ onPricesChange, prices }: CepZonePricingConfigProps) {
  const { data: zonesData, isLoading, error } = useQuery({
    queryKey: ['/api/admin/cep-zones'],
    queryFn: async () => {
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch('/api/admin/cep-zones', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching CEP zones: ${response.status}`);
      }
      
      return response.json();
    }
  });

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

  const handlePriceChange = (zoneId: number, newPrice: string) => {
    const updatedPrices = {
      ...prices,
      [zoneId]: newPrice
    };
    onPricesChange(updatedPrices);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Carregando zonas CEP...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar zonas CEP. Verifique se existem zonas ativas cadastradas.
        </AlertDescription>
      </Alert>
    );
  }

  // Handle different response formats
  let zones: CepZone[] = [];
  if (zonesData?.success && zonesData?.zones) {
    zones = zonesData.zones;
  } else if (Array.isArray(zonesData)) {
    zones = zonesData;
  }

  if (!zones || zones.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Nenhuma zona CEP ativa encontrada. Configure as zonas CEP no painel administrativo primeiro.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {zones.map((zone) => (
        <div key={zone.id} className="flex items-start gap-4 p-4 border rounded-lg bg-background">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Label className="font-semibold text-base">{zone.name}</Label>
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
              <span className="font-semibold">Preço global:</span> R$ {parseFloat(zone.price).toFixed(2)}
            </p>
          </div>
          
          <div className="w-40 space-y-2">
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
                value={prices[zone.id] || ''}
                onChange={(e) => handlePriceChange(zone.id, e.target.value)}
                placeholder={parseFloat(zone.price).toFixed(2)}
                className="pl-8"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Deixe vazio para usar o preço global
            </p>
          </div>
        </div>
      ))}
      
      <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded">
        💡 <strong>Dica:</strong> Os preços personalizados só serão aplicados se você inserir um valor. 
        Campos vazios usarão o preço global da zona.
      </div>
    </div>
  );
}
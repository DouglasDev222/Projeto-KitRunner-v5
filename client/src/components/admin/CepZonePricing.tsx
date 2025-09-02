import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { MapPin, DollarSign, Info, Power, PowerOff } from "lucide-react";
import { formatCurrency } from "@/lib/brazilian-formatter";
import { apiRequest } from "@/lib/queryClient";

interface CepZone {
  id: number;
  name: string;
  description?: string;
  globalPrice: number;
  customPrice?: number | null;
  active: boolean; // Global activation status
  activeInEvent?: boolean; // Event-specific activation status
}

interface ZoneConfig {
  price?: string;
  active: boolean;
}

interface CepZonePricingProps {
  eventId?: number; // For editing existing events
  onConfigChange: (configs: Record<number, ZoneConfig>) => void;
  isVisible: boolean;
  className?: string;
}

export function CepZonePricing({ 
  eventId, 
  onConfigChange, 
  isVisible, 
  className = "" 
}: CepZonePricingProps) {
  const [zoneConfigs, setZoneConfigs] = useState<Record<number, ZoneConfig>>({});

  // Fetch CEP zones with current prices for this event
  const { data: zonesData, isLoading } = useQuery({
    queryKey: eventId 
      ? ["/api/admin/events", eventId, "cep-zone-prices"]
      : ["/api/admin/cep-zones"],
    queryFn: async () => {
      if (eventId) {
        // Editing mode: get zones with custom prices
        const response = await apiRequest("GET", `/api/admin/events/${eventId}/cep-zone-prices`);
        return response.json();
      } else {
        // Creation mode: get all zones with global prices
        const response = await apiRequest("GET", "/api/admin/cep-zones");
        return response.json();
      }
    },
    enabled: isVisible,
  });

  // Handle different data structures from different APIs
  const zones: CepZone[] = eventId 
    ? (zonesData?.zones || []) 
    : (zonesData?.zones || []).map((zone: any) => ({
        id: zone.id,
        name: zone.name,
        description: zone.description,
        globalPrice: Number(zone.price || 0), // Map 'price' to 'globalPrice'
        customPrice: null,
        active: zone.active
      }));

  // Initialize zone configurations when data loads
  useEffect(() => {
    if (zones.length > 0) {
      const initialConfigs: Record<number, ZoneConfig> = {};
      zones.forEach(zone => {
        initialConfigs[zone.id] = {
          price: zone.customPrice !== null && zone.customPrice !== undefined 
            ? zone.customPrice.toString() 
            : undefined,
          active: zone.activeInEvent !== undefined ? zone.activeInEvent : true
        };
      });
      setZoneConfigs(initialConfigs);
      onConfigChange(initialConfigs);
    }
  }, [zones, onConfigChange]);

  const handlePriceChange = (zoneId: number, value: string) => {
    const newConfigs = { ...zoneConfigs };
    
    if (!newConfigs[zoneId]) {
      newConfigs[zoneId] = { active: true };
    }
    
    if (value.trim() === "") {
      delete newConfigs[zoneId].price;
    } else {
      newConfigs[zoneId].price = value;
    }
    
    setZoneConfigs(newConfigs);
    onConfigChange(newConfigs);
  };

  const handleActiveChange = (zoneId: number, active: boolean) => {
    const newConfigs = { ...zoneConfigs };
    
    if (!newConfigs[zoneId]) {
      newConfigs[zoneId] = { active };
    } else {
      newConfigs[zoneId].active = active;
    }
    
    setZoneConfigs(newConfigs);
    onConfigChange(newConfigs);
  };

  const handleActivateAll = () => {
    const newConfigs = { ...zoneConfigs };
    zones.forEach(zone => {
      if (!newConfigs[zone.id]) {
        newConfigs[zone.id] = { active: true };
      } else {
        newConfigs[zone.id].active = true;
      }
    });
    setZoneConfigs(newConfigs);
    onConfigChange(newConfigs);
  };

  const handleDeactivateAll = () => {
    const newConfigs = { ...zoneConfigs };
    zones.forEach(zone => {
      if (!newConfigs[zone.id]) {
        newConfigs[zone.id] = { active: false };
      } else {
        newConfigs[zone.id].active = false;
      }
    });
    setZoneConfigs(newConfigs);
    onConfigChange(newConfigs);
  };

  if (!isVisible) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className={`animate-pulse ${className}`}>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (zones.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Zonas de CEP
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-gray-500">
            <Info className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma zona de CEP configurada</p>
            <p className="text-sm">Configure as zonas de CEP primeiro para usar este tipo de precificação.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Precificação por Zonas de CEP
        </CardTitle>
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Configure preços personalizados e ative/desative zonas específicas para este evento.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleActivateAll}
              className="flex items-center gap-1"
            >
              <Power className="h-3 w-3" />
              Ativar Todas
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDeactivateAll}
              className="flex items-center gap-1"
            >
              <PowerOff className="h-3 w-3" />
              Desativar Todas
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {zones.map((zone, index) => (
          <div key={zone.id}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              {/* Zone Info */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{zone.name}</h4>
                  {zone.active ? (
                    <Badge variant="secondary" className="text-xs">Ativa Globalmente</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Inativa Globalmente</Badge>
                  )}
                </div>
                {zone.description && (
                  <p className="text-sm text-gray-500">{zone.description}</p>
                )}
              </div>

              {/* Event Activation Control */}
              <div className="space-y-1">
                <Label className="text-xs">Ativa no Evento</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`active-${zone.id}`}
                    checked={(zoneConfigs[zone.id]?.active !== false)}
                    onCheckedChange={(checked) => 
                      handleActiveChange(zone.id, checked as boolean)
                    }
                    disabled={!zone.active} // Can't activate if globally inactive
                  />
                  <Label 
                    htmlFor={`active-${zone.id}`} 
                    className={`text-sm ${!zone.active ? 'text-gray-400' : ''}`}
                  >
                    {(zoneConfigs[zone.id]?.active !== false) ? 'Ativada' : 'Desativada'}
                  </Label>
                </div>
              </div>

              {/* Global Price (Read-only) */}
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Preço Global</Label>
                <div className="flex items-center gap-2 p-2 bg-gray-100 rounded border">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">{formatCurrency(zone.globalPrice || 0)}</span>
                </div>
              </div>

              {/* Custom Price Input */}
              <div className="space-y-1">
                <Label htmlFor={`custom-price-${zone.id}`} className="text-xs">
                  Preço Personalizado
                </Label>
                <Input
                  id={`custom-price-${zone.id}`}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={`Ex: ${(zone.globalPrice || 0).toFixed(2)}`}
                  value={zoneConfigs[zone.id]?.price || ""}
                  onChange={(e) => handlePriceChange(zone.id, e.target.value)}
                  className="text-right"
                  disabled={zoneConfigs[zone.id]?.active === false}
                />
              </div>
            </div>
            
            {index < zones.length - 1 && <Separator className="my-2" />}
          </div>
        ))}

        {Object.entries(zoneConfigs).some(([_, config]) => config.price || config.active === false) && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">Resumo das Configurações</h4>
            <div className="space-y-1">
              {Object.entries(zoneConfigs)
                .filter(([_, config]) => config.price || config.active === false)
                .map(([zoneId, config]) => {
                  const zone = zones.find(z => z.id === parseInt(zoneId));
                  return zone ? (
                    <div key={zoneId} className="flex justify-between text-sm">
                      <span className="text-blue-700">{zone.name}</span>
                      <div className="flex gap-2 items-center">
                        {config.price && (
                          <span className="font-medium text-blue-900">
                            {formatCurrency(parseFloat(config.price) || 0)}
                          </span>
                        )}
                        {config.active === false && (
                          <Badge variant="outline" className="text-xs text-red-600">
                            Desativada
                          </Badge>
                        )}
                      </div>
                    </div>
                  ) : null;
                })
              }
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
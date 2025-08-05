import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, DollarSign, Info } from "lucide-react";
import { formatCurrency } from "@/lib/brazilian-formatter";
import { apiRequest } from "@/lib/queryClient";

interface CepZone {
  id: number;
  name: string;
  description?: string;
  globalPrice: number;
  customPrice?: number | null;
  active: boolean;
}

interface CepZonePricingProps {
  eventId?: number; // For editing existing events
  onPricesChange: (prices: Record<number, string>) => void;
  isVisible: boolean;
  className?: string;
}

export function CepZonePricing({ 
  eventId, 
  onPricesChange, 
  isVisible, 
  className = "" 
}: CepZonePricingProps) {
  const [customPrices, setCustomPrices] = useState<Record<number, string>>({});

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

  // Initialize custom prices when data loads
  useEffect(() => {
    if (zones.length > 0 && eventId) {
      const initialPrices: Record<number, string> = {};
      zones.forEach(zone => {
        if (zone.customPrice !== null && zone.customPrice !== undefined) {
          initialPrices[zone.id] = zone.customPrice.toString();
        }
      });
      setCustomPrices(initialPrices);
      onPricesChange(initialPrices);
    }
  }, [zones, eventId, onPricesChange]);

  const handlePriceChange = (zoneId: number, value: string) => {
    const newPrices = { ...customPrices };
    
    if (value.trim() === "") {
      delete newPrices[zoneId];
    } else {
      newPrices[zoneId] = value;
    }
    
    setCustomPrices(newPrices);
    onPricesChange(newPrices);
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
        <p className="text-sm text-gray-600">
          Defina preços personalizados para cada zona. Deixe em branco para usar o preço global da zona.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {zones.map((zone, index) => (
          <div key={zone.id}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              {/* Zone Info */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{zone.name}</h4>
                  {zone.active ? (
                    <Badge variant="secondary" className="text-xs">Ativa</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Inativa</Badge>
                  )}
                </div>
                {zone.description && (
                  <p className="text-sm text-gray-500">{zone.description}</p>
                )}
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
                  value={customPrices[zone.id] || ""}
                  onChange={(e) => handlePriceChange(zone.id, e.target.value)}
                  className="text-right"
                />
              </div>
            </div>
            
            {index < zones.length - 1 && <Separator className="my-2" />}
          </div>
        ))}

        {Object.keys(customPrices).length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">Resumo dos Preços Personalizados</h4>
            <div className="space-y-1">
              {Object.entries(customPrices).map(([zoneId, price]) => {
                const zone = zones.find(z => z.id === parseInt(zoneId));
                return zone ? (
                  <div key={zoneId} className="flex justify-between text-sm">
                    <span className="text-blue-700">{zone.name}</span>
                    <span className="font-medium text-blue-900">
                      {formatCurrency(parseFloat(price) || 0)}
                    </span>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
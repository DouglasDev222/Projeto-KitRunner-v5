import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, MapPin, Filter, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ReportType } from "./ReportSelector";

interface EventForReport {
  id: number;
  name: string;
  date: string;
  city: string;
}

interface CepZone {
  id: number;
  name: string;
  active: boolean;
  priority: number;
}

export interface ReportFilters {
  eventId?: number;
  selectedZoneIds?: number[];
  status?: string[];
  dateRange?: { start: string; end: string };
  format?: 'excel' | 'pdf' | 'csv';
  // FASE 3: New filters for analytical reports
  period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  sortBy?: 'orders' | 'revenue' | 'recent';
  city?: string;
  state?: string;
}

interface FilterPanelProps {
  reportType: ReportType;
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  className?: string;
}

const statusOptions = [
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'aguardando_pagamento', label: 'Aguardando Pagamento' },
  { value: 'em_transito', label: 'Em Trânsito' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'cancelado', label: 'Cancelado' }
];

const formatOptions = {
  kits: ['excel'],
  circuit: ['excel'],
  orders: ['excel', 'pdf', 'csv'],
  billing: ['excel', 'pdf', 'csv'],
  customers: ['excel', 'pdf', 'csv'],
  sales: ['excel', 'pdf', 'csv']
};

export default function FilterPanel({ reportType, filters, onFiltersChange, className }: FilterPanelProps) {
  const [allZonesSelected, setAllZonesSelected] = useState(true);

  // Get events for reports
  const { data: events = [], isLoading: eventsLoading } = useQuery<EventForReport[]>({
    queryKey: ['/api/admin/reports/events'],
  });

  // Get CEP zones for circuit and orders reports
  const { data: cepZonesResponse, isLoading: zonesLoading } = useQuery<{success: boolean, zones: CepZone[]}>({
    queryKey: ['/api/admin/cep-zones'],
    enabled: reportType === 'circuit' || reportType === 'orders'
  });
  
  const cepZones = cepZonesResponse?.zones || [];

  const selectedEvent = events.find(event => event.id === filters.eventId);
  const availableFormats = formatOptions[reportType] || [];

  useEffect(() => {
    // Reset zone selection when switching report types
    if (reportType !== 'circuit' && reportType !== 'orders') {
      onFiltersChange({ ...filters, selectedZoneIds: undefined });
    }
  }, [reportType]);

  const handleEventChange = (eventId: string) => {
    onFiltersChange({
      ...filters,
      eventId: eventId ? parseInt(eventId) : undefined
    });
  };

  const handleZoneSelection = (zoneId: number, checked: boolean) => {
    let newZoneIds = filters.selectedZoneIds || [];
    
    if (checked) {
      newZoneIds = [...newZoneIds, zoneId];
    } else {
      newZoneIds = newZoneIds.filter(id => id !== zoneId);
    }

    setAllZonesSelected(newZoneIds.length === 0);
    
    onFiltersChange({
      ...filters,
      selectedZoneIds: newZoneIds.length === 0 ? undefined : newZoneIds
    });
  };

  const handleAllZonesToggle = (checked: boolean) => {
    setAllZonesSelected(checked);
    onFiltersChange({
      ...filters,
      selectedZoneIds: checked ? undefined : []
    });
  };

  const handleStatusChange = (status: string[]) => {
    onFiltersChange({
      ...filters,
      status: status.length === 0 ? undefined : status
    });
  };

  const handleFormatChange = (format: string) => {
    onFiltersChange({
      ...filters,
      format: format as 'excel' | 'pdf' | 'csv'
    });
  };

  const resetFilters = () => {
    setAllZonesSelected(true);
    onFiltersChange({
      format: availableFormats[0] as 'excel' | 'pdf' | 'csv'
    });
  };

  const getFilterDescription = () => {
    const descriptions = [];
    
    if (selectedEvent) {
      descriptions.push(`Evento: ${selectedEvent.name}`);
    }
    
    if (filters.selectedZoneIds && filters.selectedZoneIds.length > 0) {
      const zoneNames = filters.selectedZoneIds
        .map(id => cepZones.find(zone => zone.id === id)?.name)
        .filter(Boolean)
        .join(', ');
      descriptions.push(`Zonas: ${zoneNames}`);
    } else if (allZonesSelected && (reportType === 'circuit' || reportType === 'orders')) {
      descriptions.push('Zonas: Todas');
    }

    if (filters.status && filters.status.length > 0) {
      descriptions.push(`Status: ${filters.status.join(', ')}`);
    }

    if (filters.format) {
      descriptions.push(`Formato: ${filters.format.toUpperCase()}`);
    }

    return descriptions;
  };

  const showZoneFilters = reportType === 'circuit' || reportType === 'orders';
  const showStatusFilters = reportType === 'orders' || reportType === 'kits';
  const showFormatSelector = availableFormats.length > 1;
  const showDateRange = ['billing', 'sales'].includes(reportType);
  const showPeriodSelector = reportType === 'billing';
  const showSortBySelector = reportType === 'customers';
  const showLocationFilters = reportType === 'customers';

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <CardTitle className="text-lg">Filtros do Relatório</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={resetFilters} data-testid="button-reset-filters">
            <RefreshCw className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Event Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Evento</label>
          <Select value={filters.eventId?.toString() || ''} onValueChange={handleEventChange}>
            <SelectTrigger data-testid="select-event">
              <SelectValue placeholder="Selecione um evento..." />
            </SelectTrigger>
            <SelectContent>
              {eventsLoading ? (
                <SelectItem value="loading" disabled>Carregando eventos...</SelectItem>
              ) : events.length === 0 ? (
                <SelectItem value="empty" disabled>Nenhum evento disponível</SelectItem>
              ) : (
                events.map((event) => (
                  <SelectItem key={event.id} value={event.id.toString()}>
                    <div className="flex flex-col">
                      <span className="font-medium">{event.name}</span>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {format(new Date(event.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </span>
                        <MapPin className="h-3 w-3" />
                        <span>{event.city}</span>
                      </div>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Zone Selection for Circuit/Orders */}
        {showZoneFilters && (
          <div className="space-y-3">
            <label className="text-sm font-medium">Zonas CEP</label>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="all-zones"
                checked={allZonesSelected}
                onCheckedChange={handleAllZonesToggle}
                data-testid="checkbox-all-zones"
              />
              <label htmlFor="all-zones" className="text-sm font-medium">
                Todas as Zonas
              </label>
              {allZonesSelected && (
                <Badge variant="secondary" className="ml-2">
                  Padrão
                </Badge>
              )}
            </div>

            {!allZonesSelected && (
              <div className="space-y-2 pl-6 border-l-2 border-muted">
                {zonesLoading ? (
                  <div className="text-sm text-muted-foreground">Carregando zonas...</div>
                ) : Array.isArray(cepZones) && cepZones.length > 0 ? (
                  cepZones.filter(zone => zone.active).map((zone) => (
                    <div key={zone.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`zone-${zone.id}`}
                        checked={filters.selectedZoneIds?.includes(zone.id) || false}
                        onCheckedChange={(checked) => handleZoneSelection(zone.id, checked as boolean)}
                        data-testid={`checkbox-zone-${zone.id}`}
                      />
                      <label htmlFor={`zone-${zone.id}`} className="text-sm">
                        {zone.name}
                      </label>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">Nenhuma zona ativa encontrada</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Status Selection */}
        {showStatusFilters && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Status dos Pedidos</label>
            <div className="grid grid-cols-2 gap-2">
              {statusOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${option.value}`}
                    checked={filters.status?.includes(option.value) || false}
                    onCheckedChange={(checked) => {
                      const currentStatus = filters.status || [];
                      const newStatus = checked
                        ? [...currentStatus, option.value]
                        : currentStatus.filter(s => s !== option.value);
                      handleStatusChange(newStatus);
                    }}
                    data-testid={`checkbox-status-${option.value}`}
                  />
                  <label htmlFor={`status-${option.value}`} className="text-sm">
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Date Range Selection for Analytical Reports */}
        {showDateRange && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Período de Análise</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Data Inicial</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded-md"
                  value={filters.dateRange?.start || ''}
                  onChange={(e) => onFiltersChange({
                    ...filters,
                    dateRange: {
                      start: e.target.value,
                      end: filters.dateRange?.end || ''
                    }
                  })}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Data Final</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded-md"
                  value={filters.dateRange?.end || ''}
                  onChange={(e) => onFiltersChange({
                    ...filters,
                    dateRange: {
                      start: filters.dateRange?.start || '',
                      end: e.target.value
                    }
                  })}
                />
              </div>
            </div>
          </div>
        )}

        {/* Period Selection for Billing Reports */}
        {showPeriodSelector && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Agrupamento</label>
            <Select 
              value={filters.period || 'monthly'} 
              onValueChange={(value) => onFiltersChange({ ...filters, period: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diário</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="yearly">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Sort By Selection for Customer Reports */}
        {showSortBySelector && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Ordenar Por</label>
            <Select 
              value={filters.sortBy || 'revenue'} 
              onValueChange={(value) => onFiltersChange({ ...filters, sortBy: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Maior Gasto</SelectItem>
                <SelectItem value="orders">Mais Pedidos</SelectItem>
                <SelectItem value="recent">Mais Recente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Location Filters for Customer Reports */}
        {showLocationFilters && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Cidade</label>
              <input
                type="text"
                placeholder="Filtrar por cidade..."
                className="w-full px-3 py-2 border rounded-md"
                value={filters.city || ''}
                onChange={(e) => onFiltersChange({ ...filters, city: e.target.value || undefined })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <input
                type="text"
                placeholder="Ex: PB"
                className="w-full px-3 py-2 border rounded-md"
                value={filters.state || ''}
                maxLength={2}
                onChange={(e) => onFiltersChange({ ...filters, state: e.target.value.toUpperCase() || undefined })}
              />
            </div>
          </div>
        )}

        {/* Format Selection */}
        {showFormatSelector && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Formato</label>
            <Select 
              value={filters.format || availableFormats[0]} 
              onValueChange={handleFormatChange}
            >
              <SelectTrigger data-testid="select-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableFormats.map((format) => (
                  <SelectItem key={format} value={format}>
                    {format.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Filter Summary */}
        {getFilterDescription().length > 0 && (
          <div className="pt-4 border-t">
            <div className="text-sm font-medium mb-2">Resumo dos Filtros:</div>
            <div className="space-y-1">
              {getFilterDescription().map((desc, index) => (
                <div key={index} className="text-xs text-muted-foreground">
                  • {desc}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
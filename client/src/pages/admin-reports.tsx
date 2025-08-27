import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { useToast } from "@/hooks/use-toast";
import { FileSpreadsheet } from "lucide-react";
import ReportSelector, { ReportType } from "@/components/admin/ReportSelector";
import FilterPanel, { ReportFilters } from "@/components/admin/FilterPanel";
import ReportPreview from "@/components/admin/ReportPreview";
import { apiRequest } from "@/lib/queryClient";

export default function AdminReports() {
  const [selectedReportType, setSelectedReportType] = useState<ReportType | null>(null);
  const [filters, setFilters] = useState<ReportFilters>({ format: 'excel' });
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleReportGeneration = async () => {
    if (!selectedReportType) {
      toast({
        title: "Erro",
        description: "Selecione um tipo de relatório",
        variant: "destructive"
      });
      return;
    }

    // Validate based on report type
    const requiresEvent = ['kits', 'circuit', 'orders'].includes(selectedReportType);
    const requiresDateRange = ['billing', 'sales'].includes(selectedReportType);
    
    if (requiresEvent && !filters.eventId) {
      toast({
        title: "Erro",
        description: "Selecione um evento para este tipo de relatório",
        variant: "destructive"
      });
      return;
    }
    
    if (requiresDateRange && (!filters.dateRange?.start || !filters.dateRange?.end)) {
      toast({
        title: "Erro",
        description: "Selecione o período de análise (data inicial e final)",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      let endpoint = '';
      
      // Route to appropriate endpoint based on report type
      switch (selectedReportType) {
        case 'kits':
          endpoint = `/api/admin/reports/kits/${filters.eventId}`;
          break;
        case 'circuit':
          endpoint = `/api/admin/reports/circuit/${filters.eventId}`;
          if (filters.selectedZoneIds && filters.selectedZoneIds.length > 0) {
            const zoneIds = filters.selectedZoneIds.join(',');
            endpoint += `?zones=${zoneIds}`;
          }
          break;
        case 'orders':
          endpoint = `/api/admin/reports/orders`;
          const params = new URLSearchParams();
          if (filters.eventId) params.append('eventId', filters.eventId.toString());
          if (filters.selectedZoneIds?.length) params.append('zones', filters.selectedZoneIds.join(','));
          if (filters.status?.length) params.append('status', filters.status.join(','));
          if (filters.format) params.append('format', filters.format);
          endpoint += `?${params.toString()}`;
          break;
        case 'billing':
          endpoint = `/api/admin/reports/billing`;
          const billingParams = new URLSearchParams();
          if (filters.period) billingParams.append('period', filters.period);
          if (filters.dateRange?.start) billingParams.append('startDate', filters.dateRange.start);
          if (filters.dateRange?.end) billingParams.append('endDate', filters.dateRange.end);
          if (filters.eventId) billingParams.append('eventId', filters.eventId.toString());
          if (filters.format) billingParams.append('format', filters.format);
          endpoint += `?${billingParams.toString()}`;
          break;
        case 'sales':
          endpoint = `/api/admin/reports/sales`;
          const salesParams = new URLSearchParams();
          if (filters.dateRange?.start) salesParams.append('startDate', filters.dateRange.start);
          if (filters.dateRange?.end) salesParams.append('endDate', filters.dateRange.end);
          if (filters.format) salesParams.append('format', filters.format);
          endpoint += `?${salesParams.toString()}`;
          break;
        case 'customers':
          endpoint = `/api/admin/reports/customers`;
          const customersParams = new URLSearchParams();
          if (filters.sortBy) customersParams.append('sortBy', filters.sortBy);
          if (filters.city) customersParams.append('city', filters.city);
          if (filters.state) customersParams.append('state', filters.state);
          if (filters.format) customersParams.append('format', filters.format);
          endpoint += `?${customersParams.toString()}`;
          break;
        default:
          throw new Error(`Relatório ${selectedReportType} ainda não implementado`);
      }

      // Make authenticated API request
      const response = await apiRequest('GET', endpoint);
      
      // apiRequest already handles error checking

      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      // Extract filename from response headers or generate one
      let filename = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '');
      if (!filename) {
        const extension = filters.format === 'pdf' ? 'pdf' : filters.format === 'csv' ? 'csv' : 'xlsx';
        filename = `relatorio-${selectedReportType}-${Date.now()}.${extension}`;
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Sucesso",
        description: "Relatório gerado com sucesso!",
        variant: "default"
      });

    } catch (error: any) {
      console.error('Erro ao gerar relatório:', error);
      toast({
        title: "Erro",
        description: error.message || 'Erro ao gerar relatório. Tente novamente.',
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFiltersChange = (newFilters: ReportFilters) => {
    setFilters(newFilters);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios Avançados</h1>
          <p className="text-muted-foreground">
            Sistema completo de relatórios para gestão de eventos e análise de dados
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Report Selection */}
          <div className="lg:col-span-1 space-y-6">
            <ReportSelector
              selectedType={selectedReportType}
              onTypeChange={setSelectedReportType}
              data-testid="report-selector"
            />
          </div>

          {/* Right Column - Filters and Preview */}
          <div className="lg:col-span-2 space-y-6">
            {selectedReportType && (
              <>
                <FilterPanel
                  reportType={selectedReportType}
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  data-testid="filter-panel"
                />
                
                <ReportPreview
                  reportType={selectedReportType}
                  filters={filters}
                  onGenerate={handleReportGeneration}
                  isGenerating={isGenerating}
                  data-testid="report-preview"
                />
              </>
            )}

            {!selectedReportType && (
              <div className="flex items-center justify-center h-64 bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/25">
                <div className="text-center space-y-3">
                  <div className="h-12 w-12 bg-muted rounded-lg mx-auto flex items-center justify-center">
                    <FileSpreadsheet className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium">Selecione um Relatório</h3>
                    <p className="text-sm text-muted-foreground">
                      Escolha o tipo de relatório que deseja gerar
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
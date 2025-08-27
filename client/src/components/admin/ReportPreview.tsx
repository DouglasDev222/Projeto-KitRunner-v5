import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Download, BarChart3, FileText, Users } from "lucide-react";
import { ReportType } from "./ReportSelector";
import { ReportFilters } from "./FilterPanel";

interface PreviewData {
  totalRecords: number;
  sampleData: Record<string, any>[];
  summary?: {
    totalRevenue?: number;
    totalOrders?: number;
    totalCustomers?: number;
    zones?: { name: string; count: number }[];
  };
}

interface ReportPreviewProps {
  reportType: ReportType;
  filters: ReportFilters;
  onGenerate: () => void;
  isGenerating: boolean;
  className?: string;
}

const getPreviewColumns = (reportType: ReportType) => {
  switch (reportType) {
    case 'kits':
      return ['Nº Pedido', 'Nome Atleta', 'CPF', 'Camisa', 'Cliente'];
    case 'circuit':
      return ['Address Line 1', 'City', 'State', 'Postal Code', 'Extra Info'];
    case 'orders':
      return ['Nº Pedido', 'Cliente', 'Status', 'Valor Total', 'Zona CEP'];
    case 'billing':
      return ['Período', 'Receita Total', 'Pedidos', 'Ticket Médio', 'Taxa Conversão'];
    case 'customers':
      return ['Nome', 'Email', 'Cidade', 'Estado', 'Total Pedidos', 'Valor Gasto'];
    case 'sales':
      return ['Evento', 'Receita Total', 'Pedidos', 'Ticket Médio'];
    default:
      return [];
  }
};

const getMockPreviewData = (reportType: ReportType, filters: ReportFilters): PreviewData => {
  // This is mock data for preview - in real implementation, this would call API
  const baseData: PreviewData = {
    totalRecords: Math.floor(Math.random() * 200) + 50,
    sampleData: [],
    summary: {}
  };

  switch (reportType) {
    case 'kits':
      baseData.sampleData = [
        { 'Nº Pedido': 'KR25-1001', 'Nome Atleta': 'João Silva', 'CPF': '***.***.***-**', 'Camisa': 'M', 'Cliente': 'João Silva' },
        { 'Nº Pedido': 'KR25-1002', 'Nome Atleta': 'Maria Santos', 'CPF': '***.***.***-**', 'Camisa': 'P', 'Cliente': 'Pedro Santos' },
        { 'Nº Pedido': 'KR25-1003', 'Nome Atleta': 'Carlos Lima', 'CPF': '***.***.***-**', 'Camisa': 'G', 'Cliente': 'Carlos Lima' }
      ];
      break;
    case 'circuit':
      baseData.sampleData = [
        { 'Address Line 1': 'Rua das Flores, 123', 'City': 'João Pessoa', 'State': 'PB', 'Postal Code': '58000-000', 'Extra Info': 'Pedido - 1001' },
        { 'Address Line 1': 'Av. Brasil, 456', 'City': 'João Pessoa', 'State': 'PB', 'Postal Code': '58010-000', 'Extra Info': 'Pedido - 1002' },
        { 'Address Line 1': 'Rua do Sol, 789', 'City': 'Campina Grande', 'State': 'PB', 'Postal Code': '58400-000', 'Extra Info': 'Pedido - 1003' }
      ];
      break;
    case 'orders':
      baseData.sampleData = [
        { 'Nº Pedido': 'KR25-1001', 'Cliente': 'João Silva', 'Status': 'Confirmado', 'Valor Total': 'R$ 35,00', 'Zona CEP': 'Centro' },
        { 'Nº Pedido': 'KR25-1002', 'Cliente': 'Maria Santos', 'Status': 'Em Trânsito', 'Valor Total': 'R$ 42,00', 'Zona CEP': 'Zona Sul' },
        { 'Nº Pedido': 'KR25-1003', 'Cliente': 'Carlos Lima', 'Status': 'Entregue', 'Valor Total': 'R$ 28,00', 'Zona CEP': 'Zona Norte' }
      ];
      baseData.summary = {
        totalRevenue: 1250.50,
        totalOrders: baseData.totalRecords,
        zones: [
          { name: 'Centro', count: 35 },
          { name: 'Zona Sul', count: 28 },
          { name: 'Zona Norte', count: 22 }
        ]
      };
      break;
  }

  return baseData;
};

export default function ReportPreview({ reportType, filters, onGenerate, isGenerating, className }: ReportPreviewProps) {
  const [showPreview, setShowPreview] = useState(false);

  // In real implementation, this would be conditional based on showPreview
  const { data: previewData, isLoading: previewLoading } = useQuery({
    queryKey: ['report-preview', reportType, filters],
    queryFn: () => getMockPreviewData(reportType, filters),
    enabled: showPreview && !!filters.eventId, // Only fetch when preview is requested and event is selected
  });

  const columns = getPreviewColumns(reportType);
  const canGenerate = filters.eventId && !isGenerating;
  const canPreview = (
    (filters.eventId && ['kits', 'circuit', 'orders'].includes(reportType)) ||
    (['billing', 'sales'].includes(reportType) && filters.dateRange?.start && filters.dateRange?.end) ||
    (reportType === 'customers')
  );

  const renderSummary = () => {
    if (!previewData?.summary) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {previewData.summary.totalRevenue && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Receita Total</p>
                  <p className="text-lg font-bold">
                    R$ {previewData.summary.totalRevenue.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {previewData.summary.totalOrders && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total de Pedidos</p>
                  <p className="text-lg font-bold">{previewData.summary.totalOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {previewData.summary.zones && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Zonas Ativas</p>
                  <p className="text-lg font-bold">{previewData.summary.zones.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderPreviewTable = () => {
    if (previewLoading) {
      return (
        <div className="space-y-3">
          <div className="flex space-x-4">
            {columns.map((col, index) => (
              <Skeleton key={index} className="h-4 w-20" />
            ))}
          </div>
          {[1, 2, 3].map((row) => (
            <div key={row} className="flex space-x-4">
              {columns.map((col, index) => (
                <Skeleton key={index} className="h-4 w-24" />
              ))}
            </div>
          ))}
        </div>
      );
    }

    if (!previewData || previewData.sampleData.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Nenhum dado encontrado com os filtros aplicados</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {renderSummary()}
        
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewData.sampleData.map((row, index) => (
              <TableRow key={index}>
                {Object.values(row).map((value: any, cellIndex) => (
                  <TableCell key={cellIndex} className="font-mono text-sm">
                    {value}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        <div className="text-xs text-muted-foreground text-center">
          Mostrando {previewData.sampleData.length} de {previewData.totalRecords} registros (preview)
        </div>
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Preview e Geração</CardTitle>
          <div className="flex items-center space-x-2">
            {previewData && (
              <Badge variant="secondary">
                {previewData.totalRecords} registros
              </Badge>
            )}
            {filters.format && (
              <Badge variant="outline">
                {filters.format.toUpperCase()}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {canPreview && (
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              disabled={!filters.eventId}
              className="flex-1"
              data-testid="button-toggle-preview"
            >
              <Eye className="mr-2 h-4 w-4" />
              {showPreview ? 'Ocultar Preview' : 'Mostrar Preview'}
            </Button>
          )}
          
          <Button
            onClick={onGenerate}
            disabled={!canGenerate}
            className="flex-1"
            data-testid="button-generate-report"
          >
            <Download className="mr-2 h-4 w-4" />
            {isGenerating ? 'Gerando...' : 'Gerar Relatório'}
          </Button>
        </div>

        {!filters.eventId && (
          <div className="text-sm text-muted-foreground text-center py-4">
            Selecione um evento para visualizar o preview e gerar o relatório
          </div>
        )}

        {showPreview && filters.eventId && (
          <div className="border-t pt-4">
            {renderPreviewTable()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, MapPin, BarChart3, Users, Package, TrendingUp } from "lucide-react";

export type ReportType = 'kits' | 'circuit' | 'orders' | 'billing' | 'customers' | 'sales';

interface ReportOption {
  id: ReportType;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'available' | 'coming_soon';
  formats: string[];
}

interface ReportSelectorProps {
  selectedType: ReportType | null;
  onTypeChange: (type: ReportType) => void;
  className?: string;
}

const reportOptions: ReportOption[] = [
  {
    id: 'kits',
    name: 'Relatório de Kits por Evento',
    description: 'Planilha para organizar a retirada dos kits no dia do evento',
    icon: FileSpreadsheet,
    status: 'available',
    formats: ['Excel']
  },
  {
    id: 'circuit',
    name: 'Endereços para Circuit',
    description: 'Relatório otimizado para importação no sistema Circuit de rotas',
    icon: MapPin,
    status: 'available',
    formats: ['Excel']
  },
  {
    id: 'orders',
    name: 'Relatório Geral de Pedidos',
    description: 'Análise completa dos pedidos por evento com zonas CEP',
    icon: Package,
    status: 'available',
    formats: ['Excel', 'PDF', 'CSV']
  },
  {
    id: 'billing',
    name: 'Relatório de Faturamento',
    description: 'Análise financeira por período com breakdown de receitas',
    icon: BarChart3,
    status: 'available',
    formats: ['Excel', 'PDF', 'CSV']
  },
  {
    id: 'customers',
    name: 'Relatório de Clientes',
    description: 'Análise de clientes com segmentação por localização e gastos',
    icon: Users,
    status: 'available',
    formats: ['Excel', 'PDF', 'CSV']
  },
  {
    id: 'sales',
    name: 'Relatório de Vendas',
    description: 'Performance de vendas por evento com ranking de eventos',
    icon: TrendingUp,
    status: 'available',
    formats: ['Excel', 'PDF', 'CSV']
  }
];

export default function ReportSelector({ selectedType, onTypeChange, className }: ReportSelectorProps) {
  const availableReports = reportOptions.filter(report => report.status === 'available');
  const comingSoonReports = reportOptions.filter(report => report.status === 'coming_soon');
  
  const selectedReport = reportOptions.find(report => report.id === selectedType);

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <label className="text-sm font-medium mb-2 block">Tipo de Relatório</label>
        <Select 
          value={selectedType || ''} 
          onValueChange={(value) => onTypeChange(value as ReportType)}
        >
          <SelectTrigger data-testid="select-report-type">
            <SelectValue placeholder="Escolha o tipo de relatório..." />
          </SelectTrigger>
          <SelectContent>
            {availableReports.map((report) => {
              const Icon = report.icon;
              return (
                <SelectItem key={report.id} value={report.id}>
                  <div className="flex items-center space-x-2">
                    <Icon className="h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="font-medium">{report.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {report.formats.join(', ')}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Selected Report Details */}
      {selectedReport && (
        <Card className="border-primary/20" data-testid="selected-report-details">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <selectedReport.icon className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{selectedReport.name}</CardTitle>
              </div>
              <Badge variant="secondary">Disponível</Badge>
            </div>
            <CardDescription>
              {selectedReport.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>Formatos disponíveis:</span>
              {selectedReport.formats.map((format, index) => (
                <Badge key={format} variant="outline" className="text-xs">
                  {format}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coming Soon Reports */}
      {comingSoonReports.length > 0 && (
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">Em Breve</CardTitle>
            <CardDescription>
              Novos relatórios que serão adicionados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {comingSoonReports.map((report) => {
                const Icon = report.icon;
                return (
                  <div key={report.id} className="flex items-center space-x-2 text-sm">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{report.name}</span>
                    <Badge variant="outline" className="text-xs ml-auto">
                      Em breve
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
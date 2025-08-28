
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
    name: 'Relatório de Kits',
    description: 'Lista completa dos kits por evento com informações dos atletas',
    icon: Package,
    status: 'available',
    formats: ['Excel', 'PDF', 'CSV']
  },
  {
    id: 'circuit',
    name: 'Relatório de Circuito',
    description: 'Análise de endereços e distribuição geográfica por zona CEP',
    icon: MapPin,
    status: 'available',
    formats: ['Excel', 'PDF', 'CSV']
  },
  {
    id: 'orders',
    name: 'Relatório de Pedidos',
    description: 'Histórico completo de pedidos com filtros avançados',
    icon: FileSpreadsheet,
    status: 'available',
    formats: ['Excel', 'PDF', 'CSV']
  },
  {
    id: 'billing',
    name: 'Relatório de Faturamento',
    description: 'Análise de receita e performance financeira por período',
    icon: BarChart3,
    status: 'available',
    formats: ['Excel', 'PDF', 'CSV']
  },
  {
    id: 'customers',
    name: 'Relatório de Clientes',
    description: 'Base de clientes com ranking e segmentação avançada',
    icon: Users,
    status: 'available',
    formats: ['Excel', 'PDF', 'CSV']
  },
  {
    id: 'sales',
    name: 'Relatório de Vendas',
    description: 'Performance de vendas e métricas de conversão',
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
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Seleção de Relatório</CardTitle>
          <CardDescription>
            Escolha o tipo de relatório que deseja gerar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Tipo de Relatório
            </label>
            <Select 
              value={selectedType || ''} 
              onValueChange={(value) => onTypeChange(value as ReportType)}
            >
              <SelectTrigger 
                className="w-full h-12"
                data-testid="select-report-type"
              >
                <SelectValue placeholder="Escolha o tipo de relatório..." />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {availableReports.map((report) => {
                  const Icon = report.icon;
                  return (
                    <SelectItem 
                      key={report.id} 
                      value={report.id}
                      className="py-3 cursor-pointer"
                    >
                      <div className="flex items-center space-x-3 w-full">
                        <div className="flex-shrink-0">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {report.name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {report.formats.join(' • ')}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {selectedReport && (
            <div className="mt-4 p-4 bg-muted/30 rounded-lg border">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <selectedReport.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm mb-1">
                    {selectedReport.name}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {selectedReport.description}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedReport.formats.map((format) => (
                      <Badge key={format} variant="secondary" className="text-xs px-2 py-0.5">
                        {format}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {comingSoonReports.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Em Breve
              </h4>
              {comingSoonReports.map((report) => {
                const Icon = report.icon;
                return (
                  <div
                    key={report.id}
                    className="flex items-center space-x-3 p-3 rounded-lg border border-dashed border-muted-foreground/25 bg-muted/10"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <span className="text-sm text-muted-foreground">
                        {report.name}
                      </span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        Em Breve
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

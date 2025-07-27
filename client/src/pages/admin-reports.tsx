import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet, Download, Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EventForReport {
  id: number;
  name: string;
  date: string;
  city: string;
}

export default function AdminReports() {
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Get events for reports
  const { data: events = [], isLoading } = useQuery<EventForReport[]>({
    queryKey: ['/api/admin/reports/events'],
  });

  const handleGenerateKitsReport = async () => {
    if (!selectedEventId) return;

    setIsGenerating(true);
    try {
      const response = await fetch(`/api/admin/reports/kits/${selectedEventId}`);
      
      if (!response.ok) {
        throw new Error('Erro ao gerar relatório');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'relatorio-kits.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      alert('Erro ao gerar relatório. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedEvent = events.find(event => event.id.toString() === selectedEventId);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground">
            Gere relatórios detalhados para gestão dos eventos
          </p>
        </div>

        <div className="grid gap-6">
          {/* Kits Report Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                <CardTitle>Relatório de Kits por Evento</CardTitle>
              </div>
              <CardDescription>
                Gere uma planilha Excel com todos os kits que serão retirados em um evento específico.
                Este relatório é usado para organizar a retirada dos kits no dia do evento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Selecione o Evento</label>
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um evento..." />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoading ? (
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

              {selectedEvent && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Evento Selecionado:</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Nome:</strong> {selectedEvent.name}</p>
                    <p><strong>Data:</strong> {format(new Date(selectedEvent.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                    <p><strong>Cidade:</strong> {selectedEvent.city}</p>
                  </div>
                </div>
              )}

              <Button
                onClick={handleGenerateKitsReport}
                disabled={!selectedEventId || isGenerating}
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                {isGenerating ? 'Gerando Relatório...' : 'Gerar Relatório de Kits'}
              </Button>

              <div className="text-xs text-muted-foreground">
                <p><strong>O relatório contém:</strong></p>
                <ul className="list-disc list-inside space-y-1 mt-1">
                  <li>Número do pedido</li>
                  <li>Nome do atleta</li>
                  <li>CPF (formatado)</li>
                  <li>Tamanho da camiseta</li>
                  <li>Se o endereço é o mesmo do cliente responsável</li>
                  <li>Nome do produto/evento</li>
                  <li>Cliente responsável pelo pedido</li>
                  <li>Endereço de entrega</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Future reports can be added here */}
          <Card className="opacity-60">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <div className="h-5 w-5 bg-muted rounded" />
                <CardTitle className="text-muted-foreground">Mais Relatórios</CardTitle>
              </div>
              <CardDescription>
                Novos tipos de relatórios serão adicionados no futuro
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Em breve: relatórios de vendas, clientes, entregas e mais.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";

interface Coupon {
  id: number;
  code: string;
  discountType: 'fixed' | 'percentage';
  discountValue: string;
  description?: string;
  maxDiscount?: string;
  productIds?: number[];
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
  usageCount: number;
  active: boolean;
  createdAt: string;
}

interface Event {
  id: number;
  name: string;
}

interface CouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupon?: Coupon | null;
  isEditing: boolean;
}

export function CouponModal({ isOpen, onClose, coupon, isEditing }: CouponModalProps) {
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'fixed' as 'fixed' | 'percentage',
    discountValue: '',
    description: '',
    maxDiscount: '',
    validFrom: '',
    validUntil: '',
    usageLimit: '',
    active: true,
    selectedEvents: [] as number[]
  });

  const [error, setError] = useState<string | null>(null);

  // Get events for product selection
  const { data: events } = useQuery<Event[]>({
    queryKey: ['/api/events'],
    enabled: isOpen
  });

  useEffect(() => {
    if (coupon && isEditing) {
      setFormData({
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        description: coupon.description || '',
        maxDiscount: coupon.maxDiscount || '',
        validFrom: format(new Date(coupon.validFrom), 'yyyy-MM-dd'),
        validUntil: format(new Date(coupon.validUntil), 'yyyy-MM-dd'),
        usageLimit: coupon.usageLimit?.toString() || '',
        active: coupon.active,
        selectedEvents: coupon.productIds || []
      });
    } else {
      setFormData({
        code: '',
        discountType: 'fixed',
        discountValue: '',
        description: '',
        maxDiscount: '',
        validFrom: format(new Date(), 'yyyy-MM-dd'),
        validUntil: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        usageLimit: '',
        active: true,
        selectedEvents: []
      });
    }
    setError(null);
  }, [coupon, isEditing, isOpen]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = isEditing ? `/api/admin/coupons/${coupon?.id}` : '/api/admin/coupons';
      const method = isEditing ? 'PUT' : 'POST';
      
      const payload = {
        code: data.code.toUpperCase(),
        discountType: data.discountType,
        discountValue: data.discountValue,
        description: data.description || null,
        maxDiscount: data.maxDiscount || null,
        productIds: data.selectedEvents.length > 0 ? data.selectedEvents : null,
        validFrom: data.validFrom,
        validUntil: data.validUntil,
        usageLimit: data.usageLimit ? parseInt(data.usageLimit) : null,
        active: data.active
      };

      const response = await apiRequest(method, url, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/coupons'] });
      onClose();
    },
    onError: (error: any) => {
      setError(error.message || 'Erro ao salvar cupom');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validations
    if (!formData.code.trim()) {
      setError('Código do cupom é obrigatório');
      return;
    }

    if (!formData.discountValue.trim()) {
      setError('Valor do desconto é obrigatório');
      return;
    }

    const discountValue = parseFloat(formData.discountValue);
    if (isNaN(discountValue) || discountValue <= 0) {
      setError('Valor do desconto deve ser um número positivo');
      return;
    }

    if (formData.discountType === 'percentage' && discountValue > 100) {
      setError('Desconto percentual não pode ser maior que 100%');
      return;
    }

    if (formData.maxDiscount && formData.discountType === 'percentage') {
      const maxDiscount = parseFloat(formData.maxDiscount);
      if (isNaN(maxDiscount) || maxDiscount <= 0) {
        setError('Desconto máximo deve ser um número positivo');
        return;
      }
    }

    if (new Date(formData.validFrom) >= new Date(formData.validUntil)) {
      setError('Data de fim deve ser posterior à data de início');
      return;
    }

    saveMutation.mutate(formData);
  };

  const handleEventToggle = (eventId: number, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      selectedEvents: checked 
        ? [...prev.selectedEvents, eventId]
        : prev.selectedEvents.filter(id => id !== eventId)
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Cupom' : 'Novo Cupom'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="code">Código do Cupom</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
              placeholder="Ex: DESCONTO10"
              className="uppercase"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="discountType">Tipo de Desconto</Label>
            <Select 
              value={formData.discountType} 
              onValueChange={(value: 'fixed' | 'percentage') => 
                setFormData(prev => ({ ...prev, discountType: value, maxDiscount: '' }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                <SelectItem value="percentage">Percentual (%)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discountValue">
                {formData.discountType === 'fixed' ? 'Valor (R$)' : 'Percentual (%)'}
              </Label>
              <Input
                id="discountValue"
                type="number"
                step="0.01"
                min="0"
                max={formData.discountType === 'percentage' ? '100' : undefined}
                value={formData.discountValue}
                onChange={(e) => setFormData(prev => ({ ...prev, discountValue: e.target.value }))}
                placeholder={formData.discountType === 'fixed' ? '10.00' : '20'}
              />
            </div>

            {formData.discountType === 'percentage' && (
              <div className="space-y-2">
                <Label htmlFor="maxDiscount">Desconto Máximo (R$)</Label>
                <Input
                  id="maxDiscount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.maxDiscount}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxDiscount: e.target.value }))}
                  placeholder="50.00"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descrição do cupom (opcional)"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="validFrom">Data de Início</Label>
              <Input
                id="validFrom"
                type="date"
                value={formData.validFrom}
                onChange={(e) => setFormData(prev => ({ ...prev, validFrom: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="validUntil">Data de Fim</Label>
              <Input
                id="validUntil"
                type="date"
                value={formData.validUntil}
                onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="usageLimit">Limite de Uso</Label>
            <Input
              id="usageLimit"
              type="number"
              min="1"
              value={formData.usageLimit}
              onChange={(e) => setFormData(prev => ({ ...prev, usageLimit: e.target.value }))}
              placeholder="Deixe vazio para uso ilimitado"
            />
          </div>

          {events && events.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Eventos Específicos</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Deixe todos desmarcados para cupom válido em todos os eventos
                </p>
              </CardHeader>
              <CardContent className="space-y-2 max-h-32 overflow-y-auto">
                {events.map((event) => (
                  <div key={event.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`event-${event.id}`}
                      checked={formData.selectedEvents.includes(event.id)}
                      onCheckedChange={(checked) => handleEventToggle(event.id, checked as boolean)}
                    />
                    <Label htmlFor={`event-${event.id}`} className="text-sm">
                      {event.name}
                    </Label>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
            />
            <Label htmlFor="active">Cupom ativo</Label>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending} className="flex-1">
              {saveMutation.isPending ? 'Salvando...' : isEditing ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
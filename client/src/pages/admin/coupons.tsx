import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Gift, Percent, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/brazilian-formatter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CouponModal } from "@/components/admin/coupon-modal";

interface Coupon {
  id: number;
  code: string;
  discountType: 'fixed' | 'percentage';
  discountValue: string;
  description?: string;
  maxDiscount?: string;
  productIds?: number[];
  cepZoneIds?: number[];
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
  usageCount: number;
  perCustomerEnabled?: boolean;
  perCustomerLimit?: number;
  active: boolean;
  createdAt: string;
}

export default function AdminCoupons() {
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const { data: couponsData, isLoading } = useQuery({
    queryKey: ['/api/admin/coupons'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/coupons');
      return response.json();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (couponId: number) => {
      const response = await apiRequest('DELETE', `/api/admin/coupons/${couponId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/coupons'] });
    }
  });

  const handleCreate = () => {
    setSelectedCoupon(null);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleEdit = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (couponId: number) => {
    if (confirm('Tem certeza que deseja deletar este cupom?')) {
      deleteMutation.mutate(couponId);
    }
  };

  const getDiscountDisplay = (coupon: Coupon) => {
    if (coupon.discountType === 'fixed') {
      return formatCurrency(parseFloat(coupon.discountValue));
    } else {
      const maxDiscount = coupon.maxDiscount ? ` (máx. ${formatCurrency(parseFloat(coupon.maxDiscount))})` : '';
      return `${coupon.discountValue}%${maxDiscount}`;
    }
  };

  const getStatusBadge = (coupon: Coupon) => {
    if (!coupon.active) {
      return <Badge variant="secondary">Inativo</Badge>;
    }
    
    const now = new Date();
    const validUntil = new Date(coupon.validUntil);
    
    if (validUntil < now) {
      return <Badge variant="destructive">Expirado</Badge>;
    }
    
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return <Badge variant="outline">Esgotado</Badge>;
    }
    
    return <Badge variant="default">Ativo</Badge>;
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <p>Carregando cupons...</p>
        </div>
      </AdminLayout>
    );
  }

  const coupons = couponsData?.coupons || [];

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Cupons de Desconto</h1>
            <p className="text-muted-foreground">Gerencie cupons e promoções</p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Cupom
          </Button>
        </div>

        {coupons.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Gift className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhum cupom encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Crie seu primeiro cupom de desconto para começar.
              </p>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Cupom
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {coupons.map((coupon: Coupon) => (
              <Card key={coupon.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold">
                      {coupon.code}
                    </CardTitle>
                    {getStatusBadge(coupon)}
                  </div>
                  {coupon.description && (
                    <p className="text-sm text-muted-foreground">
                      {coupon.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      {coupon.discountType === 'fixed' ? 
                        <DollarSign className="h-4 w-4 text-green-600" /> : 
                        <Percent className="h-4 w-4 text-blue-600" />
                      }
                      <span className="font-semibold text-lg">
                        {getDiscountDisplay(coupon)}
                      </span>
                    </div>
                    
                    <div className="text-sm space-y-1">
                      <div>
                        <span className="text-muted-foreground">Válido até: </span>
                        <span className="font-medium">
                          {format(new Date(coupon.validUntil), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </div>
                      
                      {coupon.usageLimit && (
                        <div>
                          <span className="text-muted-foreground">Uso: </span>
                          <span className="font-medium">
                            {coupon.usageCount}/{coupon.usageLimit}
                          </span>
                        </div>
                      )}
                      
                      {coupon.perCustomerEnabled && coupon.perCustomerLimit && (
                        <div>
                          <span className="text-muted-foreground">Limite por cliente: </span>
                          <span className="font-medium">{coupon.perCustomerLimit}</span>
                        </div>
                      )}
                      
                      {coupon.productIds && coupon.productIds.length > 0 && (
                        <div>
                          <span className="text-muted-foreground">Eventos específicos</span>
                        </div>
                      )}
                      
                      {coupon.cepZoneIds && coupon.cepZoneIds.length > 0 && (
                        <div>
                          <span className="text-muted-foreground">Zonas de CEP específicas</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(coupon)}
                        className="flex-1"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(coupon.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <CouponModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          coupon={selectedCoupon}
          isEditing={isEditing}
        />
      </div>
    </AdminLayout>
  );
}
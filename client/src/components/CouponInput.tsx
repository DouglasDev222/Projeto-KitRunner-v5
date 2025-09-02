import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

interface CouponData {
  id: number;
  code: string;
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  description?: string;
}

interface CouponValidationResponse {
  valid: boolean;
  coupon?: CouponData;
  discount?: number;
  finalAmount?: number;
  message: string;
}

interface CouponInputProps {
  eventId: number;
  totalAmount: number;
  customerZipCode?: string; // CEP do cliente para validação (fallback)
  addressId?: number; // ID do endereço do cliente (preferido)
  onCouponApplied: (coupon: CouponData, discount: number, finalAmount: number) => void;
  onCouponRemoved: () => void;
  appliedCoupon?: CouponData | null;
}

export function CouponInput({ 
  eventId, 
  totalAmount, 
  customerZipCode,
  addressId,
  onCouponApplied, 
  onCouponRemoved,
  appliedCoupon 
}: CouponInputProps) {
  const [couponCode, setCouponCode] = useState("");
  const [shouldValidate, setShouldValidate] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const [validationStatus, setValidationStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Query para validação do cupom
  const { isLoading, data, error } = useQuery({
    queryKey: ['validate-coupon', couponCode, eventId, totalAmount, customerZipCode, addressId],
    queryFn: async (): Promise<CouponValidationResponse> => {
      console.log('🎫 Validating coupon with addressId:', addressId, 'CEP:', customerZipCode);
      
      // Obter customerId da sessão
      let customerId: number | undefined;
      const customerData = sessionStorage.getItem("customerData");
      console.log('🎫 SessionStorage customerData:', customerData);
      if (customerData) {
        const customer = JSON.parse(customerData);
        console.log('🎫 Parsed customer:', customer);
        customerId = customer.id;
        console.log('🎫 Extracted customerId:', customerId);
      } else {
        console.log('🎫 No customerData found in sessionStorage');
      }
      
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: couponCode,
          eventId,
          totalAmount,
          customerZipCode,
          addressId,
          customerId
        }),
      });
      return response.json();
    },
    enabled: shouldValidate && couponCode.length > 0 && !appliedCoupon && (addressId !== undefined || customerZipCode !== undefined),
    // 🎫 CACHE FIX: More aggressive cache settings for real-time validation
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't keep data in cache
    retry: false
  });

  // Handle response when data changes
  useEffect(() => {
    if (data && shouldValidate) {
      setShouldValidate(false);
      setValidationMessage(data.message);
      
      if (data.valid && data.coupon && data.discount !== undefined && data.finalAmount !== undefined) {
        setValidationStatus('success');
        onCouponApplied(data.coupon, data.discount, data.finalAmount);
        setCouponCode(""); // Limpar o campo após aplicar
        
        // 🎫 CACHE FIX: Invalidate coupon cache IMMEDIATELY after successful application
        queryClient.invalidateQueries({ 
          queryKey: ['validate-coupon'], 
          exact: false 
        });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/coupons'] });
        console.log('🎫 Cache invalidated IMMEDIATELY after coupon application');
      } else {
        setValidationStatus('error');
      }
    }
  }, [data, shouldValidate, onCouponApplied]);

  // Handle error when error changes
  useEffect(() => {
    if (error && shouldValidate) {
      setShouldValidate(false);
      setValidationMessage("Erro ao validar cupom. Tente novamente.");
      setValidationStatus('error');
    }
  }, [error, shouldValidate]);

  const handleApplyCoupon = () => {
    if (couponCode.trim() && !appliedCoupon) {
      setValidationStatus('idle');
      setValidationMessage("");
      setShouldValidate(true);
    }
  };

  const handleRemoveCoupon = () => {
    onCouponRemoved();
    setCouponCode("");
    setValidationMessage("");
    setValidationStatus('idle');
    
    // 🎫 CACHE FIX: Aggressively invalidate ALL coupon-related cache when removing coupon
    queryClient.invalidateQueries({ 
      queryKey: ['validate-coupon'], 
      exact: false 
    });
    queryClient.invalidateQueries({ queryKey: ['/api/admin/coupons'] });
    // Clear any cached data immediately
    queryClient.clear();
    console.log('🎫 Coupon removed, ALL cache cleared for completely fresh validations');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApplyCoupon();
    }
  };

  return (
    <div className="space-y-3">
      {!appliedCoupon ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="coupon-code">Cupom de desconto</Label>
            <div className="flex gap-2">
              <Input
                id="coupon-code"
                type="text"
                placeholder="Digite o código do cupom"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={handleApplyCoupon}
                disabled={!couponCode.trim() || isLoading}
                variant="outline"
                size="default"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Aplicar"
                )}
              </Button>
            </div>
          </div>

          {validationMessage && (
            <Alert variant={validationStatus === 'success' ? 'default' : 'destructive'}>
              <div className="flex items-center gap-2">
                {validationStatus === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription>{validationMessage}</AlertDescription>
              </div>
            </Alert>
          )}
        </>
      ) : (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <div className="font-medium text-green-800 dark:text-green-200">
                  Cupom {appliedCoupon.code} aplicado
                </div>
                {appliedCoupon.description && (
                  <div className="text-sm text-green-600 dark:text-green-300">
                    {appliedCoupon.description}
                  </div>
                )}
              </div>
            </div>
            <Button
              onClick={handleRemoveCoupon}
              variant="ghost"
              size="sm"
              className="text-green-700 hover:text-green-800 hover:bg-green-100 dark:text-green-300 dark:hover:text-green-200 dark:hover:bg-green-800"
            >
              Remover
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
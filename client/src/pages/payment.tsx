import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Landmark, QrCode, Shield, Lock, Heart, Package, CheckCircle, ArrowLeft } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/brazilian-formatter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { orderCreationSchema } from "@shared/schema";
import { calculatePricing, formatPricingBreakdown } from "@/lib/pricing-calculator";
import { CardPayment } from "@/components/payment/card-payment";
import { PIXPayment } from "@/components/payment/pix-payment";
import { CouponInput } from "@/components/CouponInput";
import { PolicyAcceptance } from "@/components/policy-acceptance";
import { useAcceptPolicy } from "@/hooks/use-policy";
import type { Customer, Event, Address } from "@shared/schema";

type OrderCreation = {
  eventId: number;
  customerId: number;
  addressId: number;
  kitQuantity: number;
  kits: { name: string; cpf: string; shirtSize: string }[];
  paymentMethod: "credit" | "pix";
  totalCost: number;
  deliveryCost: number;
  extraKitsCost: number;
  donationCost: number;
  discountAmount: number;
  donationAmount: number;
  idempotencyKey?: string;
  couponCode?: string;
};

export default function Payment() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const [paymentMethod, setPaymentMethod] = useState<"credit" | "pix">("credit");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [kitData, setKitData] = useState<any>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [pixData, setPixData] = useState<any>(null);
  
  // SECURITY FIX: State for server-calculated pricing
  const [securePricing, setSecurePricing] = useState<any>(null);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [pricingError, setPricingError] = useState<string | null>(null);
  
  const acceptPolicyMutation = useAcceptPolicy();

  // Clear payment error when payment method changes
  useEffect(() => {
    if (paymentError) {
      setPaymentError(null);
    }
  }, [paymentMethod]);

  // Helper function to record policy acceptance
  const recordPolicyAcceptance = async (orderId: number) => {
    try {
      const policyResponse = await fetch('/api/policies?type=order');
      if (policyResponse.ok) {
        const policyData = await policyResponse.json();
        await acceptPolicyMutation.mutateAsync({
          userId: customer!.id,
          policyId: policyData.policy.id,
          context: 'order',
          orderId: orderId
        });
      }
    } catch (policyError) {
      console.error('Error recording policy acceptance:', policyError);
    }
  };
  
  // Coupon state
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [originalTotalCost, setOriginalTotalCost] = useState(0);

  const { data: event } = useQuery<Event>({
    queryKey: ["/api/events", id],
  });

  useEffect(() => {
    try {
      const customerData = sessionStorage.getItem("customerData");
      const kitInfo = sessionStorage.getItem("kitData");
      const addressData = sessionStorage.getItem("selectedAddress");
      
      if (customerData) {
        setCustomer(JSON.parse(customerData));
      }
      if (kitInfo) {
        setKitData(JSON.parse(kitInfo));
      }
      if (addressData) {
        setSelectedAddress(JSON.parse(addressData));
      }
      
      if (!customerData || !kitInfo || !addressData) {
        // Redirect to login if customer data is missing, or back to address if just missing kit/address data
        if (!customerData) {
          sessionStorage.setItem("loginReturnPath", `/events/${id}/address`);
          setLocation("/login");
        } else if (!kitInfo) {
          setLocation(`/events/${id}/kits`);
        } else {
          setLocation(`/events/${id}/address`);
        }
      }
    } catch (error) {
      console.warn("Error loading session data:", error);
      setLocation(`/events/${id}/kits`);
    }
  }, [id, setLocation]);

  // SECURITY FIX: Load secure pricing from server instead of sessionStorage
  useEffect(() => {
    const loadSecurePricing = async () => {
      if (!selectedAddress || !event || !kitData) return;
      
      // Don't interrupt ongoing PIX payment process
      if (isProcessing && paymentMethod === 'pix') {
        console.log('🔒 Skipping pricing validation during PIX generation to avoid UI interruption');
        return;
      }
      
      setPricingLoading(true);
      setPricingError(null);
      
      try {
        console.log('🔒 SECURITY FIX: Loading pricing from server instead of sessionStorage');
        
        const response = await apiRequest("POST", "/api/calculate-delivery-secure", {
          eventId: parseInt(id!),
          addressId: selectedAddress.id,
          kitQuantity: kitData.kitQuantity
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Erro ao calcular preços');
        }
        
        const pricingData = await response.json();
        // ✅ SECURITY: Server-calculated pricing loaded successfully
        
        setSecurePricing(pricingData);
        setPricingError(null);
        
      } catch (error: any) {
        console.error('❌ SECURITY ERROR: Failed to load secure pricing:', error);
        setPricingError(error.message || 'Erro ao carregar preços');
        setSecurePricing(null);
      } finally {
        setPricingLoading(false);
      }
    };
    
    loadSecurePricing();
  }, [selectedAddress, event, kitData, id, isProcessing, paymentMethod]);

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: OrderCreation) => {
      const response = await apiRequest("POST", "/api/orders", orderData);
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate caches to ensure reactive updates
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customer?.id, "orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] }); // May affect event stats
      
      // Only auto-complete for non-PIX payments
      // PIX payments will handle completion via handlePaymentSuccess when actually approved
      if (paymentMethod !== 'pix') {
        setOrderNumber(data.order.orderNumber);
        setPaymentCompleted(true);
        setPaymentError(null);
        // Store order confirmation data
        sessionStorage.setItem("orderConfirmation", JSON.stringify(data));
        // Redirect to confirmation page using order number after a short delay
        setTimeout(() => {
          setLocation(`/order/${data.order.orderNumber}/confirmation`);
        }, 2000);
      }
    },
    onError: (error: any) => {
      setPaymentError(error.message || "Erro ao criar pedido");
      setIsProcessing(false);
    }
  });

  // Payment success handler
  const handlePaymentSuccess = (paymentResult: any) => {
    setPaymentCompleted(true);
    setPaymentError(null);
    setOrderNumber(paymentResult.orderNumber);
    
    // Store payment result data
    const confirmationData = {
      order: { orderNumber: paymentResult.orderNumber },
      payment: paymentResult
    };
    sessionStorage.setItem("orderConfirmation", JSON.stringify(confirmationData));
    
    // Redirect to confirmation page after payment success
    setTimeout(() => {
      setLocation(`/order/${paymentResult.orderNumber}/confirmation`);
    }, 2000);
  };

  // Payment error handler
  const handlePaymentError = (error: string) => {
    setPaymentError(error);
    setIsProcessing(false);
  };

  // Coupon handlers
  const handleCouponApplied = (coupon: any, discount: number, finalAmount: number) => {
    setAppliedCoupon(coupon);
    setCouponDiscount(discount);
  };

  const handleCouponRemoved = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
  };

  // SECURITY FIX: Show loading/error states for pricing
  if (!customer || !kitData || !event) {
    return (
      <>
        {/* Mobile Loading */}
        <div className="lg:hidden max-w-md mx-auto bg-white min-h-screen">
          <Header showBackButton onBack={() => setLocation(`/events/${id}/kits`)} />
          <div className="p-4">
            <p className="text-center text-neutral-600">Carregando...</p>
          </div>
        </div>

        {/* Desktop Loading */}
        <div className="hidden lg:block min-h-screen bg-gray-50">
          {/* Desktop Header Skeleton */}
          <nav className="bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-6xl mx-auto px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center">
                  <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="flex items-center space-x-8">
                  <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                  <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </nav>

          {/* Main Content Skeleton */}
          <main className="max-w-6xl mx-auto px-8 py-12">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
              {/* Left Column - Payment Form Skeleton */}
              <div className="lg:col-span-3">
                <div className="bg-white rounded-xl shadow-lg p-8 animate-pulse">
                  <div className="h-8 bg-gray-200 rounded mb-4 w-2/3" />
                  <div className="h-4 bg-gray-200 rounded mb-6 w-1/2" />
                  <div className="space-y-6">
                    <div className="h-12 bg-gray-200 rounded-lg" />
                    <div className="h-12 bg-gray-200 rounded-lg" />
                    <div className="h-12 bg-gray-200 rounded-lg" />
                  </div>
                </div>
              </div>

              {/* Right Column - Summary Skeleton */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow-lg p-8 animate-pulse sticky top-6">
                  <div className="h-6 bg-gray-200 rounded mb-6" />
                  <div className="space-y-4">
                    <div className="h-4 bg-gray-200 rounded" />
                    <div className="h-4 bg-gray-200 rounded" />
                    <div className="h-4 bg-gray-200 rounded" />
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  // SECURITY FIX: Don't block UI completely during pricing calculation when PIX is being processed
  // This fixes the issue where PIX generation gets interrupted by pricing validation
  if (pricingLoading && !isProcessing && paymentMethod !== 'pix') {
    return (
      <>
        {/* Mobile Loading */}
        <div className="lg:hidden max-w-md mx-auto bg-white min-h-screen">
          <Header showBackButton onBack={() => setLocation(`/events/${id}/address`)} />
          <div className="p-4">
            <p className="text-center text-neutral-600">Carregando...</p>
          </div>
        </div>

        {/* Desktop Loading */}
        <div className="hidden lg:block min-h-screen bg-gray-50">
          {/* Desktop Header Skeleton */}
          <nav className="bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-6xl mx-auto px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center">
                  <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="flex items-center space-x-8">
                  <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                  <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </nav>

          {/* Main Content Skeleton */}
          <main className="max-w-6xl mx-auto px-8 py-12">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
              {/* Left Column - Payment Form Skeleton */}
              <div className="lg:col-span-3">
                <div className="bg-white rounded-xl shadow-lg p-8">
                  {/* Progress Steps Skeleton */}
                  <div className="flex items-center justify-center mb-8 animate-pulse">
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-200 rounded-full" />
                        <div className="ml-2 h-4 w-16 bg-gray-200 rounded" />
                      </div>
                      <div className="w-8 h-0.5 bg-gray-200" />
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-200 rounded-full" />
                        <div className="ml-2 h-4 w-20 bg-gray-200 rounded" />
                      </div>
                      <div className="w-8 h-0.5 bg-gray-200" />
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary rounded-full" />
                        <div className="ml-2 h-4 w-24 bg-gray-200 rounded" />
                      </div>
                    </div>
                  </div>

                  {/* Title Skeleton */}
                  <div className="mb-8 animate-pulse">
                    <div className="h-8 bg-gray-200 rounded mb-4 w-2/3" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                  </div>

                  {/* Payment Form Skeleton */}
                  <div className="space-y-6 animate-pulse">
                    <div className="h-12 bg-gray-200 rounded-lg" />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-12 bg-gray-200 rounded-lg" />
                      <div className="h-12 bg-gray-200 rounded-lg" />
                    </div>
                    <div className="h-12 bg-gray-200 rounded-lg" />
                    <div className="h-16 bg-gray-200 rounded-lg" />
                  </div>
                </div>
              </div>

              {/* Right Column - Summary Skeleton */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow-lg p-8 animate-pulse sticky top-6">
                  <div className="h-6 bg-gray-200 rounded mb-6" />
                  <div className="space-y-4 mb-8">
                    <div className="flex justify-between">
                      <div className="h-4 bg-gray-200 rounded w-1/2" />
                      <div className="h-4 bg-gray-200 rounded w-1/4" />
                    </div>
                    <div className="flex justify-between">
                      <div className="h-4 bg-gray-200 rounded w-2/3" />
                      <div className="h-4 bg-gray-200 rounded w-1/4" />
                    </div>
                    <div className="flex justify-between">
                      <div className="h-4 bg-gray-200 rounded w-1/3" />
                      <div className="h-4 bg-gray-200 rounded w-1/4" />
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex justify-between">
                        <div className="h-6 bg-gray-200 rounded w-1/2" />
                        <div className="h-6 bg-gray-200 rounded w-1/3" />
                      </div>
                    </div>
                  </div>
                  <div className="h-14 bg-gray-200 rounded-lg" />
                </div>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  if (pricingError || !securePricing) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <Header showBackButton onBack={() => setLocation(`/events/${id}/address`)} />
        <div className="p-4">
          <Alert className="mb-4">
            <AlertDescription>
              {pricingError || 'Erro ao calcular preços de entrega. Tente novamente.'}
            </AlertDescription>
          </Alert>
          <Button onClick={() => window.location.reload()} className="w-full">
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  // SECURITY FIX: Use server-calculated pricing instead of sessionStorage
  // This fixes VULNERABILIDADE_SESSIONSTORAGE_PRICING.md critical security issue
  const basePricing = securePricing?.pricing ? {
    baseCost: securePricing.pricing.baseCost,
    deliveryCost: securePricing.pricing.deliveryCost,
    extraKitsCost: securePricing.pricing.extraKitsCost,
    donationAmount: securePricing.pricing.donationAmount,
    totalCost: securePricing.pricing.totalCost,
    kitQuantity: securePricing.pricing.kitQuantity,
    discountAmount: 0,
    fixedPrice: event?.fixedPrice ? Number(event.fixedPrice) : null
  } : {
    baseCost: 0,
    deliveryCost: 0,
    extraKitsCost: 0,
    donationAmount: 0,
    totalCost: 0,
    kitQuantity: kitData.kitQuantity || 1,
    discountAmount: 0,
    fixedPrice: event?.fixedPrice ? Number(event.fixedPrice) : null
  };
  
  const pricingBreakdown = formatPricingBreakdown(basePricing, event, kitData.kitQuantity);
  
  // Apply coupon discount to pricing
  const pricing = {
    ...basePricing,
    discountAmount: couponDiscount,
    totalCost: Math.max(0, basePricing.totalCost - couponDiscount)
  };

  // Create order data function to be used by payment components
  // 🔒 SECURITY: Remove pricing values from frontend - server will calculate all prices
  const createOrderData = (idempotencyKey: string): OrderCreation => {
    if (!selectedAddress) {
      throw new Error("Endereço não selecionado");
    }
    
    return {
      eventId: parseInt(id!),
      customerId: customer.id,
      addressId: selectedAddress.id,
      kitQuantity: kitData.kitQuantity,
      kits: kitData.kits,
      paymentMethod,
      // 🔒 SECURITY: Send server-calculated values for validation, but server will recalculate
      totalCost: pricing.totalCost,  // From secure calculation
      deliveryCost: pricing.deliveryCost,  // From secure calculation
      extraKitsCost: pricing.extraKitsCost,  // From secure calculation
      donationCost: pricing.donationAmount,  // From secure calculation (mapped to donationCost)
      discountAmount: couponDiscount,  // Only discount is sent from frontend
      donationAmount: pricing.donationAmount,  // From secure calculation
      idempotencyKey,
      couponCode: appliedCoupon?.code,
    };
  };

  // Show payment completed state
  if (paymentCompleted) {
    return (
      <>
        {/* Mobile Version */}
        <div className="lg:hidden max-w-md mx-auto bg-white min-h-screen">
          <Header />
          <div className="p-4">
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-600 mb-2">Pagamento Aprovado!</h2>
              <p className="text-neutral-600 mb-4">
                Seu pedido foi confirmado com sucesso.
              </p>
              <p className="text-sm text-neutral-500">
                Redirecionando para confirmação...
              </p>
            </div>
          </div>
        </div>

        {/* Desktop Version */}
        <div className="hidden lg:flex min-h-screen bg-gray-50 items-center justify-center">
          <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200 max-w-md mx-auto">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-600 mb-2">Pagamento Aprovado!</h2>
              <p className="text-gray-600 mb-4">
                Seu pedido foi confirmado com sucesso.
              </p>
              <p className="text-sm text-gray-500">
                Redirecionando para confirmação...
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Mobile Version */}
      <div className="lg:hidden max-w-md mx-auto bg-white min-h-screen">
        <Header showBackButton onBack={() => setLocation(`/events/${id}/kits`)} />
        <div className="p-4">
          {/* Mobile Progress Indicator */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-2 text-xs">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-primary text-white rounded-full flex items-center justify-center text-xs">✓</div>
                <span className="ml-1 text-neutral-600">Endereço</span>
              </div>
              <div className="w-4 h-0.5 bg-primary"></div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-primary text-white rounded-full flex items-center justify-center text-xs">✓</div>
                <span className="ml-1 text-neutral-600">Retirada</span>
              </div>
              <div className="w-4 h-0.5 bg-primary"></div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-primary text-white rounded-full flex items-center justify-center text-xs">3</div>
                <span className="ml-1 text-primary font-medium">Pagamento</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center mb-2">
            <CreditCard className="w-6 h-6 text-purple-600 mr-3" />
            <h2 className="text-2xl font-bold text-neutral-800">Pagamento</h2>
          </div>
          <p className="text-neutral-600 mb-6">Finalize seu pedido escolhendo a forma de pagamento</p>
        
        {/* Order Summary */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <h3 className="font-semibold text-lg text-neutral-800 mb-3">Resumo do Pedido</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-600">Evento:</span>
                <span className="font-medium text-neutral-800">{event.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Quantidade de kits:</span>
                <span className="font-medium text-neutral-800">{kitData.kitQuantity} kit{kitData.kitQuantity > 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Endereço:</span>
                <span className="font-medium text-neutral-800">
                  {selectedAddress ? `${selectedAddress.neighborhood}, ${selectedAddress.city}` : "Endereço não selecionado"}
                </span>
              </div>
              
              {/* Pricing Breakdown */}
              <div className="border-t pt-3 mt-3">
                <h4 className="font-medium text-neutral-800 mb-2">Detalhamento</h4>
                
                {event?.fixedPrice ? (
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center">
                      <Badge variant="secondary" className="mr-2 text-xs">Preço Fixo</Badge>
                      <span className="text-neutral-600">Inclui todos os serviços</span>
                    </div>
                    <span className="font-medium text-neutral-800">{formatCurrency(Number(event.fixedPrice))}</span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-neutral-600">
                      {securePricing?.pricingType === 'cep_zones' 
                        ? `Entrega (${securePricing.zoneName || 'Zona CEP'})`
                        : `Entrega (estimativa)`
                      }
                    </span>
                    <span className="font-medium text-neutral-800">{formatCurrency(pricing.deliveryCost)}</span>
                  </div>
                )}
                
                {pricing.extraKitsCost > 0 && (
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-neutral-600">{kitData.kitQuantity - 1} kit{kitData.kitQuantity > 2 ? 's' : ''} adicional{kitData.kitQuantity > 2 ? 'is' : ''}</span>
                    <span className="font-medium text-neutral-800">{formatCurrency(pricing.extraKitsCost)}</span>
                  </div>
                )}
                
                {pricing.donationAmount > 0 && (
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center">
                      <Heart className="w-3 h-3 text-red-500 mr-1" />
                      <span className="text-neutral-600">Doação: {event.donationDescription} ({kitData.kitQuantity}x)</span>
                    </div>
                    <span className="font-medium text-neutral-800">{formatCurrency(pricing.donationAmount)}</span>
                  </div>
                )}
                
                {/* Coupon discount */}
                {couponDiscount > 0 && (
                  <div className="flex justify-between items-center mb-1 text-green-600">
                    <span className="text-green-600">Desconto ({appliedCoupon?.code})</span>
                    <span className="font-medium text-green-600">-{formatCurrency(couponDiscount)}</span>
                  </div>
                )}
                
                <div className="border-t pt-2 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-lg text-neutral-800">Total</span>
                    <span className="font-bold text-xl text-primary">{formatCurrency(pricing.totalCost)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coupon Input */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <CouponInput
              eventId={parseInt(id!)}
              totalAmount={basePricing.totalCost}
              onCouponApplied={handleCouponApplied}
              onCouponRemoved={handleCouponRemoved}
              appliedCoupon={appliedCoupon}
            />
          </CardContent>
        </Card>

        {/* Kit Details */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <h3 className="font-semibold text-lg text-neutral-800 mb-3 flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Kits ({kitData.kitQuantity})
            </h3>
            <div className="space-y-3">
              {kitData.kits.map((kit: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                  <div>
                    <p className="font-medium text-neutral-800">{kit.name}</p>
                    <p className="text-sm text-neutral-600">{kit.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</p>
                  </div>
                  <Badge variant="outline">{kit.shirtSize}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Payment Methods Selection - Hidden when PIX code is generated */}
        {(!paymentMethod || paymentMethod === 'credit' || (paymentMethod === 'pix' && !pixData)) && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg text-neutral-800 mb-4">Forma de Pagamento</h3>
              
              <div className="[&_[role=radio]]:h-4 [&_[role=radio]]:w-4 [&_[role=radio]]:min-h-[1rem] [&_[role=radio]]:min-w-[1rem] [&_[role=radio]]:max-h-[1rem] [&_[role=radio]]:max-w-[1rem] [&_[role=radio]]:flex-shrink-0 [&_[role=radio]]:rounded-sm">
                <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as "credit" | "pix")}>
                  <div className="space-y-3"></div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-neutral-50">
                    <RadioGroupItem value="credit" id="credit" />
                    <Label htmlFor="credit" className="flex items-center gap-3 cursor-pointer w-full">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="font-medium">Cartão de Crédito</div>
                        <div className="text-sm text-neutral-600">Visa, Mastercard, Elo</div>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-neutral-50">
                    <RadioGroupItem value="pix" id="pix" />
                    <Label htmlFor="pix" className="flex items-center gap-3 cursor-pointer w-full">
                      <QrCode className="h-5 w-5 text-purple-600" />
                      <div>
                        <div className="font-medium">PIX</div>
                        <div className="text-sm text-neutral-600">Pagamento instantâneo - Expira em 30 min</div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Policy Acceptance */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="[&_[role=checkbox]]:h-4 [&_[role=checkbox]]:w-4 [&_[role=checkbox]]:min-h-[1rem] [&_[role=checkbox]]:min-w-[1rem] [&_[role=checkbox]]:max-h-[1rem] [&_[role=checkbox]]:max-w-[1rem] [&_[role=checkbox]]:flex-shrink-0">
              <PolicyAcceptance
                type="order"
                checked={policyAccepted}
                onCheckedChange={setPolicyAccepted}
                required={true}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Alert className="mb-6">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Pagamento Seguro:</strong> Seus dados são protegidos por criptografia SSL e processados pelo Mercado Pago.
          </AlertDescription>
        </Alert>

        {/* Payment Processing Section */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <h3 className="font-semibold text-lg text-neutral-800 mb-4">
              {paymentMethod === 'pix' ? 'Pagamento PIX' : 'Pagamento com Cartão'}
            </h3>
            
            {/* Payment Error - Moved here to be closer to payment section */}
            {paymentError && (
              <Alert className="mb-4 border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">
                  {paymentError}
                </AlertDescription>
              </Alert>
            )}
            
            {paymentMethod === 'credit' && (
              <CardPayment
                amount={pricing.totalCost}
                orderData={() => createOrderData(`${Date.now()}-${Math.random()}`)}
                createOrder={async (orderData) => {
                  // Validate policy acceptance before creating order
                  if (!policyAccepted) {
                    throw new Error("É necessário aceitar a política de pedidos para prosseguir");
                  }
                  
                  return new Promise((resolve, reject) => {
                    createOrderMutation.mutate(orderData, {
                      onSuccess: async (data) => {
                        // Record policy acceptance after successful order creation
                        await recordPolicyAcceptance(data.order.id);
                        resolve(data);
                      },
                      onError: (error) => reject(error)
                    });
                  });
                }}
                customerData={{
                  name: customer.name,
                  email: customer.email,
                  cpf: customer.cpf
                }}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                isProcessing={isProcessing}
                setIsProcessing={setIsProcessing}
                policyAccepted={policyAccepted}
              />
            )}
            
            {paymentMethod === 'pix' && (
              <PIXPayment
                amount={pricing.totalCost}
                orderData={() => createOrderData(`${Date.now()}-${Math.random()}`)}
                createOrder={async (orderData) => {
                  // Validate policy acceptance before creating order
                  if (!policyAccepted) {
                    throw new Error("É necessário aceitar a política de pedidos para prosseguir");
                  }
                  
                  return new Promise((resolve, reject) => {
                    createOrderMutation.mutate(orderData, {
                      onSuccess: async (data) => {
                        // Record policy acceptance after successful order creation
                        await recordPolicyAcceptance(data.order.id);
                        resolve(data);
                      },
                      onError: (error) => reject(error)
                    });
                  });
                }}
                customerData={{
                  name: customer.name,
                  email: customer.email,
                  cpf: customer.cpf
                }}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                isProcessing={isProcessing}
                setIsProcessing={setIsProcessing}
                policyAccepted={policyAccepted}
                onPixDataGenerated={setPixData}
              />
            )}
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Desktop Version */}
      <div className="hidden lg:block min-h-screen bg-gray-50">
        {/* Simple Back Button */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-8 py-4">
            <Button
              variant="ghost"
              onClick={() => setLocation(`/events/${id}/kits`)}
              className="flex items-center text-gray-600 hover:text-purple-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto py-8 px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Progress & Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 sticky top-8">
                <div className="flex items-center mb-4">
                  <CreditCard className="w-6 h-6 text-purple-600 mr-3" />
                  <h3 className="text-xl font-semibold text-gray-900">Pagamento</h3>
                </div>
                <p className="text-gray-600 mb-6">Finalize seu pedido</p>
                
                {/* Progress Indicator */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-sm">
                    <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs mr-3">✓</div>
                    <span className="text-gray-700">Evento selecionado</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs mr-3">✓</div>
                    <span className="text-gray-700">Endereço confirmado</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs mr-3">✓</div>
                    <span className="text-gray-700">Informações dos kits</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs mr-3">4</div>
                    <span className="font-medium text-gray-900">Pagamento</span>
                  </div>
                </div>

                {/* Order Summary */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Resumo do Pedido</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Evento:</span>
                      <span className="font-medium text-gray-800">{event.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Kits:</span>
                      <span className="font-medium text-gray-800">{kitData.kitQuantity} kit{kitData.kitQuantity > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Endereço:</span>
                      <span className="font-medium text-gray-800">
                        {selectedAddress ? `${selectedAddress.neighborhood}, ${selectedAddress.city}` : "Não selecionado"}
                      </span>
                    </div>
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="border-t pt-3 mt-3">
                    <h4 className="font-semibold text-gray-900 mb-2">Detalhamento</h4>
                    
                    {event?.fixedPrice ? (
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center">
                          <Badge variant="secondary" className="mr-2 text-xs">Preço Fixo</Badge>
                          <span className="text-gray-600">Todos os serviços</span>
                        </div>
                        <span className="font-medium text-gray-800">{formatCurrency(Number(event.fixedPrice))}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-600">
                          {securePricing?.pricingType === 'cep_zones' 
                            ? `Entrega (${securePricing.zoneName})`
                            : `Entrega`
                          }
                        </span>
                        <span className="font-medium text-gray-800">{formatCurrency(pricing.deliveryCost)}</span>
                      </div>
                    )}
                    
                    {pricing.extraKitsCost > 0 && (
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-600">{kitData.kitQuantity - 1} kit{kitData.kitQuantity > 2 ? 's' : ''} adicional{kitData.kitQuantity > 2 ? 'is' : ''}</span>
                        <span className="font-medium text-gray-800">{formatCurrency(pricing.extraKitsCost)}</span>
                      </div>
                    )}
                    
                    {pricing.donationAmount > 0 && (
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center">
                          <Heart className="w-3 h-3 text-red-500 mr-1" />
                          <span className="text-gray-600">Doação ({kitData.kitQuantity}x)</span>
                        </div>
                        <span className="font-medium text-gray-800">{formatCurrency(pricing.donationAmount)}</span>
                      </div>
                    )}
                    
                    {/* Coupon discount */}
                    {couponDiscount > 0 && (
                      <div className="flex justify-between items-center mb-1 text-green-600">
                        <span className="text-green-600">Desconto ({appliedCoupon?.code})</span>
                        <span className="font-medium text-green-600">-{formatCurrency(couponDiscount)}</span>
                      </div>
                    )}
                    
                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-900">Total</span>
                        <span className="font-bold text-lg text-purple-600">{formatCurrency(pricing.totalCost)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security Notice */}
                <div className="mt-6 p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center">
                    <Shield className="h-4 w-4 text-purple-600 mr-2" />
                    <span className="text-sm text-purple-700 font-medium">Pagamento Seguro</span>
                  </div>
                  <p className="text-xs text-purple-600 mt-1">
                    Seus dados são protegidos por criptografia SSL
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column - Payment Content */}
            <div className="lg:col-span-2">
              <div className="space-y-6">
                {/* Coupon Section */}
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Cupom de Desconto</h3>
                  <CouponInput
                    eventId={parseInt(id!)}
                    totalAmount={basePricing.totalCost}
                    onCouponApplied={handleCouponApplied}
                    onCouponRemoved={handleCouponRemoved}
                    appliedCoupon={appliedCoupon}
                  />
                </div>

                {/* Kit Details */}
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Package className="w-5 h-5 mr-2" />
                    Kits ({kitData.kitQuantity})
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {kitData.kits.map((kit: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-800">{kit.name}</p>
                          <p className="text-sm text-gray-600">{kit.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</p>
                        </div>
                        <Badge variant="outline">{kit.shirtSize}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Methods */}
                {(!paymentMethod || paymentMethod === 'credit' || (paymentMethod === 'pix' && !pixData)) && (
                  <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Forma de Pagamento</h3>
                    
                    <div className="[&_[role=radio]]:h-4 [&_[role=radio]]:w-4 [&_[role=radio]]:min-h-[1rem] [&_[role=radio]]:min-w-[1rem] [&_[role=radio]]:max-h-[1rem] [&_[role=radio]]:max-w-[1rem] [&_[role=radio]]:flex-shrink-0 [&_[role=radio]]:rounded-sm">
                      <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as "credit" | "pix")}>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50">
                            <RadioGroupItem value="credit" id="credit" />
                            <Label htmlFor="credit" className="flex items-center gap-3 cursor-pointer w-full">
                              <CreditCard className="h-5 w-5 text-blue-600" />
                              <div>
                                <div className="font-medium">Cartão de Crédito</div>
                                <div className="text-sm text-gray-600">Visa, Mastercard, Elo</div>
                              </div>
                            </Label>
                          </div>
                          
                          <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50">
                            <RadioGroupItem value="pix" id="pix" />
                            <Label htmlFor="pix" className="flex items-center gap-3 cursor-pointer w-full">
                              <QrCode className="h-5 w-5 text-purple-600" />
                              <div>
                                <div className="font-medium">PIX</div>
                                <div className="text-sm text-gray-600">Pagamento instantâneo - Expira em 30 min</div>
                              </div>
                            </Label>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                )}

                {/* Policy Acceptance */}
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <div className="[&_[role=checkbox]]:h-4 [&_[role=checkbox]]:w-4 [&_[role=checkbox]]:min-h-[1rem] [&_[role=checkbox]]:min-w-[1rem] [&_[role=checkbox]]:max-h-[1rem] [&_[role=checkbox]]:max-w-[1rem] [&_[role=checkbox]]:flex-shrink-0">
                    <PolicyAcceptance
                      type="order"
                      checked={policyAccepted}
                      onCheckedChange={setPolicyAccepted}
                      required={true}
                    />
                  </div>
                </div>

                {/* Payment Processing Section */}
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {paymentMethod === 'pix' ? 'Pagamento PIX' : 'Pagamento com Cartão'}
                  </h3>
                  
                  {/* Payment Error */}
                  {paymentError && (
                    <Alert className="mb-4 border-red-200 bg-red-50">
                      <AlertDescription className="text-red-700">
                        {paymentError}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {paymentMethod === 'credit' && (
                    <CardPayment
                      amount={pricing.totalCost}
                      orderData={() => createOrderData(`${Date.now()}-${Math.random()}`)}
                      createOrder={async (orderData) => {
                        // Validate policy acceptance before creating order
                        if (!policyAccepted) {
                          throw new Error("É necessário aceitar a política de pedidos para prosseguir");
                        }
                        
                        return new Promise((resolve, reject) => {
                          createOrderMutation.mutate(orderData, {
                            onSuccess: async (data) => {
                              // Record policy acceptance after successful order creation
                              await recordPolicyAcceptance(data.order.id);
                              resolve(data);
                            },
                            onError: (error) => reject(error)
                          });
                        });
                      }}
                      customerData={{
                        name: customer.name,
                        email: customer.email,
                        cpf: customer.cpf
                      }}
                      onSuccess={handlePaymentSuccess}
                      onError={handlePaymentError}
                      isProcessing={isProcessing}
                      setIsProcessing={setIsProcessing}
                      policyAccepted={policyAccepted}
                    />
                  )}
                  
                  {paymentMethod === 'pix' && (
                    <PIXPayment
                      amount={pricing.totalCost}
                      orderData={() => createOrderData(`${Date.now()}-${Math.random()}`)}
                      createOrder={async (orderData) => {
                        // Validate policy acceptance before creating order
                        if (!policyAccepted) {
                          throw new Error("É necessário aceitar a política de pedidos para prosseguir");
                        }
                        
                        return new Promise((resolve, reject) => {
                          createOrderMutation.mutate(orderData, {
                            onSuccess: async (data) => {
                              // Record policy acceptance after successful order creation
                              await recordPolicyAcceptance(data.order.id);
                              resolve(data);
                            },
                            onError: (error) => reject(error)
                          });
                        });
                      }}
                      customerData={{
                        name: customer.name,
                        email: customer.email,
                        cpf: customer.cpf
                      }}
                      onSuccess={handlePaymentSuccess}
                      onError={handlePaymentError}
                      isProcessing={isProcessing}
                      setIsProcessing={setIsProcessing}
                      policyAccepted={policyAccepted}
                      onPixDataGenerated={setPixData}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

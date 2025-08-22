import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, Calendar, MapPin, User, CreditCard, Heart, Home, Plus, FileText, ArrowLeft } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatDate } from "@/lib/brazilian-formatter";
import { formatCPF } from "@/lib/cpf-validator";
import { calculatePricing, formatPricingBreakdown } from "@/lib/pricing-calculator";
import { getStatusBadge } from "@/lib/status-utils";
import { OrderStatusHistory } from "@/components/order-status-history";
import { PendingPayment } from "@/components/pending-payment";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Order, Kit, Address, Event } from "@shared/schema";

export default function OrderDetails() {
  const [, setLocation] = useLocation();
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const isMobile = useIsMobile();

  const { data: order, isLoading } = useQuery({
    queryKey: ["/api/orders/" + orderNumber],
    enabled: !!orderNumber,
  });

  const { data: kits } = useQuery({
    queryKey: ["/api/orders", order?.id, "kits"],
    enabled: !!order?.id,
  });

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <Header showBackButton onBack={() => setLocation("/my-orders")} />
        <div className="p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="h-24 bg-gray-200 rounded" />
            <div className="h-32 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <Header showBackButton onBack={() => setLocation("/my-orders")} />
        <div className="p-4 text-center">
          <Package className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-neutral-800 mb-2">Pedido não encontrado</h2>
          <p className="text-neutral-600">O pedido solicitado não foi encontrado.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Version */}
      <div className="lg:hidden max-w-md mx-auto bg-white min-h-screen">
        <Header showBackButton onBack={() => setLocation("/my-orders")} />
        <div className="p-4 pb-20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-neutral-800">Pedido #{order.orderNumber}</h2>
            <p className="text-sm text-neutral-600">
              {formatDate(order.createdAt.split('T')[0])}
            </p>
          </div>
          {getStatusBadge(order.status, isMobile)}
        </div>

        {/* Event Information */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Evento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-neutral-800">{order.event?.name}</p>
            <div className="flex items-center text-sm text-neutral-600 mt-1">
              <Calendar className="w-4 h-4 mr-2" />
              {formatDate(order.event?.date)} às {order.event?.time}
            </div>
            <div className="flex items-center text-sm text-neutral-600 mt-1">
              <MapPin className="w-4 h-4 mr-2" />
              {order.event?.location}, {order.event?.city} - {order.event?.state}
            </div>
          </CardContent>
        </Card>

        {/* Kits Information */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Kits ({order.kitQuantity})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {kits && kits.length > 0 ? (
              <div className="space-y-3">
                {kits.map((kit: Kit, index: number) => (
                  <div key={kit.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                    <div>
                      <p className="font-medium text-neutral-800">{kit.name}</p>
                      <p className="text-sm text-neutral-600">{formatCPF(kit.cpf)}</p>
                    </div>
                    <Badge variant="outline">{kit.shirtSize}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-neutral-600">Nenhum kit encontrado para este pedido.</p>
            )}
          </CardContent>
        </Card>

        {/* Delivery Address */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Endereço de Entrega
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-medium text-neutral-800">{order.address?.label}</p>
              <p className="text-sm text-neutral-600">
                {order.address?.street}, {order.address?.number}
                {order.address?.complement && `, ${order.address.complement}`}
              </p>
              <p className="text-sm text-neutral-600">
                {order.address?.neighborhood}, {order.address?.city} - {order.address?.state}
              </p>
              <p className="text-sm text-neutral-600">
                CEP: {order.address?.zipCode}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Payment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              Detalhamento do Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Show delivery cost if exists (variable pricing) */}
              {parseFloat(order.deliveryCost) > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">Entrega (baseada na distância):</span>
                  <span className="text-neutral-800">{formatCurrency(parseFloat(order.deliveryCost))}</span>
                </div>
              )}
              
              {/* Show fixed price if exists */}
              {order.event?.fixedPrice && (
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">Preço Fixo (inclui todos os serviços):</span>
                  <span className="text-neutral-800">{formatCurrency(parseFloat(order.event.fixedPrice))}</span>
                </div>
              )}
              
              {parseFloat(order.extraKitsCost) > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">Kits adicionais:</span>
                  <span className="text-neutral-800">{formatCurrency(parseFloat(order.extraKitsCost))}</span>
                </div>
              )}
              
              {parseFloat(order.donationAmount) > 0 && (
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Heart className="w-3 h-3 text-red-500 mr-1" />
                    <span className="text-neutral-600">Doação:</span>
                  </div>
                  <span className="text-neutral-800">{formatCurrency(parseFloat(order.donationAmount))}</span>
                </div>
              )}
              
              {parseFloat(order.discountAmount) > 0 && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">Desconto:</span>
                    <span className="text-green-600">-{formatCurrency(parseFloat(order.discountAmount))}</span>
                  </div>
                  {order.couponCode && (
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-600">Cupom utilizado:</span>
                      <span className="font-mono text-xs bg-green-50 text-green-700 px-2 py-1 rounded">{order.couponCode}</span>
                    </div>
                  )}
                </>
              )}
              
              <Separator />
              <div className="flex justify-between items-center">
                <span className="font-semibold text-neutral-800">Total Pago:</span>
                <span className="font-bold text-primary text-lg">
                  {formatCurrency(parseFloat(order.totalCost))}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-neutral-600">Forma de pagamento:</span>
                <Badge variant="outline">{order.paymentMethod}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Payment Section - Show only for orders awaiting payment */}
        {order.status === "aguardando_pagamento" && (
          <PendingPayment 
            order={order}
            onPaymentSuccess={() => {
              // Invalidate queries to refresh order data
              window.location.reload();
            }}
            onPaymentError={(error) => {
              console.error('Payment error:', error);
            }}
          />
        )}

        {/* Order Status History */}
        <OrderStatusHistory orderNumber={order.orderNumber} />
        </div>
        <Footer />
      </div>

      {/* Desktop Version */}
      <div className="hidden lg:block min-h-screen bg-gray-50">
        {/* Desktop Header */}
        <nav className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex items-center">
                <img src="/logo.webp" alt="KitRunner" className="h-10 w-auto" />
              </div>

              {/* Navigation Links */}
              <div className="flex items-center space-x-8">
                <button
                  onClick={() => setLocation("/")}
                  className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-lg transition-colors"
                >
                  <Home className="w-4 h-4" />
                  <span>Início</span>
                </button>

                <button
                  onClick={() => setLocation("/my-orders")}
                  className="flex items-center space-x-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-lg font-medium"
                >
                  <Package className="w-4 h-4" />
                  <span>Pedidos</span>
                </button>

                <button
                  onClick={() => setLocation("/eventos")}
                  className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-lg transition-colors"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Eventos</span>
                </button>

                <button
                  onClick={() => setLocation("/profile")}
                  className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-lg transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span>Perfil</span>
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto pt-16 pb-8 px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 sticky top-24">
                <div className="mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">#{order.orderNumber}</h1>
                  <p className="text-gray-600 mt-1">
                    {formatDate(order.createdAt.split('T')[0])}
                  </p>
                </div>
                <div className="mb-4 flex justify-end">
                  {getStatusBadge(order.status, false)}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-gray-900">{order.event?.name}</p>
                      <p className="text-sm text-gray-600">{formatDate(order.event?.date)} às {order.event?.time}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Package className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-gray-900">{order.kitQuantity} kit{order.kitQuantity > 1 ? 's' : ''}</p>
                      <p className="text-sm text-gray-600">Itens do pedido</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <CreditCard className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-gray-900">{formatCurrency(parseFloat(order.totalCost))}</p>
                      <p className="text-sm text-gray-600">{order.paymentMethod}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3">Ações Rápidas</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => setLocation("/my-orders")}
                      className="w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Voltar
                    </button>
                    <button
                      onClick={() => setLocation("/eventos")}
                      className="w-full text-left px-3 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors flex items-center"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Fazer Novo Pedido
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Order Details */}
            <div className="lg:col-span-2">
              <div className="space-y-6">
                {/* Event Information */}
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center">
                      <Calendar className="w-6 h-6 mr-3 text-purple-600" />
                      Informações do Evento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-lg font-semibold text-gray-900 mb-2">{order.event?.name}</p>
                        <div className="space-y-2">
                          <div className="flex items-center text-gray-600">
                            <Calendar className="w-4 h-4 mr-2" />
                            <span>{formatDate(order.event?.date)} às {order.event?.time}</span>
                          </div>
                          <div className="flex items-center text-gray-600">
                            <MapPin className="w-4 h-4 mr-2" />
                            <span>{order.event?.location}</span>
                          </div>
                          <div className="flex items-center text-gray-600">
                            <MapPin className="w-4 h-4 mr-2" />
                            <span>{order.event?.city} - {order.event?.state}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Kits Information */}
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center">
                      <Package className="w-6 h-6 mr-3 text-purple-600" />
                      Kits Solicitados ({order.kitQuantity})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {kits && kits.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {kits.map((kit: Kit, index: number) => (
                          <div key={kit.id} className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-gray-900">{kit.name}</p>
                                <p className="text-sm text-gray-600">{formatCPF(kit.cpf)}</p>
                              </div>
                              <Badge variant="outline" className="bg-white">{kit.shirtSize}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600">Nenhum kit encontrado para este pedido.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Delivery Address */}
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center">
                      <MapPin className="w-6 h-6 mr-3 text-purple-600" />
                      Endereço de Entrega
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="font-semibold text-gray-900 mb-2">{order.address?.label}</p>
                      <div className="space-y-1 text-gray-600">
                        <p>{order.address?.street}, {order.address?.number}
                          {order.address?.complement && `, ${order.address.complement}`}</p>
                        <p>{order.address?.neighborhood}, {order.address?.city} - {order.address?.state}</p>
                        <p>CEP: {order.address?.zipCode}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Information */}
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center">
                      <CreditCard className="w-6 h-6 mr-3 text-purple-600" />
                      Detalhamento Financeiro
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Show delivery cost if exists (variable pricing) */}
                      {parseFloat(order.deliveryCost) > 0 && (
                        <div className="flex justify-between items-center py-2">
                          <span className="text-gray-600">Entrega (baseada na distância):</span>
                          <span className="font-medium text-gray-900">{formatCurrency(parseFloat(order.deliveryCost))}</span>
                        </div>
                      )}
                      
                      {/* Show fixed price if exists */}
                      {order.event?.fixedPrice && (
                        <div className="flex justify-between items-center py-2">
                          <span className="text-gray-600">Preço Fixo (inclui todos os serviços):</span>
                          <span className="font-medium text-gray-900">{formatCurrency(parseFloat(order.event.fixedPrice))}</span>
                        </div>
                      )}
                      
                      {parseFloat(order.extraKitsCost) > 0 && (
                        <div className="flex justify-between items-center py-2">
                          <span className="text-gray-600">Kits adicionais:</span>
                          <span className="font-medium text-gray-900">{formatCurrency(parseFloat(order.extraKitsCost))}</span>
                        </div>
                      )}
                      
                      {parseFloat(order.donationAmount) > 0 && (
                        <div className="flex justify-between items-center py-2">
                          <div className="flex items-center">
                            <Heart className="w-4 h-4 text-red-500 mr-2" />
                            <span className="text-gray-600">Doação:</span>
                          </div>
                          <span className="font-medium text-gray-900">{formatCurrency(parseFloat(order.donationAmount))}</span>
                        </div>
                      )}
                      
                      {parseFloat(order.discountAmount) > 0 && (
                        <>
                          <div className="flex justify-between items-center py-2">
                            <span className="text-gray-600">Desconto:</span>
                            <span className="font-medium text-green-600">-{formatCurrency(parseFloat(order.discountAmount))}</span>
                          </div>
                          {order.couponCode && (
                            <div className="flex justify-between items-center py-2">
                              <span className="text-gray-600">Cupom utilizado:</span>
                              <span className="font-mono text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full">{order.couponCode}</span>
                            </div>
                          )}
                        </>
                      )}
                      
                      <Separator />
                      <div className="flex justify-between items-center py-3 bg-purple-50 px-4 rounded-lg">
                        <span className="text-xl font-bold text-gray-900">Total Pago:</span>
                        <span className="text-2xl font-bold text-purple-600">
                          {formatCurrency(parseFloat(order.totalCost))}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-gray-600">Forma de pagamento:</span>
                        <Badge variant="outline" className="bg-gray-50">{order.paymentMethod}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Pending Payment Section - Show only for orders awaiting payment */}
                {order.status === "aguardando_pagamento" && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-yellow-800 mb-4">Pagamento Pendente</h3>
                    <PendingPayment 
                      order={order}
                      onPaymentSuccess={() => {
                        window.location.reload();
                      }}
                      onPaymentError={(error) => {
                        console.error('Payment error:', error);
                      }}
                    />
                  </div>
                )}

                {/* Order Status History */}
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center">
                      <Calendar className="w-6 h-6 mr-3 text-purple-600" />
                      Histórico do Pedido
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <OrderStatusHistory orderNumber={order.orderNumber} />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
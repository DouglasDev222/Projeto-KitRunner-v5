import type { Event } from "@shared/schema";

export interface PricingBreakdown {
  deliveryCost: number;
  extraKitsCost: number;
  donationAmount: number;
  discountAmount: number;
  totalCost: number;
  baseCost: number;
  fixedPrice: number | null;
}

export interface PricingCalculatorProps {
  event: Event;
  kitQuantity: number;
  deliveryPrice?: number;
  discountAmount?: number;
}

export function calculatePricing({
  event,
  kitQuantity,
  deliveryPrice = 18.50,
  discountAmount = 0
}: PricingCalculatorProps): PricingBreakdown {
  let baseCost = 0;
  let deliveryCost = 0;
  let extraKitsCost = 0;
  let donationAmount = 0;
  let totalCost = 0;

  const fixedPrice = event.fixedPrice ? Number(event.fixedPrice) : null;

  if (fixedPrice) {
    // Fixed price event - includes all services, no separate delivery cost
    baseCost = fixedPrice;
    deliveryCost = 0; // Included in fixed price
  } else {
    // Variable pricing - separate delivery cost calculation
    deliveryCost = deliveryPrice;
    baseCost = 0; // No base cost, only delivery
  }

  // Calculate extra kits cost (first kit is included in base cost or delivery)
  if (kitQuantity > 1 && event.extraKitPrice) {
    extraKitsCost = (kitQuantity - 1) * Number(event.extraKitPrice);
  }

  // Calculate donation amount (multiplied by kit quantity)
  if (event.donationRequired && event.donationAmount) {
    donationAmount = Number(event.donationAmount) * kitQuantity;
  }

  // Calculate total
  totalCost = baseCost + deliveryCost + extraKitsCost + donationAmount - discountAmount;

  return {
    deliveryCost,
    extraKitsCost,
    donationAmount,
    discountAmount,
    totalCost,
    baseCost,
    fixedPrice
  };
}

export function formatPricingBreakdown(pricing: PricingBreakdown, event: Event, kitQuantity: number): {
  label: string;
  value: number;
  isTotal?: boolean;
}[] {
  const breakdown = [];

  if (pricing.fixedPrice) {
    breakdown.push({
      label: "Preço Fixo (inclui todos os serviços)",
      value: pricing.fixedPrice
    });
  } else {
    // Show delivery cost separately for variable pricing
    breakdown.push({
      label: "Entrega (baseada na distância)",
      value: pricing.deliveryCost
    });
  }

  if (pricing.extraKitsCost > 0) {
    const extraKits = kitQuantity - 1;
    breakdown.push({
      label: `${extraKits} kit${extraKits > 1 ? 's' : ''} adicional${extraKits > 1 ? 'is' : ''}`,
      value: pricing.extraKitsCost
    });
  }

  if (pricing.donationAmount > 0) {
    breakdown.push({
      label: `Doação: ${event.donationDescription || 'Contribuição'} (${kitQuantity}x)`,
      value: pricing.donationAmount
    });
  }

  if (pricing.discountAmount > 0) {
    breakdown.push({
      label: "Desconto",
      value: -pricing.discountAmount
    });
  }

  breakdown.push({
    label: "Total",
    value: pricing.totalCost,
    isTotal: true
  });

  return breakdown;
}
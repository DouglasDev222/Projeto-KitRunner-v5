import { CouponService } from "./coupon-service";

async function seedCoupons() {
  console.log("Criando cupons de exemplo...");
  
  try {
    // Cupom de desconto fixo
    const fixedCoupon = await CouponService.createCoupon({
      code: "10OFF",
      discountType: "fixed",
      discountValue: "10.00",
      description: "R$ 10 de desconto",
      maxDiscount: null,
      productIds: null, // Válido para todos os eventos
      validFrom: new Date("2025-01-01"),
      validUntil: new Date("2025-12-31"),
      usageLimit: 100,
      usageCount: 0,
      active: true
    });
    
    // Cupom de desconto percentual
    const percentCoupon = await CouponService.createCoupon({
      code: "SAVE20",
      discountType: "percentage",
      discountValue: "20.00",
      description: "20% de desconto (máx. R$ 50)",
      maxDiscount: "50.00",
      productIds: null, // Válido para todos os eventos
      validFrom: new Date("2025-01-01"),
      validUntil: new Date("2025-12-31"),
      usageLimit: 50,
      usageCount: 0,
      active: true
    });
    
    // Cupom específico para evento
    const eventSpecificCoupon = await CouponService.createCoupon({
      code: "CORRIDA25",
      discountType: "fixed",
      discountValue: "15.00",
      description: "R$ 15 de desconto para corridas",
      maxDiscount: null,
      productIds: [1], // Apenas para evento ID 1
      validFrom: new Date("2025-08-01"),
      validUntil: new Date("2025-08-31"),
      usageLimit: 25,
      usageCount: 0,
      active: true
    });
    
    console.log("✅ Cupons criados com sucesso:");
    console.log(`- ${fixedCoupon.code}: ${fixedCoupon.description}`);
    console.log(`- ${percentCoupon.code}: ${percentCoupon.description}`);
    console.log(`- ${eventSpecificCoupon.code}: ${eventSpecificCoupon.description}`);
    
  } catch (error) {
    console.error("Erro ao criar cupons:", error);
  }
}

seedCoupons().catch(console.error);
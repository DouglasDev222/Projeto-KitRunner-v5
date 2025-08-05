import { db } from "./db";
import { coupons } from "@shared/schema";
import { eq, and, or, isNull, sql } from "drizzle-orm";

export interface CouponValidationRequest {
  code: string;
  eventId: number;
  totalAmount: number;
}

export interface CouponValidationResponse {
  valid: boolean;
  coupon?: {
    id: number;
    code: string;
    discountType: 'fixed' | 'percentage';
    discountValue: number;
    description?: string;
  };
  discount?: number;
  finalAmount?: number;
  message: string;
}

export class CouponService {
  
  /**
   * Valida um cupom e calcula o desconto
   */
  static async validateCoupon(request: CouponValidationRequest): Promise<CouponValidationResponse> {
    const { code, eventId, totalAmount } = request;
    
    try {
      // Buscar cupom pelo código (case-insensitive)
      const coupon = await db
        .select()
        .from(coupons)
        .where(sql`LOWER(${coupons.code}) = LOWER(${code})`)
        .limit(1);

      if (coupon.length === 0) {
        return {
          valid: false,
          message: "Cupom não encontrado"
        };
      }

      const couponData = coupon[0];

      // Verificar se o cupom está ativo
      if (!couponData.active) {
        return {
          valid: false,
          message: "Cupom inativo"
        };
      }

      // Verificar se não está expirado
      const now = new Date();
      if (couponData.validUntil && new Date(couponData.validUntil) < now) {
        return {
          valid: false,
          message: "Cupom expirado"
        };
      }

      // Verificar se ainda está dentro do período válido
      if (couponData.validFrom && new Date(couponData.validFrom) > now) {
        return {
          valid: false,
          message: "Cupom ainda não está válido"
        };
      }

      // Verificar limite de uso
      if (couponData.usageLimit && couponData.usageCount >= couponData.usageLimit) {
        return {
          valid: false,
          message: "Cupom esgotado"
        };
      }

      // Verificar se é válido para o evento (se productIds não for null)
      if (couponData.productIds && couponData.productIds.length > 0) {
        if (!couponData.productIds.includes(eventId)) {
          return {
            valid: false,
            message: "Cupom não é válido para este evento"
          };
        }
      }

      // Calcular desconto
      let discount = 0;
      const discountValue = parseFloat(couponData.discountValue.toString());

      if (couponData.discountType === 'fixed') {
        discount = Math.min(discountValue, totalAmount); // Não pode ser maior que o total
      } else if (couponData.discountType === 'percentage') {
        discount = (totalAmount * discountValue) / 100;
        // Aplicar limite máximo se definido
        if (couponData.maxDiscount) {
          const maxDiscount = parseFloat(couponData.maxDiscount.toString());
          discount = Math.min(discount, maxDiscount);
        }
      }

      const finalAmount = Math.max(0, totalAmount - discount); // Não pode ser negativo

      return {
        valid: true,
        coupon: {
          id: couponData.id,
          code: couponData.code,
          discountType: couponData.discountType as 'fixed' | 'percentage',
          discountValue: discountValue,
          description: couponData.description || undefined
        },
        discount,
        finalAmount,
        message: "Cupom aplicado com sucesso!"
      };

    } catch (error) {
      console.error("Erro ao validar cupom:", error);
      return {
        valid: false,
        message: "Erro interno ao validar cupom"
      };
    }
  }

  /**
   * Incrementa o uso de um cupom após pagamento confirmado
   */
  static async incrementUsage(couponCode: string): Promise<boolean> {
    try {
      const result = await db
        .update(coupons)
        .set({ 
          usageCount: sql`${coupons.usageCount} + 1`
        })
        .where(sql`LOWER(${coupons.code}) = LOWER(${couponCode})`)
        .returning({ id: coupons.id });

      return result.length > 0;
    } catch (error) {
      console.error("Erro ao incrementar uso do cupom:", error);
      return false;
    }
  }

  /**
   * Lista todos os cupons (admin)
   */
  static async getAllCoupons() {
    try {
      const allCoupons = await db
        .select()
        .from(coupons)
        .orderBy(sql`${coupons.createdAt} DESC`);
      
      return allCoupons;
    } catch (error) {
      console.error("Erro ao buscar cupons:", error);
      throw error;
    }
  }

  /**
   * Cria um novo cupom (admin)
   */
  static async createCoupon(couponData: any) {
    try {
      const newCoupon = await db
        .insert(coupons)
        .values(couponData)
        .returning();
      
      return newCoupon[0];
    } catch (error) {
      console.error("Erro ao criar cupom:", error);
      throw error;
    }
  }

  /**
   * Atualiza um cupom (admin)
   */
  static async updateCoupon(id: number, couponData: any) {
    try {
      const updatedCoupon = await db
        .update(coupons)
        .set(couponData)
        .where(eq(coupons.id, id))
        .returning();
      
      return updatedCoupon[0];
    } catch (error) {
      console.error("Erro ao atualizar cupom:", error);
      throw error;
    }
  }

  /**
   * Deleta um cupom (admin)
   */
  static async deleteCoupon(id: number) {
    try {
      const result = await db
        .delete(coupons)
        .where(eq(coupons.id, id))
        .returning({ id: coupons.id });
      
      return result.length > 0;
    } catch (error) {
      console.error("Erro ao deletar cupom:", error);
      throw error;
    }
  }

  /**
   * Busca cupom por ID (admin)
   */
  static async getCouponById(id: number) {
    try {
      const coupon = await db
        .select()
        .from(coupons)
        .where(eq(coupons.id, id))
        .limit(1);
      
      return coupon[0] || null;
    } catch (error) {
      console.error("Erro ao buscar cupom por ID:", error);
      throw error;
    }
  }
}
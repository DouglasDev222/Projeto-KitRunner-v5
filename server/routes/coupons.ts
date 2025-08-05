import { Router } from "express";
import { z } from "zod";
import { CouponService } from "../coupon-service";
import { requireAdmin } from "../middleware/auth";
import { insertCouponSchema } from "@shared/schema";

const router = Router();

// Função utilitária para converter datas corretamente com fuso horário brasileiro
function parseLocalDate(dateString: string, endOfDay = false): Date {
  const time = endOfDay ? 'T23:59:59-03:00' : 'T00:00:00-03:00';
  return new Date(dateString + time);
}

// Schema para validação de cupom
const couponValidationSchema = z.object({
  code: z.string().min(1, "Código do cupom é obrigatório"),
  eventId: z.number().min(1, "ID do evento é obrigatório"),
  totalAmount: z.number().min(0, "Valor total deve ser positivo")
});

// Schema para criação/atualização de cupom (admin)
const adminCouponSchema = insertCouponSchema.extend({
  discountType: z.enum(["fixed", "percentage"], {
    required_error: "Tipo de desconto é obrigatório"
  }),
  discountValue: z.string().min(1, "Valor do desconto é obrigatório"),
  validFrom: z.string().min(1, "Data de início é obrigatória"),
  validUntil: z.string().min(1, "Data de fim é obrigatória")
});

/**
 * POST /api/coupons/validate
 * Valida um cupom e retorna o desconto aplicável
 */
router.post('/coupons/validate', async (req, res) => {
  try {
    console.log('🎫 Coupon validation request:', req.body);
    const validatedData = couponValidationSchema.parse(req.body);
    
    const validation = await CouponService.validateCoupon(validatedData);
    console.log('🎫 Coupon validation result:', validation);
    
    res.json(validation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        valid: false,
        message: "Dados inválidos",
        errors: error.errors
      });
    }
    
    console.error("Erro na validação de cupom:", error);
    res.status(500).json({
      valid: false,
      message: "Erro interno do servidor"
    });
  }
});

/**
 * GET /api/admin/coupons
 * Lista todos os cupons (admin apenas)
 */
router.get('/admin/coupons', requireAdmin, async (req, res) => {
  try {
    const coupons = await CouponService.getAllCoupons();
    res.json({ success: true, coupons });
  } catch (error) {
    console.error("Erro ao buscar cupons:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

/**
 * POST /api/admin/coupons
 * Cria um novo cupom (admin apenas)
 */
router.post('/admin/coupons', requireAdmin, async (req, res) => {
  try {
    const validatedData = adminCouponSchema.parse(req.body);
    
    // Converter campos de string para tipos corretos
    const couponData = {
      ...validatedData,
      discountValue: validatedData.discountValue,
      maxDiscount: validatedData.maxDiscount || null,
      validFrom: parseLocalDate(validatedData.validFrom),
      validUntil: parseLocalDate(validatedData.validUntil, true),
      usageLimit: validatedData.usageLimit || null,
      productIds: validatedData.productIds || null
    };
    
    const newCoupon = await CouponService.createCoupon(couponData);
    
    res.status(201).json({ 
      success: true, 
      coupon: newCoupon,
      message: "Cupom criado com sucesso" 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos",
        errors: error.errors
      });
    }
    
    console.error("Erro ao criar cupom:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

/**
 * GET /api/admin/coupons/:id
 * Busca um cupom específico (admin apenas)
 */
router.get('/admin/coupons/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "ID inválido"
      });
    }
    
    const coupon = await CouponService.getCouponById(id);
    
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Cupom não encontrado"
      });
    }
    
    res.json({ success: true, coupon });
  } catch (error) {
    console.error("Erro ao buscar cupom:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

/**
 * PUT /api/admin/coupons/:id
 * Atualiza um cupom (admin apenas)
 */
router.put('/admin/coupons/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "ID inválido"
      });
    }
    
    const validatedData = adminCouponSchema.partial().parse(req.body);
    
    // Converter campos de string para tipos corretos
    const couponData: any = { ...validatedData };
    if (validatedData.validFrom) {
      couponData.validFrom = parseLocalDate(validatedData.validFrom);
    }
    if (validatedData.validUntil) {
      couponData.validUntil = parseLocalDate(validatedData.validUntil, true);
    }
    
    const updatedCoupon = await CouponService.updateCoupon(id, couponData);
    
    if (!updatedCoupon) {
      return res.status(404).json({
        success: false,
        message: "Cupom não encontrado"
      });
    }
    
    res.json({ 
      success: true, 
      coupon: updatedCoupon,
      message: "Cupom atualizado com sucesso" 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos",
        errors: error.errors
      });
    }
    
    console.error("Erro ao atualizar cupom:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

/**
 * DELETE /api/admin/coupons/:id
 * Deleta um cupom (admin apenas)
 */
router.delete('/admin/coupons/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "ID inválido"
      });
    }
    
    const deleted = await CouponService.deleteCoupon(id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Cupom não encontrado"
      });
    }
    
    res.json({ 
      success: true,
      message: "Cupom deletado com sucesso" 
    });
  } catch (error) {
    console.error("Erro ao deletar cupom:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

export default router;
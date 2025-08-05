import { Router } from "express";
import { z } from "zod";
import { PolicyService } from "../policy-service";
import { requireAdmin } from "../middleware/auth";
import { insertPolicyDocumentSchema, insertPolicyAcceptanceSchema } from "@shared/schema";

const router = Router();

// Schema for policy validation
const policyQuerySchema = z.object({
  type: z.enum(["register", "order"], {
    required_error: "Tipo de política é obrigatório"
  })
});

// Schema for policy acceptance
const policyAcceptanceSchema = z.object({
  userId: z.number().min(1, "ID do usuário é obrigatório"),
  policyId: z.number().min(1, "ID da política é obrigatório"),
  context: z.enum(["register", "order"], {
    required_error: "Contexto é obrigatório"
  }),
  orderId: z.number().optional()
});

// Schema for admin policy creation/update
const adminPolicySchema = insertPolicyDocumentSchema.extend({
  type: z.enum(["register", "order"], {
    required_error: "Tipo de política é obrigatório"
  }),
  title: z.string().min(1, "Título é obrigatório"),
  content: z.string().min(1, "Conteúdo é obrigatório")
});

/**
 * GET /api/policies?type=register|order
 * Get active policy by type (public)
 */
router.get('/policies', async (req, res) => {
  try {
    const validatedQuery = policyQuerySchema.parse(req.query);
    
    const policy = await PolicyService.getActivePolicyByType(validatedQuery.type);
    
    if (!policy) {
      return res.status(404).json({
        success: false,
        message: "Política não encontrada"
      });
    }
    
    res.json({
      success: true,
      policy
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Parâmetros inválidos",
        errors: error.errors
      });
    }
    
    console.error("Error fetching policy:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

/**
 * POST /api/policies/accept
 * Record policy acceptance (public, but requires user data)
 */
router.post('/policies/accept', async (req, res) => {
  try {
    const validatedData = policyAcceptanceSchema.parse(req.body);
    
    // Check if policy exists and is active
    const policy = await PolicyService.getPolicyById(validatedData.policyId);
    if (!policy || !policy.active) {
      return res.status(404).json({
        success: false,
        message: "Política não encontrada ou inativa"
      });
    }
    
    // Check if user already accepted this policy
    const hasAccepted = await PolicyService.hasUserAcceptedPolicy(
      validatedData.userId,
      validatedData.policyId,
      validatedData.context
    );
    
    if (hasAccepted) {
      return res.json({
        success: true,
        message: "Política já foi aceita anteriormente"
      });
    }
    
    // Record acceptance
    await PolicyService.createPolicyAcceptance({
      userId: validatedData.userId,
      policyId: validatedData.policyId,
      context: validatedData.context,
      orderId: validatedData.orderId || null
    });
    
    res.json({
      success: true,
      message: "Aceite registrado com sucesso"
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos",
        errors: error.errors
      });
    }
    
    console.error("Error recording policy acceptance:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

/**
 * GET /api/admin/policies
 * Get all policies (admin only)
 */
router.get('/admin/policies', requireAdmin, async (req, res) => {
  try {
    const policies = await PolicyService.getAllPolicies();
    
    res.json({
      success: true,
      policies
    });
  } catch (error) {
    console.error("Error fetching policies:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

/**
 * POST /api/admin/policies
 * Create new policy (admin only)
 */
router.post('/admin/policies', requireAdmin, async (req, res) => {
  try {
    const validatedData = adminPolicySchema.parse(req.body);
    
    const newPolicy = await PolicyService.createPolicy(validatedData);
    
    res.status(201).json({
      success: true,
      policy: newPolicy,
      message: "Política criada com sucesso"
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos",
        errors: error.errors
      });
    }
    
    console.error("Error creating policy:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

/**
 * GET /api/admin/policies/:id
 * Get specific policy (admin only)
 */
router.get('/admin/policies/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "ID inválido"
      });
    }
    
    const policy = await PolicyService.getPolicyById(id);
    
    if (!policy) {
      return res.status(404).json({
        success: false,
        message: "Política não encontrada"
      });
    }
    
    res.json({
      success: true,
      policy
    });
  } catch (error) {
    console.error("Error fetching policy:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

/**
 * PUT /api/admin/policies/:id
 * Update policy (admin only)
 */
router.put('/admin/policies/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "ID inválido"
      });
    }
    
    const validatedData = adminPolicySchema.partial().parse(req.body);
    
    const updatedPolicy = await PolicyService.updatePolicy(id, validatedData);
    
    if (!updatedPolicy) {
      return res.status(404).json({
        success: false,
        message: "Política não encontrada"
      });
    }
    
    res.json({
      success: true,
      policy: updatedPolicy,
      message: "Política atualizada com sucesso"
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos",
        errors: error.errors
      });
    }
    
    console.error("Error updating policy:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

/**
 * DELETE /api/admin/policies/:id
 * Soft delete policy (admin only)
 */
router.delete('/admin/policies/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "ID inválido"
      });
    }
    
    const deleted = await PolicyService.deletePolicy(id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Política não encontrada"
      });
    }
    
    res.json({
      success: true,
      message: "Política desativada com sucesso"
    });
  } catch (error) {
    console.error("Error deleting policy:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

/**
 * GET /api/users/:userId/policy-acceptances
 * Get user's policy acceptances (admin only)
 */
router.get('/users/:userId/policy-acceptances', requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "ID do usuário inválido"
      });
    }
    
    const acceptances = await PolicyService.getUserAcceptances(userId);
    
    res.json({
      success: true,
      acceptances
    });
  } catch (error) {
    console.error("Error fetching user acceptances:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

export default router;
import express from "express";
import { z } from "zod";
import { db } from "../db";
import { storage } from "../storage";
import { insertCepZoneSchema, type CepZone } from "@shared/schema";
import { 
  parseRangesFromText, 
  checkCepZoneOverlap, 
  calculateCepZoneDelivery, 
  type CepRange 
} from "../cep-zones-calculator";
import { requireAdminAuth } from "../middleware/auth";

const router = express.Router();

// Schema for creating/updating CEP zones with text input and priority
const cepZoneInputSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome deve ter no máximo 100 caracteres"),
  description: z.string().optional(),
  rangesText: z.string().min(1, "Pelo menos uma faixa de CEP é obrigatória"),
  price: z.string().min(1, "Preço é obrigatório").regex(/^\d+(\.\d{1,2})?$/, "Formato de preço inválido"),
  priority: z.number().min(1, "Prioridade deve ser maior que 0").optional(),
});

// GET /api/admin/cep-zones - List all zones
router.get("/admin/cep-zones", requireAdminAuth, async (req, res) => {
  try {
    const zones = await storage.getCepZones();
    res.json({ success: true, zones });
  } catch (error) {
    console.error("Error fetching CEP zones:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erro interno do servidor" 
    });
  }
});

// POST /api/admin/cep-zones - Create new zone
router.post("/admin/cep-zones", requireAdminAuth, async (req, res) => {
  try {
    const validatedData = cepZoneInputSchema.parse(req.body);
    
    // Parse ranges from text input
    const ranges = parseRangesFromText(validatedData.rangesText);
    
    if (ranges.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Nenhuma faixa de CEP válida encontrada. Use o formato: 58083000...58083500"
      });
    }
    
    // Automatically assign the next priority (last position)
    const existingZones = await storage.getCepZones();
    const activeZones = existingZones.filter(zone => zone.active);
    const nextPriority = activeZones.length > 0 ? Math.max(...activeZones.map(z => z.priority || 1)) + 1 : 1;
    
    // Create the zone with automatic priority
    const zoneData = {
      name: validatedData.name,
      description: validatedData.description || null,
      cepRanges: JSON.stringify(ranges),
      price: validatedData.price,
      priority: nextPriority,
    };
    
    const zone = await storage.createCepZone(zoneData);
    
    res.status(201).json({ 
      success: true, 
      zone,
      message: "Zona CEP criada com sucesso" 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos",
        errors: error.errors
      });
    }
    
    console.error("Error creating CEP zone:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erro interno do servidor" 
    });
  }
});

// PUT /api/admin/cep-zones/:id - Update zone
router.put("/admin/cep-zones/:id", requireAdminAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "ID da zona inválido"
      });
    }
    
    const validatedData = cepZoneInputSchema.parse(req.body);
    
    // Parse ranges from text input
    const ranges = parseRangesFromText(validatedData.rangesText);
    
    if (ranges.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Nenhuma faixa de CEP válida encontrada. Use o formato: 58083000...58083500"
      });
    }
    
    // When updating, only check priority if it's being changed
    if (validatedData.priority) {
      const existingZones = await storage.getCepZones();
      const duplicatePriority = existingZones.find(zone => 
        zone.active && zone.id !== id && zone.priority === validatedData.priority
      );
      
      if (duplicatePriority) {
        return res.status(400).json({
          success: false,
          message: `Já existe uma zona com prioridade ${validatedData.priority}: ${duplicatePriority.name}. Use os botões de seta para reordenar.`
        });
      }
    }
    
    // Update the zone (only include priority if provided)
    const updateData: any = {
      name: validatedData.name,
      description: validatedData.description || null,
      cepRanges: JSON.stringify(ranges),
      price: validatedData.price,
    };
    
    // Only update priority if explicitly provided
    if (validatedData.priority !== undefined) {
      updateData.priority = validatedData.priority;
    }
    
    const zone = await storage.updateCepZone(id, updateData);
    
    if (!zone) {
      return res.status(404).json({
        success: false,
        message: "Zona não encontrada"
      });
    }
    
    res.json({ 
      success: true, 
      zone,
      message: "Zona CEP atualizada com sucesso" 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos",
        errors: error.errors
      });
    }
    
    console.error("Error updating CEP zone:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erro interno do servidor" 
    });
  }
});

// DELETE /api/admin/cep-zones/:id - Delete (deactivate) zone and reorder priorities
router.delete("/admin/cep-zones/:id", requireAdminAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "ID da zona inválido"
      });
    }
    
    // Get the zone to be deleted
    const existingZones = await storage.getCepZones();
    const zoneToDelete = existingZones.find(zone => zone.id === id);
    
    if (!zoneToDelete) {
      return res.status(404).json({
        success: false,
        message: "Zona não encontrada"
      });
    }
    
    // Soft delete by setting active to false
    await storage.updateCepZone(id, { active: false });
    
    // Reorder priorities of remaining active zones
    const remainingActiveZones = existingZones
      .filter(zone => zone.active && zone.id !== id)
      .sort((a, b) => (a.priority || 1) - (b.priority || 1));
    
    // Update priorities to be sequential (1, 2, 3, ...)
    for (let i = 0; i < remainingActiveZones.length; i++) {
      const newPriority = i + 1;
      if (remainingActiveZones[i].priority !== newPriority) {
        await storage.updateCepZone(remainingActiveZones[i].id, { priority: newPriority });
      }
    }
    
    res.json({ 
      success: true, 
      message: "Zona CEP removida e prioridades reajustadas com sucesso" 
    });
  } catch (error) {
    console.error("Error deleting CEP zone:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erro interno do servidor" 
    });
  }
});

// GET /api/cep-zones/check/:zipCode - Check zone for CEP (public endpoint)
router.get("/cep-zones/check/:zipCode", async (req, res) => {
  try {
    const { zipCode } = req.params;
    
    if (!zipCode || zipCode.length < 8) {
      return res.status(400).json({
        success: false,
        message: "CEP inválido"
      });
    }
    
    const zones = await storage.getCepZones(true); // Only active zones
    const result = calculateCepZoneDelivery(zipCode, zones);
    
    res.json({ 
      success: true, 
      result 
    });
  } catch (error) {
    console.error("Error checking CEP zone:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erro interno do servidor" 
    });
  }
});

// PUT /api/admin/cep-zones/reorder - Reorder zones by priority  
router.put("/admin/cep-zones/reorder", requireAdminAuth, async (req, res) => {
  try {
    console.log("🔄 REORDER REQUEST RECEIVED");
    console.log("Raw request body:", JSON.stringify(req.body, null, 2));
    console.log("Request headers:", req.headers['content-type']);
    
    const { zones } = req.body; // Array of { id, priority }
    console.log("Extracted zones:", zones);
    
    if (!Array.isArray(zones)) {
      console.error("Zones is not an array:", zones);
      return res.status(400).json({
        success: false,
        message: "Dados de prioridade inválidos - zones deve ser um array"
      });
    }
    
    if (zones.length !== 2) {
      console.error("Invalid zones length:", zones.length);
      return res.status(400).json({
        success: false,
        message: "Dados de prioridade inválidos - deve conter exatamente 2 zonas para trocar"
      });
    }
    
    // Validate each zone update
    for (const zone of zones) {
      console.log("Validating zone:", zone);
      if (!zone.hasOwnProperty('id') || !zone.hasOwnProperty('priority')) {
        console.error("Missing required properties:", zone);
        return res.status(400).json({
          success: false,
          message: "Cada zona deve ter propriedades 'id' e 'priority'"
        });
      }
      
      if (typeof zone.id !== 'number' || typeof zone.priority !== 'number' || zone.priority < 1) {
        console.error("Invalid zone data types:", zone);
        return res.status(400).json({
          success: false,
          message: `Dados inválidos para zona: ID=${zone.id} (tipo: ${typeof zone.id}), prioridade=${zone.priority} (tipo: ${typeof zone.priority})`
        });
      }
    }
    
    console.log("Updating zones with new priorities...");
    // Update priorities in batch (swap)
    for (const zone of zones) {
      console.log(`Updating zone ${zone.id} to priority ${zone.priority}`);
      await storage.updateCepZone(zone.id, { priority: zone.priority });
    }
    
    console.log("Reorder completed successfully");
    res.json({
      success: true,
      message: "Prioridades atualizadas com sucesso"
    });
  } catch (error) {
    console.error("Error reordering CEP zones:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao reordenar zonas"
    });
  }
});

export default router;
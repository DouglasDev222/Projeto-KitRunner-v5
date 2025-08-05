import { eq, and, desc } from "drizzle-orm";
import { storage } from "./storage";
import { db } from "./db";
import { policyDocuments, policyAcceptances } from "@shared/schema";
import type { NewPolicyDocument, NewPolicyAcceptance, PolicyDocument } from "@shared/schema";

export class PolicyService {
  /**
   * Get active policy by type
   */
  static async getActivePolicyByType(type: 'register' | 'order'): Promise<PolicyDocument | null> {
    try {
      const policies = await db
        .select()
        .from(policyDocuments)
        .where(and(
          eq(policyDocuments.type, type),
          eq(policyDocuments.active, true)
        ))
        .orderBy(desc(policyDocuments.updatedAt))
        .limit(1);

      return policies[0] || null;
    } catch (error) {
      console.error(`Error getting active policy for type ${type}:`, error);
      throw error;
    }
  }

  /**
   * Create new policy document
   */
  static async createPolicy(data: NewPolicyDocument): Promise<PolicyDocument> {
    try {
      // Deactivate existing active policy of the same type
      await db
        .update(policyDocuments)
        .set({ active: false, updatedAt: new Date() })
        .where(and(
          eq(policyDocuments.type, data.type),
          eq(policyDocuments.active, true)
        ));

      // Create new policy
      const newPolicy = await db
        .insert(policyDocuments)
        .values({
          ...data,
          active: true,
          updatedAt: new Date()
        })
        .returning();

      return newPolicy[0];
    } catch (error) {
      console.error('Error creating policy:', error);
      throw error;
    }
  }

  /**
   * Update existing policy
   */
  static async updatePolicy(id: number, data: Partial<NewPolicyDocument>): Promise<PolicyDocument | null> {
    try {
      // If activating this policy, deactivate others of the same type
      if (data.active === true) {
        const currentPolicy = await db
          .select()
          .from(policyDocuments)
          .where(eq(policyDocuments.id, id))
          .limit(1);

        if (currentPolicy[0]) {
          await db
            .update(policyDocuments)
            .set({ active: false, updatedAt: new Date() })
            .where(and(
              eq(policyDocuments.type, currentPolicy[0].type),
              eq(policyDocuments.active, true)
            ));
        }
      }

      const updated = await db
        .update(policyDocuments)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(policyDocuments.id, id))
        .returning();

      return updated[0] || null;
    } catch (error) {
      console.error('Error updating policy:', error);
      throw error;
    }
  }

  /**
   * Get all policies (for admin)
   */
  static async getAllPolicies(): Promise<PolicyDocument[]> {
    try {
      return await db
        .select()
        .from(policyDocuments)
        .orderBy(desc(policyDocuments.updatedAt));
    } catch (error) {
      console.error('Error getting all policies:', error);
      throw error;
    }
  }

  /**
   * Get policy by ID
   */
  static async getPolicyById(id: number): Promise<PolicyDocument | null> {
    try {
      const policies = await db
        .select()
        .from(policyDocuments)
        .where(eq(policyDocuments.id, id))
        .limit(1);

      return policies[0] || null;
    } catch (error) {
      console.error('Error getting policy by ID:', error);
      throw error;
    }
  }

  /**
   * Create policy acceptance record
   */
  static async createPolicyAcceptance(data: NewPolicyAcceptance): Promise<void> {
    try {
      await db
        .insert(policyAcceptances)
        .values(data);
    } catch (error) {
      console.error('Error creating policy acceptance:', error);
      throw error;
    }
  }

  /**
   * Check if user has accepted a specific policy
   */
  static async hasUserAcceptedPolicy(userId: number, policyId: number, context: 'register' | 'order'): Promise<boolean> {
    try {
      const acceptances = await db
        .select()
        .from(policyAcceptances)
        .where(and(
          eq(policyAcceptances.userId, userId),
          eq(policyAcceptances.policyId, policyId),
          eq(policyAcceptances.context, context)
        ))
        .limit(1);

      return acceptances.length > 0;
    } catch (error) {
      console.error('Error checking policy acceptance:', error);
      throw error;
    }
  }

  /**
   * Get user's policy acceptances
   */
  static async getUserAcceptances(userId: number): Promise<any[]> {
    try {
      return await db
        .select({
          id: policyAcceptances.id,
          policyId: policyAcceptances.policyId,
          acceptedAt: policyAcceptances.acceptedAt,
          context: policyAcceptances.context,
          orderId: policyAcceptances.orderId,
          policyTitle: policyDocuments.title,
          policyType: policyDocuments.type
        })
        .from(policyAcceptances)
        .leftJoin(policyDocuments, eq(policyAcceptances.policyId, policyDocuments.id))
        .where(eq(policyAcceptances.userId, userId))
        .orderBy(desc(policyAcceptances.acceptedAt));
    } catch (error) {
      console.error('Error getting user acceptances:', error);
      throw error;
    }
  }

  /**
   * Delete policy (soft delete by setting inactive)
   */
  static async deletePolicy(id: number): Promise<boolean> {
    try {
      const updated = await db
        .update(policyDocuments)
        .set({ 
          active: false, 
          updatedAt: new Date() 
        })
        .where(eq(policyDocuments.id, id))
        .returning();

      return updated.length > 0;
    } catch (error) {
      console.error('Error deleting policy:', error);
      throw error;
    }
  }
}
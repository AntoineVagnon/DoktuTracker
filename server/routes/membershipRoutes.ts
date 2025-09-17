/**
 * Additional Membership API Routes
 * Complementary routes to complete the membership system API coverage
 */

import type { Express } from "express";
import { membershipService } from "../services/membershipService";
import { isAuthenticated } from "../supabaseAuth";
import { strictLimiter } from "../middleware/security";
import { storage } from "../storage";
import { z } from "zod";

export function registerMembershipRoutes(app: Express) {
  
  // Get user's allowance status and cycle information
  app.get("/api/membership/allowance", isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const userId = parseInt(req.user.id);
      
      console.log(`🔍 Fetching allowance status for user ID: ${userId}`);
      const allowanceStatus = await membershipService.getAllowanceStatus(userId);
      console.log(`📊 Allowance status result:`, allowanceStatus);
      
      if (!allowanceStatus) {
        console.log(`❌ No allowance status found for user ${userId}`);
        return res.json({
          hasAllowance: false,
          allowanceStatus: null,
          message: "No active subscription found"
        });
      }
      
      console.log(`✅ Returning allowance data for user ${userId}:`, {
        cycleId: allowanceStatus.cycleId,
        allowanceGranted: allowanceStatus.allowanceGranted,
        allowanceUsed: allowanceStatus.allowanceUsed,
        allowanceRemaining: allowanceStatus.allowanceRemaining,
        isActive: allowanceStatus.isActive
      });
      
      res.json({
        hasAllowance: true,
        allowanceStatus: {
          cycleId: allowanceStatus.cycleId,
          allowanceGranted: allowanceStatus.allowanceGranted,
          allowanceUsed: allowanceStatus.allowanceUsed,
          allowanceRemaining: allowanceStatus.allowanceRemaining,
          cycleStart: allowanceStatus.cycleStart,
          cycleEnd: allowanceStatus.cycleEnd,
          resetDate: allowanceStatus.resetDate,
          isActive: allowanceStatus.isActive
        }
      });
    } catch (error) {
      console.error("Error fetching allowance status:", error);
      res.status(500).json({ error: "Failed to fetch allowance status" });
    }
  });

  // Get allowance event history for current cycle
  app.get("/api/membership/allowance/history", isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const userId = parseInt(req.user.id);
      
      const allowanceStatus = await membershipService.getAllowanceStatus(userId);
      
      if (!allowanceStatus) {
        return res.status(404).json({ error: "No active subscription found" });
      }
      
      const history = await membershipService.getAllowanceEventHistory(allowanceStatus.cycleId);
      
      res.json({
        cycleId: allowanceStatus.cycleId,
        events: history.map(event => ({
          id: event.id,
          eventType: event.eventType,
          appointmentId: event.appointmentId,
          amountChanged: event.amountChanged,
          previousBalance: event.previousBalance,
          newBalance: event.newBalance,
          reason: event.reason,
          timestamp: event.timestamp
        }))
      });
    } catch (error) {
      console.error("Error fetching allowance history:", error);
      res.status(500).json({ error: "Failed to fetch allowance history" });
    }
  });

  // Check if specific appointment would be covered
  app.post("/api/membership/check-appointment-coverage", isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const userId = parseInt(req.user.id);
      const { appointmentPrice, appointmentDate } = req.body;

      // Validate request body
      const checkCoverageSchema = z.object({
        appointmentPrice: z.number().positive(),
        appointmentDate: z.string().datetime().optional()
      });

      const validatedData = checkCoverageSchema.parse({
        appointmentPrice,
        appointmentDate
      });

      const parsedDate = validatedData.appointmentDate ? new Date(validatedData.appointmentDate) : undefined;

      const coverageResult = await membershipService.checkAppointmentCoverage(
        userId,
        validatedData.appointmentPrice,
        parsedDate
      );

      res.json({
        coverage: {
          isCovered: coverageResult.isCovered,
          coverageType: coverageResult.coverageType,
          originalPrice: coverageResult.originalPrice,
          coveredAmount: coverageResult.coveredAmount,
          patientPaid: coverageResult.patientPaid,
          allowanceDeducted: coverageResult.allowanceDeducted,
          remainingAllowance: coverageResult.remainingAllowance,
          reason: coverageResult.reason
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid request data", 
          details: error.errors 
        });
      }
      
      console.error("Error checking appointment coverage:", error);
      res.status(500).json({ error: "Failed to check appointment coverage" });
    }
  });

  // Get subscription billing history (simplified for now)
  app.get("/api/membership/billing-history", isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const userId = parseInt(req.user.id);
      const user = req.user;
      
      if (!user?.stripeCustomerId) {
        return res.json({
          billingHistory: [],
          message: "No billing history found"
        });
      }

      // Note: In a full implementation, this would fetch actual billing history from Stripe
      // For now, we return a placeholder structure
      res.json({
        billingHistory: [
          {
            id: "placeholder",
            date: new Date(),
            amount: 0,
            currency: "EUR",
            status: "succeeded",
            description: "Membership subscription",
            invoiceUrl: null
          }
        ],
        message: "Billing history would be fetched from Stripe in full implementation"
      });
    } catch (error) {
      console.error("Error fetching billing history:", error);
      res.status(500).json({ error: "Failed to fetch billing history" });
    }
  });

  // Change subscription plan (upgrade/downgrade)
  app.post("/api/membership/change-plan", strictLimiter, isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const userId = parseInt(req.user.id);
      const user = req.user;
      const { newPlanId } = req.body;

      if (!newPlanId) {
        return res.status(400).json({ error: "New plan ID is required" });
      }

      if (!user?.stripeSubscriptionId) {
        return res.status(400).json({ error: "No active subscription found to modify" });
      }

      // Validate new plan exists
      const planConfigs = membershipService.getPlanConfigurations();
      if (!planConfigs[newPlanId]) {
        return res.status(400).json({ error: "Invalid plan selected" });
      }

      // Note: In a full implementation, this would:
      // 1. Update the Stripe subscription with new price
      // 2. Calculate prorated charges
      // 3. Update allowance cycles accordingly
      // 4. Handle immediate vs. end-of-period changes

      res.json({
        success: false,
        message: "Plan changes not fully implemented yet",
        availablePlans: Object.keys(planConfigs),
        currentSubscription: user.stripeSubscriptionId,
        requestedPlan: newPlanId
      });
    } catch (error) {
      console.error("Error changing subscription plan:", error);
      res.status(500).json({ error: "Failed to change subscription plan" });
    }
  });

  // Note: Reactivate endpoint is implemented in server/routes.ts

  // Get membership recommendations for user
  app.get("/api/membership/recommendations", isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const userId = parseInt(req.user.id);
      
      // Get current subscription status
      const allowanceStatus = await membershipService.getAllowanceStatus(userId);
      const planConfigs = membershipService.getPlanConfigurations();
      
      // Simple recommendation logic
      let recommendations = [];
      
      if (!allowanceStatus) {
        // User has no subscription - recommend based on usage patterns
        recommendations = [
          {
            planId: 'monthly_plan',
            reason: 'Perfect for trying out our service',
            savings: null,
            priority: 'high'
          },
          {
            planId: 'biannual_plan',
            reason: 'Best value with 23% savings',
            savings: '23%',
            priority: 'medium'
          }
        ];
      } else {
        // User has subscription - suggest alternatives
        if (allowanceStatus.allowanceUsed >= allowanceStatus.allowanceGranted * 0.8) {
          recommendations.push({
            planId: 'biannual_plan',
            reason: 'You are using most of your allowance - consider upgrading for better value',
            savings: '23%',
            priority: 'high'
          });
        }
      }
      
      res.json({
        recommendations: recommendations.map(rec => ({
          ...rec,
          planDetails: planConfigs[rec.planId]
        })),
        currentSubscription: allowanceStatus ? {
          allowanceUsage: `${allowanceStatus.allowanceUsed}/${allowanceStatus.allowanceGranted}`,
          utilizationRate: Math.round((allowanceStatus.allowanceUsed / allowanceStatus.allowanceGranted) * 100)
        } : null
      });
    } catch (error) {
      console.error("Error generating membership recommendations:", error);
      res.status(500).json({ error: "Failed to generate recommendations" });
    }
  });

  // Health check for membership service
  app.get("/api/membership/health", async (req, res) => {
    try {
      const planConfigs = membershipService.getPlanConfigurations();
      const planCount = Object.keys(planConfigs).length;
      
      res.json({
        status: "healthy",
        service: "membership",
        timestamp: new Date(),
        availablePlans: planCount,
        features: [
          "subscription_management",
          "allowance_tracking", 
          "coverage_determination",
          "billing_integration"
        ]
      });
    } catch (error) {
      console.error("Membership service health check failed:", error);
      res.status(500).json({ 
        status: "unhealthy", 
        service: "membership",
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
}
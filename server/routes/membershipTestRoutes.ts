/**
 * Membership Testing Routes
 *
 * These endpoints allow testing of subscription renewals by:
 * - Fast-forwarding subscription dates
 * - Manually triggering renewals
 * - Viewing renewal history
 *
 * ⚠️ WARNING: These endpoints should ONLY be available in development/staging!
 */

import type { Express } from "express";
import { db } from "../db";
import {
  membershipSubscriptions,
  membershipCycles,
  membershipAllowanceEvents,
  users
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { membershipService } from "../services/membershipService";
import { isAuthenticated } from "../supabaseAuth";
import Stripe from "stripe";

export function registerMembershipTestRoutes(app: Express, stripe: Stripe) {
  // ONLY enable in development/staging - SECURITY FIX
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️ Membership test routes are DISABLED in production for security');
    return;
  }

  console.log('✅ Membership test routes ENABLED (development/staging mode)');

  // Health check
  app.get("/api/test/membership/status", async (req, res) => {
    try {
      res.json({
        status: "operational",
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        message: "Membership testing endpoints available"
      });
    } catch (error) {
      res.status(500).json({ error: "Health check failed" });
    }
  });

  /**
   * Fast-forward subscription dates to test renewals
   *
   * This endpoint allows you to artificially advance a subscription's period
   * to test renewal behavior without waiting for real time to pass.
   *
   * POST /api/test/membership/fast-forward
   * Body: { userId: number, daysToAdd: number }
   *
   * Example: Add 30 days to test monthly renewal
   */
  app.post("/api/test/membership/fast-forward", isAuthenticated, async (req, res) => {
    try {
      const { daysToAdd } = req.body;
      const userId = parseInt(req.user.id);

      if (!daysToAdd || daysToAdd <= 0) {
        return res.status(400).json({ error: "daysToAdd must be a positive number" });
      }

      console.log(`⏩ Fast-forwarding subscription for user ${userId} by ${daysToAdd} days`);

      // Get user's subscription
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user?.stripeSubscriptionId) {
        return res.status(404).json({ error: "No active subscription found" });
      }

      // Get membership subscription record
      const [membershipSub] = await db
        .select()
        .from(membershipSubscriptions)
        .where(eq(membershipSubscriptions.stripeSubscriptionId, user.stripeSubscriptionId))
        .limit(1);

      if (!membershipSub) {
        return res.status(404).json({ error: "No membership subscription record found" });
      }

      // Get current cycle
      const [currentCycle] = await db
        .select()
        .from(membershipCycles)
        .where(
          and(
            eq(membershipCycles.subscriptionId, membershipSub.id),
            eq(membershipCycles.isActive, true)
          )
        )
        .limit(1);

      if (!currentCycle) {
        return res.status(404).json({ error: "No active cycle found" });
      }

      // Calculate new dates
      const originalEnd = new Date(membershipSub.currentPeriodEnd);
      const newEnd = new Date(originalEnd);
      newEnd.setDate(newEnd.getDate() - daysToAdd); // Move end date backwards to make it "expire sooner"

      const now = new Date();
      const hasExpired = newEnd <= now;

      console.log(`📅 Original period end: ${originalEnd.toISOString()}`);
      console.log(`📅 Adjusted period end: ${newEnd.toISOString()}`);
      console.log(`📅 Current time: ${now.toISOString()}`);
      console.log(`⏰ Has expired: ${hasExpired}`);

      // Update database period dates
      await db
        .update(membershipSubscriptions)
        .set({
          currentPeriodEnd: newEnd,
          updatedAt: now
        })
        .where(eq(membershipSubscriptions.id, membershipSub.id));

      // Update cycle end date
      await db
        .update(membershipCycles)
        .set({
          cycleEnd: newEnd,
          resetDate: newEnd,
          updatedAt: now
        })
        .where(eq(membershipCycles.id, currentCycle.id));

      res.json({
        success: true,
        message: `Fast-forwarded ${daysToAdd} days`,
        subscription: {
          id: membershipSub.id,
          stripeSubscriptionId: membershipSub.stripeSubscriptionId,
          originalPeriodEnd: originalEnd,
          adjustedPeriodEnd: newEnd,
          hasExpired,
          daysUntilExpiry: hasExpired ? 0 : Math.ceil((newEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        },
        cycle: {
          id: currentCycle.id,
          cycleStart: currentCycle.cycleStart,
          cycleEnd: newEnd,
          allowanceRemaining: currentCycle.allowanceRemaining
        },
        nextSteps: hasExpired
          ? "Subscription has expired. Call /api/test/membership/trigger-renewal to simulate renewal payment."
          : `Subscription will expire in ${Math.ceil((newEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} days. Add more days to make it expire.`
      });
    } catch (error: any) {
      console.error("Error fast-forwarding subscription:", error);
      res.status(500).json({ error: error.message || "Failed to fast-forward subscription" });
    }
  });

  /**
   * Manually trigger a subscription renewal
   *
   * This simulates Stripe sending an invoice.payment_succeeded webhook
   * with billing_reason='subscription_cycle' to test the renewal logic.
   *
   * POST /api/test/membership/trigger-renewal
   * Body: { userId: number }
   */
  app.post("/api/test/membership/trigger-renewal", isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.user.id);

      console.log(`🔄 Manually triggering renewal for user ${userId}`);

      // Get user's subscription
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user?.stripeSubscriptionId) {
        return res.status(404).json({ error: "No active subscription found" });
      }

      // Get Stripe subscription to get current period
      const stripeSubscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

      // Get membership subscription record
      const [membershipSub] = await db
        .select()
        .from(membershipSubscriptions)
        .where(eq(membershipSubscriptions.stripeSubscriptionId, user.stripeSubscriptionId))
        .limit(1);

      if (!membershipSub) {
        return res.status(404).json({ error: "No membership subscription record found" });
      }

      // Calculate new period (current period + interval)
      const planConfig = membershipService.getPlanConfigurations()[membershipSub.planId];
      if (!planConfig) {
        return res.status(404).json({ error: "Invalid plan configuration" });
      }

      // Use current period end as new period start
      const newPeriodStart = new Date(membershipSub.currentPeriodEnd);
      const newPeriodEnd = new Date(newPeriodStart);

      // Add interval based on plan
      if (planConfig.intervalCount === 6) {
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 6);
      } else {
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
      }

      console.log(`📅 New period: ${newPeriodStart.toISOString()} to ${newPeriodEnd.toISOString()}`);

      // Renew the allowance cycle
      const newCycle = await membershipService.renewAllowanceCycle(
        membershipSub.id,
        newPeriodStart,
        newPeriodEnd
      );

      // Update subscription period dates
      await db
        .update(membershipSubscriptions)
        .set({
          currentPeriodStart: newPeriodStart,
          currentPeriodEnd: newPeriodEnd,
          updatedAt: new Date()
        })
        .where(eq(membershipSubscriptions.id, membershipSub.id));

      console.log(`✅ Renewal complete for user ${userId}`);

      res.json({
        success: true,
        message: "Subscription renewed successfully",
        renewal: {
          subscriptionId: membershipSub.id,
          plan: planConfig.name,
          previousPeriod: {
            start: membershipSub.currentPeriodStart,
            end: membershipSub.currentPeriodEnd
          },
          newPeriod: {
            start: newPeriodStart,
            end: newPeriodEnd
          },
          newCycle: {
            id: newCycle.id,
            allowanceGranted: newCycle.allowanceGranted,
            allowanceRemaining: newCycle.allowanceRemaining,
            cycleStart: newCycle.cycleStart,
            cycleEnd: newCycle.cycleEnd
          }
        }
      });
    } catch (error: any) {
      console.error("Error triggering renewal:", error);
      res.status(500).json({ error: error.message || "Failed to trigger renewal" });
    }
  });

  /**
   * View renewal history for a subscription
   *
   * GET /api/test/membership/renewal-history
   */
  app.get("/api/test/membership/renewal-history", isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.user.id);

      // Get user's subscription
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user?.stripeSubscriptionId) {
        return res.status(404).json({ error: "No active subscription found" });
      }

      // Get membership subscription record
      const [membershipSub] = await db
        .select()
        .from(membershipSubscriptions)
        .where(eq(membershipSubscriptions.stripeSubscriptionId, user.stripeSubscriptionId))
        .limit(1);

      if (!membershipSub) {
        return res.status(404).json({ error: "No membership subscription record found" });
      }

      // Get all cycles for this subscription
      const cycles = await db
        .select()
        .from(membershipCycles)
        .where(eq(membershipCycles.subscriptionId, membershipSub.id))
        .orderBy(desc(membershipCycles.createdAt));

      // Get all events
      const events = await db
        .select()
        .from(membershipAllowanceEvents)
        .where(eq(membershipAllowanceEvents.subscriptionId, membershipSub.id))
        .orderBy(desc(membershipAllowanceEvents.createdAt))
        .limit(50);

      res.json({
        subscription: {
          id: membershipSub.id,
          planId: membershipSub.planId,
          status: membershipSub.status,
          activatedAt: membershipSub.activatedAt,
          currentPeriodStart: membershipSub.currentPeriodStart,
          currentPeriodEnd: membershipSub.currentPeriodEnd
        },
        cycles: cycles.map(cycle => ({
          id: cycle.id,
          cycleStart: cycle.cycleStart,
          cycleEnd: cycle.cycleEnd,
          allowanceGranted: cycle.allowanceGranted,
          allowanceUsed: cycle.allowanceUsed,
          allowanceRemaining: cycle.allowanceRemaining,
          isActive: cycle.isActive,
          createdAt: cycle.createdAt
        })),
        recentEvents: events.map(event => ({
          id: event.id,
          cycleId: event.cycleId,
          eventType: event.eventType,
          allowanceChange: event.allowanceChange,
          allowanceBefore: event.allowanceBefore,
          allowanceAfter: event.allowanceAfter,
          reason: event.reason,
          createdAt: event.createdAt
        })),
        summary: {
          totalCycles: cycles.length,
          activeCycles: cycles.filter(c => c.isActive).length,
          totalEvents: events.length
        }
      });
    } catch (error: any) {
      console.error("Error fetching renewal history:", error);
      res.status(500).json({ error: error.message || "Failed to fetch renewal history" });
    }
  });

  /**
   * Reset subscription to initial state (for testing)
   *
   * POST /api/test/membership/reset
   */
  app.post("/api/test/membership/reset", isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.user.id);

      console.log(`🔄 Resetting subscription for user ${userId}`);

      // Get user's subscription
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user?.stripeSubscriptionId) {
        return res.status(404).json({ error: "No active subscription found" });
      }

      // Get Stripe subscription
      const stripeSubscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

      // Re-create initial allowance (this will clean up and recreate)
      await membershipService.createInitialAllowance(userId);

      console.log(`✅ Subscription reset for user ${userId}`);

      res.json({
        success: true,
        message: "Subscription reset to initial state",
        subscriptionId: user.stripeSubscriptionId,
        periodStart: new Date(stripeSubscription.current_period_start * 1000),
        periodEnd: new Date(stripeSubscription.current_period_end * 1000)
      });
    } catch (error: any) {
      console.error("Error resetting subscription:", error);
      res.status(500).json({ error: error.message || "Failed to reset subscription" });
    }
  });
}

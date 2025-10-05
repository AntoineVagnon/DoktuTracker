import { 
  membershipPlans, 
  membershipSubscriptions, 
  membershipCycles,
  membershipAllowanceEvents,
  appointmentCoverage,
  billingAttempts,
  users,
  appointments,
  type MembershipPlan,
  type MembershipSubscription,
  type MembershipCycle,
  type InsertMembershipSubscription,
  type InsertMembershipCycle,
  type InsertMembershipAllowanceEvent
} from "@shared/schema";
import { db } from "../db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { addMonths, startOfMonth, endOfMonth, isAfter, isBefore } from "date-fns";
import Stripe from "stripe";

export interface PlanConfiguration {
  id: string;
  name: string;
  priceAmount: number; // in cents
  interval: 'month';
  intervalCount: number;
  allowancePerCycle: number;
  description: string;
}

export interface AllowanceStatus {
  cycleId: string;
  allowanceGranted: number;
  allowanceUsed: number;
  allowanceRemaining: number;
  cycleStart: Date;
  cycleEnd: Date;
  resetDate: Date;
  isActive: boolean;
}

export interface CoverageResult {
  isCovered: boolean;
  coverageType: 'full_coverage' | 'partial_coverage' | 'no_coverage';
  originalPrice: number;
  coveredAmount: number;
  patientPaid: number;
  allowanceDeducted: number;
  remainingAllowance: number;
  reason?: string;
}

export class MembershipService {
  private stripe: Stripe;

  constructor(stripe: Stripe) {
    this.stripe = stripe;
  }

  /**
   * Get plan configurations - hardcoded for now but could come from database
   */
  getPlanConfigurations(): Record<string, PlanConfiguration> {
    return {
      "monthly_plan": {
        id: "monthly_plan",
        name: "Monthly Membership",
        priceAmount: 4500, // €45.00 in cents
        interval: 'month',
        intervalCount: 1,
        allowancePerCycle: 2,
        description: "2 consultations per month with certified doctors"
      },
      "biannual_plan": {
        id: "biannual_plan", 
        name: "6-Month Membership",
        priceAmount: 21900, // €219.00 in cents
        interval: 'month',
        intervalCount: 6,
        allowancePerCycle: 12,
        description: "12 consultations over 6 months (2 per month) with 23% savings"
      }
    };
  }

  /**
   * Create initial allowance cycle for new subscription
   */
  async createInitialAllowanceCycle(
    subscriptionId: string,
    planId: string,
    currentPeriodStart: Date,
    currentPeriodEnd: Date
  ): Promise<MembershipCycle> {
    console.log(`🔄 createInitialAllowanceCycle called with:`, {
      subscriptionId,
      planId,
      currentPeriodStart,
      currentPeriodEnd,
      isStartDateValid: currentPeriodStart instanceof Date && !isNaN(currentPeriodStart.getTime()),
      isEndDateValid: currentPeriodEnd instanceof Date && !isNaN(currentPeriodEnd.getTime())
    });

    const planConfig = this.getPlanConfigurations()[planId];
    if (!planConfig) {
      throw new Error(`Invalid plan ID: ${planId}`);
    }

    // Validate dates before creating cycle
    if (!(currentPeriodStart instanceof Date) || isNaN(currentPeriodStart.getTime())) {
      throw new Error(`Invalid currentPeriodStart date: ${currentPeriodStart}`);
    }
    if (!(currentPeriodEnd instanceof Date) || isNaN(currentPeriodEnd.getTime())) {
      throw new Error(`Invalid currentPeriodEnd date: ${currentPeriodEnd}`);
    }

    const cycleData: InsertMembershipCycle = {
      subscriptionId,
      cycleStart: currentPeriodStart,
      cycleEnd: currentPeriodEnd,
      allowanceGranted: planConfig.allowancePerCycle,
      allowanceUsed: 0,
      allowanceRemaining: planConfig.allowancePerCycle,
      resetDate: currentPeriodEnd,
      isActive: true
    };

    console.log(`💾 Inserting cycle data:`, cycleData);

    const [cycle] = await db.insert(membershipCycles).values(cycleData).returning();
    
    // Log the allowance grant event
    await this.logAllowanceEvent(cycle.id, 'granted', null, planConfig.allowancePerCycle, 0, planConfig.allowancePerCycle, 'Initial allowance grant');
    
    return cycle;
  }

  /**
   * Get current active allowance cycle for subscription
   */
  async getCurrentAllowanceCycle(subscriptionId: string): Promise<MembershipCycle | null> {
    const [cycle] = await db
      .select()
      .from(membershipCycles)
      .where(
        and(
          eq(membershipCycles.subscriptionId, subscriptionId),
          eq(membershipCycles.isActive, true)
        )
      )
      .orderBy(desc(membershipCycles.cycleStart))
      .limit(1);

    return cycle || null;
  }

  /**
   * Calculate allowance consumption for appointment booking
   */
  async consumeAllowance(
    subscriptionId: string,
    appointmentId: number,
    originalPrice: number,
    amount: number = 1
  ): Promise<CoverageResult> {
    const cycle = await this.getCurrentAllowanceCycle(subscriptionId);
    
    if (!cycle || !cycle.isActive) {
      return {
        isCovered: false,
        coverageType: 'no_coverage',
        originalPrice,
        coveredAmount: 0,
        patientPaid: originalPrice,
        allowanceDeducted: 0,
        remainingAllowance: 0,
        reason: 'No active allowance cycle found'
      };
    }

    if (cycle.allowanceRemaining < amount) {
      return {
        isCovered: false,
        coverageType: 'no_coverage',
        originalPrice,
        coveredAmount: 0,
        patientPaid: originalPrice,
        allowanceDeducted: 0,
        remainingAllowance: cycle.allowanceRemaining,
        reason: 'Insufficient allowance remaining'
      };
    }

    // Update cycle allowance
    const [updatedCycle] = await db
      .update(membershipCycles)
      .set({
        allowanceUsed: cycle.allowanceUsed + amount,
        allowanceRemaining: cycle.allowanceRemaining - amount,
        updatedAt: new Date()
      })
      .where(eq(membershipCycles.id, cycle.id))
      .returning();

    // Create coverage record
    const [coverageRecord] = await db
      .insert(appointmentCoverage)
      .values({
        appointmentId,
        subscriptionId,
        cycleId: cycle.id,
        originalPrice: originalPrice.toFixed(2),
        coveredAmount: originalPrice.toFixed(2),
        patientPaid: '0.00',
        coverageType: 'full_coverage'
      })
      .returning();

    // Log allowance consumption event
    await this.logAllowanceEvent(
      cycle.id,
      'consumed',
      appointmentId,
      -amount,
      cycle.allowanceRemaining,
      cycle.allowanceRemaining - amount,
      'Appointment booking'
    );

    return {
      isCovered: true,
      coverageType: 'full_coverage',
      originalPrice,
      coveredAmount: originalPrice,
      patientPaid: 0,
      allowanceDeducted: amount,
      remainingAllowance: updatedCycle.allowanceRemaining
    };
  }

  /**
   * Restore allowance when appointment is cancelled
   */
  async restoreAllowance(
    appointmentId: number,
    reason: string,
    amount: number = 1
  ): Promise<void> {
    // Find the coverage record for this appointment
    const [coverageRecord] = await db
      .select()
      .from(appointmentCoverage)
      .where(eq(appointmentCoverage.appointmentId, appointmentId))
      .limit(1);

    if (!coverageRecord || coverageRecord.coverageType === 'no_coverage') {
      return; // Nothing to restore
    }

    // Get the cycle
    const [cycle] = await db
      .select()
      .from(membershipCycles)
      .where(eq(membershipCycles.id, coverageRecord.cycleId!))
      .limit(1);

    if (!cycle) {
      throw new Error('Allowance cycle not found');
    }

    // Restore allowance (but don't exceed granted amount)
    const newUsed = Math.max(0, cycle.allowanceUsed - amount);
    const newRemaining = Math.min(cycle.allowanceGranted, cycle.allowanceRemaining + amount);

    await db
      .update(membershipCycles)
      .set({
        allowanceUsed: newUsed,
        allowanceRemaining: newRemaining,
        updatedAt: new Date()
      })
      .where(eq(membershipCycles.id, cycle.id));

    // Update coverage record to reflect cancellation
    await db
      .update(appointmentCoverage)
      .set({
        coverageType: 'cancelled'
      })
      .where(eq(appointmentCoverage.id, coverageRecord.id));

    // Log allowance restoration event
    await this.logAllowanceEvent(
      cycle.id,
      'restored',
      appointmentId,
      amount,
      cycle.allowanceRemaining,
      newRemaining,
      reason
    );
  }

  /**
   * Check appointment coverage eligibility
   */
  async checkAppointmentCoverage(
    patientId: number,
    appointmentPrice: number,
    appointmentDate?: Date
  ): Promise<CoverageResult> {
    // Get user's active subscription
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, patientId))
      .limit(1);

    if (!user?.stripeSubscriptionId) {
      return {
        isCovered: false,
        coverageType: 'no_coverage',
        originalPrice: appointmentPrice,
        coveredAmount: 0,
        patientPaid: appointmentPrice,
        allowanceDeducted: 0,
        remainingAllowance: 0,
        reason: 'No active subscription found'
      };
    }

    // First, get the membership subscription record using the Stripe subscription ID
    const [subscription] = await db
      .select()
      .from(membershipSubscriptions)
      .where(eq(membershipSubscriptions.stripeSubscriptionId, user.stripeSubscriptionId))
      .limit(1);

    if (!subscription) {
      return {
        isCovered: false,
        coverageType: 'no_coverage',
        originalPrice: appointmentPrice,
        coveredAmount: 0,
        patientPaid: appointmentPrice,
        allowanceDeducted: 0,
        remainingAllowance: 0,
        reason: 'No membership subscription record found'
      };
    }

    // Get current allowance cycle using the subscription UUID
    const cycle = await this.getCurrentAllowanceCycle(subscription.id);
    
    if (!cycle || !cycle.isActive) {
      return {
        isCovered: false,
        coverageType: 'no_coverage',
        originalPrice: appointmentPrice,
        coveredAmount: 0,
        patientPaid: appointmentPrice,
        allowanceDeducted: 0,
        remainingAllowance: 0,
        reason: 'No active allowance cycle'
      };
    }

    // Check if appointment date is within cycle period
    if (appointmentDate) {
      if (isBefore(appointmentDate, cycle.cycleStart) || isAfter(appointmentDate, cycle.cycleEnd)) {
        return {
          isCovered: false,
          coverageType: 'no_coverage',
          originalPrice: appointmentPrice,
          coveredAmount: 0,
          patientPaid: appointmentPrice,
          allowanceDeducted: 0,
          remainingAllowance: cycle.allowanceRemaining,
          reason: 'Appointment date outside of current cycle period'
        };
      }
    }

    // Check remaining allowance
    if (cycle.allowanceRemaining <= 0) {
      return {
        isCovered: false,
        coverageType: 'no_coverage',
        originalPrice: appointmentPrice,
        coveredAmount: 0,
        patientPaid: appointmentPrice,
        allowanceDeducted: 0,
        remainingAllowance: 0,
        reason: 'Allowance exhausted for current cycle'
      };
    }

    // Appointment is covered
    return {
      isCovered: true,
      coverageType: 'full_coverage',
      originalPrice: appointmentPrice,
      coveredAmount: appointmentPrice,
      patientPaid: 0,
      allowanceDeducted: 1,
      remainingAllowance: cycle.allowanceRemaining - 1
    };
  }

  /**
   * Process cycle renewal when subscription period rolls over
   */
  async renewAllowanceCycle(
    subscriptionId: string,
    newPeriodStart: Date,
    newPeriodEnd: Date
  ): Promise<MembershipCycle> {
    // Deactivate current cycle
    await db
      .update(membershipCycles)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(membershipCycles.subscriptionId, subscriptionId),
          eq(membershipCycles.isActive, true)
        )
      );

    // Get subscription to determine plan
    const [subscription] = await db
      .select()
      .from(membershipSubscriptions)
      .where(eq(membershipSubscriptions.id, subscriptionId))
      .limit(1);

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Create new cycle
    return this.createInitialAllowanceCycle(
      subscriptionId,
      subscription.planId,
      newPeriodStart,
      newPeriodEnd
    );
  }

  /**
   * Get allowance status for a user
   */
  async getAllowanceStatus(patientId: number): Promise<AllowanceStatus | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, patientId))
      .limit(1);

    if (!user?.stripeSubscriptionId) {
      return null;
    }

    // First, get the membership subscription record using the Stripe subscription ID
    const [subscription] = await db
      .select()
      .from(membershipSubscriptions)
      .where(eq(membershipSubscriptions.stripeSubscriptionId, user.stripeSubscriptionId))
      .limit(1);

    if (!subscription) {
      return null;
    }

    // Now use the subscription UUID to get the current cycle
    const cycle = await this.getCurrentAllowanceCycle(subscription.id);
    if (!cycle) {
      return null;
    }

    return {
      cycleId: cycle.id,
      allowanceGranted: cycle.allowanceGranted,
      allowanceUsed: cycle.allowanceUsed,
      allowanceRemaining: cycle.allowanceRemaining,
      cycleStart: cycle.cycleStart,
      cycleEnd: cycle.cycleEnd,
      resetDate: cycle.resetDate,
      isActive: cycle.isActive ?? false
    };
  }

  /**
   * Log allowance event for audit trail
   */
  private async logAllowanceEvent(
    cycleId: string,
    eventType: 'granted' | 'consumed' | 'restored' | 'expired',
    appointmentId: number | null,
    amountChanged: number,
    previousBalance: number,
    newBalance: number,
    reason: string
  ): Promise<void> {
    // Get the subscription ID from the cycle
    const [cycle] = await db
      .select({ subscriptionId: membershipCycles.subscriptionId })
      .from(membershipCycles)
      .where(eq(membershipCycles.id, cycleId))
      .limit(1);

    if (!cycle) {
      throw new Error('Cycle not found');
    }

    const eventData: InsertMembershipAllowanceEvent = {
      subscriptionId: cycle.subscriptionId,
      cycleId,
      eventType,
      appointmentId,
      allowanceChange: amountChanged,
      allowanceBefore: previousBalance,
      allowanceAfter: newBalance,
      reason
    };

    await db.insert(membershipAllowanceEvents).values(eventData);
  }

  /**
   * Get allowance event history for a cycle
   */
  async getAllowanceEventHistory(cycleId: string): Promise<any[]> {
    return db
      .select()
      .from(membershipAllowanceEvents)
      .where(eq(membershipAllowanceEvents.cycleId, cycleId))
      .orderBy(desc(membershipAllowanceEvents.createdAt));
  }

  /**
   * Create initial allowance for a user with an existing Stripe subscription
   * Used for retroactive allowance creation when subscription was paid before webhook was set up
   */
  async createInitialAllowance(patientId: number): Promise<void> {
    console.log(`🔧 Starting createInitialAllowance for patient ${patientId}`);

    // Get user with subscription ID
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, patientId))
      .limit(1);

    if (!user?.stripeSubscriptionId) {
      throw new Error('User does not have a Stripe subscription');
    }

    console.log(`✅ User has Stripe subscription: ${user.stripeSubscriptionId}`);

    // Clean up any potentially corrupted records first
    try {
      const existingRecords = await db
        .select()
        .from(membershipSubscriptions)
        .where(eq(membershipSubscriptions.stripeSubscriptionId, user.stripeSubscriptionId));

      console.log(`🔍 Found ${existingRecords.length} existing subscription records`);

      for (const record of existingRecords) {
        console.log(`🔍 Checking record:`, { id: record.id, planId: record.planId, hasValidDates: !!record.currentPeriodStart && !!record.currentPeriodEnd });

        // Delete cycles first
        try {
          const deletedCycles = await db
            .delete(membershipCycles)
            .where(eq(membershipCycles.subscriptionId, record.id))
            .returning();
          if (deletedCycles.length > 0) {
            console.log(`🗑️ Deleted ${deletedCycles.length} cycles for record ${record.id}`);
          }
        } catch (err) {
          console.warn(`⚠️ Could not delete cycles for ${record.id}:`, err);
        }

        // Then delete subscription
        await db
          .delete(membershipSubscriptions)
          .where(eq(membershipSubscriptions.id, record.id));
        console.log(`🗑️ Deleted subscription record ${record.id}`);
      }

      console.log(`✅ Cleanup complete, starting fresh`);
    } catch (cleanupError) {
      console.error(`❌ Cleanup error (continuing anyway):`, cleanupError);
    }

    // Check if subscription record already exists (should be none after cleanup)
    const [existingSubscription] = await db
      .select()
      .from(membershipSubscriptions)
      .where(eq(membershipSubscriptions.stripeSubscriptionId, user.stripeSubscriptionId))
      .limit(1);

    console.log(`🔍 After cleanup check:`, { exists: !!existingSubscription });

    // After cleanup, there should be no existing subscription
    if (existingSubscription) {
      console.error(`⚠️ Unexpected: subscription still exists after cleanup, this should not happen`);
      throw new Error('Failed to clean up existing records');
    }

    // Fetch subscription details from Stripe
    const stripeSubscription = await this.stripe.subscriptions.retrieve(user.stripeSubscriptionId);

    console.log(`📅 Stripe subscription data:`, {
      id: stripeSubscription.id,
      status: stripeSubscription.status,
      current_period_start: stripeSubscription.current_period_start,
      current_period_end: stripeSubscription.current_period_end,
      created: stripeSubscription.created,
      metadata: stripeSubscription.metadata
    });

    if (stripeSubscription.status !== 'active') {
      throw new Error(`Subscription is not active: ${stripeSubscription.status}`);
    }

    const planIdString = stripeSubscription.metadata?.planId || user.pendingSubscriptionPlan || 'monthly_plan';
    console.log(`📋 Plan ID from metadata/user: ${planIdString}`);

    // Get the plan configuration
    const planConfig = this.getPlanConfigurations()[planIdString];
    if (!planConfig) {
      throw new Error(`Invalid plan ID: ${planIdString}`);
    }

    // Find the plan in the database by interval_count
    const [plan] = await db
      .select()
      .from(membershipPlans)
      .where(eq(membershipPlans.intervalCount, planConfig.intervalCount))
      .limit(1);

    let planUuid: string;

    if (!plan) {
      console.log(`📝 Plan not found, creating: ${planConfig.name}`);

      // Create the plan if it doesn't exist
      const [newPlan] = await db
        .insert(membershipPlans)
        .values({
          name: planConfig.name,
          description: planConfig.description,
          priceAmount: planConfig.priceAmount, // Integer (cents)
          currency: 'EUR',
          intervalType: planConfig.intervalCount === 6 ? '6_months' : 'month',
          intervalCount: planConfig.intervalCount,
          allowancePerCycle: planConfig.allowancePerCycle,
          stripeProductId: null,
          stripePriceId: null,
          isActive: true
        })
        .returning();

      console.log(`✅ Created plan in database:`, { id: newPlan.id, name: newPlan.name });
      planUuid = newPlan.id;
    } else {
      console.log(`✅ Found plan in database:`, { id: plan.id, name: plan.name });
      planUuid = plan.id;
    }

    // Handle missing period dates (use fallback dates based on plan)
    let currentPeriodStart: Date;
    let currentPeriodEnd: Date;

    if (stripeSubscription.current_period_start && stripeSubscription.current_period_end) {
      // Use Stripe's dates if available
      currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
      currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
      console.log(`✅ Using Stripe period dates`);
    } else {
      // Fallback: use current date and calculate end based on plan
      console.warn(`⚠️ Stripe subscription missing period dates, using fallback`);
      currentPeriodStart = new Date();

      if (planConfig.intervalCount === 6) {
        // 6-month plan
        currentPeriodEnd = new Date(currentPeriodStart);
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 6);
      } else {
        // Monthly plan
        currentPeriodEnd = new Date(currentPeriodStart);
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
      }
    }

    console.log(`📅 Final dates to use:`, {
      currentPeriodStart: currentPeriodStart.toISOString(),
      currentPeriodEnd: currentPeriodEnd.toISOString()
    });

    // Validate created timestamp
    if (!stripeSubscription.created) {
      throw new Error(`Invalid subscription created timestamp: ${stripeSubscription.created}`);
    }

    // Create subscription record
    const subscriptionData: InsertMembershipSubscription = {
      patientId,
      planId: planUuid,
      stripeSubscriptionId: user.stripeSubscriptionId,
      stripeCustomerId: stripeSubscription.customer as string,
      status: 'active',
      currentPeriodStart,
      currentPeriodEnd,
      activatedAt: new Date(stripeSubscription.created * 1000)
    };

    console.log(`📋 Subscription data to insert:`, subscriptionData);

    const [subscription] = await db
      .insert(membershipSubscriptions)
      .values(subscriptionData)
      .returning();

    console.log(`✅ Created subscription record with ID: ${subscription.id}`);

    // Create initial allowance cycle
    await this.createInitialAllowanceCycle(
      subscription.id,
      planIdString,
      currentPeriodStart,
      currentPeriodEnd
    );

    console.log(`✅ Created subscription record and allowance cycle for user ${patientId}`);
  }

  /**
   * Handle subscription activation from Stripe webhook
   */
  async activateSubscription(
    stripeSubscriptionId: string,
    planId: string,
    patientId: number,
    currentPeriodStart: Date,
    currentPeriodEnd: Date
  ): Promise<void> {
    // Create subscription record in database
    const subscriptionData: InsertMembershipSubscription = {
      patientId,
      planId,
      stripeSubscriptionId,
      stripeCustomerId: '', // Will be filled by webhook
      status: 'active',
      currentPeriodStart,
      currentPeriodEnd,
      activatedAt: new Date()
    };

    const [subscription] = await db
      .insert(membershipSubscriptions)
      .values(subscriptionData)
      .returning();

    // Create initial allowance cycle
    await this.createInitialAllowanceCycle(
      subscription.id,
      planId,
      currentPeriodStart,
      currentPeriodEnd
    );
  }

  /**
   * Handle subscription cancellation
   */
  async cancelSubscription(
    stripeSubscriptionId: string,
    cancelledAt: Date,
    endsAt?: Date
  ): Promise<void> {
    await db
      .update(membershipSubscriptions)
      .set({
        status: 'cancelled',
        cancelledAt,
        endsAt,
        updatedAt: new Date()
      })
      .where(eq(membershipSubscriptions.stripeSubscriptionId, stripeSubscriptionId));

    // Deactivate current allowance cycle if subscription ends immediately
    if (endsAt && isBefore(endsAt, new Date())) {
      await db
        .update(membershipCycles)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(membershipCycles.subscriptionId, stripeSubscriptionId),
            eq(membershipCycles.isActive, true)
          )
        );
    }
  }
}

// Export singleton instance
export const membershipService = new (class extends MembershipService {
  constructor() {
    // This will be injected by the main application
    super(null as any);
  }
  
  initialize(stripe: Stripe) {
    (this as any).stripe = stripe;
  }
})();
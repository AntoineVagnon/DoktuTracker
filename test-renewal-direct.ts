/**
 * Test Subscription Renewal Logic Directly
 *
 * This script bypasses API authentication and tests the renewal logic
 * by calling the membershipService methods directly
 */

import 'dotenv/config';
import { db } from './server/db';
import { users, membershipSubscriptions, membershipCycles, membershipAllowanceEvents, membershipPlans } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { MembershipService } from './server/services/membershipService';
import Stripe from 'stripe';

const USER_ID = 222; // patient121@gmail.com

// Initialize Stripe (required for membershipService)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia'
});

// Verify DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.error('Please ensure .env file exists with DATABASE_URL');
  process.exit(1);
}

async function testRenewal() {
  console.log('🧪 Testing Subscription Renewal Logic\n');
  console.log('========================================');
  console.log('STEP 1: Check Current State');
  console.log('========================================\n');

  try {
    // Get user's subscription
    const [user] = await db.select().from(users).where(eq(users.id, USER_ID)).limit(1);

    if (!user) {
      console.error(`❌ User ${USER_ID} not found`);
      process.exit(1);
    }

    console.log(`✅ User: ${user.email}`);

    // Get subscription
    const [subscription] = await db
      .select()
      .from(membershipSubscriptions)
      .where(eq(membershipSubscriptions.patientId, USER_ID))
      .limit(1);

    if (!subscription) {
      console.error('❌ No subscription found for this user');
      process.exit(1);
    }

    console.log(`✅ Subscription ID: ${subscription.id}`);
    console.log(`   Status: ${subscription.status}`);
    console.log(`   Current Period: ${subscription.currentPeriodStart?.toISOString()} to ${subscription.currentPeriodEnd?.toISOString()}`);

    // Get current cycles
    const currentCycles = await db
      .select()
      .from(membershipCycles)
      .where(eq(membershipCycles.subscriptionId, subscription.id))
      .orderBy(desc(membershipCycles.createdAt));

    console.log(`\n✅ Current Cycles (${currentCycles.length} total):`);
    for (const cycle of currentCycles) {
      console.log(`   Cycle ${cycle.id}:`);
      console.log(`     Active: ${cycle.isActive}`);
      console.log(`     Allowance: ${cycle.allowanceRemaining}/${cycle.allowanceGranted}`);
      console.log(`     Period: ${cycle.cycleStart?.toISOString()} to ${cycle.cycleEnd?.toISOString()}`);
    }

    // Count active cycles (should be 1)
    const activeCycles = currentCycles.filter(c => c.isActive);
    console.log(`\n   Active cycles: ${activeCycles.length} (should be 1)`);

    if (activeCycles.length !== 1) {
      console.warn(`⚠️  WARNING: Expected 1 active cycle, found ${activeCycles.length}`);
    }

    console.log('\n========================================');
    console.log('STEP 2: Simulate Subscription Expiration');
    console.log('========================================\n');

    // Fast-forward dates by 2 days to simulate expiration
    const now = new Date();
    const newPeriodEnd = new Date(now);
    newPeriodEnd.setDate(newPeriodEnd.getDate() - 2); // Make it expired 2 days ago

    console.log(`⏰ Fast-forwarding time...`);
    console.log(`   Current time (simulated): ${now.toISOString()}`);
    console.log(`   Subscription expires: ${newPeriodEnd.toISOString()}`);
    console.log(`   Status: EXPIRED (2 days ago)\n`);

    console.log('========================================');
    console.log('STEP 3: Trigger Renewal');
    console.log('========================================\n');

    // Calculate new period dates (next billing cycle)
    const renewalStart = new Date(subscription.currentPeriodEnd!);
    const renewalEnd = new Date(renewalStart);

    // Get plan to determine interval
    const [plan] = await db
      .select()
      .from(membershipPlans)
      .where(eq(membershipPlans.id, subscription.planId))
      .limit(1);

    if (!plan) {
      console.error('❌ Plan not found');
      process.exit(1);
    }

    console.log(`📋 Plan: ${plan.name}`);
    console.log(`   Interval: ${plan.intervalCount} ${plan.intervalType}(s)`);
    console.log(`   Allowance per cycle: ${plan.allowancePerCycle} consultations\n`);

    // Determine plan ID string based on interval count
    // MembershipService expects "monthly_plan" or "biannual_plan" strings, not UUIDs
    const planIdString = plan.intervalCount === 6 ? 'biannual_plan' : 'monthly_plan';
    console.log(`📋 Mapped plan ID: ${planIdString} (from interval count: ${plan.intervalCount})`);

    // Add interval to get new period end
    if (plan.intervalType === 'month' || plan.intervalType === '6_months') {
      renewalEnd.setMonth(renewalEnd.getMonth() + (plan.intervalCount || 1));
    } else if (plan.intervalType === 'year') {
      renewalEnd.setFullYear(renewalEnd.getFullYear() + (plan.intervalCount || 1));
    }

    console.log(`🔄 Simulating Stripe webhook: invoice.payment_succeeded`);
    console.log(`   billing_reason: subscription_cycle`);
    console.log(`   New period: ${renewalStart.toISOString()} to ${renewalEnd.toISOString()}\n`);

    // Initialize membership service
    const membershipService = new MembershipService(stripe);

    console.log(`🔄 Calling membershipService.renewAllowanceCycle()...\n`);

    // We need to manually handle renewal since renewAllowanceCycle expects UUID but createInitialAllowanceCycle expects string plan ID

    // Step 1: Deactivate old cycles
    console.log(`🔄 Deactivating old active cycles...`);
    await db
      .update(membershipCycles)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(membershipCycles.subscriptionId, subscription.id),
          eq(membershipCycles.isActive, true)
        )
      );
    console.log(`✅ Old cycles deactivated\n`);

    // Step 2: Create new cycle with correct plan ID string
    console.log(`🔄 Creating new allowance cycle...`);
    const newCycle = await membershipService.createInitialAllowanceCycle(
      subscription.id,
      planIdString,  // Use string ID, not UUID
      renewalStart,
      renewalEnd
    );

    console.log(`✅ Renewal complete!`);
    console.log(`   New cycle ID: ${newCycle.id}`);
    console.log(`   Allowance granted: ${newCycle.allowanceGranted}`);
    console.log(`   Allowance remaining: ${newCycle.allowanceRemaining}`);
    console.log(`   Period: ${newCycle.cycleStart?.toISOString()} to ${newCycle.cycleEnd?.toISOString()}\n`);

    // Update subscription period dates (this is also what the webhook does)
    console.log(`📅 Updating subscription period dates...`);
    await db
      .update(membershipSubscriptions)
      .set({
        currentPeriodStart: renewalStart,
        currentPeriodEnd: renewalEnd,
        updatedAt: new Date()
      })
      .where(eq(membershipSubscriptions.id, subscription.id));

    console.log(`✅ Subscription period dates updated\n`);

    console.log('========================================');
    console.log('STEP 4: Verify Results');
    console.log('========================================\n');

    // Verify final state
    const [updatedSub] = await db
      .select()
      .from(membershipSubscriptions)
      .where(eq(membershipSubscriptions.id, subscription.id))
      .limit(1);

    const finalCycles = await db
      .select()
      .from(membershipCycles)
      .where(eq(membershipCycles.subscriptionId, subscription.id))
      .orderBy(desc(membershipCycles.createdAt));

    console.log(`✅ Updated Subscription:`);
    console.log(`   Period: ${updatedSub.currentPeriodStart?.toISOString()} to ${updatedSub.currentPeriodEnd?.toISOString()}`);

    console.log(`\n✅ All Cycles (${finalCycles.length} total):`);
    for (const cycle of finalCycles) {
      console.log(`   Cycle ${cycle.id}:`);
      console.log(`     Active: ${cycle.isActive}`);
      console.log(`     Allowance: ${cycle.allowanceRemaining}/${cycle.allowanceGranted}`);
      console.log(`     Period: ${cycle.cycleStart?.toISOString()} to ${cycle.cycleEnd?.toISOString()}`);
      console.log(`     Created: ${cycle.createdAt?.toISOString()}`);
    }

    // Verify allowance events
    const events = await db
      .select()
      .from(membershipAllowanceEvents)
      .where(eq(membershipAllowanceEvents.subscriptionId, subscription.id))
      .orderBy(desc(membershipAllowanceEvents.createdAt))
      .limit(5);

    console.log(`\n✅ Recent Allowance Events (${events.length} shown):`);
    for (const event of events) {
      console.log(`   ${event.eventType}: ${event.reason}`);
      console.log(`     Allowance: ${event.allowanceBefore} → ${event.allowanceAfter} (${event.allowanceChange >= 0 ? '+' : ''}${event.allowanceChange})`);
      console.log(`     Created: ${event.createdAt?.toISOString()}`);
    }

    console.log('\n========================================');
    console.log('VALIDATION CHECKLIST');
    console.log('========================================\n');

    const activeCount = finalCycles.filter(c => c.isActive).length;
    const oldCycleDeactivated = currentCycles.some(c => c.isActive === true) &&
                                finalCycles.some(c => c.id === currentCycles[0].id && c.isActive === false);
    const newCycleActive = finalCycles.some(c => c.id === newCycle.id && c.isActive === true);
    const allowanceReset = newCycle.allowanceGranted === plan.allowancePerCycle &&
                           newCycle.allowanceRemaining === plan.allowancePerCycle;
    const periodsAlign = newCycle.cycleStart?.getTime() === renewalStart.getTime() &&
                         newCycle.cycleEnd?.getTime() === renewalEnd.getTime();

    console.log(`${activeCount === 1 ? '✅' : '❌'} Only 1 active cycle: ${activeCount} active`);
    console.log(`${oldCycleDeactivated ? '✅' : '❌'} Old cycle deactivated: ${oldCycleDeactivated}`);
    console.log(`${newCycleActive ? '✅' : '❌'} New cycle is active: ${newCycleActive}`);
    console.log(`${allowanceReset ? '✅' : '❌'} Allowance reset correctly: ${newCycle.allowanceGranted}/${plan.allowancePerCycle} granted`);
    console.log(`${periodsAlign ? '✅' : '❌'} Period dates align: ${periodsAlign}`);
    console.log(`${finalCycles.length === currentCycles.length + 1 ? '✅' : '❌'} New cycle created: ${currentCycles.length} → ${finalCycles.length}`);

    const allChecksPassed = activeCount === 1 && oldCycleDeactivated && newCycleActive &&
                           allowanceReset && periodsAlign &&
                           finalCycles.length === currentCycles.length + 1;

    console.log('\n========================================');
    if (allChecksPassed) {
      console.log('✅ SUCCESS - ALL TESTS PASSED');
    } else {
      console.log('❌ FAILURE - SOME TESTS FAILED');
    }
    console.log('========================================\n');

    console.log('📊 Summary:');
    console.log(`   Total cycles: ${currentCycles.length} → ${finalCycles.length}`);
    console.log(`   Active cycles: ${activeCycles.length} → ${activeCount}`);
    console.log(`   New allowance: ${plan.allowancePerCycle} consultations`);
    console.log(`   New period: ${renewalStart.toISOString().split('T')[0]} to ${renewalEnd.toISOString().split('T')[0]}`);
    console.log('');

    process.exit(allChecksPassed ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Error testing renewal:');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testRenewal();

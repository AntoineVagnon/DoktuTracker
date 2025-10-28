/**
 * Create Backdated Subscription for Testing Renewals
 *
 * This script creates a membership subscription that started 29 days ago
 * so we can test the renewal flow immediately
 */

import 'dotenv/config';
import { db } from './server/db';
import { users, membershipSubscriptions, membershipCycles, membershipAllowanceEvents, membershipPlans } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

const USER_ID = 222; // patient121@gmail.com
const DAYS_AGO = 29;

// Verify DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.error('Please ensure .env file exists with DATABASE_URL');
  process.exit(1);
}

async function createBackdatedSubscription() {
  console.log('🚀 Creating backdated subscription for testing...\n');

  try {
    // Step 1: Check current state
    console.log(`📋 Step 1: Checking user ${USER_ID} (patient121@gmail.com)...`);
    const [user] = await db.select().from(users).where(eq(users.id, USER_ID)).limit(1);

    if (!user) {
      console.error(`❌ User ${USER_ID} not found`);
      process.exit(1);
    }

    console.log(`✅ User found: ${user.email}`);
    console.log(`   Current stripeSubscriptionId: ${user.stripeSubscriptionId || 'null'}\n`);

    // Step 2: Check if subscription already exists
    console.log('📋 Step 2: Checking for existing subscription...');
    const existingSubs = await db
      .select()
      .from(membershipSubscriptions)
      .where(eq(membershipSubscriptions.patientId, USER_ID));

    let subscription;
    let cycle;
    let plan;

    if (existingSubs.length > 0) {
      console.log(`✅ Found existing subscription - will backdate it instead of creating new one`);
      subscription = existingSubs[0];

      // Calculate backdated dates
      const now = new Date();
      const periodStart = new Date(now);
      periodStart.setDate(periodStart.getDate() - DAYS_AGO);

      const periodEnd = new Date(now);
      periodEnd.setDate(periodEnd.getDate() + 1); // Expires tomorrow

      console.log(`   Original period: ${subscription.currentPeriodStart?.toISOString()} to ${subscription.currentPeriodEnd?.toISOString()}`);
      console.log(`   New period: ${periodStart.toISOString()} to ${periodEnd.toISOString()}\n`);

      // Update subscription dates
      console.log('📋 Step 3: Backdating subscription...');
      await db
        .update(membershipSubscriptions)
        .set({
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          activatedAt: periodStart,
          updatedAt: now
        })
        .where(eq(membershipSubscriptions.id, subscription.id));

      console.log('✅ Subscription backdated\n');

      // Update active cycle dates
      console.log('📋 Step 4: Backdating active cycle...');
      const activeCycles = await db
        .select()
        .from(membershipCycles)
        .where(and(
          eq(membershipCycles.subscriptionId, subscription.id),
          eq(membershipCycles.isActive, true)
        ));

      if (activeCycles.length > 0) {
        cycle = activeCycles[0];
        await db
          .update(membershipCycles)
          .set({
            cycleStart: periodStart,
            cycleEnd: periodEnd,
            resetDate: periodEnd,
            updatedAt: now
          })
          .where(eq(membershipCycles.id, cycle.id));

        console.log('✅ Cycle backdated\n');
      }

      // Get the plan
      [plan] = await db
        .select()
        .from(membershipPlans)
        .where(eq(membershipPlans.id, subscription.planId))
        .limit(1);

      // Skip to verification
      console.log('========================================');
      console.log('VERIFICATION');
      console.log('========================================\n');

      const [verifyUser] = await db.select().from(users).where(eq(users.id, USER_ID)).limit(1);
      const [verifySub] = await db.select().from(membershipSubscriptions).where(eq(membershipSubscriptions.id, subscription.id)).limit(1);
      const verifyCycles = await db.select().from(membershipCycles).where(eq(membershipCycles.subscriptionId, subscription.id));

      console.log('✅ User:');
      console.log(`   Email: ${verifyUser.email}`);
      console.log(`   Stripe Subscription ID: ${verifyUser.stripeSubscriptionId}\n`);

      console.log('✅ Subscription:');
      console.log(`   ID: ${verifySub.id}`);
      console.log(`   Status: ${verifySub.status}`);
      console.log(`   Period: ${verifySub.currentPeriodStart?.toISOString()} to ${verifySub.currentPeriodEnd?.toISOString()}`);
      console.log(`   Days until expiry: 1\n`);

      console.log('✅ Cycles:');
      for (const c of verifyCycles) {
        console.log(`   Cycle ${c.id}:`);
        console.log(`     Active: ${c.isActive}`);
        console.log(`     Allowance: ${c.allowanceRemaining}/${c.allowanceGranted}`);
        console.log(`     Period: ${c.cycleStart?.toISOString()} to ${c.cycleEnd?.toISOString()}`);
      }

      console.log('\n========================================');
      console.log('SUCCESS!');
      console.log('========================================\n');

      console.log('📝 Next steps:');
      console.log('   1. Fast-forward by 2 days: curl -X POST http://localhost:5000/api/test/membership/fast-forward -H "Authorization: Bearer YOUR_TOKEN" -d \'{"daysToAdd": 2}\'');
      console.log('   2. Trigger renewal: curl -X POST http://localhost:5000/api/test/membership/trigger-renewal -H "Authorization: Bearer YOUR_TOKEN"');
      console.log('   3. Check history: curl http://localhost:5000/api/test/membership/renewal-history -H "Authorization: Bearer YOUR_TOKEN"');
      console.log('');

      process.exit(0);
    }

    // Step 3: Get or create monthly plan
    console.log('📋 Step 3: Getting monthly plan...');
    [plan] = await db
      .select()
      .from(membershipPlans)
      .where(eq(membershipPlans.intervalCount, 1))
      .limit(1);

    if (!plan) {
      console.log('   Creating monthly plan...');
      [plan] = await db
        .insert(membershipPlans)
        .values({
          name: 'Monthly Membership',
          description: '2 consultations per month',
          priceAmount: 4500,
          currency: 'EUR',
          intervalType: 'month',
          intervalCount: 1,
          allowancePerCycle: 2,
          stripeProductId: null,
          stripePriceId: null,
          isActive: true
        })
        .returning();
    }

    console.log(`✅ Plan found/created: ${plan.name} (${plan.allowancePerCycle} consultations)\n`);

    // Step 4: Calculate backdated dates
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - DAYS_AGO);

    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + 1); // Expires tomorrow

    console.log('📋 Step 4: Creating backdated subscription...');
    console.log(`   Period Start: ${periodStart.toISOString()} (${DAYS_AGO} days ago)`);
    console.log(`   Period End: ${periodEnd.toISOString()} (tomorrow)`);
    console.log(`   Days Until Expiry: 1\n`);

    // Step 5: Create subscription
    const stripeSubId = `sub_TEST_BACKDATED_${Date.now()}`;
    [subscription] = await db
      .insert(membershipSubscriptions)
      .values({
        patientId: USER_ID,
        planId: plan.id,
        stripeSubscriptionId: stripeSubId,
        stripeCustomerId: `cus_TEST_${Date.now()}`,
        status: 'active',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        activatedAt: periodStart,
        createdAt: periodStart,
        updatedAt: now
      })
      .returning();

    console.log('✅ Subscription created:');
    console.log(`   ID: ${subscription.id}`);
    console.log(`   Stripe ID: ${subscription.stripeSubscriptionId}\n`);

    // Step 6: Create initial cycle
    console.log('📋 Step 5: Creating initial allowance cycle...');
    [cycle] = await db
      .insert(membershipCycles)
      .values({
        subscriptionId: subscription.id,
        cycleStart: periodStart,
        cycleEnd: periodEnd,
        allowanceGranted: plan.allowancePerCycle,
        allowanceUsed: 0,
        allowanceRemaining: plan.allowancePerCycle,
        resetDate: periodEnd,
        isActive: true,
        createdAt: periodStart,
        updatedAt: now
      })
      .returning();

    console.log('✅ Cycle created:');
    console.log(`   ID: ${cycle.id}`);
    console.log(`   Allowance: ${cycle.allowanceRemaining}/${cycle.allowanceGranted}`);
    console.log(`   Active: ${cycle.isActive}\n`);

    // Step 7: Log the event
    console.log('📋 Step 6: Logging allowance event...');
    await db
      .insert(membershipAllowanceEvents)
      .values({
        subscriptionId: subscription.id,
        cycleId: cycle.id,
        eventType: 'granted',
        appointmentId: null,
        allowanceChange: plan.allowancePerCycle,
        allowanceBefore: 0,
        allowanceAfter: plan.allowancePerCycle,
        reason: 'Initial allowance grant (backdated for testing)',
        createdAt: periodStart
      });

    console.log('✅ Event logged\n');

    // Step 8: Update user with subscription ID
    console.log('📋 Step 7: Updating user record...');
    await db
      .update(users)
      .set({ stripeSubscriptionId: stripeSubId, updatedAt: now })
      .where(eq(users.id, USER_ID));

    console.log('✅ User updated\n');

    // Step 9: Verify final state
    console.log('========================================');
    console.log('VERIFICATION');
    console.log('========================================\n');

    const [verifyUser] = await db.select().from(users).where(eq(users.id, USER_ID)).limit(1);
    const [verifySub] = await db.select().from(membershipSubscriptions).where(eq(membershipSubscriptions.id, subscription.id)).limit(1);
    const verifyCycles = await db.select().from(membershipCycles).where(eq(membershipCycles.subscriptionId, subscription.id));

    console.log('✅ User:');
    console.log(`   Email: ${verifyUser.email}`);
    console.log(`   Stripe Subscription ID: ${verifyUser.stripeSubscriptionId}\n`);

    console.log('✅ Subscription:');
    console.log(`   ID: ${verifySub.id}`);
    console.log(`   Status: ${verifySub.status}`);
    console.log(`   Period: ${verifySub.currentPeriodStart?.toISOString()} to ${verifySub.currentPeriodEnd?.toISOString()}`);
    console.log(`   Days until expiry: 1\n`);

    console.log('✅ Cycles:');
    for (const c of verifyCycles) {
      console.log(`   Cycle ${c.id}:`);
      console.log(`     Active: ${c.isActive}`);
      console.log(`     Allowance: ${c.allowanceRemaining}/${c.allowanceGranted}`);
      console.log(`     Period: ${c.cycleStart?.toISOString()} to ${c.cycleEnd?.toISOString()}`);
    }

    console.log('\n========================================');
    console.log('SUCCESS!');
    console.log('========================================\n');

    console.log('📝 Next steps:');
    console.log('   1. Fast-forward by 2 days: curl -X POST http://localhost:5000/api/test/membership/fast-forward -H "Authorization: Bearer YOUR_TOKEN" -d \'{"daysToAdd": 2}\'');
    console.log('   2. Trigger renewal: curl -X POST http://localhost:5000/api/test/membership/trigger-renewal -H "Authorization: Bearer YOUR_TOKEN"');
    console.log('   3. Check history: curl http://localhost:5000/api/test/membership/renewal-history -H "Authorization: Bearer YOUR_TOKEN"');
    console.log('');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error creating backdated subscription:');
    console.error(error);
    process.exit(1);
  }
}

// Run the script
createBackdatedSubscription();

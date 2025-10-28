/**
 * Fix WARNING-001: Backfill Missing Subscription Records
 *
 * This script syncs Stripe subscriptions with the database for users who have
 * active Stripe subscriptions but missing database records.
 *
 * Affected Users: IDs 198-209 (and potentially others)
 *
 * Process:
 * 1. Fetch all active Stripe subscriptions
 * 2. Check each subscription against database records
 * 3. For missing subscriptions:
 *    - Create membership_subscriptions record
 *    - Create initial membership_cycles record
 *    - Grant appropriate allowances based on plan type
 *
 * USAGE:
 *   node backfill-missing-subscriptions.cjs [--dry-run]
 *
 * Options:
 *   --dry-run    Show what would be created without making changes
 */

const { neon } = require('@neondatabase/serverless');
const Stripe = require('stripe');
require('dotenv').config();

// Initialize
const sql = neon(process.env.DATABASE_URL);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const DRY_RUN = process.argv.includes('--dry-run');

async function backfillMissingSubscriptions() {
  console.log('🔧 Starting Subscription Backfill...');
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes will be made)' : '✍️  LIVE MODE (changes will be applied)'}`);
  console.log('');

  // Validate Stripe API key
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey || stripeKey.includes('dummy') || stripeKey.includes('testing')) {
    console.error('❌ ERROR: Invalid Stripe API Key detected!');
    console.error('');
    console.error('Your .env file contains a dummy/test Stripe secret key:');
    console.error(`   ${stripeKey}`);
    console.error('');
    console.error('To run this script, you need a REAL Stripe secret key.');
    console.error('');
    console.error('Steps to fix:');
    console.error('  1. Log in to Stripe Dashboard: https://dashboard.stripe.com');
    console.error('  2. Navigate to Developers → API keys');
    console.error('  3. Copy your Secret key (starts with sk_test_ or sk_live_)');
    console.error('  4. Update .apps/DoktuTracker/.env:');
    console.error('     STRIPE_SECRET_KEY=sk_test_YOUR_REAL_KEY_HERE');
    console.error('  5. Run this script again');
    console.error('');
    console.error('For more information, see: BACKFILL_SUBSCRIPTIONS_README.md');
    console.error('');
    throw new Error('Invalid Stripe API key - cannot proceed');
  }

  try {
    // Step 1: Fetch all active Stripe subscriptions
    console.log('Step 1: Fetching all active Stripe subscriptions...');

    const allSubscriptions = [];
    let hasMore = true;
    let startingAfter = undefined;

    while (hasMore) {
      const response = await stripe.subscriptions.list({
        limit: 100,
        status: 'active',
        starting_after: startingAfter,
      });

      allSubscriptions.push(...response.data);
      hasMore = response.has_more;

      if (hasMore) {
        startingAfter = response.data[response.data.length - 1].id;
      }
    }

    console.log(`✅ Found ${allSubscriptions.length} active Stripe subscription(s)`);
    console.log('');

    // Step 2: Fetch existing subscription records from database
    console.log('Step 2: Fetching existing database records...');

    const existingSubscriptions = await sql`
      SELECT stripe_subscription_id, user_id, plan_id
      FROM membership_subscriptions
    `;

    const existingStripeIds = new Set(
      existingSubscriptions.map(sub => sub.stripe_subscription_id)
    );

    console.log(`✅ Found ${existingSubscriptions.length} subscription(s) in database`);
    console.log('');

    // Step 3: Identify missing subscriptions
    console.log('Step 3: Identifying missing subscriptions...');

    const missingSubscriptions = allSubscriptions.filter(
      stripeSub => !existingStripeIds.has(stripeSub.id)
    );

    console.log(`Found ${missingSubscriptions.length} subscription(s) missing from database:`);
    console.log('');

    if (missingSubscriptions.length === 0) {
      console.log('✅ No missing subscriptions found. Database is in sync with Stripe!');
      return;
    }

    // Step 4: Fetch membership plans for mapping
    console.log('Step 4: Fetching membership plans...');

    const plans = await sql`
      SELECT id, name, interval_count, interval_type, allowance_per_cycle, price_amount
      FROM membership_plans
      WHERE is_active = true
    `;

    const planMap = {
      monthly: plans.find(p => p.interval_count === 1),
      biannual: plans.find(p => p.interval_count === 6),
    };

    console.log('Available plans:', {
      monthly: planMap.monthly ? `${planMap.monthly.name} (${planMap.monthly.allowance_per_cycle} consultations)` : 'NOT FOUND',
      biannual: planMap.biannual ? `${planMap.biannual.name} (${planMap.biannual.allowance_per_cycle} consultations)` : 'NOT FOUND',
    });
    console.log('');

    // Step 5: Process each missing subscription
    console.log('Step 5: Processing missing subscriptions...');
    console.log('');

    let successCount = 0;
    let errorCount = 0;

    for (const stripeSub of missingSubscriptions) {
      try {
        const customerId = stripeSub.customer;
        const subscriptionId = stripeSub.id;
        const status = stripeSub.status;
        const currentPeriodStart = new Date(stripeSub.current_period_start * 1000);
        const currentPeriodEnd = new Date(stripeSub.current_period_end * 1000);

        // Get plan details from Stripe
        const stripePlan = stripeSub.items.data[0]?.plan;
        if (!stripePlan) {
          console.log(`  ⚠️  Skipping ${subscriptionId}: No plan data found`);
          errorCount++;
          continue;
        }

        // Determine plan type based on interval_count
        let planType, dbPlan;
        if (stripePlan.interval === 'month' && stripePlan.interval_count === 6) {
          planType = 'biannual';
          dbPlan = planMap.biannual;
        } else if (stripePlan.interval === 'month' && stripePlan.interval_count === 1) {
          planType = 'monthly';
          dbPlan = planMap.monthly;
        } else {
          console.log(`  ⚠️  Skipping ${subscriptionId}: Unknown plan type (${stripePlan.interval} x ${stripePlan.interval_count})`);
          errorCount++;
          continue;
        }

        if (!dbPlan) {
          console.log(`  ❌ Skipping ${subscriptionId}: No matching ${planType} plan in database`);
          errorCount++;
          continue;
        }

        // Find user by Stripe customer ID
        const [user] = await sql`
          SELECT id, email, first_name, last_name
          FROM users
          WHERE stripe_customer_id = ${customerId}
          LIMIT 1
        `;

        if (!user) {
          console.log(`  ⚠️  Skipping ${subscriptionId}: No user found with Stripe customer ID ${customerId}`);
          errorCount++;
          continue;
        }

        console.log(`  📋 Processing subscription for User ${user.id} (${user.email}):`);
        console.log(`     Stripe Sub ID: ${subscriptionId}`);
        console.log(`     Plan: ${dbPlan.name} (${dbPlan.allowance_per_cycle} consultations)`);
        console.log(`     Status: ${status}`);
        console.log(`     Period: ${currentPeriodStart.toISOString()} → ${currentPeriodEnd.toISOString()}`);

        if (DRY_RUN) {
          console.log(`     🔍 DRY RUN: Would create subscription and cycle records`);
          successCount++;
          console.log('');
          continue;
        }

        // Create subscription record
        const [newSubscription] = await sql`
          INSERT INTO membership_subscriptions (
            user_id,
            plan_id,
            stripe_subscription_id,
            status,
            current_period_start,
            current_period_end,
            cancel_at_period_end,
            created_at,
            updated_at
          ) VALUES (
            ${user.id},
            ${dbPlan.id},
            ${subscriptionId},
            ${status},
            ${currentPeriodStart},
            ${currentPeriodEnd},
            ${stripeSub.cancel_at_period_end},
            ${new Date(stripeSub.created * 1000)},
            NOW()
          )
          RETURNING id
        `;

        console.log(`     ✅ Created subscription record (ID: ${newSubscription.id})`);

        // Create initial cycle
        const [newCycle] = await sql`
          INSERT INTO membership_cycles (
            subscription_id,
            cycle_start,
            cycle_end,
            allowance_granted,
            allowance_used,
            allowance_remaining,
            is_active,
            created_at,
            updated_at
          ) VALUES (
            ${newSubscription.id},
            ${currentPeriodStart},
            ${currentPeriodEnd},
            ${dbPlan.allowance_per_cycle},
            0,
            ${dbPlan.allowance_per_cycle},
            true,
            NOW(),
            NOW()
          )
          RETURNING id
        `;

        console.log(`     ✅ Created cycle record (ID: ${newCycle.id}, ${dbPlan.allowance_per_cycle} consultations)`);

        // Log allowance event
        await sql`
          INSERT INTO membership_allowance_events (
            subscription_id,
            cycle_id,
            event_type,
            allowance_change,
            allowance_before,
            allowance_after,
            reason,
            created_at
          ) VALUES (
            ${newSubscription.id},
            ${newCycle.id},
            'granted',
            ${dbPlan.allowance_per_cycle},
            0,
            ${dbPlan.allowance_per_cycle},
            'Backfill: Initial allowance for previously untracked subscription (WARNING-001 fix)',
            NOW()
          )
        `;

        console.log(`     ✅ Logged allowance event`);
        successCount++;
        console.log('');

      } catch (error) {
        console.error(`  ❌ Error processing subscription ${stripeSub.id}:`, error.message);
        errorCount++;
        console.log('');
      }
    }

    // Summary
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ BACKFILL COMPLETED');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
    console.log(`Total missing subscriptions: ${missingSubscriptions.length}`);
    console.log(`Successfully processed: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('');

    if (DRY_RUN) {
      console.log('🔍 This was a dry run. No changes were made to the database.');
      console.log('   Run without --dry-run to apply changes.');
    } else {
      console.log('Next Steps:');
      console.log('  1. Verify affected users can now see their membership status');
      console.log('  2. Check that renewal webhooks process correctly for these subscriptions');
      console.log('  3. Monitor for any duplicate subscription warnings');
    }
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ FATAL ERROR:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

// Run the backfill
backfillMissingSubscriptions()
  .then(() => {
    console.log('✅ Backfill script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Backfill script failed:', error.message);
    process.exit(1);
  });

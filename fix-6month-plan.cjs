/**
 * Fix BLOCKER-001: 6-Month Plan Data Mismatch
 *
 * This script corrects the database records for users subscribed to 6-month plans
 * who were incorrectly stored as monthly plan subscribers.
 *
 * Affected Users:
 * - User 55: sub_1S2dmF2YxuDmKTPwBssKjLuo
 * - User 53: sub_1S2c2t2YxuDmKTPw62xtKKPB
 */

const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

async function fix6MonthPlanMismatch() {
  console.log('🔧 Starting 6-Month Plan Data Fix...\n');

  try {
    // Step 1: Check if 6-month plan exists
    console.log('Step 1: Checking for existing 6-month plan...');
    const existing6MonthPlans = await sql`
      SELECT id, name, interval_count, allowance_per_cycle, price_amount
      FROM membership_plans
      WHERE interval_count = 6
    `;

    let sixMonthPlanId;

    if (existing6MonthPlans.length === 0) {
      console.log('⚠️  No 6-month plan found. Creating new 6-month plan...');

      // Create 6-month plan
      const [newPlan] = await sql`
        INSERT INTO membership_plans (
          name,
          description,
          price_amount,
          currency,
          interval_type,
          interval_count,
          allowance_per_cycle,
          is_active,
          created_at,
          updated_at
        ) VALUES (
          '6-Month Membership',
          '12 consultations over 6 months with 23% savings compared to monthly plan',
          21900,
          'EUR',
          '6_months',
          6,
          12,
          true,
          NOW(),
          NOW()
        ) RETURNING id, name, interval_count, allowance_per_cycle, price_amount
      `;

      sixMonthPlanId = newPlan.id;
      console.log('✅ Created 6-month plan:', {
        id: newPlan.id,
        name: newPlan.name,
        interval_count: newPlan.interval_count,
        allowance_per_cycle: newPlan.allowance_per_cycle,
        price_amount: `€${newPlan.price_amount / 100}`
      });
    } else {
      sixMonthPlanId = existing6MonthPlans[0].id;
      console.log('✅ Found existing 6-month plan:', {
        id: existing6MonthPlans[0].id,
        name: existing6MonthPlans[0].name,
        interval_count: existing6MonthPlans[0].interval_count,
        allowance_per_cycle: existing6MonthPlans[0].allowance_per_cycle
      });
    }

    console.log('\nStep 2: Fetching affected subscriptions...');
    const affectedSubscriptions = await sql`
      SELECT
        ms.id as subscription_id,
        ms.user_id,
        ms.stripe_subscription_id,
        ms.plan_id as old_plan_id,
        mp.name as old_plan_name,
        mp.interval_count as old_interval_count,
        mp.allowance_per_cycle as old_allowance
      FROM membership_subscriptions ms
      JOIN membership_plans mp ON ms.plan_id = mp.id
      WHERE ms.stripe_subscription_id IN (
        'sub_1S2dmF2YxuDmKTPwBssKjLuo',
        'sub_1S2c2t2YxuDmKTPw62xtKKPB'
      )
    `;

    console.log(`Found ${affectedSubscriptions.length} affected subscription(s):`);
    affectedSubscriptions.forEach((sub, idx) => {
      console.log(`  ${idx + 1}. User ${sub.user_id} - ${sub.stripe_subscription_id}`);
      console.log(`     Current: ${sub.old_plan_name} (${sub.old_allowance} consultations)`);
    });

    if (affectedSubscriptions.length === 0) {
      console.log('\n⚠️  No affected subscriptions found. They may have already been fixed.');
      return;
    }

    console.log('\nStep 3: Updating subscriptions to 6-month plan...');
    const subscriptionIds = affectedSubscriptions.map(s => s.subscription_id);

    await sql`
      UPDATE membership_subscriptions
      SET
        plan_id = ${sixMonthPlanId},
        updated_at = NOW()
      WHERE id = ANY(${subscriptionIds})
    `;

    console.log(`✅ Updated ${affectedSubscriptions.length} subscription(s) to 6-month plan`);

    console.log('\nStep 4: Fetching active cycles for affected subscriptions...');
    const activeCycles = await sql`
      SELECT
        mc.id as cycle_id,
        mc.subscription_id,
        mc.allowance_granted,
        mc.allowance_used,
        mc.allowance_remaining,
        mc.cycle_start,
        mc.cycle_end,
        ms.stripe_subscription_id
      FROM membership_cycles mc
      JOIN membership_subscriptions ms ON mc.subscription_id = ms.id
      WHERE mc.subscription_id = ANY(${subscriptionIds})
        AND mc.is_active = true
    `;

    console.log(`Found ${activeCycles.length} active cycle(s):`);
    activeCycles.forEach((cycle, idx) => {
      console.log(`  ${idx + 1}. Cycle ${cycle.cycle_id}`);
      console.log(`     Current allowance: ${cycle.allowance_granted} granted, ${cycle.allowance_used} used, ${cycle.allowance_remaining} remaining`);
      console.log(`     Should be: 12 granted, ${cycle.allowance_used} used, ${12 - cycle.allowance_used} remaining`);
    });

    if (activeCycles.length === 0) {
      console.log('\n⚠️  No active cycles found for affected subscriptions.');
    } else {
      console.log('\nStep 5: Correcting active cycle allowances...');

      for (const cycle of activeCycles) {
        const allowanceBefore = cycle.allowance_remaining;
        const allowanceCorrection = 12 - cycle.allowance_granted; // Should add 10 (from 2 to 12)
        const allowanceAfter = cycle.allowance_remaining + allowanceCorrection;

        // Update the cycle
        await sql`
          UPDATE membership_cycles
          SET
            allowance_granted = 12,
            allowance_remaining = allowance_remaining + ${allowanceCorrection},
            updated_at = NOW()
          WHERE id = ${cycle.cycle_id}
        `;

        // Log the correction event
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
            ${cycle.subscription_id},
            ${cycle.cycle_id},
            'granted',
            ${allowanceCorrection},
            ${allowanceBefore},
            ${allowanceAfter},
            'Data correction: 6-month plan allowance restoration (BLOCKER-001 fix)',
            NOW()
          )
        `;

        console.log(`  ✅ Cycle ${cycle.cycle_id}: ${allowanceCorrection} consultations added (${allowanceBefore} → ${allowanceAfter})`);
      }
    }

    console.log('\nStep 6: Verification - Fetching final state...');
    const finalState = await sql`
      SELECT
        ms.stripe_subscription_id,
        ms.user_id,
        mp.name as plan_name,
        mp.interval_count,
        mp.allowance_per_cycle,
        mc.allowance_granted,
        mc.allowance_used,
        mc.allowance_remaining,
        mc.is_active as cycle_active
      FROM membership_subscriptions ms
      JOIN membership_plans mp ON ms.plan_id = mp.id
      LEFT JOIN membership_cycles mc ON ms.id = mc.subscription_id AND mc.is_active = true
      WHERE ms.stripe_subscription_id IN (
        'sub_1S2dmF2YxuDmKTPwBssKjLuo',
        'sub_1S2c2t2YxuDmKTPw62xtKKPB'
      )
    `;

    console.log('\n✅ Final State:');
    finalState.forEach((state, idx) => {
      console.log(`\n  ${idx + 1}. User ${state.user_id} - ${state.stripe_subscription_id}`);
      console.log(`     Plan: ${state.plan_name} (${state.interval_count}-month, ${state.allowance_per_cycle} consultations/cycle)`);
      if (state.cycle_active) {
        console.log(`     Active Cycle: ${state.allowance_granted} granted, ${state.allowance_used} used, ${state.allowance_remaining} remaining`);
      } else {
        console.log(`     Active Cycle: None`);
      }
    });

    console.log('\n\n✅✅✅ BLOCKER-001 FIX COMPLETED SUCCESSFULLY ✅✅✅');
    console.log('');
    console.log('Summary:');
    console.log(`  - 6-month plan ID: ${sixMonthPlanId}`);
    console.log(`  - Subscriptions updated: ${affectedSubscriptions.length}`);
    console.log(`  - Cycles corrected: ${activeCycles.length}`);
    console.log(`  - Total allowances added: ${activeCycles.length * 10} consultations`);
    console.log('');
    console.log('Next Steps:');
    console.log('  1. Verify users can now see correct allowances in their dashboard');
    console.log('  2. Run TC-REN-002 test to verify 6-month renewal works correctly');
    console.log('  3. Monitor webhook processing for these subscriptions');

  } catch (error) {
    console.error('\n❌ ERROR during fix:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

// Run the fix
fix6MonthPlanMismatch()
  .then(() => {
    console.log('\n✅ Fix script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fix script failed:', error.message);
    process.exit(1);
  });

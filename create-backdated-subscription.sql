-- Create Backdated Membership Subscription for Testing Renewals
-- User: patient121@gmail.com (ID: 222)
-- Purpose: Test automatic renewal by creating subscription that started 29 days ago

-- Step 1: Check if user already has subscription
SELECT
  u.id,
  u.email,
  u.stripe_subscription_id,
  ms.id as membership_sub_id,
  ms.current_period_start,
  ms.current_period_end
FROM users u
LEFT JOIN membership_subscriptions ms ON ms.patient_id = u.id
WHERE u.id = 222;

-- Step 2: If subscription exists, update dates to be backdated
-- (Run this if subscription already exists)
UPDATE membership_subscriptions
SET
  current_period_start = NOW() - INTERVAL '29 days',
  current_period_end = NOW() + INTERVAL '1 day',
  activated_at = NOW() - INTERVAL '29 days',
  updated_at = NOW()
WHERE patient_id = 222
RETURNING
  id,
  stripe_subscription_id,
  current_period_start,
  current_period_end;

-- Step 3: Update existing cycle to match backdated dates
UPDATE membership_cycles
SET
  cycle_start = NOW() - INTERVAL '29 days',
  cycle_end = NOW() + INTERVAL '1 day',
  reset_date = NOW() + INTERVAL '1 day',
  updated_at = NOW()
WHERE subscription_id = (
  SELECT id FROM membership_subscriptions WHERE patient_id = 222
)
AND is_active = true
RETURNING
  id,
  subscription_id,
  cycle_start,
  cycle_end,
  allowance_granted,
  allowance_remaining,
  is_active;

-- Step 4: If NO subscription exists, create one with backdated dates
-- First, ensure we have a monthly plan
INSERT INTO membership_plans (
  id,
  name,
  description,
  price_amount,
  currency,
  interval_type,
  interval_count,
  allowance_per_cycle,
  is_active
)
VALUES (
  gen_random_uuid(),
  'Monthly Test Plan',
  '2 consultations per month - TEST ONLY',
  4500, -- €45
  'EUR',
  'month',
  1,
  2,
  true
)
ON CONFLICT (name) DO UPDATE SET updated_at = NOW()
RETURNING id, name;

-- Create backdated subscription (if none exists)
INSERT INTO membership_subscriptions (
  id,
  patient_id,
  plan_id,
  stripe_subscription_id,
  stripe_customer_id,
  status,
  current_period_start,
  current_period_end,
  activated_at,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  222,
  (SELECT id FROM membership_plans WHERE name = 'Monthly Test Plan' LIMIT 1),
  'sub_TEST_BACKDATED_' || TO_CHAR(NOW(), 'YYYYMMDD'),
  'cus_TEST_' || TO_CHAR(NOW(), 'YYYYMMDD'),
  'active',
  NOW() - INTERVAL '29 days',
  NOW() + INTERVAL '1 day',
  NOW() - INTERVAL '29 days',
  NOW() - INTERVAL '29 days',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM membership_subscriptions WHERE patient_id = 222
)
RETURNING
  id,
  stripe_subscription_id,
  current_period_start,
  current_period_end;

-- Create initial backdated cycle
INSERT INTO membership_cycles (
  id,
  subscription_id,
  cycle_start,
  cycle_end,
  allowance_granted,
  allowance_used,
  allowance_remaining,
  reset_date,
  is_active,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid()::text,
  ms.id,
  NOW() - INTERVAL '29 days',
  NOW() + INTERVAL '1 day',
  2,
  0,
  2,
  NOW() + INTERVAL '1 day',
  true,
  NOW() - INTERVAL '29 days',
  NOW()
FROM membership_subscriptions ms
WHERE ms.patient_id = 222
  AND NOT EXISTS (
    SELECT 1 FROM membership_cycles WHERE subscription_id = ms.id
  )
RETURNING
  id,
  subscription_id,
  cycle_start,
  cycle_end,
  allowance_granted,
  allowance_remaining;

-- Log the allowance grant event
INSERT INTO membership_allowance_events (
  id,
  subscription_id,
  cycle_id,
  event_type,
  appointment_id,
  allowance_change,
  allowance_before,
  allowance_after,
  reason,
  created_at
)
SELECT
  gen_random_uuid()::text,
  ms.id,
  mc.id,
  'granted',
  NULL,
  2,
  0,
  2,
  'Initial allowance grant (backdated for testing)',
  NOW() - INTERVAL '29 days'
FROM membership_subscriptions ms
JOIN membership_cycles mc ON mc.subscription_id = ms.id AND mc.is_active = true
WHERE ms.patient_id = 222
  AND NOT EXISTS (
    SELECT 1 FROM membership_allowance_events
    WHERE subscription_id = ms.id AND event_type = 'granted'
  )
RETURNING
  id,
  event_type,
  allowance_change,
  reason;

-- Step 5: Update user record with test Stripe subscription ID
UPDATE users
SET
  stripe_subscription_id = (
    SELECT stripe_subscription_id
    FROM membership_subscriptions
    WHERE patient_id = 222
    LIMIT 1
  ),
  updated_at = NOW()
WHERE id = 222
  AND stripe_subscription_id IS NULL
RETURNING
  id,
  email,
  stripe_subscription_id;

-- Verification: Check final state
SELECT
  'User' as record_type,
  u.id::text,
  u.email,
  u.stripe_subscription_id as reference,
  NULL::timestamp as start_date,
  NULL::timestamp as end_date,
  NULL::integer as allowance
FROM users u
WHERE u.id = 222

UNION ALL

SELECT
  'Subscription' as record_type,
  ms.id::text,
  ms.status,
  ms.stripe_subscription_id,
  ms.current_period_start,
  ms.current_period_end,
  NULL::integer
FROM membership_subscriptions ms
WHERE ms.patient_id = 222

UNION ALL

SELECT
  'Cycle' as record_type,
  mc.id::text,
  CASE WHEN mc.is_active THEN 'active' ELSE 'inactive' END,
  mc.subscription_id::text,
  mc.cycle_start,
  mc.cycle_end,
  mc.allowance_remaining
FROM membership_cycles mc
WHERE mc.subscription_id = (SELECT id FROM membership_subscriptions WHERE patient_id = 222)
ORDER BY start_date DESC NULLS LAST;

-- Expected result:
-- - User has stripe_subscription_id set
-- - Subscription exists with period_start = 29 days ago, period_end = tomorrow
-- - One active cycle with same dates
-- - Allowance = 2 remaining

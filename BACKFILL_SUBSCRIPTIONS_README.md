# Subscription Backfill Script - Usage Guide

## Overview

This script addresses **WARNING-001** from the QA test report: syncing Stripe subscriptions with the database for users who have active Stripe subscriptions but missing database records.

**Affected Users**: IDs 198-209 (and potentially others)

## Prerequisites

### Required: Real Stripe API Key

The script requires a **real Stripe secret key** to fetch subscription data from Stripe API.

**Current Issue**: The `.env` file contains a dummy key:
```
STRIPE_SECRET_KEY=sk_test_dummy_secret_for_testing
```

### How to Get Your Stripe Secret Key

1. Log in to your Stripe Dashboard: https://dashboard.stripe.com
2. Navigate to **Developers** → **API keys**
3. Copy your **Secret key** (starts with `sk_test_` for test mode or `sk_live_` for live mode)
4. Update `.apps/DoktuTracker/.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_YOUR_REAL_KEY_HERE
   ```

⚠️ **IMPORTANT**: Never commit your real Stripe secret key to version control!

## Usage

### 1. Dry Run (Recommended First)

Run in dry-run mode to see what subscriptions would be backfilled **without making any changes**:

```bash
cd .apps/DoktuTracker
node backfill-missing-subscriptions.cjs --dry-run
```

This will:
- ✅ Fetch all active Stripe subscriptions
- ✅ Compare with database records
- ✅ Show which subscriptions are missing
- ✅ Display what would be created
- ❌ **NOT** make any database changes

### 2. Live Run (Apply Changes)

After verifying the dry-run output, run without `--dry-run` to apply changes:

```bash
cd .apps/DoktuTracker
node backfill-missing-subscriptions.cjs
```

This will:
- Create `membership_subscriptions` records for missing subscriptions
- Create initial `membership_cycles` records with appropriate allowances
- Grant consultations based on plan type (2 for monthly, 12 for 6-month)
- Log audit events for all changes

## What the Script Does

### Step 1: Fetch Stripe Subscriptions
Retrieves all active subscriptions from your Stripe account using the Stripe API.

### Step 2: Compare with Database
Queries the database to find which subscriptions don't have corresponding records.

### Step 3: Identify Plan Types
For each missing subscription:
- Reads the Stripe plan's `interval` and `interval_count`
- Maps to database plan:
  - `interval=month, interval_count=1` → Monthly Plan (2 consultations)
  - `interval=month, interval_count=6` → 6-Month Plan (12 consultations)

### Step 4: Create Records
For each missing subscription:
1. **membership_subscriptions** record with:
   - user_id (looked up via stripe_customer_id)
   - plan_id (matched based on interval_count)
   - stripe_subscription_id
   - status, period dates, etc.

2. **membership_cycles** record with:
   - Current period start/end dates
   - Full allowance granted (2 or 12 consultations)
   - allowance_used = 0
   - is_active = true

3. **membership_allowance_events** audit log

### Step 5: Summary Report
Displays:
- Total missing subscriptions found
- Successfully processed count
- Error count
- Next steps for verification

## Expected Output Example

```
🔧 Starting Subscription Backfill...
Mode: 🔍 DRY RUN (no changes will be made)

Step 1: Fetching all active Stripe subscriptions...
✅ Found 15 active Stripe subscription(s)

Step 2: Fetching existing database records...
✅ Found 7 subscription(s) in database

Step 3: Identifying missing subscriptions...
Found 8 subscription(s) missing from database:

Step 4: Fetching membership plans...
Available plans: {
  monthly: '€45/month Membership (2 consultations)',
  biannual: '6-Month Membership (12 consultations)'
}

Step 5: Processing missing subscriptions...

  📋 Processing subscription for User 198 (user198@example.com):
     Stripe Sub ID: sub_1ABC123XYZ
     Plan: €45/month Membership (2 consultations)
     Status: active
     Period: 2025-09-15T00:00:00.000Z → 2025-10-15T00:00:00.000Z
     🔍 DRY RUN: Would create subscription and cycle records

═══════════════════════════════════════════════════════════
✅ BACKFILL COMPLETED
═══════════════════════════════════════════════════════════
Mode: DRY RUN
Total missing subscriptions: 8
Successfully processed: 8
Errors: 0
```

## Verification After Running

After running the live version, verify the changes:

### 1. Check Database Records

```sql
-- Verify new subscriptions were created
SELECT
  ms.id,
  ms.user_id,
  ms.stripe_subscription_id,
  ms.status,
  mp.name as plan_name,
  mc.allowance_granted,
  mc.allowance_remaining
FROM membership_subscriptions ms
JOIN membership_plans mp ON ms.plan_id = mp.id
LEFT JOIN membership_cycles mc ON ms.id = mc.subscription_id AND mc.is_active = true
WHERE ms.created_at > NOW() - INTERVAL '1 hour'
ORDER BY ms.created_at DESC;
```

### 2. Check Audit Logs

```sql
-- Verify allowance events were logged
SELECT
  event_type,
  allowance_change,
  reason,
  created_at
FROM membership_allowance_events
WHERE reason LIKE '%Backfill%'
ORDER BY created_at DESC;
```

### 3. Test User Access

For affected users:
1. Log in to their account
2. Navigate to membership dashboard
3. Verify they can see:
   - Current membership status
   - Available consultations
   - Next renewal date

## Troubleshooting

### Error: "Invalid API Key provided"

**Cause**: Using dummy Stripe key in .env file

**Fix**: Add your real Stripe secret key to `.apps/DoktuTracker/.env`

### Error: "No user found with Stripe customer ID"

**Cause**: Subscription belongs to a customer that doesn't exist in your database

**Fix**: This is expected for test subscriptions. The script will skip these and continue.

### Error: "No matching plan in database"

**Cause**: Subscription uses a plan type that doesn't exist in your database

**Fix**:
1. Check if you need to create the plan in `membership_plans` table
2. Or verify the Stripe subscription's interval/interval_count values

## Alternative: Manual SQL Approach

If you prefer not to use the Node.js script, you can manually create records via SQL. However, you'll need to:

1. Export subscription data from Stripe Dashboard
2. Manually map each subscription to a user and plan
3. Create SQL INSERT statements

The Node.js script automates this entire process.

## Integration with Existing Fixes

This backfill script works together with other fixes:

- **BLOCKER-001**: Run `fix-6month-plan.sql` first to ensure plans are correct
- **WARNING-002**: Payment failure handler will work correctly once records exist
- **Webhook Processing**: Once records exist, renewal webhooks will process normally

## Next Steps After Backfill

1. ✅ Verify all users can access their membership status
2. ✅ Monitor webhook processing for previously missing subscriptions
3. ✅ Run renewal flow tests (TC-REN-001, TC-REN-002)
4. ✅ Check for any duplicate subscription warnings

## Files Modified

- **Created**: `backfill-missing-subscriptions.cjs` - The backfill script
- **Created**: `BACKFILL_SUBSCRIPTIONS_README.md` - This documentation

## Support

For issues or questions:
- Review the QA test report: `DOKTUTRACKER_MEMBERSHIP_RENEWAL_TEST_REPORT.md`
- Check the fixes summary: `MEMBERSHIP_RENEWAL_FIXES_SUMMARY.md`
- Look for WARNING-001 details in test evidence folder

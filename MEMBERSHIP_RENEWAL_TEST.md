# Membership Subscription Renewal Testing Guide

This guide provides step-by-step instructions to test automatic subscription renewals for both monthly and 6-month (biannual) membership plans.

## Overview

The DoktuTracker membership system includes:
- **Monthly Plan**: €45/month, 2 consultations per cycle
- **Biannual Plan**: €219/6 months, 12 consultations per cycle

When a subscription renews (via Stripe webhook `invoice.payment_succeeded` with `billing_reason='subscription_cycle'`), the system should:
1. Deactivate the current allowance cycle
2. Create a new allowance cycle with fresh consultation allowances
3. Update subscription period dates
4. Log the renewal process

## Test Infrastructure

Five test endpoints are available at `/api/test/membership/*`:

1. **GET /api/test/membership/status** - Health check
2. **POST /api/test/membership/fast-forward** - Fast-forward subscription dates
3. **POST /api/test/membership/trigger-renewal** - Manually trigger renewal
4. **GET /api/test/membership/renewal-history** - View renewal history
5. **POST /api/test/membership/reset** - Reset subscription to initial state

⚠️ **WARNING**: These endpoints should ONLY be available in development/staging environments!

## Prerequisites

Before testing, ensure you have:
1. A test user account with an active subscription
2. Valid authentication token for API requests
3. The user's subscription must be in active state
4. Backend server running locally or in staging

## Test Procedure

### Step 1: Get Your Authentication Token

Login to the application and get your auth token from localStorage or the network tab:

```bash
# The token should be in format: Bearer <token>
TOKEN="Bearer eyJhbGc..."
```

### Step 2: Check Current Subscription Status

View your current subscription and cycle information:

```bash
curl -X GET "http://localhost:5000/api/test/membership/renewal-history" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "subscription": {
    "id": "uuid-here",
    "planId": "monthly" or "biannual",
    "status": "active",
    "currentPeriodStart": "2025-10-15T00:00:00.000Z",
    "currentPeriodEnd": "2025-11-15T00:00:00.000Z"
  },
  "cycles": [
    {
      "id": 1,
      "allowanceGranted": 2 or 12,
      "allowanceRemaining": 2 or 12,
      "isActive": true,
      "cycleStart": "2025-10-15T00:00:00.000Z",
      "cycleEnd": "2025-11-15T00:00:00.000Z"
    }
  ],
  "summary": {
    "totalCycles": 1,
    "activeCycles": 1
  }
}
```

📝 **Note down**:
- `currentPeriodEnd` - When the subscription is set to expire
- `allowanceRemaining` - Current consultation allowance
- `cycleEnd` - When the current cycle ends

---

### Step 3: Fast-Forward Time (Monthly Plan Test)

To test a **monthly** renewal, fast-forward by 31 days:

```bash
curl -X POST "http://localhost:5000/api/test/membership/fast-forward" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"daysToAdd": 31}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Fast-forwarded 31 days",
  "subscription": {
    "originalPeriodEnd": "2025-11-15T00:00:00.000Z",
    "adjustedPeriodEnd": "2025-10-15T00:00:00.000Z",
    "hasExpired": true,
    "daysUntilExpiry": 0
  },
  "nextSteps": "Subscription has expired. Call /api/test/membership/trigger-renewal to simulate renewal payment."
}
```

✅ **Verify**: `hasExpired` should be `true`, meaning the subscription period has "ended"

---

### Step 3 (Alternative): Fast-Forward Time (Biannual Plan Test)

To test a **6-month** renewal, fast-forward by 181 days:

```bash
curl -X POST "http://localhost:5000/api/test/membership/fast-forward" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"daysToAdd": 181}'
```

---

### Step 4: Trigger Subscription Renewal

Simulate Stripe sending a renewal payment webhook:

```bash
curl -X POST "http://localhost:5000/api/test/membership/trigger-renewal" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Subscription renewed successfully",
  "renewal": {
    "subscriptionId": "uuid-here",
    "plan": "Monthly Plan" or "Biannual Plan",
    "previousPeriod": {
      "start": "2025-10-15T00:00:00.000Z",
      "end": "2025-10-15T00:00:00.000Z"
    },
    "newPeriod": {
      "start": "2025-10-15T00:00:00.000Z",
      "end": "2025-11-15T00:00:00.000Z" (or +6 months for biannual)
    },
    "newCycle": {
      "id": 2,
      "allowanceGranted": 2 (or 12 for biannual),
      "allowanceRemaining": 2 (or 12 for biannual),
      "cycleStart": "2025-10-15T00:00:00.000Z",
      "cycleEnd": "2025-11-15T00:00:00.000Z"
    }
  }
}
```

✅ **Verify**:
- `newCycle.id` should be incremented (was 1, now 2)
- `allowanceGranted` and `allowanceRemaining` should be **reset** to full amount:
  - Monthly: 2 consultations
  - Biannual: 12 consultations
- `newPeriod.end` should be 1 month (or 6 months) after `newPeriod.start`

---

### Step 5: Verify Renewal Created New Cycle

Check renewal history to confirm a new cycle was created:

```bash
curl -X GET "http://localhost:5000/api/test/membership/renewal-history" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Changes:**
```json
{
  "subscription": {
    "currentPeriodStart": "2025-10-15T00:00:00.000Z",
    "currentPeriodEnd": "2025-11-15T00:00:00.000Z"
  },
  "cycles": [
    {
      "id": 2,
      "allowanceGranted": 2,
      "allowanceUsed": 0,
      "allowanceRemaining": 2,
      "isActive": true,  // ← New cycle is active
      "cycleStart": "2025-10-15T00:00:00.000Z",
      "cycleEnd": "2025-11-15T00:00:00.000Z"
    },
    {
      "id": 1,
      "allowanceGranted": 2,
      "allowanceUsed": 0,
      "allowanceRemaining": 2,
      "isActive": false,  // ← Old cycle deactivated
      "cycleStart": "2025-09-15T00:00:00.000Z",
      "cycleEnd": "2025-10-15T00:00:00.000Z"
    }
  ],
  "recentEvents": [
    {
      "eventType": "cycle_created",
      "reason": "Subscription renewal - new billing cycle",
      "allowanceChange": 2,
      "allowanceBefore": 0,
      "allowanceAfter": 2
    }
  ],
  "summary": {
    "totalCycles": 2,  // ← Incremented from 1 to 2
    "activeCycles": 1
  }
}
```

✅ **Verify**:
- **Old cycle (id: 1)**: `isActive: false` (deactivated)
- **New cycle (id: 2)**: `isActive: true` (newly created)
- `totalCycles` incremented from 1 to 2
- `recentEvents` shows `cycle_created` event with renewed allowance

---

### Step 6: Check Server Logs

The renewal process should produce detailed logs. Check your server console for:

```
🔄 Subscription renewal payment successful for user 123
📅 Period: 2025-10-15T00:00:00.000Z to 2025-11-15T00:00:00.000Z
🔄 Renewing allowance cycle for subscription uuid-here
✅ Allowance cycle renewed: { cycleId: 2, allowanceGranted: 2, ... }
✅ Subscription period dates updated in database
```

---

### Step 7 (Optional): Reset Subscription

To run tests again from the beginning:

```bash
curl -X POST "http://localhost:5000/api/test/membership/reset" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json"
```

This will:
- Delete all existing cycles and events
- Recreate initial allowance from current Stripe subscription data
- Reset subscription to original period dates

---

## Complete Test Scenarios

### Scenario 1: Monthly Plan Full Renewal Cycle

```bash
# 1. Check initial state
curl -X GET "http://localhost:5000/api/test/membership/renewal-history" \
  -H "Authorization: $TOKEN" | jq '.summary.totalCycles'
# Should show: 1

# 2. Fast-forward 31 days
curl -X POST "http://localhost:5000/api/test/membership/fast-forward" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"daysToAdd": 31}' | jq '.subscription.hasExpired'
# Should show: true

# 3. Trigger renewal
curl -X POST "http://localhost:5000/api/test/membership/trigger-renewal" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" | jq '.newCycle.allowanceGranted'
# Should show: 2

# 4. Verify new cycle created
curl -X GET "http://localhost:5000/api/test/membership/renewal-history" \
  -H "Authorization: $TOKEN" | jq '.summary.totalCycles'
# Should show: 2
```

---

### Scenario 2: Biannual Plan Full Renewal Cycle

```bash
# 1. Check initial state
curl -X GET "http://localhost:5000/api/test/membership/renewal-history" \
  -H "Authorization: $TOKEN" | jq '.subscription.planId'
# Should show: "biannual"

# 2. Fast-forward 181 days (6 months + 1 day)
curl -X POST "http://localhost:5000/api/test/membership/fast-forward" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"daysToAdd": 181}' | jq '.subscription.hasExpired'
# Should show: true

# 3. Trigger renewal
curl -X POST "http://localhost:5000/api/test/membership/trigger-renewal" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" | jq '.newCycle.allowanceGranted'
# Should show: 12

# 4. Verify new cycle created
curl -X GET "http://localhost:5000/api/test/membership/renewal-history" \
  -H "Authorization: $TOKEN" | jq '.summary.totalCycles'
# Should show: 2
```

---

### Scenario 3: Multiple Renewals

Test multiple consecutive renewals:

```bash
for i in {1..3}; do
  echo "=== Renewal #$i ==="

  # Fast-forward
  curl -X POST "http://localhost:5000/api/test/membership/fast-forward" \
    -H "Authorization: $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"daysToAdd": 31}' -s | jq '.subscription.hasExpired'

  # Trigger renewal
  curl -X POST "http://localhost:5000/api/test/membership/trigger-renewal" \
    -H "Authorization: $TOKEN" \
    -H "Content-Type: application/json" -s | jq '.newCycle.id'

  # Check total cycles
  curl -X GET "http://localhost:5000/api/test/membership/renewal-history" \
    -H "Authorization: $TOKEN" -s | jq '.summary.totalCycles'

  echo ""
done
```

Expected output:
```
=== Renewal #1 ===
true
2
2

=== Renewal #2 ===
true
3
3

=== Renewal #3 ===
true
4
4
```

---

## Validation Checklist

After running tests, verify:

- [ ] **Webhook Logic**: The `invoice.payment_succeeded` webhook handles both:
  - `billing_reason: 'subscription_create'` (initial payment)
  - `billing_reason: 'subscription_cycle'` (renewal payment)

- [ ] **Cycle Management**:
  - [ ] Old cycle is deactivated (`isActive: false`)
  - [ ] New cycle is created with fresh allowance
  - [ ] Only one cycle is active at a time

- [ ] **Allowance Reset**:
  - [ ] Monthly plan: 2 consultations granted
  - [ ] Biannual plan: 12 consultations granted
  - [ ] `allowanceUsed` starts at 0
  - [ ] `allowanceRemaining` equals `allowanceGranted`

- [ ] **Period Dates**:
  - [ ] `currentPeriodStart` = previous `currentPeriodEnd`
  - [ ] `currentPeriodEnd` = start + 1 month (monthly) or + 6 months (biannual)
  - [ ] Database dates match Stripe subscription dates

- [ ] **Events Logged**:
  - [ ] `cycle_created` event recorded
  - [ ] Proper allowance change tracking
  - [ ] Server logs show renewal process

- [ ] **Multiple Renewals**:
  - [ ] System can handle consecutive renewals
  - [ ] Each renewal increments cycle count
  - [ ] No orphaned cycles remain active

---

## Troubleshooting

### Issue: "No active subscription found"

**Cause**: User doesn't have an active Stripe subscription

**Solution**:
1. Verify user has subscribed via frontend
2. Check `users` table for `stripeSubscriptionId`
3. Verify Stripe subscription status is `active`

---

### Issue: Fast-forward doesn't make subscription expire

**Cause**: `daysToAdd` value too small

**Solution**:
- Monthly plan: Use at least 31 days
- Biannual plan: Use at least 181 days (6 months = ~180 days)

---

### Issue: Renewal creates cycle but allowance is 0

**Cause**: Plan configuration missing or incorrect

**Solution**:
1. Check `membershipService.getPlanConfigurations()`
2. Verify plan has `allowance` property set
3. Check database `membershipSubscriptions.planId` matches config key

---

### Issue: Multiple active cycles after renewal

**Cause**: Old cycle not being deactivated

**Solution**:
1. Check `membershipService.renewAllowanceCycle()` implementation
2. Verify it updates old cycles with `isActive: false`
3. Check database constraints allow only one active cycle per subscription

---

## Production Considerations

⚠️ **IMPORTANT**: Before deploying to production:

1. **Disable Test Endpoints**: Add environment check to `membershipTestRoutes.ts`:
   ```typescript
   export function registerMembershipTestRoutes(app: Express, stripe: Stripe) {
     // ONLY enable in development/staging
     if (process.env.NODE_ENV === 'production') {
       console.warn('⚠️ Membership test routes are disabled in production');
       return;
     }
     // ... rest of routes
   }
   ```

2. **Monitor Webhook Logs**: Set up monitoring for:
   - `invoice.payment_succeeded` events
   - Renewal failures
   - Allowance cycle creation errors

3. **Test with Real Stripe Webhooks**:
   - Use Stripe CLI to forward test webhooks
   - Verify production webhook endpoint is configured
   - Test with Stripe test mode first

4. **Database Backups**: Ensure regular backups before any subscription changes

---

## Additional Testing with Stripe CLI

To test with real Stripe webhooks (more realistic):

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Forward webhooks to local server
stripe listen --forward-to localhost:5000/api/webhooks/stripe

# Trigger a test renewal webhook
stripe trigger invoice.payment_succeeded \
  --add invoice:billing_reason=subscription_cycle \
  --add invoice:subscription=sub_test_123
```

---

## Summary

This test suite verifies that:
1. ✅ Subscription renewals trigger correctly via Stripe webhooks
2. ✅ Allowance cycles reset with fresh consultation allowances
3. ✅ Period dates update correctly for both monthly and biannual plans
4. ✅ Old cycles are properly deactivated
5. ✅ Multiple consecutive renewals work correctly
6. ✅ All events are logged for audit purposes

**Test Status**: 🟢 Ready for testing

**Next Steps**: Run the test scenarios above and verify all checkboxes pass.

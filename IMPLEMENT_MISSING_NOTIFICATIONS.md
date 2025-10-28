# Implementation Plan: Missing High-Priority Notifications

**Date**: 2025-10-26
**Status**: Templates exist ✅, Triggers needed ❌

---

## Summary

ALL 8 email templates already exist in `server/services/emailTemplates.ts`. What's missing are the **trigger mechanisms** to schedule these notifications at the right time.

---

## Templates Status

| Code | Template Name | Status | Line |
|------|--------------|--------|------|
| B4 | `booking_reminder_24h` | ✅ EXISTS | 225 |
| B5 | `booking_reminder_1h` | ✅ EXISTS | 314 |
| B6 | `booking_live_imminent` | ✅ EXISTS | 969 |
| B7 | `reschedule_confirmation` | ✅ EXISTS | 487 |
| M2 | `membership_renewal_upcoming` | ✅ EXISTS | 1992 |
| M3 | `membership_renewed` | ✅ EXISTS | 1256 |
| P1 | `payment_receipt` | ✅ EXISTS | 1414 |
| H2 | `health_profile_created` | ✅ EXISTS | 3742 |

---

## Implementation Tasks

### 1. B4 - 24 Hour Reminder (Cron Job Required)

**Trigger**: Cron job runs every hour, finds appointments in 24 hours

**File to Create**: `server/cron/appointmentReminders.ts`

```typescript
import cron from 'node-cron';
import { db } from '../db';
import { appointments } from '../../shared/schema';
import { notificationService } from '../services/notificationService';
import { TriggerCode } from '../services/notificationService';
import { sql } from 'drizzle-orm';

// Run every hour
cron.schedule('0 * * * *', async () => {
  console.log('Running 24h appointment reminder job...');

  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  try {
    // Find appointments between 24-25 hours from now
    const upcomingAppointments = await db
      .select()
      .from(appointments)
      .where(
        sql`${appointments.scheduledAt} >= ${in24Hours}
        AND ${appointments.scheduledAt} < ${in25Hours}
        AND ${appointments.status} = 'confirmed'`
      );

    console.log(`Found ${upcomingAppointments.length} appointments for 24h reminders`);

    for (const appointment of upcomingAppointments) {
      await notificationService.scheduleNotification({
        userId: appointment.patientId,
        appointmentId: appointment.id,
        triggerCode: TriggerCode.BOOKING_REMINDER_24H,
        scheduledFor: new Date(), // Send immediately
        mergeData: {
          patient_first_name: '...', // Get from users table
          appointment_datetime_local: appointment.scheduledAt.toLocaleString(),
          doctor_name: '...', // Get from doctors table
          join_link: `${process.env.VITE_APP_URL}/appointments/${appointment.id}/join`
        }
      });
    }
  } catch (error) {
    console.error('24h reminder job error:', error);
  }
});
```

**Integration Point**: `server/index.ts` - Import and initialize cron jobs

---

### 2. B5 - 1 Hour Reminder (Cron Job Required)

**Trigger**: Cron job runs every 5 minutes, finds appointments in 1 hour

**File**: Same `server/cron/appointmentReminders.ts`

```typescript
// Run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('Running 1h appointment reminder job...');

  const now = new Date();
  const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);
  const in65Minutes = new Date(now.getTime() + 65 * 60 * 1000);

  try {
    const upcomingAppointments = await db
      .select()
      .from(appointments)
      .where(
        sql`${appointments.scheduledAt} >= ${in1Hour}
        AND ${appointments.scheduledAt} < ${in65Minutes}
        AND ${appointments.status} = 'confirmed'`
      );

    for (const appointment of upcomingAppointments) {
      await notificationService.scheduleNotification({
        userId: appointment.patientId,
        appointmentId: appointment.id,
        triggerCode: TriggerCode.BOOKING_REMINDER_1H,
        scheduledFor: new Date(),
        mergeData: { /* ... */ }
      });
    }
  } catch (error) {
    console.error('1h reminder job error:', error);
  }
});
```

---

### 3. B6 - Live Imminent (Cron Job Required)

**Trigger**: Cron job runs every minute, finds appointments starting in 5 minutes

**File**: Same `server/cron/appointmentReminders.ts`

```typescript
// Run every minute
cron.schedule('* * * * *', async () => {
  const now = new Date();
  const in5Minutes = new Date(now.getTime() + 5 * 60 * 1000);
  const in6Minutes = new Date(now.getTime() + 6 * 60 * 1000);

  try {
    const imminentAppointments = await db
      .select()
      .from(appointments)
      .where(
        sql`${appointments.scheduledAt} >= ${in5Minutes}
        AND ${appointments.scheduledAt} < ${in6Minutes}
        AND ${appointments.status} = 'confirmed'`
      );

    for (const appointment of imminentAppointments) {
      await notificationService.scheduleNotification({
        userId: appointment.patientId,
        appointmentId: appointment.id,
        triggerCode: TriggerCode.BOOKING_LIVE_IMMINENT,
        scheduledFor: new Date(),
        mergeData: {
          patient_first_name: '...',
          doctor_name: '...',
          join_link: `${process.env.VITE_APP_URL}/appointments/${appointment.id}/join`
        }
      });
    }
  } catch (error) {
    console.error('Live imminent job error:', error);
  }
});
```

---

### 4. B7 - Rescheduled (Event-Driven)

**Trigger**: When appointment is rescheduled via API

**File to Modify**: `server/routes.ts` or `server/routes/appointments.ts`

**Find the reschedule endpoint** (likely `PUT /api/appointments/:id` or `POST /api/appointments/:id/reschedule`)

**Add notification call**:

```typescript
// After successful reschedule
await notificationService.scheduleNotification({
  userId: appointment.patientId,
  appointmentId: appointment.id,
  triggerCode: TriggerCode.BOOKING_RESCHEDULED,
  scheduledFor: new Date(),
  mergeData: {
    patient_first_name: patient.firstName,
    new_appointment_datetime_local: newTime.toLocaleString(),
    old_appointment_datetime_local: oldTime.toLocaleString(),
    doctor_name: `${doctor.firstName} ${doctor.lastName}`,
    join_link: `${process.env.VITE_APP_URL}/appointments/${appointment.id}/join`
  }
});
```

---

### 5. M2 - Membership Renewal Upcoming (Cron Job Required)

**Trigger**: Cron job runs daily, finds memberships expiring in 3 days

**File to Create**: `server/cron/membershipReminders.ts`

```typescript
import cron from 'node-cron';
import { db } from '../db';
import { memberships } from '../../shared/schema';
import { notificationService } from '../services/notificationService';
import { TriggerCode } from '../services/notificationService';
import { sql } from 'drizzle-orm';

// Run daily at 9 AM
cron.schedule('0 9 * * *', async () => {
  console.log('Running membership renewal reminder job...');

  const now = new Date();
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const in4Days = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

  try {
    const expiringMemberships = await db
      .select()
      .from(memberships)
      .where(
        sql`${memberships.endDate} >= ${in3Days}
        AND ${memberships.endDate} < ${in4Days}
        AND ${memberships.status} = 'active'`
      );

    for (const membership of expiringMemberships) {
      await notificationService.scheduleNotification({
        userId: membership.userId,
        triggerCode: TriggerCode.MEMBERSHIP_RENEWAL_UPCOMING,
        scheduledFor: new Date(),
        mergeData: {
          first_name: '...', // Get from users table
          plan_name: membership.planName,
          renewal_date: membership.endDate.toLocaleDateString(),
          amount: membership.price.toString(),
          days_until_renewal: '3'
        }
      });
    }
  } catch (error) {
    console.error('Membership renewal reminder error:', error);
  }
});
```

---

### 6. M3 - Membership Renewed (Stripe Webhook)

**Trigger**: Stripe webhook for successful subscription renewal

**File to Modify**: `server/routes/stripeWebhooks.ts` or create `server/webhooks/stripe.ts`

**Add handler for `invoice.payment_succeeded` event**:

```typescript
// Handle successful membership renewal
if (event.type === 'invoice.payment_succeeded' && subscription) {
  const membership = await db
    .select()
    .from(memberships)
    .where(eq(memberships.stripeSubscriptionId, subscription.id))
    .limit(1);

  if (membership[0]) {
    await notificationService.scheduleNotification({
      userId: membership[0].userId,
      triggerCode: TriggerCode.MEMBERSHIP_RENEWED,
      scheduledFor: new Date(),
      mergeData: {
        first_name: user.firstName,
        amount: (invoice.amount_paid / 100).toString(),
        plan_name: membership[0].planName,
        consultations_per_month: membership[0].consultationsPerMonth.toString()
      }
    });
  }
}
```

---

### 7. P1 - Payment Receipt (Event-Driven)

**Trigger**: After successful appointment payment

**File to Modify**: `server/routes.ts` - Find payment completion endpoint

**Add notification after payment succeeds**:

```typescript
// After Stripe payment success
await notificationService.scheduleNotification({
  userId: appointment.patientId,
  appointmentId: appointment.id,
  triggerCode: TriggerCode.PAYMENT_RECEIPT,
  scheduledFor: new Date(),
  mergeData: {
    doctor_name: `Dr. ${doctor.lastName}`,
    amount: payment.amount.toString(),
    currency: payment.currency || 'EUR',
    payment_date: new Date().toLocaleDateString(),
    receipt_url: paymentIntent.receipt_url || '#'
  }
});
```

---

### 8. H2 - Health Profile Created (Event-Driven)

**Trigger**: When user completes health profile

**File to Modify**: `server/routes/healthProfile.ts` or similar

**Add notification after profile creation**:

```typescript
// After successful profile creation
await notificationService.scheduleNotification({
  userId: user.id,
  triggerCode: TriggerCode.HEALTH_PROFILE_CREATED,
  scheduledFor: new Date(),
  mergeData: {
    first_name: user.firstName,
    profile_url: `${process.env.VITE_APP_URL}/health-profile`
  }
});
```

---

## Implementation Priority

### Phase 1 (Immediate - 2 hours)
1. ✅ Create cron job file: `server/cron/appointmentReminders.ts`
2. ✅ Implement B4, B5, B6 reminder jobs
3. ✅ Add cron job initialization to `server/index.ts`

### Phase 2 (Today - 3 hours)
4. ✅ Find and modify reschedule endpoint (B7)
5. ✅ Find and modify payment endpoint (P1)
6. ✅ Create membership reminder cron job (M2)

### Phase 3 (This Week - 2 hours)
7. ✅ Implement Stripe webhook handler (M3)
8. ✅ Find and modify health profile creation (H2)

---

## Dependencies Needed

```bash
npm install node-cron
npm install @types/node-cron --save-dev
```

---

## Testing Plan

### B4, B5, B6 Testing
```bash
# Manually trigger cron jobs for testing
node test-appointment-reminders.mjs

# Or create appointments at specific times and wait
```

### B7, P1, H2 Testing
```bash
# Use existing UI flows
# - Reschedule an appointment (B7)
# - Complete a payment (P1)
# - Fill out health profile (H2)
```

### M2, M3 Testing
```bash
# Create memberships with near-expiry dates
# Use Stripe test mode webhooks
```

---

## Next Steps

1. ✅ Install node-cron dependency
2. ✅ Create `server/cron/appointmentReminders.ts`
3. ✅ Implement B4, B5, B6 cron jobs
4. ✅ Initialize cron jobs in `server/index.ts`
5. ✅ Test with real appointments
6. ✅ Proceed to Phase 2 (event-driven triggers)


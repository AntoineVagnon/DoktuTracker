import cron from 'node-cron';
import { db } from '../db';
import { membershipSubscriptions, membershipPlans, users } from '../../shared/schema';
import { eq, and, gte, lt, sql } from 'drizzle-orm';
import { TriggerCode } from '../services/notificationService';

// Import notification service - will be initialized in index.ts
let notificationService: any;

export function initializeNotificationService(service: any) {
  notificationService = service;
}

/**
 * M2: Membership Renewal Upcoming Notification
 * Runs daily at 9 AM to find memberships expiring in 3 days
 */
export function startRenewalUpcomingReminders() {
  cron.schedule('0 9 * * *', async () => {
    console.log('[CRON] Running membership renewal upcoming reminder job...');

    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const in4Days = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

    try {
      // Find active memberships expiring between 3-4 days from now
      const expiringSubscriptions = await db
        .select({
          subscriptionId: membershipSubscriptions.id,
          patientId: membershipSubscriptions.patientId,
          stripeSubscriptionId: membershipSubscriptions.stripeSubscriptionId,
          currentPeriodEnd: membershipSubscriptions.currentPeriodEnd,
          planId: membershipSubscriptions.planId,
          patientFirstName: users.firstName,
          patientLastName: users.lastName,
          patientEmail: users.email,
        })
        .from(membershipSubscriptions)
        .innerJoin(users, eq(membershipSubscriptions.patientId, users.id))
        .where(
          and(
            gte(membershipSubscriptions.currentPeriodEnd, in3Days),
            lt(membershipSubscriptions.currentPeriodEnd, in4Days),
            eq(membershipSubscriptions.status, 'active')
          )
        );

      console.log(`[CRON] Found ${expiringSubscriptions.length} memberships expiring in 3 days`);

      for (const subscription of expiringSubscriptions) {
        // Get plan details
        const [planDetails] = await db
          .select({
            name: membershipPlans.name,
            priceAmount: membershipPlans.priceAmount,
            currency: membershipPlans.currency,
            allowancePerCycle: membershipPlans.allowancePerCycle,
          })
          .from(membershipPlans)
          .where(eq(membershipPlans.id, subscription.planId));

        if (!planDetails) {
          console.error(`[CRON] Plan not found for subscription ${subscription.subscriptionId}`);
          continue;
        }

        // Calculate price in euros
        const priceEUR = (planDetails.priceAmount / 100).toFixed(2);

        // Schedule M2 notification
        await notificationService.scheduleNotification({
          userId: subscription.patientId,
          triggerCode: TriggerCode.MEMBERSHIP_RENEWAL_UPCOMING,
          scheduledFor: new Date(),
          mergeData: {
            first_name: subscription.patientFirstName,
            plan_name: planDetails.name,
            renewal_date: subscription.currentPeriodEnd.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            amount: priceEUR,
            currency: planDetails.currency,
            days_until_renewal: '3',
            consultations_per_month: planDetails.allowancePerCycle.toString(),
            manage_subscription_link: `${process.env.CLIENT_URL || 'https://doktu.co'}/account/membership`
          }
        });

        console.log(`[CRON] Scheduled M2 renewal reminder for subscription ${subscription.subscriptionId}`);
      }
    } catch (error) {
      console.error('[CRON] Membership renewal reminder job error:', error);
    }
  });

  console.log('[CRON] Membership renewal reminder job initialized (runs daily at 9 AM)');
}

/**
 * Initialize all membership reminder cron jobs
 */
export function initializeMembershipReminders(service: any) {
  initializeNotificationService(service);

  startRenewalUpcomingReminders();

  console.log('[CRON] All membership reminder jobs initialized successfully');
}

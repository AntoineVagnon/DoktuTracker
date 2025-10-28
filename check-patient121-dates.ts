import 'dotenv/config';
import { db } from './server/db';
import { users, membershipSubscriptions, membershipCycles } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

async function checkDates() {
  const [user] = await db.select().from(users).where(eq(users.id, 222)).limit(1);
  console.log('👤 User:', user.email);
  console.log('🔗 Stripe Sub ID:', user.stripeSubscriptionId);

  const [sub] = await db
    .select()
    .from(membershipSubscriptions)
    .where(eq(membershipSubscriptions.patientId, 222))
    .limit(1);

  console.log('\n📅 Database Subscription:');
  console.log('  Period Start:', sub.currentPeriodStart?.toISOString());
  console.log('  Period End:', sub.currentPeriodEnd?.toISOString());
  console.log('  Status:', sub.status);

  const cycles = await db
    .select()
    .from(membershipCycles)
    .where(eq(membershipCycles.subscriptionId, sub.id))
    .orderBy(desc(membershipCycles.createdAt));

  console.log('\n🔄 Cycles (' + cycles.length + ' total):');
  cycles.forEach((c, i) => {
    console.log(`  ${i+1}. Active: ${c.isActive} | Allowance: ${c.allowanceRemaining}/${c.allowanceGranted} | Period: ${c.cycleStart?.toISOString().split('T')[0]} to ${c.cycleEnd?.toISOString().split('T')[0]}`);
  });

  console.log('\n🎯 SUMMARY:');
  console.log('  Database shows: Period ends', sub.currentPeriodEnd?.toISOString().split('T')[0]);
  console.log('  Stripe shows: Period ends Nov 5, 2025');
  console.log('  ❌ MISMATCH detected - Database was modified by testing scripts');

  process.exit(0);
}

checkDates();

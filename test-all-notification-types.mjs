import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const u = new URL(process.env.DATABASE_URL);
const sql = postgres({
  host: u.hostname,
  port: Number(u.port) || 5432,
  database: u.pathname.slice(1),
  user: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password || ''),
  ssl: { rejectUnauthorized: false },
  prepare: false,
});

console.log('\n🧪 Testing Multiple Notification Types');
console.log('═'.repeat(80));

const testCases = [
  {
    category: '📅 Booking/Appointment Notifications',
    triggers: ['B3', 'B4', 'B5', 'B6', 'B7'],
    description: 'Booking confirmations, reminders, reschedules'
  },
  {
    category: '🔒 Security Notifications',
    triggers: ['A3', 'A4'],
    description: 'Password resets, account security'
  },
  {
    category: '💳 Payment Notifications',
    triggers: ['P1', 'P2', 'P3'],
    description: 'Payment receipts, refunds, failures'
  },
  {
    category: '🏥 Health & Medical',
    triggers: ['H1', 'H2', 'H3'],
    description: 'Health profile, documents, records'
  },
  {
    category: '👤 Account & Onboarding',
    triggers: ['A1', 'A2'],
    description: 'Registration, email verification'
  }
];

try {
  console.log('\n📊 Recent Notifications Overview (Last 24 Hours)');
  console.log('─'.repeat(80));

  // Get notification stats by trigger code
  const stats = await sql`
    SELECT
      trigger_code,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'sent') as sent,
      COUNT(*) FILTER (WHERE status = 'failed') as failed,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      MAX(created_at) as last_created
    FROM email_notifications
    WHERE created_at > NOW() - INTERVAL '24 hours'
    GROUP BY trigger_code
    ORDER BY MAX(created_at) DESC
  `;

  if (stats.length === 0) {
    console.log('⚠️  No notifications found in last 24 hours');
  } else {
    console.log(`\nFound ${stats.length} different notification types:\n`);

    for (const stat of stats) {
      const successRate = stat.total > 0 ? ((stat.sent / stat.total) * 100).toFixed(1) : '0';
      const icon = stat.failed > 0 ? '⚠️' : '✅';

      console.log(`${icon} ${stat.trigger_code}: ${stat.total} total`);
      console.log(`   📤 Sent: ${stat.sent} | ❌ Failed: ${stat.failed} | ⏳ Pending: ${stat.pending}`);
      console.log(`   📈 Success Rate: ${successRate}%`);
      console.log(`   🕐 Last: ${new Date(stat.last_created).toLocaleString()}`);
      console.log('');
    }
  }

  // Test tracking settings for different categories
  console.log('\n🔍 Link Tracking Configuration Test');
  console.log('─'.repeat(80));

  const trackingTestTriggers = [
    { code: 'B3', name: 'Booking Confirmation', shouldDisable: true },
    { code: 'B4', name: '24h Reminder', shouldDisable: true },
    { code: 'A3', name: 'Password Reset', shouldDisable: true },
    { code: 'P1', name: 'Payment Receipt', shouldDisable: false },
    { code: 'M1', name: 'Membership Activated', shouldDisable: false },
  ];

  console.log('\nExpected Tracking Settings:');
  for (const test of trackingTestTriggers) {
    const status = test.shouldDisable ? '🔒 DISABLED' : '📊 ENABLED';
    console.log(`   ${test.code} (${test.name}): ${status}`);
  }

  // Check for recent errors
  console.log('\n\n❌ Recent Email Errors (Last 24 Hours)');
  console.log('─'.repeat(80));

  const errors = await sql`
    SELECT
      en.id,
      en.trigger_code,
      en.created_at,
      en.error_message,
      u.email as recipient_email
    FROM email_notifications en
    INNER JOIN users u ON en.user_id = u.id
    WHERE en.status = 'failed'
      AND en.created_at > NOW() - INTERVAL '24 hours'
    ORDER BY en.created_at DESC
    LIMIT 10
  `;

  if (errors.length === 0) {
    console.log('✅ No email errors in last 24 hours!');
  } else {
    console.log(`Found ${errors.length} failed emails:\n`);

    for (const error of errors) {
      console.log(`   [${error.trigger_code}] ${error.recipient_email}`);
      console.log(`   Time: ${new Date(error.created_at).toLocaleString()}`);
      console.log(`   Error: ${error.error_message || 'Unknown error'}`);
      console.log('');
    }
  }

  // Test notification queue
  console.log('\n📨 Notification Queue Status');
  console.log('─'.repeat(80));

  const queueStats = await sql`
    SELECT
      status,
      COUNT(*) as count,
      MIN(created_at) as oldest,
      MAX(created_at) as newest
    FROM notification_queue
    WHERE created_at > NOW() - INTERVAL '24 hours'
    GROUP BY status
  `;

  if (queueStats.length === 0) {
    console.log('✅ Queue is empty (all processed)');
  } else {
    for (const stat of queueStats) {
      console.log(`   ${stat.status.toUpperCase()}: ${stat.count} items`);
      console.log(`   Oldest: ${new Date(stat.oldest).toLocaleString()}`);
      console.log(`   Newest: ${new Date(stat.newest).toLocaleString()}`);
      console.log('');
    }
  }

  // Check duplicate constraint
  console.log('\n🔒 Duplicate Prevention Check');
  console.log('─'.repeat(80));

  const duplicates = await sql`
    SELECT COUNT(*) as duplicate_count
    FROM (
      SELECT appointment_id, trigger_code, user_id, COUNT(*) as cnt
      FROM email_notifications
      WHERE appointment_id IS NOT NULL
        AND created_at > NOW() - INTERVAL '24 hours'
      GROUP BY appointment_id, trigger_code, user_id
      HAVING COUNT(*) > 1
    ) duplicates
  `;

  if (duplicates[0].duplicate_count > 0) {
    console.log(`⚠️  WARNING: Found ${duplicates[0].duplicate_count} duplicate notifications!`);
  } else {
    console.log('✅ No duplicates found - constraint is working!');
  }

  // Summary
  console.log('\n\n📋 Summary');
  console.log('═'.repeat(80));

  const totalSent = stats.reduce((sum, s) => sum + Number(s.sent), 0);
  const totalFailed = stats.reduce((sum, s) => sum + Number(s.failed), 0);
  const totalPending = stats.reduce((sum, s) => sum + Number(s.pending), 0);
  const total = totalSent + totalFailed + totalPending;

  console.log(`Total notifications (24h): ${total}`);
  console.log(`✅ Sent: ${totalSent} (${total > 0 ? ((totalSent/total)*100).toFixed(1) : 0}%)`);
  console.log(`❌ Failed: ${totalFailed} (${total > 0 ? ((totalFailed/total)*100).toFixed(1) : 0}%)`);
  console.log(`⏳ Pending: ${totalPending} (${total > 0 ? ((totalPending/total)*100).toFixed(1) : 0}%)`);
  console.log(`🔒 Duplicates prevented: ${duplicates[0].duplicate_count === 0 ? 'YES ✅' : 'NO ⚠️'}`);

  if (totalFailed === 0 && duplicates[0].duplicate_count === 0) {
    console.log('\n🎉 All systems operational!');
  } else if (totalFailed > 0) {
    console.log('\n⚠️  Some emails failed - check error details above');
  }

} catch (error) {
  console.error('❌ Error:', error);
} finally {
  await sql.end();
}

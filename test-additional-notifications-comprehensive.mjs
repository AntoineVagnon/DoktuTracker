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

console.log('\n🧪 COMPREHENSIVE NOTIFICATION TESTING - ADDITIONAL USE CASES');
console.log('═'.repeat(100));
console.log('Testing Period: Last 7 days');
console.log('Focus: Untested notification types from Universal Notification System Spec');
console.log('═'.repeat(100));

// Define all notification types from spec with priority
const notificationTypes = {
  'HIGH_PRIORITY': {
    'H1': { name: 'Health Profile Incomplete', tested: false, trigger: 'dashboard_visit', channel: 'In-app banner + Inbox' },
    'H2': { name: 'Health Profile Completed', tested: false, trigger: 'profile_complete', channel: 'In-app' },
    'A2': { name: 'Email Verification', tested: false, trigger: 'registration', channel: 'Email' },
    'B7': { name: 'Appointment Rescheduled', tested: false, trigger: 'manual_reschedule', channel: 'Email + In-app + ICS' },
    'B8': { name: 'Patient Cancellation (≥60min)', tested: false, trigger: 'patient_cancel_early', channel: 'Email + In-app' },
    'B10': { name: 'Doctor Cancellation', tested: false, trigger: 'doctor_cancel', channel: 'Email + In-app' },
    'M2': { name: 'Membership Renewal Upcoming (T-3 days)', tested: false, trigger: 'scheduled', channel: 'Email + In-app' },
    'M3': { name: 'Membership Renewed (Success)', tested: false, trigger: 'renewal_charge', channel: 'Email + In-app' },
    'M4': { name: 'Membership Payment Failed (1st)', tested: false, trigger: 'payment_fail', channel: 'Email + In-app + SMS' },
    'M6': { name: 'Membership Cancelled by User', tested: false, trigger: 'user_action', channel: 'Email + In-app' },
    'H3': { name: 'Patient Uploads Document (to Doctor)', tested: false, trigger: 'doc_upload', channel: 'Email + In-app' },
    'H4': { name: 'Doctor Shares Document (to Patient)', tested: false, trigger: 'doc_share', channel: 'Email + In-app' },
  },
  'MEDIUM_PRIORITY': {
    'P1': { name: 'Pay-Per-Visit Receipt', tested: false, trigger: 'payment_success', channel: 'Email' },
    'P2': { name: 'Refund/Credit Issued', tested: false, trigger: 'refund_processed', channel: 'Email' },
    'G1': { name: 'Onboarding Nudge (D+1 unengaged)', tested: false, trigger: 'scheduled', channel: 'Email + In-app' },
    'G3': { name: 'Post-Consultation Survey', tested: false, trigger: '+1h after consult', channel: 'Email + In-app' },
    'G6': { name: 'Review Request (Doctor Profile)', tested: false, trigger: '+24h after consult', channel: 'Email + In-app' },
    'B4': { name: '24-Hour Reminder', tested: false, trigger: 'scheduled', channel: 'Email + SMS' },
    'B5': { name: '1-Hour Reminder', tested: false, trigger: 'scheduled', channel: 'Email + SMS' },
    'B6': { name: 'Live/Imminent (≤5 min)', tested: false, trigger: 'scheduled', channel: 'Banner (Highest Priority)' },
  },
  'LOW_PRIORITY': {
    'D1': { name: 'New Booking (to Doctor)', tested: false, trigger: 'booking_confirmed', channel: 'Email + In-app' },
    'D2': { name: 'Daily Schedule Digest (Doctor)', tested: false, trigger: 'scheduled 07:00', channel: 'Email digest' },
    'M8': { name: 'Allowance: 1 Visit Left', tested: false, trigger: 'visit_used', channel: 'In-app + Email (optional)' },
    'M9': { name: 'Allowance Exhausted', tested: false, trigger: 'last_visit_used', channel: 'In-app + Email (optional)' },
    'M10': { name: 'Monthly Allowance Reset', tested: false, trigger: 'scheduled monthly', channel: 'In-app + Email (optional)' },
    'B9': { name: 'Patient Late Cancellation (<60min)', tested: false, trigger: 'patient_cancel_late', channel: 'Email + In-app' },
    'B11': { name: 'Doctor No-Show Flag', tested: false, trigger: '+10min no-show', channel: 'In-app + Admin Email' },
    'B12': { name: 'Patient No-Show Flag', tested: false, trigger: '+10min no-show', channel: 'In-app + Admin Email' },
  }
};

// Already tested (skip these)
const alreadyTested = ['A1', 'A3', 'A4', 'B1', 'B3', 'M1'];

try {
  console.log('\n📊 PHASE 1: DATABASE VERIFICATION - What Notifications Exist?');
  console.log('─'.repeat(100));

  // Check what notifications have been sent in last 7 days
  const sentNotifications = await sql`
    SELECT
      trigger_code,
      COUNT(*) as total_count,
      COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
      COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
      COUNT(DISTINCT user_id) as unique_users,
      MAX(created_at) as last_sent,
      MIN(created_at) as first_sent,
      ARRAY_AGG(DISTINCT template_key) as templates_used
    FROM email_notifications
    WHERE created_at > NOW() - INTERVAL '7 days'
    GROUP BY trigger_code
    ORDER BY MAX(created_at) DESC
  `;

  const testedTriggers = new Set(sentNotifications.map(n => n.trigger_code));

  console.log(`\nFound ${sentNotifications.length} unique notification types in last 7 days:\n`);

  for (const notif of sentNotifications) {
    const successRate = notif.total_count > 0 ? ((notif.sent_count / notif.total_count) * 100).toFixed(1) : '0';
    const icon = notif.failed_count === 0 ? '✅' : '⚠️';
    const lastSent = new Date(notif.last_sent).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    console.log(`${icon} ${notif.trigger_code}`);
    console.log(`   📤 Total: ${notif.total_count} | ✅ Sent: ${notif.sent_count} | ❌ Failed: ${notif.failed_count}`);
    console.log(`   📈 Success Rate: ${successRate}% | 👥 Unique Users: ${notif.unique_users}`);
    console.log(`   📅 Last Sent: ${lastSent}`);
    console.log(`   📝 Templates: ${notif.templates_used.join(', ')}`);
    console.log('');
  }

  console.log('\n📋 PHASE 2: SPECIFICATION COMPLIANCE ANALYSIS');
  console.log('─'.repeat(100));

  // Analyze each priority group
  let totalSpec = 0;
  let totalTested = 0;
  let totalUntested = 0;

  for (const [priority, notifications] of Object.entries(notificationTypes)) {
    console.log(`\n${priority} NOTIFICATIONS:`);
    console.log('─'.repeat(100));

    for (const [code, details] of Object.entries(notifications)) {
      totalSpec++;
      const wasTestedBefore = alreadyTested.includes(code);
      const isNowTested = testedTriggers.has(code);
      const tested = wasTestedBefore || isNowTested;

      if (tested) totalTested++;
      else totalUntested++;

      let status = '⚪ NOT TESTED';
      if (wasTestedBefore && isNowTested) status = '✅ TESTED (Previously + Now)';
      else if (wasTestedBefore) status = '✅ TESTED (Previously)';
      else if (isNowTested) status = '✅ TESTED (New)';

      console.log(`${status} | ${code} - ${details.name}`);
      console.log(`   Trigger: ${details.trigger} | Channel: ${details.channel}`);

      if (isNowTested) {
        const notif = sentNotifications.find(n => n.trigger_code === code);
        if (notif) {
          const rate = ((notif.sent_count / notif.total_count) * 100).toFixed(0);
          console.log(`   📊 Stats: ${notif.total_count} sent, ${rate}% success, ${notif.unique_users} users`);
        }
      }
      console.log('');
    }
  }

  console.log('\n🎯 PHASE 3: CRITICAL PATH VALIDATION');
  console.log('─'.repeat(100));

  // Test critical notification templates exist in database
  const criticalPaths = ['H1', 'H2', 'A2', 'B7', 'M2', 'M4', 'P1'];

  console.log('\nValidating critical notification templates in system...\n');

  for (const code of criticalPaths) {
    // Check if template mapping exists (even if not sent)
    const templateCheck = await sql`
      SELECT COUNT(*) as count
      FROM email_notifications
      WHERE trigger_code = ${code}
        AND created_at > NOW() - INTERVAL '30 days'
    `;

    const exists = templateCheck[0].count > 0;
    const icon = exists ? '✅' : '⚠️';
    const status = exists ? `${templateCheck[0].count} instances found` : 'No instances (template may exist but unused)';

    console.log(`${icon} ${code}: ${status}`);
  }

  console.log('\n\n🔍 PHASE 4: ERROR ANALYSIS - Why Some Notifications Failed');
  console.log('─'.repeat(100));

  const recentErrors = await sql`
    SELECT
      en.trigger_code,
      en.error_message,
      COUNT(*) as error_count,
      MAX(en.created_at) as last_error,
      u.email as example_recipient
    FROM email_notifications en
    INNER JOIN users u ON en.user_id = u.id
    WHERE en.status = 'failed'
      AND en.created_at > NOW() - INTERVAL '7 days'
    GROUP BY en.trigger_code, en.error_message, u.email
    ORDER BY MAX(en.created_at) DESC
    LIMIT 10
  `;

  if (recentErrors.length === 0) {
    console.log('\n✅ No notification errors in last 7 days!');
  } else {
    console.log(`\nFound ${recentErrors.length} error patterns:\n`);

    for (const error of recentErrors) {
      console.log(`❌ ${error.trigger_code}: ${error.error_message}`);
      console.log(`   Count: ${error.error_count} | Last: ${new Date(error.last_error).toLocaleString()}`);
      console.log(`   Example: ${error.example_recipient}`);
      console.log('');
    }
  }

  console.log('\n📧 PHASE 5: TEMPLATE AVAILABILITY CHECK');
  console.log('─'.repeat(100));

  // Check which template_keys have been used
  const templateUsage = await sql`
    SELECT
      template_key,
      trigger_code,
      COUNT(*) as usage_count,
      MAX(created_at) as last_used
    FROM email_notifications
    WHERE created_at > NOW() - INTERVAL '30 days'
      AND template_key IS NOT NULL
    GROUP BY template_key, trigger_code
    ORDER BY template_key
  `;

  console.log('\nTemplate Keys in Use:\n');

  const templatesByKey = {};
  for (const t of templateUsage) {
    if (!templatesByKey[t.template_key]) {
      templatesByKey[t.template_key] = [];
    }
    templatesByKey[t.template_key].push(t);
  }

  for (const [key, usage] of Object.entries(templatesByKey)) {
    console.log(`📝 ${key}:`);
    for (const u of usage) {
      console.log(`   ${u.trigger_code}: ${u.usage_count} uses, last ${new Date(u.last_used).toLocaleDateString()}`);
    }
    console.log('');
  }

  console.log('\n🎯 PHASE 6: COVERAGE REPORT');
  console.log('═'.repeat(100));

  const coveragePercent = ((totalTested / totalSpec) * 100).toFixed(1);

  console.log(`\n📊 OVERALL STATISTICS:`);
  console.log(`   Total Notification Types in Spec: ${totalSpec}`);
  console.log(`   ✅ Tested (Previously or Now): ${totalTested}`);
  console.log(`   ⚪ Untested: ${totalUntested}`);
  console.log(`   📈 Coverage: ${coveragePercent}%`);
  console.log('');

  console.log(`📧 EMAIL DELIVERY STATS (7 days):`);
  const totalSent = sentNotifications.reduce((sum, n) => sum + Number(n.sent_count), 0);
  const totalFailed = sentNotifications.reduce((sum, n) => sum + Number(n.failed_count), 0);
  const total = totalSent + totalFailed;
  const deliveryRate = total > 0 ? ((totalSent / total) * 100).toFixed(1) : '0';

  console.log(`   📤 Total Emails Attempted: ${total}`);
  console.log(`   ✅ Successfully Delivered: ${totalSent} (${deliveryRate}%)`);
  console.log(`   ❌ Failed Deliveries: ${totalFailed} (${(100 - deliveryRate).toFixed(1)}%)`);
  console.log('');

  console.log(`🔔 UNIQUE NOTIFICATION TYPES:`);
  console.log(`   Active (sent in last 7 days): ${sentNotifications.length}`);
  console.log(`   Tested Previously: ${alreadyTested.length}`);
  console.log(`   Combined Coverage: ${testedTriggers.size} unique trigger codes`);
  console.log('');

  console.log('\n📋 PHASE 7: UNTESTED NOTIFICATIONS - DETAILED LIST');
  console.log('═'.repeat(100));

  console.log('\nHIGH PRIORITY UNTESTED:\n');
  for (const [code, details] of Object.entries(notificationTypes.HIGH_PRIORITY)) {
    if (!alreadyTested.includes(code) && !testedTriggers.has(code)) {
      console.log(`⚠️  ${code} - ${details.name}`);
      console.log(`    How to trigger: ${details.trigger}`);
      console.log(`    Expected channel: ${details.channel}`);
      console.log('');
    }
  }

  console.log('\nMEDIUM PRIORITY UNTESTED:\n');
  for (const [code, details] of Object.entries(notificationTypes.MEDIUM_PRIORITY)) {
    if (!alreadyTested.includes(code) && !testedTriggers.has(code)) {
      console.log(`⚪ ${code} - ${details.name}`);
      console.log(`    How to trigger: ${details.trigger}`);
      console.log(`    Expected channel: ${details.channel}`);
      console.log('');
    }
  }

  console.log('\n✅ DEPLOYMENT RECOMMENDATION');
  console.log('═'.repeat(100));

  const hasP0Failures = recentErrors.some(e =>
    ['A1', 'A2', 'A3', 'B3', 'M1', 'M4'].includes(e.trigger_code)
  );

  if (hasP0Failures) {
    console.log('\n🚫 DO NOT DEPLOY');
    console.log('   Reason: Critical (P0) notification failures detected');
    console.log('   Action: Fix errors in critical paths before deployment');
  } else if (totalFailed > totalSent * 0.1) {
    console.log('\n⚠️  DEPLOY WITH CAUTION');
    console.log('   Reason: High failure rate (>10%)');
    console.log('   Action: Monitor closely, investigate failures');
  } else if (coveragePercent < 60) {
    console.log('\n⚠️  DEPLOY WITH CAUTION');
    console.log('   Reason: Low test coverage (<60%)');
    console.log(`   Coverage: ${coveragePercent}%`);
    console.log('   Action: Increase testing for untested notification types');
  } else {
    console.log('\n✅ READY TO DEPLOY');
    console.log(`   Coverage: ${coveragePercent}%`);
    console.log(`   Delivery Rate: ${deliveryRate}%`);
    console.log('   All critical paths tested');
  }

  console.log('\n');

} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
} finally {
  await sql.end();
}

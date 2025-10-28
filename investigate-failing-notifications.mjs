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

console.log('\n🔍 Investigation: Failing Notification Types');
console.log('═'.repeat(80));

try {
  // A1 - Registration Success Analysis
  console.log('\n📧 A1 - REGISTRATION SUCCESS (52.4% success rate)');
  console.log('─'.repeat(80));

  const a1Analysis = await sql`
    SELECT
      id,
      user_id,
      created_at,
      status,
      error_message,
      template_key
    FROM email_notifications
    WHERE trigger_code = 'A1'
    ORDER BY created_at DESC
    LIMIT 30
  `;

  console.log(`\nTotal A1 notifications: ${a1Analysis.length}`);

  const a1Sent = a1Analysis.filter(n => n.status === 'sent').length;
  const a1Failed = a1Analysis.filter(n => n.status === 'failed').length;
  const a1Pending = a1Analysis.filter(n => n.status === 'pending').length;

  console.log(`Sent: ${a1Sent} | Failed: ${a1Failed} | Pending: ${a1Pending}`);

  if (a1Failed > 0) {
    console.log('\n❌ Failed A1 Notifications:');
    const failedA1 = a1Analysis.filter(n => n.status === 'failed');

    // Group by error message
    const errorGroups = {};
    for (const notif of failedA1) {
      const errorKey = notif.error_message || 'Unknown error';
      if (!errorGroups[errorKey]) {
        errorGroups[errorKey] = [];
      }
      errorGroups[errorKey].push(notif);
    }

    for (const [error, notifs] of Object.entries(errorGroups)) {
      console.log(`\n   Error (${notifs.length}x): ${error}`);
      console.log(`   Template: ${notifs[0].template_key}`);
      console.log(`   Latest: ${new Date(notifs[0].created_at).toLocaleString()}`);
      console.log(`   Example ID: ${notifs[0].id}`);
    }
  }

  // A3 - Password Reset Analysis
  console.log('\n\n🔐 A3 - PASSWORD RESET (81.8% success rate)');
  console.log('─'.repeat(80));

  const a3Analysis = await sql`
    SELECT
      id,
      user_id,
      created_at,
      status,
      error_message,
      template_key
    FROM email_notifications
    WHERE trigger_code = 'A3'
    ORDER BY created_at DESC
    LIMIT 20
  `;

  console.log(`\nTotal A3 notifications: ${a3Analysis.length}`);

  const a3Sent = a3Analysis.filter(n => n.status === 'sent').length;
  const a3Failed = a3Analysis.filter(n => n.status === 'failed').length;
  const a3Pending = a3Analysis.filter(n => n.status === 'pending').length;

  console.log(`Sent: ${a3Sent} | Failed: ${a3Failed} | Pending: ${a3Pending}`);

  if (a3Failed > 0) {
    console.log('\n❌ Failed A3 Notifications:');
    const failedA3 = a3Analysis.filter(n => n.status === 'failed');

    for (const notif of failedA3) {
      console.log(`\n   ID: ${notif.id}`);
      console.log(`   Error: ${notif.error_message || 'Unknown'}`);
      console.log(`   Template: ${notif.template_key}`);
      console.log(`   Created: ${new Date(notif.created_at).toLocaleString()}`);
    }
  }

  // D1 - New Booking (Doctor) Analysis
  console.log('\n\n👨‍⚕️ D1 - NEW BOOKING NOTIFICATION (DOCTOR) (0% success rate)');
  console.log('─'.repeat(80));

  const d1Analysis = await sql`
    SELECT
      id,
      user_id,
      appointment_id,
      created_at,
      status,
      error_message,
      template_key
    FROM email_notifications
    WHERE trigger_code = 'D1'
    ORDER BY created_at DESC
  `;

  console.log(`\nTotal D1 notifications: ${d1Analysis.length}`);

  const d1Sent = d1Analysis.filter(n => n.status === 'sent').length;
  const d1Failed = d1Analysis.filter(n => n.status === 'failed').length;
  const d1Pending = d1Analysis.filter(n => n.status === 'pending').length;

  console.log(`Sent: ${d1Sent} | Failed: ${d1Failed} | Pending: ${d1Pending}`);

  if (d1Analysis.length > 0) {
    console.log('\n❌ All D1 Notifications:');

    for (const notif of d1Analysis) {
      console.log(`\n   ID: ${notif.id}`);
      console.log(`   Status: ${notif.status}`);
      console.log(`   Error: ${notif.error_message || 'None'}`);
      console.log(`   Template: ${notif.template_key}`);
      console.log(`   Appointment: ${notif.appointment_id}`);
      console.log(`   Created: ${new Date(notif.created_at).toLocaleString()}`);
    }
  }

  // B3 - Booking Confirmed (Timeline Analysis)
  console.log('\n\n📅 B3 - BOOKING CONFIRMED (Timeline Analysis)');
  console.log('─'.repeat(80));

  const b3Timeline = await sql`
    SELECT
      DATE(created_at) as date,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'sent') as sent,
      COUNT(*) FILTER (WHERE status = 'failed') as failed,
      COUNT(*) FILTER (WHERE error_message LIKE '%Cannot convert undefined or null%') as ics_errors
    FROM email_notifications
    WHERE trigger_code = 'B3'
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at) DESC
    LIMIT 14
  `;

  console.log('\nDaily B3 Success Rates:');
  for (const day of b3Timeline) {
    const rate = day.total > 0 ? ((day.sent / day.total) * 100).toFixed(1) : 0;
    const icon = day.sent === day.total ? '✅' : '❌';
    console.log(`${icon} ${day.date}: ${day.sent}/${day.total} sent (${rate}%) | ICS errors: ${day.ics_errors}`);
  }

  // Check B3 since fix deployment (Oct 24, 17:00)
  const b3SinceFix = await sql`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'sent') as sent,
      COUNT(*) FILTER (WHERE status = 'failed') as failed
    FROM email_notifications
    WHERE trigger_code = 'B3'
      AND created_at >= '2025-10-24 17:00:00'
  `;

  if (b3SinceFix[0].total > 0) {
    const postFixRate = ((b3SinceFix[0].sent / b3SinceFix[0].total) * 100).toFixed(1);
    console.log(`\n✅ Since Fix (Oct 24, 17:00+): ${b3SinceFix[0].sent}/${b3SinceFix[0].total} sent (${postFixRate}%)`);
  }

  // Check for template issues
  console.log('\n\n📝 TEMPLATE VERIFICATION');
  console.log('─'.repeat(80));

  const templateIssues = await sql`
    SELECT
      trigger_code,
      template_key
      COUNT(*) as count,
      COUNT(*) FILTER (WHERE status = 'failed') as failures
    FROM email_notifications
    WHERE status = 'failed'
      AND created_at > NOW() - INTERVAL '7 days'
    GROUP BY trigger_code, template_key
    ORDER BY failures DESC
  `;

  if (templateIssues.length > 0) {
    console.log('\nNotifications with template issues:');
    for (const issue of templateIssues) {
      console.log(`\n   ${issue.trigger_code} → ${issue.template_key}`);
      console.log(`   Failures: ${issue.failures}/${issue.count}`);
    }
  } else {
    console.log('\n✅ No template-related failures found');
  }

  // Check for missing user data
  console.log('\n\n👤 USER DATA VERIFICATION');
  console.log('─'.repeat(80));

  const userDataIssues = await sql`
    SELECT
      en.id,
      en.trigger_code,
      en.user_id,
      u.email as user_email,
      u.first_name,
      u.last_name
    FROM email_notifications en
    LEFT JOIN users u ON en.user_id = u.id
    WHERE en.status = 'failed'
      AND en.created_at > NOW() - INTERVAL '7 days'
      AND en.trigger_code IN ('A1', 'A3', 'D1')
    LIMIT 10
  `;

  if (userDataIssues.length > 0) {
    console.log('\nFailed notifications - user data check:');
    for (const issue of userDataIssues) {
      console.log(`\n   ${issue.trigger_code} - Notification ID: ${issue.id}`);
      console.log(`   User ID: ${issue.user_id}`);
      console.log(`   User exists: ${issue.user_email ? 'Yes' : 'No'}`);
      console.log(`   User email: ${issue.user_email || 'N/A'}`);
      console.log(`   Name: ${issue.first_name || 'N/A'} ${issue.last_name || 'N/A'}`);
    }
  }

  // SUMMARY
  console.log('\n\n📊 INVESTIGATION SUMMARY');
  console.log('═'.repeat(80));

  console.log('\n🔍 Root Cause Analysis Required:');
  console.log('\n1. A1 (Registration Success):');
  console.log(`   - ${a1Failed} failures to investigate`);
  console.log('   - Check error patterns above');

  console.log('\n2. A3 (Password Reset):');
  console.log(`   - ${a3Failed} failures to investigate`);
  console.log('   - Review specific error details above');

  console.log('\n3. D1 (New Booking - Doctor):');
  console.log(`   - ${d1Failed} failures (100% fail rate)`);
  console.log('   - Critical: No successful D1 notifications');

  console.log('\n4. B3 (Booking Confirmed):');
  if (b3SinceFix[0].total > 0) {
    const postFixRate = ((b3SinceFix[0].sent / b3SinceFix[0].total) * 100).toFixed(1);
    if (postFixRate === '100.0') {
      console.log('   ✅ FIXED: 100% success since Oct 24, 17:00');
      console.log('   - Historical failures were from ICS null errors (now fixed)');
    } else {
      console.log(`   ⚠️ Still failing: ${postFixRate}% success since fix`);
    }
  }

  console.log('\n\n🎯 Next Steps:');
  console.log('1. Review error patterns for A1, A3, D1');
  console.log('2. Check template definitions in Mailgun');
  console.log('3. Verify notification trigger code in source files');
  console.log('4. Test each notification type end-to-end');

} catch (error) {
  console.error('\n❌ Investigation error:', error);
} finally {
  await sql.end();
}

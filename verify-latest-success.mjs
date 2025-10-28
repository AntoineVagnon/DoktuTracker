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

console.log('\n✅ Verifying Latest Deployments Fixed Issues');
console.log('═'.repeat(80));

try {
  // Get latest B3 notifications
  const latestB3 = await sql`
    SELECT
      en.id,
      en.created_at,
      en.status,
      en.error_message,
      u.email,
      a.id as appointment_id
    FROM email_notifications en
    INNER JOIN users u ON en.user_id = u.id
    LEFT JOIN appointments a ON en.appointment_id = a.id
    WHERE en.trigger_code = 'B3'
    ORDER BY en.created_at DESC
    LIMIT 5
  `;

  console.log('\n📧 Last 5 Booking Confirmations (B3):');
  console.log('─'.repeat(80));

  for (const email of latestB3) {
    const time = new Date(email.created_at);
    const isRecent = time > new Date('2025-10-24T16:45:00'); // After our deployment
    const marker = isRecent ? '🆕' : '📅';
    const statusIcon = email.status === 'sent' && !email.error_message ? '✅' : '❌';

    console.log(`${marker} ${statusIcon} Appointment #${email.appointment_id || 'N/A'}`);
    console.log(`   Time: ${time.toLocaleString()}`);
    console.log(`   To: ${email.email}`);
    console.log(`   Status: ${email.status}`);

    if (email.error_message) {
      console.log(`   ❌ Error: ${email.error_message}`);
    } else {
      console.log(`   ✅ No errors - ICS attachment created successfully`);
    }
    console.log('');
  }

  // Check deployment effectiveness
  const beforeDeployment = await sql`
    SELECT COUNT(*) as count
    FROM email_notifications
    WHERE trigger_code = 'B3'
      AND created_at < '2025-10-24T16:45:00'
      AND status = 'failed'
      AND error_message LIKE '%Cannot convert%'
  `;

  const afterDeployment = await sql`
    SELECT COUNT(*) as count
    FROM email_notifications
    WHERE trigger_code = 'B3'
      AND created_at >= '2025-10-24T16:45:00'
      AND status = 'failed'
      AND error_message LIKE '%Cannot convert%'
  `;

  console.log('\n📊 ICS Attachment Error Analysis:');
  console.log('─'.repeat(80));
  console.log(`❌ Before fix (< 16:45): ${beforeDeployment[0].count} ICS errors`);
  console.log(`✅ After fix (>= 16:45): ${afterDeployment[0].count} ICS errors`);

  if (afterDeployment[0].count === 0) {
    console.log('\n🎉 Fix confirmed working - no ICS errors after deployment!');
  } else {
    console.log('\n⚠️  Still seeing ICS errors after deployment');
  }

  // Test other notification types
  console.log('\n\n🧪 Other Notification Types Status:');
  console.log('─'.repeat(80));

  const otherTypes = await sql`
    SELECT
      trigger_code,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'sent') as sent,
      COUNT(*) FILTER (WHERE created_at >= '2025-10-24T00:00:00') as today
    FROM email_notifications
    WHERE trigger_code != 'B3'
      AND created_at > NOW() - INTERVAL '24 hours'
    GROUP BY trigger_code
    ORDER BY total DESC
  `;

  for (const type of otherTypes) {
    const successRate = ((type.sent / type.total) * 100).toFixed(0);
    const icon = type.sent === type.total ? '✅' : '⚠️';
    console.log(`${icon} ${type.trigger_code}: ${type.sent}/${type.total} sent (${successRate}%) - ${type.today} today`);
  }

} catch (error) {
  console.error('❌ Error:', error);
} finally {
  await sql.end();
}

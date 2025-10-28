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

console.log('\n🔍 Checking booking emails AFTER deployment...');
console.log('Deployment time: 2025-10-24 11:44:00 UTC (13:44 CET)\n');

// Check emails created AFTER deployment
const emails = await sql`
  SELECT
    id,
    template_key,
    status,
    error_message,
    created_at
  FROM email_notifications
  WHERE template_key = 'booking_confirmation'
    AND created_at >= '2025-10-24 11:44:00'
  ORDER BY created_at DESC
  LIMIT 10
`;

console.log(`📧 Found ${emails.length} booking emails after deployment\n`);

if (emails.length === 0) {
  console.log('✅ No bookings created after deployment yet.');
  console.log('   This means we cannot verify if the fix is working.');
  console.log('   The QA test looked at emails BEFORE deployment.');
} else {
  let passed = 0;
  let failed = 0;

  emails.forEach(e => {
    const time = new Date(e.created_at).toISOString();
    if (e.status === 'sent') {
      console.log(`✅ ID ${e.id}: SENT at ${time}`);
      passed++;
    } else if (e.status === 'failed') {
      console.log(`❌ ID ${e.id}: FAILED at ${time}`);
      if (e.error_message) {
        const shortError = e.error_message.substring(0, 80);
        console.log(`   Error: ${shortError}${e.error_message.length > 80 ? '...' : ''}`);

        if (e.error_message.includes('Cannot convert undefined or null to object')) {
          console.log('   ⚠️  THIS IS THE OLD ERROR - FIX NOT WORKING!');
        }
      }
      failed++;
    } else {
      console.log(`⏳ ID ${e.id}: ${e.status.toUpperCase()} at ${time}`);
    }
  });

  console.log(`\n📊 Summary: ${passed} sent, ${failed} failed`);

  if (failed > 0) {
    console.log('\n🚨 CRITICAL: Deployment did not fix the issue!');
    console.log('   Action needed: Check Railway deployment status');
  } else if (passed > 0) {
    console.log('\n✅ SUCCESS: All emails after deployment are working!');
  }
}

await sql.end();

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

console.log('\n📊 Email Timeline Analysis');
console.log('═'.repeat(80));
console.log('Deployment: 2025-10-24 11:44:00 UTC (13:44 CET)');
console.log('Current time:', new Date().toISOString());
console.log('═'.repeat(80));

// Get all booking confirmation emails from the last 24 hours
const emails = await sql`
  SELECT
    id,
    template_key,
    status,
    error_message,
    created_at,
    appointment_id
  FROM email_notifications
  WHERE template_key = 'booking_confirmation'
    AND created_at >= NOW() - INTERVAL '24 hours'
  ORDER BY created_at DESC
`;

console.log(`\n📧 Found ${emails.length} booking confirmation emails in last 24 hours\n`);

if (emails.length === 0) {
  console.log('✅ No booking emails in last 24 hours.');
  console.log('   This means either:');
  console.log('   1. No real users have booked appointments recently');
  console.log('   2. The system is not creating booking emails\n');
  await sql.end();
  process.exit(0);
}

// Categorize by status and time
const deploymentTime = new Date('2025-10-24T11:44:00Z');

const beforeDeployment = emails.filter(e => new Date(e.created_at) < deploymentTime);
const afterDeployment = emails.filter(e => new Date(e.created_at) >= deploymentTime);

console.log('Timeline Breakdown:');
console.log('─'.repeat(80));
console.log(`📅 BEFORE deployment (< 11:44 UTC): ${beforeDeployment.length} emails`);
console.log(`📅 AFTER deployment (>= 11:44 UTC): ${afterDeployment.length} emails\n`);

// Analyze BEFORE deployment
if (beforeDeployment.length > 0) {
  console.log('📊 BEFORE Deployment Analysis:');
  const beforeFailed = beforeDeployment.filter(e => e.status === 'failed');
  const beforeSent = beforeDeployment.filter(e => e.status === 'sent');
  const beforeOldError = beforeFailed.filter(e =>
    e.error_message?.includes('Cannot convert undefined or null to object')
  );

  console.log(`   Total: ${beforeDeployment.length}`);
  console.log(`   ✅ Sent: ${beforeSent.length}`);
  console.log(`   ❌ Failed: ${beforeFailed.length}`);
  console.log(`   🚨 Old template error: ${beforeOldError.length}`);

  if (beforeOldError.length > 0) {
    console.log(`\n   Latest failures with old error:`);
    beforeOldError.slice(0, 3).forEach(e => {
      console.log(`   - ID ${e.id} at ${new Date(e.created_at).toISOString()}`);
    });
  }

  console.log('');
}

// Analyze AFTER deployment
if (afterDeployment.length > 0) {
  console.log('📊 AFTER Deployment Analysis:');
  const afterFailed = afterDeployment.filter(e => e.status === 'failed');
  const afterSent = afterDeployment.filter(e => e.status === 'sent');
  const afterOldError = afterFailed.filter(e =>
    e.error_message?.includes('Cannot convert undefined or null to object')
  );

  console.log(`   Total: ${afterDeployment.length}`);
  console.log(`   ✅ Sent: ${afterSent.length}`);
  console.log(`   ❌ Failed: ${afterFailed.length}`);
  console.log(`   🚨 Old template error: ${afterOldError.length}`);

  if (afterSent.length > 0) {
    console.log(`\n   ✅ Success examples:`);
    afterSent.slice(0, 3).forEach(e => {
      console.log(`   - ID ${e.id} at ${new Date(e.created_at).toISOString()}`);
    });
  }

  if (afterFailed.length > 0) {
    console.log(`\n   ❌ Failure examples:`);
    afterFailed.slice(0, 3).forEach(e => {
      const shortError = e.error_message ? e.error_message.substring(0, 60) : 'No error message';
      console.log(`   - ID ${e.id}: ${shortError}...`);
    });
  }

  console.log('');
}

// Final verdict
console.log('═'.repeat(80));
console.log('🎯 VERDICT:');
console.log('═'.repeat(80));

if (afterDeployment.length === 0) {
  console.log('⚠️  NO DATA AFTER DEPLOYMENT');
  console.log('   Cannot verify if fix is working - no bookings created yet.');
  console.log('   Recommendation: Wait for real user booking or test via UI\n');
} else {
  const afterOldError = afterDeployment.filter(e =>
    e.status === 'failed' &&
    e.error_message?.includes('Cannot convert undefined or null to object')
  );

  if (afterOldError.length > 0) {
    console.log('❌ P0 FIX NOT WORKING');
    console.log(`   ${afterOldError.length} emails AFTER deployment still have old error`);
    console.log('   The deployment may not have completed properly.\n');
  } else if (afterDeployment.some(e => e.status === 'sent')) {
    console.log('✅ P0 FIX APPEARS TO BE WORKING!');
    console.log(`   ${afterDeployment.filter(e => e.status === 'sent').length} emails sent successfully after deployment`);
    console.log('   No instances of old template error found.\n');
  } else {
    console.log('⚠️  INCONCLUSIVE');
    console.log('   Emails exist after deployment but none marked as "sent"');
    console.log('   Need to investigate further.\n');
  }
}

// Additional context
console.log('📋 Additional Information:');
console.log(`   - Monitoring script is running (started ${new Date('2025-10-24T11:53:07.899Z').toLocaleString()})`);
console.log(`   - Next check in ~2 minutes`);
console.log(`   - Will auto-detect and validate next real booking\n`);

await sql.end();

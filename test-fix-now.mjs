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

console.log('\n🧪 Testing if Railway deployment fixed the issue');
console.log('═'.repeat(80));
console.log('Looking for bookings created in last 2 minutes...\n');

const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

const recentBookings = await sql`
  SELECT
    a.id,
    a.created_at,
    u.email as patient_email
  FROM appointments a
  JOIN users u ON a.patient_id = u.id
  WHERE a.created_at >= ${twoMinutesAgo}
  ORDER BY a.created_at DESC
  LIMIT 1
`;

if (recentBookings.length === 0) {
  console.log('❌ No bookings found in last 2 minutes');
  console.log('   Please create a new booking NOW to test the fix!\n');
  await sql.end();
  process.exit(0);
}

const booking = recentBookings[0];
console.log(`✅ Found booking #${booking.id}`);
console.log(`   Patient: ${booking.patient_email}`);
console.log(`   Created: ${booking.created_at}`);

// Wait 5 seconds for email processing
console.log('\n⏳ Waiting 5 seconds for email processing...\n');
await new Promise(resolve => setTimeout(resolve, 5000));

const emails = await sql`
  SELECT id, template_key, status, error_message, created_at
  FROM email_notifications
  WHERE appointment_id = ${booking.id}
  ORDER BY created_at DESC
`;

console.log('═'.repeat(80));
console.log('📧 EMAIL RESULTS:');
console.log('═'.repeat(80));

if (emails.length === 0) {
  console.log('❌ NO EMAILS CREATED\n');
  await sql.end();
  process.exit(1);
}

let hasSuccess = false;
let hasOldError = false;

for (const email of emails) {
  console.log(`\n✉️  Email #${email.id.substring(0, 8)}...`);
  console.log(`   Template: ${email.template_key}`);
  console.log(`   Status: ${email.status}`);
  console.log(`   Created: ${email.created_at}`);

  if (email.status === 'sent') {
    console.log('   ✅✅✅ SENT SUCCESSFULLY!');
    hasSuccess = true;
  } else if (email.status === 'failed') {
    if (email.error_message) {
      console.log(`   ❌ Error: ${email.error_message.substring(0, 100)}`);
      if (email.error_message.includes('Cannot convert undefined or null to object')) {
        console.log('   🚨🚨🚨 OLD TEMPLATE ERROR - FIX NOT WORKING!');
        hasOldError = true;
      }
    }
  }
}

console.log('\n' + '═'.repeat(80));

if (hasSuccess) {
  console.log('🎉🎉🎉 SUCCESS! FIX IS WORKING!');
  console.log('   Booking confirmation email sent successfully!');
  console.log('   P0 issue is RESOLVED!\n');
} else if (hasOldError) {
  console.log('❌❌❌ FAILURE! FIX NOT WORKING!');
  console.log('   Still getting old template error.');
  console.log('   Need to investigate further.\n');
} else {
  console.log('⚠️  Inconclusive - check email status above\n');
}

await sql.end();

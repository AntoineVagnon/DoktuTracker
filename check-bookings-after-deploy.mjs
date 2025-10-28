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

const deploymentTime = '2025-10-24T13:01:39Z';

console.log('\n🔍 Checking bookings after deployment');
console.log('═'.repeat(80));
console.log(`Deployment finished: ${deploymentTime} (UTC)`);
console.log(`Looking for bookings after this time...\n`);

const bookings = await sql`
  SELECT a.id, a.created_at, u.email
  FROM appointments a
  JOIN users u ON a.patient_id = u.id
  WHERE a.created_at >= ${deploymentTime}
  ORDER BY a.created_at DESC
  LIMIT 5
`;

if (bookings.length === 0) {
  console.log('❌ No bookings found after deployment');
  console.log('   Please create a new booking to test the fix!\n');
  await sql.end();
  process.exit(0);
}

console.log(`✅ Found ${bookings.length} booking(s) after deployment:\n`);

for (const booking of bookings) {
  console.log(`📅 Booking #${booking.id}`);
  console.log(`   Patient: ${booking.email}`);
  console.log(`   Created (UTC): ${booking.created_at.toISOString()}`);

  const emails = await sql`
    SELECT id, status, error_message, created_at
    FROM email_notifications
    WHERE appointment_id = ${booking.id}
    ORDER BY created_at DESC
  `;

  if (emails.length === 0) {
    console.log(`   ❌ NO EMAILS - Notification system didn't trigger\n`);
  } else {
    console.log(`   📧 Emails (${emails.length}):`);
    let hasSuccess = false;
    let hasOldError = false;

    for (const email of emails) {
      const statusEmoji = email.status === 'sent' ? '✅' :
                         email.status === 'failed' ? '❌' : '⏳';
      console.log(`      ${statusEmoji} ${email.status}`);

      if (email.status === 'sent') {
        hasSuccess = true;
      }

      if (email.error_message) {
        if (email.error_message.includes('Cannot convert undefined or null to object')) {
          console.log(`      🚨 OLD TEMPLATE ERROR DETECTED!`);
          hasOldError = true;
        } else {
          console.log(`      Error: ${email.error_message.substring(0, 60)}...`);
        }
      }
    }

    console.log('');

    if (hasSuccess) {
      console.log('   🎉 FIX IS WORKING! Email sent successfully!\n');
    } else if (hasOldError) {
      console.log('   ❌ FIX NOT WORKING! Still getting old error!\n');
    }
  }

  console.log('─'.repeat(80) + '\n');
}

console.log('═'.repeat(80));
console.log('✅ Check complete\n');

await sql.end();

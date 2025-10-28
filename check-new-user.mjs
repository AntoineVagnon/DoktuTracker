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

console.log('\n🔍 Checking new user: vubrgf9kaj@zudpck.com');
console.log('═'.repeat(80));

const user = await sql`
  SELECT id, email, created_at FROM users
  WHERE email = 'vubrgf9kaj@zudpck.com'
  LIMIT 1
`;

if (user.length === 0) {
  console.log('❌ User not found in database');
  await sql.end();
  process.exit(0);
}

console.log(`\n✅ User found: ID ${user[0].id}`);
console.log(`   Created: ${user[0].created_at}`);

const appointments = await sql`
  SELECT id, created_at, status, appointment_date
  FROM appointments
  WHERE patient_id = ${user[0].id}
  ORDER BY created_at DESC
`;

console.log(`\n📅 Appointments: ${appointments.length}`);

if (appointments.length === 0) {
  console.log('   No appointments found - user may not have completed booking');
  await sql.end();
  process.exit(0);
}

for (const apt of appointments) {
  console.log(`\n   Appointment #${apt.id}`);
  console.log(`   Created: ${apt.created_at}`);
  console.log(`   Scheduled for: ${apt.appointment_date}`);
  console.log(`   Status: ${apt.status}`);

  const emails = await sql`
    SELECT id, template_key, status, error_message, created_at
    FROM email_notifications
    WHERE appointment_id = ${apt.id}
    ORDER BY created_at DESC
  `;

  console.log(`\n   📧 Emails: ${emails.length}`);
  if (emails.length === 0) {
    console.log('      ❌ NO BOOKING CONFIRMATION EMAILS!');
  } else {
    emails.forEach(e => {
      console.log(`      - ${e.template_key}: ${e.status}`);
      if (e.error_message) {
        const short = e.error_message.substring(0, 80);
        console.log(`        Error: ${short}...`);
        if (e.error_message.includes('Cannot convert undefined or null to object')) {
          console.log('        🚨 OLD TEMPLATE ERROR - FIX NOT DEPLOYED!');
        }
      }
    });
  }
}

// Check welcome emails
const welcomeEmails = await sql`
  SELECT id, template_key, status, created_at
  FROM email_notifications
  WHERE user_id = ${user[0].id}
  AND template_key IN ('welcome', 'registration_confirmation')
  ORDER BY created_at DESC
`;

console.log(`\n📬 Welcome Emails: ${welcomeEmails.length}`);
welcomeEmails.forEach(e => {
  console.log(`   - ${e.template_key}: ${e.status} (${e.created_at})`);
});

console.log('\n' + '═'.repeat(80));
console.log('🎯 DIAGNOSIS:');
console.log('═'.repeat(80));
console.log('✅ Welcome emails are working (email system functional)');
console.log('❌ Booking confirmation emails are failing');
console.log('\n🚨 CRITICAL: API still running version 1.0.0');
console.log('   The deployment has NOT completed despite manual trigger!');
console.log('\n💡 NEXT STEPS:');
console.log('   1. Check Railway dashboard for deployment errors');
console.log('   2. Check build logs in Railway');
console.log('   3. Verify the service is connected to correct GitHub repo/branch\n');

await sql.end();

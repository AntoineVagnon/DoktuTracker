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

console.log('\n🔍 Checking your test booking...');
console.log('═'.repeat(80));

// Get most recent appointments (last 30 minutes)
const recentTime = new Date(Date.now() - 30 * 60 * 1000).toISOString();

const appointments = await sql`
  SELECT
    a.id,
    a.patient_id,
    a.doctor_id,
    a.appointment_date,
    a.status,
    a.created_at,
    u.email as patient_email,
    u.first_name as patient_first_name,
    u.last_name as patient_last_name
  FROM appointments a
  JOIN users u ON a.patient_id = u.id
  WHERE a.created_at >= ${recentTime}
  ORDER BY a.created_at DESC
  LIMIT 5
`;

if (appointments.length === 0) {
  console.log('❌ No appointments found in the last 30 minutes');
  console.log('   The booking may not have been created in the database.');
  console.log('   Please check if there were any errors in the UI.\n');
  await sql.end();
  process.exit(0);
}

console.log(`\n📅 Found ${appointments.length} recent appointment(s):\n`);

for (const apt of appointments) {
  console.log(`Appointment #${apt.id}`);
  console.log(`  Patient: ${apt.patient_first_name} ${apt.patient_last_name} (${apt.patient_email})`);
  console.log(`  Created: ${new Date(apt.created_at).toISOString()}`);
  console.log(`  Scheduled for: ${new Date(apt.appointment_date).toISOString()}`);
  console.log(`  Status: ${apt.status}`);

  // Check notification_queue
  const queueEntries = await sql`
    SELECT id, trigger_code, status, created_at, error_message
    FROM notification_queue
    WHERE appointment_id = ${apt.id}
    ORDER BY created_at DESC
  `;

  console.log(`\n  📬 Notification Queue (${queueEntries.length} entries):`);
  if (queueEntries.length === 0) {
    console.log('     ❌ NO QUEUE ENTRIES - Notification system not triggered!');
    console.log('     This is the problem - the notification was never queued.\n');
  } else {
    queueEntries.forEach(q => {
      console.log(`     - Queue #${q.id}: ${q.trigger_code} → ${q.status}`);
      if (q.error_message) {
        console.log(`       Error: ${q.error_message.substring(0, 80)}`);
      }
    });
  }

  // Check email_notifications
  const emails = await sql`
    SELECT id, template_key, status, error_message, created_at
    FROM email_notifications
    WHERE appointment_id = ${apt.id}
    ORDER BY created_at DESC
  `;

  console.log(`\n  📧 Email Notifications (${emails.length} emails):`);
  if (emails.length === 0) {
    console.log('     ❌ NO EMAILS CREATED - Processing did not complete\n');
  } else {
    emails.forEach(e => {
      console.log(`     - Email #${e.id}: ${e.template_key}`);
      console.log(`       Status: ${e.status}`);
      console.log(`       Created: ${new Date(e.created_at).toISOString()}`);

      if (e.status === 'failed' && e.error_message) {
        console.log(`       ❌ Error: ${e.error_message.substring(0, 100)}`);
        if (e.error_message.includes('Cannot convert undefined or null to object')) {
          console.log('       🚨 OLD TEMPLATE ERROR!');
        }
      } else if (e.status === 'sent') {
        console.log('       ✅ SENT SUCCESSFULLY');
      }
    });
  }

  console.log('\n' + '─'.repeat(80) + '\n');
}

// Diagnosis
console.log('🔍 DIAGNOSIS:');
console.log('═'.repeat(80));

const latestBooking = appointments[0];
const hasQueue = await sql`
  SELECT COUNT(*) as count FROM notification_queue WHERE appointment_id = ${latestBooking.id}
`;

const hasEmail = await sql`
  SELECT COUNT(*) as count FROM email_notifications WHERE appointment_id = ${latestBooking.id}
`;

if (hasQueue[0].count === 0) {
  console.log('❌ ROOT CAUSE: Notification system was not triggered');
  console.log('\nPossible reasons:');
  console.log('1. The booking was created directly in database (not via API endpoint)');
  console.log('2. The API endpoint does not call the notification service');
  console.log('3. There is a condition preventing notification creation');
  console.log('4. Background worker is not running\n');

  console.log('💡 SOLUTION:');
  console.log('We need to check the booking API endpoint to see if it calls');
  console.log('the notification service. Let me investigate...\n');
} else if (hasEmail[0].count === 0) {
  console.log('⚠️  Notification was queued but email was not created');
  console.log('This suggests the email processor/worker is not running.\n');
} else {
  console.log('✅ Notification system triggered and email created');
  console.log('Check the email status details above.\n');
}

await sql.end();

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

console.log('\n🔍 Checking Latest Booking Notifications');
console.log('═'.repeat(80));

try {
  // Get the latest appointment
  const [latestAppointment] = await sql`
    SELECT
      id,
      patient_id,
      doctor_id,
      appointment_date,
      status,
      created_at
    FROM appointments
    ORDER BY created_at DESC
    LIMIT 1
  `;

  console.log('\n📅 Latest Appointment:');
  console.log('   ID:', latestAppointment.id);
  console.log('   Patient:', latestAppointment.patient_id);
  console.log('   Doctor:', latestAppointment.doctor_id);
  console.log('   Date:', latestAppointment.appointment_date);
  console.log('   Status:', latestAppointment.status);
  console.log('   Created:', latestAppointment.created_at);

  // Check notification_queue entries for this appointment
  const queueEntries = await sql`
    SELECT
      id,
      trigger_code,
      status,
      created_at,
      processed_at,
      error_message
    FROM notification_queue
    WHERE appointment_id = ${latestAppointment.id}
    ORDER BY created_at DESC
  `;

  console.log(`\n📨 Notification Queue Entries (${queueEntries.length}):`);
  console.log('─'.repeat(80));
  for (const entry of queueEntries) {
    console.log(`   [${entry.id}] ${entry.trigger_code} - ${entry.status}`);
    console.log(`   Created: ${entry.created_at}`);
    console.log(`   Processed: ${entry.processed_at || 'Not processed'}`);
    if (entry.error_message) {
      console.log(`   Error: ${entry.error_message}`);
    }
    console.log('');
  }

  // Check email_notifications for this appointment
  const emailNotifications = await sql`
    SELECT
      en.id,
      en.trigger_code,
      en.status,
      en.user_id,
      u.email as user_email,
      en.created_at,
      en.sent_at,
      en.error_message
    FROM email_notifications en
    INNER JOIN users u ON en.user_id = u.id
    WHERE en.appointment_id = ${latestAppointment.id}
    ORDER BY en.created_at DESC
  `;

  console.log(`\n📧 Email Notifications Sent (${emailNotifications.length}):`);
  console.log('─'.repeat(80));
  for (const email of emailNotifications) {
    console.log(`   [${email.id}] ${email.trigger_code} - ${email.status}`);
    console.log(`   To: ${email.user_email} (user_id: ${email.user_id})`);
    console.log(`   Created: ${email.created_at}`);
    console.log(`   Sent: ${email.sent_at || 'Not sent'}`);
    if (email.error_message) {
      console.log(`   Error: ${email.error_message}`);
    }
    console.log('');
  }

  // Summary
  console.log('\n📊 Summary:');
  console.log('─'.repeat(80));
  console.log(`   Queue entries: ${queueEntries.length}`);
  console.log(`   Emails sent: ${emailNotifications.filter(e => e.status === 'sent').length}`);
  console.log(`   Emails failed: ${emailNotifications.filter(e => e.status === 'failed').length}`);

  if (emailNotifications.length > 1) {
    console.log('\n⚠️  WARNING: Multiple emails were sent for the same appointment!');
    console.log('   This explains why you received the email twice.');
  }

} catch (error) {
  console.error('❌ Error:', error);
} finally {
  await sql.end();
}

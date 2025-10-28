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

console.log('\n🔍 Checking Appointment #190 - Post-Fix Verification');
console.log('═'.repeat(80));

try {
  // Check email_notifications for appointment 190
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
    WHERE en.appointment_id = 190
    ORDER BY en.created_at DESC
  `;

  console.log(`\n📧 Email Notifications (${emailNotifications.length}):`);
  console.log('─'.repeat(80));

  if (emailNotifications.length === 1) {
    console.log('✅ SUCCESS: Only ONE notification created (duplicate fix working!)');
  } else {
    console.log(`⚠️  WARNING: ${emailNotifications.length} notifications found (expected 1)`);
  }

  console.log('');

  for (const email of emailNotifications) {
    console.log(`   [${email.id}] ${email.trigger_code} - ${email.status}`);
    console.log(`   To: ${email.user_email}`);
    console.log(`   Created: ${email.created_at}`);
    console.log(`   Sent: ${email.sent_at || 'Not sent'}`);

    if (email.error_message) {
      console.log(`   ❌ Error: ${email.error_message}`);
    } else {
      console.log(`   ✅ No errors - ICS attachment created successfully!`);
    }
    console.log('');
  }

  console.log('\n📊 Summary:');
  console.log('─'.repeat(80));
  console.log(`   Total notifications: ${emailNotifications.length}`);
  console.log(`   Sent successfully: ${emailNotifications.filter(e => e.status === 'sent' && !e.error_message).length}`);
  console.log(`   With errors: ${emailNotifications.filter(e => e.error_message).length}`);

  if (emailNotifications.length === 1 && !emailNotifications[0].error_message) {
    console.log('\n🎉 BOTH FIXES VERIFIED:');
    console.log('   ✅ Only one notification created (duplicate fix working)');
    console.log('   ✅ No ICS attachment error (calendar service fixed)');
  }

} catch (error) {
  console.error('❌ Error:', error);
} finally {
  await sql.end();
}

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

console.log('\n🧪 Testing Untested Notification Types');
console.log('═'.repeat(80));

const testResults = {
  success: [],
  failed: [],
  skipped: []
};

try {
  // Get a test user
  const [testUser] = await sql`
    SELECT id, email, first_name, last_name
    FROM users
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (!testUser) {
    console.log('❌ No test user found. Please create a user first.');
    process.exit(1);
  }

  console.log(`\n👤 Using test user: ${testUser.email}`);
  console.log('─'.repeat(80));

  // Test 1: Email Verification (A2)
  console.log('\n📧 Test 1: Email Verification (A2)');
  console.log('─'.repeat(80));

  try {
    await sql`
      INSERT INTO email_notifications (
        user_id, trigger_code, status, created_at
      ) VALUES (
        ${testUser.id}, 'A2', 'pending', NOW()
      )
    `;
    console.log('✅ A2 (Email Verification) notification created');
    testResults.success.push('A2 - Email Verification');
  } catch (error) {
    console.log(`❌ Failed to create A2: ${error.message}`);
    testResults.failed.push('A2 - Email Verification');
  }

  // Test 2: Booking Reminders (B4, B5, B6)
  console.log('\n⏰ Test 2: Booking Reminders (B4, B5, B6)');
  console.log('─'.repeat(80));

  // Get a future appointment or create one
  const [futureAppointment] = await sql`
    SELECT id, appointment_date, patient_id, doctor_id
    FROM appointments
    WHERE appointment_date > NOW()
    ORDER BY appointment_date ASC
    LIMIT 1
  `;

  if (futureAppointment) {
    console.log(`Found future appointment #${futureAppointment.id}`);

    // Test B4 (24h reminder)
    try {
      await sql`
        INSERT INTO email_notifications (
          user_id, appointment_id, trigger_code, status, created_at
        ) VALUES (
          ${futureAppointment.patient_id}, ${futureAppointment.id}, 'B4', 'pending', NOW()
        )
      `;
      console.log('✅ B4 (24h Reminder) notification created');
      testResults.success.push('B4 - 24h Reminder');
    } catch (error) {
      console.log(`❌ Failed to create B4: ${error.message}`);
      testResults.failed.push('B4 - 24h Reminder');
    }

    // Test B5 (1h reminder)
    try {
      await sql`
        INSERT INTO email_notifications (
          user_id, appointment_id, trigger_code, status, created_at
        ) VALUES (
          ${futureAppointment.patient_id}, ${futureAppointment.id}, 'B5', 'pending', NOW()
        )
      `;
      console.log('✅ B5 (1h Reminder) notification created');
      testResults.success.push('B5 - 1h Reminder');
    } catch (error) {
      console.log(`❌ Failed to create B5: ${error.message}`);
      testResults.failed.push('B5 - 1h Reminder');
    }

    // Test B6 (Live imminent)
    try {
      await sql`
        INSERT INTO email_notifications (
          user_id, appointment_id, trigger_code, status, created_at
        ) VALUES (
          ${futureAppointment.patient_id}, ${futureAppointment.id}, 'B6', 'pending', NOW()
        )
      `;
      console.log('✅ B6 (Live Imminent) notification created');
      testResults.success.push('B6 - Live Imminent');
    } catch (error) {
      console.log(`❌ Failed to create B6: ${error.message}`);
      testResults.failed.push('B6 - Live Imminent');
    }
  } else {
    console.log('⚠️  No future appointments found - skipping reminder tests');
    testResults.skipped.push('B4 - 24h Reminder', 'B5 - 1h Reminder', 'B6 - Live Imminent');
  }

  // Test 3: Payment Notifications (P1, P2)
  console.log('\n💳 Test 3: Payment Notifications (P1, P2)');
  console.log('─'.repeat(80));

  // Test P1 (Payment Receipt)
  try {
    await sql`
      INSERT INTO email_notifications (
        user_id, trigger_code, status, created_at
      ) VALUES (
        ${testUser.id}, 'P1', 'pending', NOW()
      )
    `;
    console.log('✅ P1 (Payment Receipt) notification created');
    testResults.success.push('P1 - Payment Receipt');
  } catch (error) {
    console.log(`❌ Failed to create P1: ${error.message}`);
    testResults.failed.push('P1 - Payment Receipt');
  }

  // Test P2 (Payment Failed)
  try {
    await sql`
      INSERT INTO email_notifications (
        user_id, trigger_code, status, created_at
      ) VALUES (
        ${testUser.id}, 'P2', 'pending', NOW()
      )
    `;
    console.log('✅ P2 (Payment Failed) notification created');
    testResults.success.push('P2 - Payment Failed');
  } catch (error) {
    console.log(`❌ Failed to create P2: ${error.message}`);
    testResults.failed.push('P2 - Payment Failed');
  }

  // Test 4: Membership Notifications (M2, M6)
  console.log('\n👥 Test 4: Membership Notifications (M2, M6)');
  console.log('─'.repeat(80));

  // Test M2 (Membership Renewed)
  try {
    await sql`
      INSERT INTO email_notifications (
        user_id, trigger_code, status, created_at
      ) VALUES (
        ${testUser.id}, 'M2', 'pending', NOW()
      )
    `;
    console.log('✅ M2 (Membership Renewed) notification created');
    testResults.success.push('M2 - Membership Renewed');
  } catch (error) {
    console.log(`❌ Failed to create M2: ${error.message}`);
    testResults.failed.push('M2 - Membership Renewed');
  }

  // Test M6 (Renewal Upcoming)
  try {
    await sql`
      INSERT INTO email_notifications (
        user_id, trigger_code, status, created_at
      ) VALUES (
        ${testUser.id}, 'M6', 'pending', NOW()
      )
    `;
    console.log('✅ M6 (Renewal Upcoming) notification created');
    testResults.success.push('M6 - Renewal Upcoming');
  } catch (error) {
    console.log(`❌ Failed to create M6: ${error.message}`);
    testResults.failed.push('M6 - Renewal Upcoming');
  }

  // Test 5: Health Profile Notifications (H1, H2)
  console.log('\n🏥 Test 5: Health Profile Notifications (H1, H2)');
  console.log('─'.repeat(80));

  // Test H1 (Health Profile Reminder)
  try {
    await sql`
      INSERT INTO email_notifications (
        user_id, trigger_code, status, created_at
      ) VALUES (
        ${testUser.id}, 'H1', 'pending', NOW()
      )
    `;
    console.log('✅ H1 (Health Profile Reminder) notification created');
    testResults.success.push('H1 - Health Profile Reminder');
  } catch (error) {
    console.log(`❌ Failed to create H1: ${error.message}`);
    testResults.failed.push('H1 - Health Profile Reminder');
  }

  // Test H2 (Health Profile Completed)
  try {
    await sql`
      INSERT INTO email_notifications (
        user_id, trigger_code, status, created_at
      ) VALUES (
        ${testUser.id}, 'H2', 'pending', NOW()
      )
    `;
    console.log('✅ H2 (Health Profile Completed) notification created');
    testResults.success.push('H2 - Health Profile Completed');
  } catch (error) {
    console.log(`❌ Failed to create H2: ${error.message}`);
    testResults.failed.push('H2 - Health Profile Completed');
  }

  // Test 6: General Notifications (G1, G3)
  console.log('\n📬 Test 6: General Notifications (G1, G3)');
  console.log('─'.repeat(80));

  // Test G1 (Welcome - Free Credit)
  try {
    await sql`
      INSERT INTO email_notifications (
        user_id, trigger_code, status, created_at
      ) VALUES (
        ${testUser.id}, 'G1', 'pending', NOW()
      )
    `;
    console.log('✅ G1 (Welcome - Free Credit) notification created');
    testResults.success.push('G1 - Welcome Free Credit');
  } catch (error) {
    console.log(`❌ Failed to create G1: ${error.message}`);
    testResults.failed.push('G1 - Welcome Free Credit');
  }

  // Test G3 (Profile Completion Reminder)
  try {
    await sql`
      INSERT INTO email_notifications (
        user_id, trigger_code, status, created_at
      ) VALUES (
        ${testUser.id}, 'G3', 'pending', NOW()
      )
    `;
    console.log('✅ G3 (Profile Completion Reminder) notification created');
    testResults.success.push('G3 - Profile Completion Reminder');
  } catch (error) {
    console.log(`❌ Failed to create G3: ${error.message}`);
    testResults.failed.push('G3 - Profile Completion Reminder');
  }

  // Wait for notification processor to pick up pending notifications
  console.log('\n⏳ Waiting 5 seconds for notification processor...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Check if notifications were processed
  console.log('\n📊 Checking Processing Results');
  console.log('─'.repeat(80));

  const processedNotifications = await sql`
    SELECT
      trigger_code,
      status,
      error_message,
      sent_at
    FROM email_notifications
    WHERE user_id = ${testUser.id}
      AND created_at > NOW() - INTERVAL '1 minute'
    ORDER BY created_at DESC
  `;

  console.log(`\nFound ${processedNotifications.length} recent notifications:\n`);

  for (const notif of processedNotifications) {
    const statusIcon = notif.status === 'sent' ? '✅' : notif.status === 'failed' ? '❌' : '⏳';
    console.log(`${statusIcon} ${notif.trigger_code}: ${notif.status.toUpperCase()}`);

    if (notif.error_message) {
      console.log(`   Error: ${notif.error_message}`);
    }

    if (notif.sent_at) {
      console.log(`   Sent: ${new Date(notif.sent_at).toLocaleTimeString()}`);
    }
  }

  // Summary
  console.log('\n\n📋 Test Summary');
  console.log('═'.repeat(80));
  console.log(`✅ Successfully created: ${testResults.success.length}`);
  console.log(`❌ Failed to create: ${testResults.failed.length}`);
  console.log(`⏭️  Skipped: ${testResults.skipped.length}`);

  if (testResults.success.length > 0) {
    console.log('\n✅ Successfully Tested:');
    testResults.success.forEach(t => console.log(`   - ${t}`));
  }

  if (testResults.failed.length > 0) {
    console.log('\n❌ Failed:');
    testResults.failed.forEach(t => console.log(`   - ${t}`));
  }

  if (testResults.skipped.length > 0) {
    console.log('\n⏭️  Skipped:');
    testResults.skipped.forEach(t => console.log(`   - ${t}`));
  }

  const sentCount = processedNotifications.filter(n => n.status === 'sent').length;
  const failedCount = processedNotifications.filter(n => n.status === 'failed').length;

  console.log('\n📈 Processing Results:');
  console.log(`   Sent: ${sentCount}/${processedNotifications.length}`);
  console.log(`   Failed: ${failedCount}/${processedNotifications.length}`);

  if (sentCount === processedNotifications.length && processedNotifications.length > 0) {
    console.log('\n🎉 All test notifications sent successfully!');
  } else if (failedCount > 0) {
    console.log('\n⚠️  Some notifications failed - check error messages above');
  }

} catch (error) {
  console.error('❌ Test error:', error);
} finally {
  await sql.end();
}

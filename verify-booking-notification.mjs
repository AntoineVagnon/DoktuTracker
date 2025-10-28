/**
 * Verify booking notification was scheduled for appointment 174
 * Critical P0 Test Verification
 */

import pkg from 'pg';
const { Client } = pkg;

// Use the same connection string from .env
const connectionString = 'postgresql://postgres.hzmrkvooqjbxptqjqxii:ArnuVVZ0mS4ZbMR8@aws-0-eu-central-1.pooler.supabase.com:5432/postgres';

async function verifyBookingNotification() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false } // Required for Supabase
  });

  try {
    await client.connect();
    console.log('✅ Connected to production database\n');

    // 1. Check notification record for appointment 174
    console.log('📋 Query 1: Check notification record for appointment 174...');
    const notificationResult = await client.query(`
      SELECT *
      FROM notification_queue
      WHERE created_at > NOW() - INTERVAL '30 minutes'
      ORDER BY created_at DESC
      LIMIT 10;
    `);

    if (notificationResult.rows.length > 0) {
      console.log('✅ Notification record(s) found:');
      notificationResult.rows.forEach((row, index) => {
        console.log(`\n   Record ${index + 1}:`);
        console.log(`   - ID: ${row.id}`);
        console.log(`   - User ID: ${row.user_id}`);
        console.log(`   - Appointment ID: ${row.appointment_id}`);
        console.log(`   - Trigger Code: ${row.trigger_code}`);
        console.log(`   - Status: ${row.status}`);
        console.log(`   - Scheduled For: ${row.scheduled_for}`);
        console.log(`   - Created At: ${row.created_at}`);
        console.log(`   - Merge Data: ${JSON.stringify(row.merge_data)}`);
      });

      if (notificationResult.rows.length > 1) {
        console.log(`\n⚠️  WARNING: ${notificationResult.rows.length} notification records found (expected 1)`);
        console.log('   This may indicate deduplication is not working correctly.');
      }
    } else {
      console.log('❌ NO notification record found for appointment 174');
      console.log('   This indicates the notification was NOT scheduled!');
      console.log('   Check server logs for errors in notificationService.scheduleNotification()');
    }

    // 2. Check email queue record
    console.log('\n\n📧 Query 2: Check email queue for test user...');
    const emailResult = await client.query(`
      SELECT
        id,
        notification_id,
        to_email,
        subject,
        status,
        sent_at,
        error_message,
        created_at
      FROM email_notifications
      WHERE to_email = 'test.booking.1761303583@doktu.co'
      AND created_at > NOW() - INTERVAL '15 minutes'
      ORDER BY created_at DESC
      LIMIT 5;
    `);

    if (emailResult.rows.length > 0) {
      console.log('✅ Email notification record(s) found:');
      emailResult.rows.forEach((row, index) => {
        console.log(`\n   Record ${index + 1}:`);
        console.log(`   - ID: ${row.id}`);
        console.log(`   - Notification ID: ${row.notification_id}`);
        console.log(`   - To Email: ${row.to_email}`);
        console.log(`   - Subject: ${row.subject}`);
        console.log(`   - Status: ${row.status}`);
        console.log(`   - Sent At: ${row.sent_at || 'Not sent yet'}`);
        console.log(`   - Error: ${row.error_message || 'None'}`);
        console.log(`   - Created At: ${row.created_at}`);
      });
    } else {
      console.log('❌ NO email notification record found');
      console.log('   Email may still be queued or notification was not created');
    }

    // 3. Check user locale preference
    console.log('\n\n🌍 Query 3: Check user locale preference...');
    const userResult = await client.query(`
      SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.created_at,
        np.locale,
        np.email_enabled,
        np.created_at as pref_created_at
      FROM users u
      LEFT JOIN notification_preferences np ON u.id = np.user_id
      WHERE u.email = 'test.booking.1761303583@doktu.co';
    `);

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      console.log('✅ User record found:');
      console.log(`   - User ID: ${user.id}`);
      console.log(`   - Email: ${user.email}`);
      console.log(`   - Name: ${user.first_name} ${user.last_name}`);
      console.log(`   - User Created: ${user.created_at}`);
      console.log(`   - Locale: ${user.locale || 'NOT SET (❌ PROBLEM!)'}`);
      console.log(`   - Email Enabled: ${user.email_enabled}`);
      console.log(`   - Preferences Created: ${user.pref_created_at || 'NOT SET'}`);

      if (!user.locale) {
        console.log('\n⚠️  WARNING: User locale is NOT SET!');
        console.log('   Expected: locale = \'bs\' (Bosnian)');
        console.log('   Emails will be sent in default language (English)');
      } else if (user.locale !== 'bs') {
        console.log(`\n⚠️  WARNING: User locale is '${user.locale}', expected 'bs' (Bosnian)`);
      } else {
        console.log('\n✅ User locale correctly set to Bosnian (bs)');
      }
    } else {
      console.log('❌ User not found!');
    }

    // 4. Check appointment status
    console.log('\n\n📅 Query 4: Check appointment status...');
    const appointmentResult = await client.query(`
      SELECT
        id,
        patient_id,
        doctor_id,
        appointment_date,
        status,
        price,
        created_at,
        updated_at
      FROM appointments
      WHERE id = 174;
    `);

    if (appointmentResult.rows.length > 0) {
      const apt = appointmentResult.rows[0];
      console.log('✅ Appointment record found:');
      console.log(`   - ID: ${apt.id}`);
      console.log(`   - Patient ID: ${apt.patient_id}`);
      console.log(`   - Doctor ID: ${apt.doctor_id}`);
      console.log(`   - Date: ${apt.appointment_date}`);
      console.log(`   - Status: ${apt.status}`);
      console.log(`   - Price: €${apt.price}`);
      console.log(`   - Created: ${apt.created_at}`);
      console.log(`   - Updated: ${apt.updated_at}`);

      if (apt.status !== 'paid') {
        console.log(`\n⚠️  WARNING: Appointment status is '${apt.status}', expected 'paid'`);
      } else {
        console.log('\n✅ Appointment status correctly updated to \'paid\'');
      }
    } else {
      console.log('❌ Appointment 174 not found!');
    }

    // 5. Summary
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 VERIFICATION SUMMARY');
    console.log('='.repeat(80));

    const hasNotification = notificationResult.rows.length > 0;
    const hasEmail = emailResult.rows.length > 0;
    const hasUser = userResult.rows.length > 0;
    const hasAppointment = appointmentResult.rows.length > 0;
    const localeCorrect = hasUser && userResult.rows[0].locale === 'bs';
    const appointmentPaid = hasAppointment && appointmentResult.rows[0].status === 'paid';

    console.log(`\n✅ Appointment Created:          ${hasAppointment ? 'YES' : 'NO'}`);
    console.log(`✅ Appointment Status Paid:      ${appointmentPaid ? 'YES' : 'NO'}`);
    console.log(`✅ User Created:                 ${hasUser ? 'YES' : 'NO'}`);
    console.log(`✅ User Locale Set to Bosnian:   ${localeCorrect ? 'YES' : 'NO'}`);
    console.log(`✅ Notification Record Created:  ${hasNotification ? 'YES' : 'NO'}`);
    console.log(`✅ Email Queue Record Created:   ${hasEmail ? 'YES' : 'NO'}`);

    if (hasNotification) {
      const notification = notificationResult.rows[0];
      const emailSent = hasEmail && emailResult.rows[0].status === 'sent';
      console.log(`✅ Email Sent:                   ${emailSent ? 'YES' : 'PENDING'}`);

      if (notificationResult.rows.length > 1) {
        console.log(`⚠️  Duplicate Notifications:      ${notificationResult.rows.length} records found`);
      } else {
        console.log(`✅ No Duplicate Notifications:   CORRECT (only 1 record)`);
      }
    }

    console.log('\n' + '='.repeat(80));

    if (hasNotification && hasEmail && localeCorrect && appointmentPaid) {
      console.log('🎉 P0 TEST RESULT: ✅ PASS');
      console.log('   All critical checks passed!');
      console.log('   Booking notification system working correctly.');
    } else {
      console.log('❌ P0 TEST RESULT: FAIL');
      console.log('   One or more critical checks failed.');
      console.log('   Review the issues above and investigate root cause.');
    }

    console.log('='.repeat(80) + '\n');

    await client.end();
  } catch (error) {
    console.error('❌ Database error:', error.message);
    if (error.code) {
      console.error('   Error code:', error.code);
    }
    if (error.stack) {
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run verification
verifyBookingNotification().catch(console.error);

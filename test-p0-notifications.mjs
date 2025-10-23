// P0 Critical Notification Tests
// Tests registration, password reset, and booking confirmation emails
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Disable TLS certificate validation for Supabase
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test configuration
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@doktu.co';
const TEST_USER_ID = 1; // Will be replaced with actual test user

async function testP0Notifications() {
  console.log('\n========================================');
  console.log('P0 CRITICAL NOTIFICATION TESTS');
  console.log('========================================\n');

  const client = await pool.connect();
  let testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
  };

  try {
    // TEST 1: Account Registration Success (A1) - Priority 100
    console.log('TEST 1: Account Registration Success (A1)');
    console.log('--------------------------------------------------');

    const registrationData = {
      first_name: 'Test',
      last_name: 'Patient',
      email: TEST_EMAIL,
      verification_link: `https://app.doktu.co/verify?token=test-token-${Date.now()}`
    };

    const registrationResult = await client.query(`
      INSERT INTO email_notifications (
        user_id, trigger_code, template_key, status, priority,
        scheduled_for, merge_data, metadata
      ) VALUES (
        $1, 'A1', 'account_registration_success', 'pending', 100,
        NOW(), $2::jsonb, $3::jsonb
      ) RETURNING id, trigger_code, status, priority, scheduled_for
    `, [
      TEST_USER_ID,
      JSON.stringify(registrationData),
      JSON.stringify({ test: true, test_name: 'NT-001-Registration' })
    ]);

    const regNotif = registrationResult.rows[0];
    testResults.total++;

    if (regNotif.id) {
      console.log('✅ PASS: Registration notification created');
      console.log(`   ID: ${regNotif.id}`);
      console.log(`   Priority: ${regNotif.priority}`);
      console.log(`   Scheduled: ${regNotif.scheduled_for}`);
      testResults.passed++;
      testResults.tests.push({
        id: 'NT-001',
        name: 'Account Registration Success',
        triggerCode: 'A1',
        status: 'PASS',
        notificationId: regNotif.id
      });
    } else {
      console.log('❌ FAIL: Failed to create registration notification');
      testResults.failed++;
      testResults.tests.push({
        id: 'NT-001',
        name: 'Account Registration Success',
        triggerCode: 'A1',
        status: 'FAIL'
      });
    }

    // TEST 2: Password Reset Request (A3) - Priority 100
    console.log('\nTEST 2: Password Reset Request (A3)');
    console.log('--------------------------------------------------');

    const passwordResetData = {
      first_name: 'Test',
      email: TEST_EMAIL,
      reset_link: `https://app.doktu.co/password-reset?token=reset-${Date.now()}`,
      expiry_time: '1 hour'
    };

    const passwordResetResult = await client.query(`
      INSERT INTO email_notifications (
        user_id, trigger_code, template_key, status, priority,
        scheduled_for, merge_data, metadata
      ) VALUES (
        $1, 'A3', 'account_password_reset', 'pending', 100,
        NOW(), $2::jsonb, $3::jsonb
      ) RETURNING id, trigger_code, status, priority
    `, [
      TEST_USER_ID,
      JSON.stringify(passwordResetData),
      JSON.stringify({ test: true, test_name: 'NT-002-PasswordReset' })
    ]);

    const pwdNotif = passwordResetResult.rows[0];
    testResults.total++;

    if (pwdNotif.id) {
      console.log('✅ PASS: Password reset notification created');
      console.log(`   ID: ${pwdNotif.id}`);
      testResults.passed++;
      testResults.tests.push({
        id: 'NT-002',
        name: 'Password Reset Request',
        triggerCode: 'A3',
        status: 'PASS',
        notificationId: pwdNotif.id
      });
    } else {
      console.log('❌ FAIL: Failed to create password reset notification');
      testResults.failed++;
      testResults.tests.push({
        id: 'NT-002',
        name: 'Password Reset Request',
        triggerCode: 'A3',
        status: 'FAIL'
      });
    }

    // TEST 3: Booking Confirmed (B3) - Priority 100
    console.log('\nTEST 3: Booking Confirmed (B3)');
    console.log('--------------------------------------------------');

    const bookingConfirmationData = {
      patient_first_name: 'Test',
      appointment_id: '12345',
      appointment_datetime_utc: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      appointment_datetime_local: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString('en-US'),
      patient_timezone: 'Europe/Paris',
      doctor_name: 'Dr. Smith',
      doctor_specialization: 'General Practice',
      join_link: 'https://app.doktu.co/join/test-room-123',
      price: '35',
      currency: '€'
    };

    const bookingResult = await client.query(`
      INSERT INTO email_notifications (
        user_id, trigger_code, template_key, status, priority,
        scheduled_for, merge_data, metadata
      ) VALUES (
        $1, 'B3', 'booking_confirmation', 'pending', 100,
        NOW(), $2::jsonb, $3::jsonb
      ) RETURNING id, trigger_code, status, priority
    `, [
      TEST_USER_ID,
      JSON.stringify(bookingConfirmationData),
      JSON.stringify({ test: true, test_name: 'NT-003-BookingConfirmed' })
    ]);

    const bookingNotif = bookingResult.rows[0];
    testResults.total++;

    if (bookingNotif.id) {
      console.log('✅ PASS: Booking confirmation notification created');
      console.log(`   ID: ${bookingNotif.id}`);
      testResults.passed++;
      testResults.tests.push({
        id: 'NT-003',
        name: 'Booking Confirmed',
        triggerCode: 'B3',
        status: 'PASS',
        notificationId: bookingNotif.id
      });
    } else {
      console.log('❌ FAIL: Failed to create booking confirmation notification');
      testResults.failed++;
      testResults.tests.push({
        id: 'NT-003',
        name: 'Booking Confirmed',
        triggerCode: 'B3',
        status: 'FAIL'
      });
    }

    // TEST 4: Verify notifications are in queue
    console.log('\nTEST 4: Verify Notifications in Queue');
    console.log('--------------------------------------------------');

    const queueResult = await client.query(`
      SELECT id, trigger_code, template_key, status, priority, scheduled_for
      FROM email_notifications
      WHERE metadata->>'test' = 'true'
        AND created_at > NOW() - INTERVAL '5 minutes'
      ORDER BY priority DESC, scheduled_for ASC
    `);

    testResults.total++;

    console.log(`Found ${queueResult.rows.length} test notifications in queue:`);
    queueResult.rows.forEach(notif => {
      console.log(`   - ${notif.trigger_code} (ID: ${notif.id}, Priority: ${notif.priority})`);
    });

    if (queueResult.rows.length >= 3) {
      console.log('✅ PASS: All P0 notifications queued successfully');
      testResults.passed++;
      testResults.tests.push({
        id: 'NT-004',
        name: 'Notifications Queued',
        status: 'PASS',
        count: queueResult.rows.length
      });
    } else {
      console.log(`❌ FAIL: Expected 3+ notifications, found ${queueResult.rows.length}`);
      testResults.failed++;
      testResults.tests.push({
        id: 'NT-004',
        name: 'Notifications Queued',
        status: 'FAIL',
        count: queueResult.rows.length
      });
    }

    // TEST 5: Wait for background processor (2 minutes)
    console.log('\nTEST 5: Background Processor Execution');
    console.log('--------------------------------------------------');
    console.log('⏳ Waiting 130 seconds for background processor to run...');
    console.log('   (Background processor runs every 2 minutes)');

    // Wait 130 seconds (2 min + 10 sec buffer)
    await new Promise(resolve => setTimeout(resolve, 130000));

    // Check if notifications were processed
    const processedResult = await client.query(`
      SELECT id, trigger_code, status, sent_at, error_message
      FROM email_notifications
      WHERE metadata->>'test' = 'true'
        AND created_at > NOW() - INTERVAL '10 minutes'
      ORDER BY created_at DESC
    `);

    testResults.total++;

    console.log('\nProcessing Results:');
    let sentCount = 0;
    let pendingCount = 0;
    let failedCount = 0;

    processedResult.rows.forEach(notif => {
      if (notif.status === 'sent') {
        sentCount++;
        console.log(`   ✅ ${notif.trigger_code}: SENT (${notif.sent_at})`);
      } else if (notif.status === 'pending') {
        pendingCount++;
        console.log(`   ⏳ ${notif.trigger_code}: PENDING`);
      } else {
        failedCount++;
        console.log(`   ❌ ${notif.trigger_code}: FAILED - ${notif.error_message}`);
      }
    });

    if (sentCount >= 3) {
      console.log('\n✅ PASS: All P0 notifications sent successfully');
      testResults.passed++;
      testResults.tests.push({
        id: 'NT-005',
        name: 'Background Processor Execution',
        status: 'PASS',
        sent: sentCount,
        pending: pendingCount,
        failed: failedCount
      });
    } else if (sentCount > 0) {
      console.log(`\n⚠️  PARTIAL: ${sentCount}/3 notifications sent`);
      testResults.failed++;
      testResults.tests.push({
        id: 'NT-005',
        name: 'Background Processor Execution',
        status: 'PARTIAL',
        sent: sentCount,
        pending: pendingCount,
        failed: failedCount
      });
    } else {
      console.log('\n❌ FAIL: No notifications sent');
      testResults.failed++;
      testResults.tests.push({
        id: 'NT-005',
        name: 'Background Processor Execution',
        status: 'FAIL',
        sent: sentCount,
        pending: pendingCount,
        failed: failedCount
      });
    }

    client.release();

    // Print summary
    console.log('\n========================================');
    console.log('TEST SUMMARY');
    console.log('========================================');
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`Passed: ${testResults.passed}`);
    console.log(`Failed: ${testResults.failed}`);
    console.log(`Pass Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
    console.log('========================================\n');

    // Print detailed results
    console.log('DETAILED RESULTS:');
    testResults.tests.forEach(test => {
      const status = test.status === 'PASS' ? '✅' : test.status === 'PARTIAL' ? '⚠️ ' : '❌';
      console.log(`${status} ${test.id}: ${test.name} (${test.status})`);
      if (test.notificationId) {
        console.log(`   Notification ID: ${test.notificationId}`);
      }
      if (test.count !== undefined) {
        console.log(`   Count: ${test.count}`);
      }
      if (test.sent !== undefined) {
        console.log(`   Sent: ${test.sent}, Pending: ${test.pending}, Failed: ${test.failed}`);
      }
    });

    console.log('\n========================================');
    console.log(`📧 Check inbox: ${TEST_EMAIL}`);
    console.log('📧 Also check spam folder');
    console.log('========================================\n');

    return testResults.failed === 0;

  } catch (error) {
    console.error('\n❌ TEST EXECUTION FAILED:', error.message);
    console.error('Stack:', error.stack);
    return false;
  } finally {
    await pool.end();
  }
}

// Run the tests
testP0Notifications()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });

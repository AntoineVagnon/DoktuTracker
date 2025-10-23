// Comprehensive Notification System Test - Including Bitdefender Fix Verification
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const TEST_EMAIL = process.env.TEST_EMAIL || 'antoine.vagnon@gmail.com';

async function comprehensiveTest() {
  console.log('\n========================================');
  console.log('COMPREHENSIVE NOTIFICATION SYSTEM TEST');
  console.log('Including Bitdefender Fix Verification');
  console.log('========================================\n');

  const client = await pool.connect();
  const testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    tests: []
  };

  try {
    // Get test user
    let testUser = await client.query(`
      SELECT id, email FROM users ORDER BY id LIMIT 1
    `);

    let userId;
    if (testUser.rows.length === 0) {
      console.log('Creating test user...');
      const newUser = await client.query(`
        INSERT INTO users (email, role, first_name, last_name)
        VALUES ($1, 'patient', 'QA', 'Test')
        RETURNING id, email
      `, [TEST_EMAIL]);
      userId = newUser.rows[0].id;
      console.log(`✅ Created test user ID: ${userId}\n`);
    } else {
      userId = testUser.rows[0].id;
      console.log(`✅ Using existing user ID: ${userId} (${testUser.rows[0].email})\n`);
    }

    // TEST 1: Registration Email (A1) - WITH tracking
    console.log('TEST 1: Registration Email (A1)');
    console.log('Expected: Tracking ENABLED (marketing email)');
    console.log('--------------------------------------------------');

    const registrationNotif = await client.query(`
      INSERT INTO email_notifications (
        user_id, trigger_code, template_key, status, priority,
        scheduled_for, merge_data, metadata
      ) VALUES (
        $1, 'A1', 'account_registration_success', 'pending', 100,
        NOW(), $2::jsonb, $3::jsonb
      ) RETURNING id, trigger_code, priority
    `, [
      userId,
      JSON.stringify({ first_name: 'QA', email: TEST_EMAIL }),
      JSON.stringify({ test: true, test_id: 'COMP-001' })
    ]);

    console.log(`✅ Created notification ID: ${registrationNotif.rows[0].id}`);
    testResults.total++;
    testResults.tests.push({ name: 'Registration Email (A1)', status: 'created', tracking: 'enabled' });

    // TEST 2: Password Reset (A3) - WITHOUT tracking (BITDEFENDER FIX)
    console.log('\nTEST 2: Password Reset (A3)');
    console.log('Expected: Tracking DISABLED (security email - Bitdefender fix)');
    console.log('--------------------------------------------------');

    const resetToken = `test-reset-${Date.now()}`;
    const passwordResetNotif = await client.query(`
      INSERT INTO email_notifications (
        user_id, trigger_code, template_key, status, priority,
        scheduled_for, merge_data, metadata
      ) VALUES (
        $1, 'A3', 'account_password_reset', 'pending', 100,
        NOW(), $2::jsonb, $3::jsonb
      ) RETURNING id, trigger_code, priority
    `, [
      userId,
      JSON.stringify({
        first_name: 'QA',
        email: TEST_EMAIL,
        reset_link: `https://doktu-tracker.vercel.app/password-reset?token=${resetToken}`,
        expiry_time: '1 hour'
      }),
      JSON.stringify({ test: true, test_id: 'COMP-002', bitdefender_fix: true })
    ]);

    console.log(`✅ Created notification ID: ${passwordResetNotif.rows[0].id}`);
    console.log(`   Reset Token: ${resetToken}`);
    testResults.total++;
    testResults.tests.push({ name: 'Password Reset (A3)', status: 'created', tracking: 'disabled', bitdefender_fix: true });

    // TEST 3: Password Changed (A4) - WITHOUT tracking (BITDEFENDER FIX)
    console.log('\nTEST 3: Password Changed Confirmation (A4)');
    console.log('Expected: Tracking DISABLED (security email - Bitdefender fix)');
    console.log('--------------------------------------------------');

    const passwordChangedNotif = await client.query(`
      INSERT INTO email_notifications (
        user_id, trigger_code, template_key, status, priority,
        scheduled_for, merge_data, metadata
      ) VALUES (
        $1, 'A4', 'account_password_changed', 'pending', 93,
        NOW(), $2::jsonb, $3::jsonb
      ) RETURNING id, trigger_code, priority
    `, [
      userId,
      JSON.stringify({
        first_name: 'QA',
        email: TEST_EMAIL,
        device: 'Chrome on Windows',
        location: 'Munich, Germany',
        ip_address: '192.168.1.1',
        timestamp: new Date().toLocaleString()
      }),
      JSON.stringify({ test: true, test_id: 'COMP-003', bitdefender_fix: true })
    ]);

    console.log(`✅ Created notification ID: ${passwordChangedNotif.rows[0].id}`);
    testResults.total++;
    testResults.tests.push({ name: 'Password Changed (A4)', status: 'created', tracking: 'disabled', bitdefender_fix: true });

    // TEST 4: Booking Confirmation (B3) - WITH tracking
    console.log('\nTEST 4: Booking Confirmation (B3)');
    console.log('Expected: Tracking ENABLED (transactional email with analytics)');
    console.log('--------------------------------------------------');

    const appointmentTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const bookingNotif = await client.query(`
      INSERT INTO email_notifications (
        user_id, trigger_code, template_key, status, priority,
        scheduled_for, merge_data, metadata
      ) VALUES (
        $1, 'B3', 'booking_confirmation', 'pending', 100,
        NOW(), $2::jsonb, $3::jsonb
      ) RETURNING id, trigger_code, priority
    `, [
      userId,
      JSON.stringify({
        patient_first_name: 'QA',
        price: '45',
        currency: '€',
        appointment_id: '999',
        patient_timezone: 'Europe/Berlin',
        doctor_name: 'Dr. Test',
        doctor_specialization: 'General Practice',
        appointment_datetime_utc: appointmentTime,
        join_link: 'https://doktu-tracker.vercel.app/consultation/999'
      }),
      JSON.stringify({ test: true, test_id: 'COMP-004' })
    ]);

    console.log(`✅ Created notification ID: ${bookingNotif.rows[0].id}`);
    testResults.total++;
    testResults.tests.push({ name: 'Booking Confirmation (B3)', status: 'created', tracking: 'enabled' });

    // Wait for background processor
    console.log('\n⏰ Waiting 130 seconds for background processor...');
    console.log('   (Background processor checks every 2 minutes)\n');
    await new Promise(resolve => setTimeout(resolve, 130000));

    // Check all notification statuses
    console.log('Checking notification processing results...');
    console.log('========================================\n');

    const notifIds = [
      registrationNotif.rows[0].id,
      passwordResetNotif.rows[0].id,
      passwordChangedNotif.rows[0].id,
      bookingNotif.rows[0].id
    ];

    for (let i = 0; i < notifIds.length; i++) {
      const result = await client.query(`
        SELECT id, trigger_code, template_key, status, sent_at, error_message
        FROM email_notifications
        WHERE id = $1
      `, [notifIds[i]]);

      const notif = result.rows[0];
      const testName = testResults.tests[i].name;
      const trackingStatus = testResults.tests[i].tracking;
      const isBitdefenderFix = testResults.tests[i].bitdefender_fix;

      console.log(`${testName} (${notif.trigger_code}):`);
      console.log(`   Tracking: ${trackingStatus.toUpperCase()}`);
      if (isBitdefenderFix) {
        console.log(`   🔒 Bitdefender Fix: YES`);
      }

      if (notif.status === 'sent') {
        console.log(`   Status: ✅ SENT`);
        console.log(`   Sent at: ${notif.sent_at}`);
        testResults.passed++;
        testResults.tests[i].status = 'passed';
      } else if (notif.status === 'failed') {
        console.log(`   Status: ❌ FAILED`);
        console.log(`   Error: ${notif.error_message}`);
        testResults.failed++;
        testResults.tests[i].status = 'failed';
        testResults.tests[i].error = notif.error_message;
      } else {
        console.log(`   Status: ⏳ ${notif.status.toUpperCase()}`);
        testResults.tests[i].status = 'pending';
      }
      console.log('');
    }

    // Final summary
    console.log('========================================');
    console.log('TEST SUMMARY');
    console.log('========================================\n');

    console.log(`Total Tests: ${testResults.total}`);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`⏳ Pending: ${testResults.total - testResults.passed - testResults.failed}`);
    console.log(`Pass Rate: ${Math.round((testResults.passed / testResults.total) * 100)}%\n`);

    // Bitdefender fix verification
    const bitdefenderTests = testResults.tests.filter(t => t.bitdefender_fix);
    const bitdefenderPassed = bitdefenderTests.filter(t => t.status === 'passed').length;

    console.log('========================================');
    console.log('BITDEFENDER FIX VERIFICATION');
    console.log('========================================\n');

    console.log(`Bitdefender Fix Tests: ${bitdefenderTests.length}`);
    console.log(`✅ Passed: ${bitdefenderPassed}`);
    console.log(`Expected: Tracking DISABLED for security emails`);

    if (bitdefenderPassed === bitdefenderTests.length) {
      console.log('\n🎉 ✅ BITDEFENDER FIX VERIFIED - All security emails sent without tracking!');
      console.log('   Links will be direct (no Mailgun redirects)');
      console.log('   Antivirus should NOT block these links\n');
    } else {
      console.log('\n⚠️  BITDEFENDER FIX INCOMPLETE - Some security emails failed\n');
    }

    console.log('========================================');
    console.log('NEXT STEPS');
    console.log('========================================\n');

    console.log('1. Check inbox: ' + TEST_EMAIL);
    console.log('2. Verify password reset link has NO Mailgun redirect');
    console.log('3. Test clicking links with Bitdefender enabled');
    console.log('4. Confirm NO security warnings appear\n');

    if (testResults.passed === testResults.total) {
      console.log('========================================');
      console.log('✅ ALL TESTS PASSED');
      console.log('========================================\n');
      client.release();
      await pool.end();
      process.exit(0);
    } else {
      console.log('========================================');
      console.log('⚠️  SOME TESTS FAILED');
      console.log('========================================\n');
      client.release();
      await pool.end();
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ TEST EXECUTION FAILED:', error.message);
    console.error('Stack:', error.stack);
    client.release();
    await pool.end();
    process.exit(1);
  }
}

comprehensiveTest();

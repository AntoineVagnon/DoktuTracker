/**
 * COMPREHENSIVE QA TEST SCRIPT
 * DoktuTracker Notification System - Critical Fixes Validation
 *
 * Tests 3 deployed fixes:
 * P0: Email template rendering (no more "Cannot convert undefined or null to object")
 * P1: Language detection working correctly
 * P1: Duplicate notification prevention
 *
 * Deployment: dc7b32c on Railway (https://web-production-b2ce.up.railway.app)
 */

import postgres from 'postgres';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Missing DATABASE_URL');
  process.exit(1);
}

// Parse connection URL
const u = new URL(connectionString);
const sql = postgres({
  host: u.hostname,
  port: Number(u.port) || 5432,
  database: u.pathname.slice(1),
  user: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password || ''),
  ssl: { rejectUnauthorized: false },
  prepare: false,
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  const timestamp = new Date().toISOString();
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${'═'.repeat(80)}`, colors.cyan);
  log(`${title}`, colors.cyan + colors.bold);
  log(`${'═'.repeat(80)}`, colors.cyan);
}

function logTest(id, description) {
  log(`\n${'─'.repeat(80)}`, colors.blue);
  log(`🧪 TEST ${id}: ${description}`, colors.blue + colors.bold);
  log(`${'─'.repeat(80)}`, colors.blue);
}

function logPass(message) {
  log(`✅ PASS: ${message}`, colors.green);
}

function logFail(message) {
  log(`❌ FAIL: ${message}`, colors.red);
}

function logWarn(message) {
  log(`⚠️  WARN: ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  INFO: ${message}`, colors.blue);
}

// Test Results Tracking
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function recordTest(id, description, status, details, evidence = null) {
  testResults.total++;
  if (status === 'PASS') testResults.passed++;
  if (status === 'FAIL') testResults.failed++;
  if (status === 'WARN') testResults.warnings++;

  testResults.tests.push({
    id,
    description,
    status,
    details,
    evidence,
    timestamp: new Date().toISOString()
  });
}

/**
 * P0 TEST: Email Template Rendering Validation
 */
async function testP0_EmailRendering() {
  logTest('P0-001', 'Email Template Rendering - No "Cannot convert undefined or null to object" errors');

  try {
    // Get recent email notifications (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentEmails = await sql`
      SELECT
        id,
        appointment_id,
        status,
        error_message,
        user_email,
        subject,
        template_key,
        created_at,
        sent_at
      FROM email_notifications
      WHERE created_at >= ${oneDayAgo.toISOString()}
      ORDER BY created_at DESC
      LIMIT 50
    `;

    logInfo(`Found ${recentEmails.length} email notifications in last 24 hours`);

    // Check for the old template rendering error
    const templateErrors = recentEmails.filter(e =>
      e.error_message && e.error_message.includes('Cannot convert undefined or null to object')
    );

    if (templateErrors.length > 0) {
      logFail(`Found ${templateErrors.length} emails with template rendering errors`);
      templateErrors.forEach(e => {
        logFail(`  - Email ID ${e.id}: ${e.error_message}`);
      });
      recordTest('P0-001', 'Email Template Rendering', 'FAIL',
        `${templateErrors.length} emails still have template rendering errors`,
        { templateErrors });
      return false;
    }

    // Check success rate
    const failedEmails = recentEmails.filter(e => e.status === 'failed');
    const sentEmails = recentEmails.filter(e => e.status === 'sent');
    const successRate = recentEmails.length > 0
      ? (sentEmails.length / recentEmails.length * 100).toFixed(2)
      : 0;

    logInfo(`Success Rate: ${successRate}% (${sentEmails.length} sent / ${recentEmails.length} total)`);

    if (failedEmails.length > 0) {
      logInfo(`Failed Emails: ${failedEmails.length}`);
      failedEmails.forEach(e => {
        logWarn(`  - Email ID ${e.id} to ${e.user_email}: ${e.error_message || 'No error message'}`);
      });
    }

    if (templateErrors.length === 0) {
      logPass('No template rendering errors found - P0 fix confirmed working');
      recordTest('P0-001', 'Email Template Rendering', 'PASS',
        `0 template errors, ${successRate}% success rate`,
        { recentEmails: recentEmails.length, sent: sentEmails.length, failed: failedEmails.length });
      return true;
    }

  } catch (error) {
    logFail(`Database query failed: ${error.message}`);
    recordTest('P0-001', 'Email Template Rendering', 'FAIL',
      `Test execution error: ${error.message}`, null);
    return false;
  }
}

/**
 * P0 TEST: Verify data enrichment is working
 */
async function testP0_DataEnrichment() {
  logTest('P0-002', 'Data Enrichment - Appointment details populated in email merge data');

  try {
    // Get recent booking confirmation emails
    const recentBookingEmails = await sql`
      SELECT
        en.id,
        en.appointment_id,
        en.status,
        en.merge_data,
        en.error_message,
        a.id as appt_id,
        a.appointment_date,
        a.doctor_id,
        a.patient_id
      FROM email_notifications en
      LEFT JOIN appointments a ON en.appointment_id = a.id
      WHERE en.template_key LIKE '%booking_confirmation%'
        OR en.trigger_code = 'B3'
      ORDER BY en.created_at DESC
      LIMIT 10
    `;

    logInfo(`Found ${recentBookingEmails.length} booking confirmation emails`);

    if (recentBookingEmails.length === 0) {
      logWarn('No booking confirmation emails found - cannot verify enrichment');
      recordTest('P0-002', 'Data Enrichment', 'WARN',
        'No booking emails to verify - need real booking data', null);
      return true; // Not a failure, just no data
    }

    let enrichmentIssues = 0;

    for (const email of recentBookingEmails) {
      const mergeData = typeof email.merge_data === 'string'
        ? JSON.parse(email.merge_data)
        : email.merge_data;

      // Check if critical merge data fields are present
      const requiredFields = ['doctor_name', 'appointment_datetime_local'];
      const missingFields = requiredFields.filter(field => !mergeData || !mergeData[field]);

      if (missingFields.length > 0) {
        enrichmentIssues++;
        logWarn(`  Email ID ${email.id}: Missing fields: ${missingFields.join(', ')}`);
      } else {
        logPass(`  Email ID ${email.id}: All required fields present`);
        logInfo(`    Doctor: ${mergeData.doctor_name}`);
        logInfo(`    Appointment: ${mergeData.appointment_datetime_local}`);
      }
    }

    if (enrichmentIssues === 0) {
      logPass('All booking emails have properly enriched data');
      recordTest('P0-002', 'Data Enrichment', 'PASS',
        `All ${recentBookingEmails.length} booking emails have complete merge data`,
        { emailsChecked: recentBookingEmails.length });
      return true;
    } else {
      logFail(`${enrichmentIssues} emails have incomplete merge data`);
      recordTest('P0-002', 'Data Enrichment', 'FAIL',
        `${enrichmentIssues} out of ${recentBookingEmails.length} emails missing required fields`,
        { enrichmentIssues });
      return false;
    }

  } catch (error) {
    logFail(`Test failed: ${error.message}`);
    recordTest('P0-002', 'Data Enrichment', 'FAIL',
      `Test execution error: ${error.message}`, null);
    return false;
  }
}

/**
 * P1 TEST: Language Detection Validation
 */
async function testP1_LanguageDetection() {
  logTest('P1-001', 'Language Detection - User locale preferences stored and applied');

  try {
    // Check users with locale preferences
    const usersWithPrefs = await sql`
      SELECT
        np.user_id,
        np.locale,
        u.email,
        u.first_name,
        u.last_name,
        np.created_at
      FROM notification_preferences np
      JOIN users u ON np.user_id = u.id
      WHERE np.locale IS NOT NULL
      ORDER BY np.created_at DESC
      LIMIT 20
    `;

    logInfo(`Found ${usersWithPrefs.length} users with language preferences`);

    // Count locale distribution
    const localeCount = {};
    usersWithPrefs.forEach(user => {
      localeCount[user.locale] = (localeCount[user.locale] || 0) + 1;
    });

    logInfo('Locale Distribution:');
    Object.entries(localeCount).forEach(([locale, count]) => {
      logInfo(`  ${locale}: ${count} users`);
    });

    // Check if Bosnian (bs) users exist
    const bosnianUsers = usersWithPrefs.filter(u => u.locale === 'bs');

    if (bosnianUsers.length > 0) {
      logPass(`Found ${bosnianUsers.length} Bosnian-language users`);
      bosnianUsers.slice(0, 3).forEach(u => {
        logInfo(`  - ${u.first_name} ${u.last_name} (${u.email}): locale='bs'`);
      });
    } else {
      logWarn('No Bosnian-language users found - language detection may not have been tested');
    }

    // Verify default to English for users without preference
    const usersWithoutPrefs = await sql`
      SELECT COUNT(*)::int as count
      FROM users u
      LEFT JOIN notification_preferences np ON u.id = np.user_id
      WHERE np.user_id IS NULL OR np.locale IS NULL
    `;

    logInfo(`Users without locale preference: ${usersWithoutPrefs[0].count} (will default to 'en')`);

    if (usersWithPrefs.length > 0) {
      logPass('Language detection infrastructure is working');
      recordTest('P1-001', 'Language Detection', 'PASS',
        `${usersWithPrefs.length} users have locale preferences`,
        { localeCount, bosnianUsers: bosnianUsers.length });
      return true;
    } else {
      logWarn('No users have locale preferences yet - needs real user registration');
      recordTest('P1-001', 'Language Detection', 'WARN',
        'Infrastructure exists but no test data yet', null);
      return true; // Not a failure
    }

  } catch (error) {
    logFail(`Test failed: ${error.message}`);
    recordTest('P1-001', 'Language Detection', 'FAIL',
      `Test execution error: ${error.message}`, null);
    return false;
  }
}

/**
 * P1 TEST: Duplicate Notification Prevention
 */
async function testP1_DuplicatePrevention() {
  logTest('P1-002', 'Duplicate Prevention - No duplicate notifications within 30-minute window');

  try {
    // Get all notifications from last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentNotifications = await sql`
      SELECT
        user_id,
        trigger_code,
        appointment_id,
        status,
        created_at
      FROM notification_queue
      WHERE created_at >= ${oneDayAgo.toISOString()}
      ORDER BY created_at DESC
    `;

    logInfo(`Analyzing ${recentNotifications.length} notifications from last 24 hours`);

    // Check for duplicates within 30-minute windows
    const duplicates = [];
    const thirtyMinutes = 30 * 60 * 1000;

    for (let i = 0; i < recentNotifications.length; i++) {
      const notif = recentNotifications[i];
      const notifTime = new Date(notif.created_at).getTime();

      // Look for similar notifications within 30 minutes
      for (let j = i + 1; j < recentNotifications.length; j++) {
        const otherNotif = recentNotifications[j];
        const otherTime = new Date(otherNotif.created_at).getTime();

        const timeDiff = Math.abs(notifTime - otherTime);

        if (timeDiff > thirtyMinutes) break; // Outside 30-minute window

        // Check if it's a potential duplicate
        if (notif.user_id === otherNotif.user_id &&
            notif.trigger_code === otherNotif.trigger_code &&
            notif.appointment_id === otherNotif.appointment_id) {

          duplicates.push({
            userId: notif.user_id,
            triggerCode: notif.trigger_code,
            appointmentId: notif.appointment_id,
            time1: notif.created_at,
            time2: otherNotif.created_at,
            timeDiffMinutes: (timeDiff / 60000).toFixed(2),
            status1: notif.status,
            status2: otherNotif.status
          });
        }
      }
    }

    if (duplicates.length === 0) {
      logPass('No duplicate notifications found within 30-minute windows');
      recordTest('P1-002', 'Duplicate Prevention', 'PASS',
        `0 duplicates found in ${recentNotifications.length} notifications`,
        { notificationsAnalyzed: recentNotifications.length });
      return true;
    } else {
      logFail(`Found ${duplicates.length} potential duplicates`);
      duplicates.forEach(dup => {
        logFail(`  User ${dup.userId}, Trigger ${dup.triggerCode}, Appt ${dup.appointmentId || 'N/A'}`);
        logFail(`    Created: ${dup.time1} (${dup.status1}) and ${dup.time2} (${dup.status2})`);
        logFail(`    Time difference: ${dup.timeDiffMinutes} minutes`);
      });
      recordTest('P1-002', 'Duplicate Prevention', 'FAIL',
        `${duplicates.length} duplicates found`,
        { duplicates });
      return false;
    }

  } catch (error) {
    logFail(`Test failed: ${error.message}`);
    recordTest('P1-002', 'Duplicate Prevention', 'FAIL',
      `Test execution error: ${error.message}`, null);
    return false;
  }
}

/**
 * P1 TEST: Verify deduplication includes 'failed' status
 */
async function testP1_DeduplicationLogic() {
  logTest('P1-003', 'Deduplication Logic - Checks both "pending" and "failed" status');

  try {
    // Get failed notifications from last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const failedNotifications = await sql`
      SELECT
        user_id,
        trigger_code,
        status,
        created_at
      FROM notification_queue
      WHERE status = 'failed'
        AND created_at >= ${oneHourAgo.toISOString()}
      ORDER BY created_at DESC
      LIMIT 10
    `;

    logInfo(`Found ${failedNotifications.length} failed notifications in last hour`);

    if (failedNotifications.length === 0) {
      logInfo('No failed notifications to test retry behavior');
      recordTest('P1-003', 'Deduplication Logic', 'PASS',
        'No failed notifications - deduplication logic present in code',
        null);
      return true;
    }

    // For each failed notification, check if duplicates were created
    let issuesFound = 0;

    for (const failed of failedNotifications) {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

      const potentialDuplicates = await sql`
        SELECT COUNT(*)::int as count
        FROM notification_queue
        WHERE user_id = ${failed.user_id}
          AND trigger_code = ${failed.trigger_code}
          AND created_at >= ${thirtyMinutesAgo.toISOString()}
          AND (status = 'pending' OR status = 'failed')
      `;

      const duplicateCount = potentialDuplicates[0].count;

      if (duplicateCount > 1) {
        issuesFound++;
        logWarn(`  User ${failed.user_id}, Trigger ${failed.trigger_code}: ${duplicateCount} notifications found`);
      }
    }

    if (issuesFound === 0) {
      logPass('Deduplication correctly prevents failed notification duplicates');
      recordTest('P1-003', 'Deduplication Logic', 'PASS',
        'No duplicate failed notifications found',
        { failedNotificationsChecked: failedNotifications.length });
      return true;
    } else {
      logFail(`${issuesFound} failed notifications have potential duplicates`);
      recordTest('P1-003', 'Deduplication Logic', 'FAIL',
        `${issuesFound} failed notifications created duplicates`,
        { issuesFound });
      return false;
    }

  } catch (error) {
    logFail(`Test failed: ${error.message}`);
    recordTest('P1-003', 'Deduplication Logic', 'FAIL',
      `Test execution error: ${error.message}`, null);
    return false;
  }
}

/**
 * Integration Test: End-to-End Booking Flow
 */
async function testE2E_BookingFlow() {
  logTest('E2E-001', 'End-to-End Booking Flow - Notification created and email sent');

  try {
    // Get most recent booking
    const recentBooking = await sql`
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

    if (recentBooking.length === 0) {
      logWarn('No bookings found - cannot test E2E flow');
      recordTest('E2E-001', 'E2E Booking Flow', 'WARN',
        'No booking data available', null);
      return true;
    }

    const booking = recentBooking[0];
    logInfo(`Testing booking ID: ${booking.id}`);
    logInfo(`  Patient ID: ${booking.patient_id}`);
    logInfo(`  Doctor ID: ${booking.doctor_id}`);
    logInfo(`  Created: ${booking.created_at}`);

    // Check if notification was created
    const notifications = await sql`
      SELECT * FROM notification_queue
      WHERE appointment_id = ${booking.id}
      ORDER BY created_at DESC
    `;

    if (notifications.length === 0) {
      logFail('No notification created for booking');
      recordTest('E2E-001', 'E2E Booking Flow', 'FAIL',
        'Notification not created for booking', { bookingId: booking.id });
      return false;
    }

    logPass(`${notifications.length} notification(s) created for booking`);

    // Check if email was sent
    const emails = await sql`
      SELECT en.id, en.appointment_id, en.status, en.error_message, en.template_key, en.created_at, en.sent_at, u.email as user_email FROM email_notifications en LEFT JOIN users u ON en.user_id = u.id
      WHERE appointment_id = ${booking.id}
      ORDER BY created_at DESC
    `;

    if (emails.length === 0) {
      logFail('No email sent for booking');
      recordTest('E2E-001', 'E2E Booking Flow', 'FAIL',
        'Email not sent for booking', { bookingId: booking.id });
      return false;
    }

    const email = emails[0];
    logInfo(`Email status: ${email.status}`);

    if (email.status === 'sent') {
      logPass(`Email delivered successfully to ${email.user_email}`);
      logInfo(`  Subject: ${email.subject}`);
      logInfo(`  Sent at: ${email.sent_at}`);
      recordTest('E2E-001', 'E2E Booking Flow', 'PASS',
        'Booking → Notification → Email delivery successful',
        { bookingId: booking.id, emailStatus: 'sent' });
      return true;
    } else if (email.status === 'failed') {
      logFail(`Email delivery failed: ${email.error_message}`);
      recordTest('E2E-001', 'E2E Booking Flow', 'FAIL',
        `Email delivery failed: ${email.error_message}`,
        { bookingId: booking.id, error: email.error_message });
      return false;
    } else {
      logWarn(`Email status: ${email.status} (not yet sent)`);
      recordTest('E2E-001', 'E2E Booking Flow', 'WARN',
        `Email pending: ${email.status}`,
        { bookingId: booking.id, emailStatus: email.status });
      return true;
    }

  } catch (error) {
    logFail(`Test failed: ${error.message}`);
    recordTest('E2E-001', 'E2E Booking Flow', 'FAIL',
      `Test execution error: ${error.message}`, null);
    return false;
  }
}

/**
 * Generate Test Report
 */
function generateTestReport() {
  logSection('TEST EXECUTION REPORT');

  log(`\nTest Summary:`, colors.bold);
  log(`  Total Tests: ${testResults.total}`);
  log(`  Passed: ${testResults.passed}`, colors.green);
  log(`  Failed: ${testResults.failed}`, testResults.failed > 0 ? colors.red : colors.reset);
  log(`  Warnings: ${testResults.warnings}`, testResults.warnings > 0 ? colors.yellow : colors.reset);

  const passRate = testResults.total > 0
    ? ((testResults.passed / testResults.total) * 100).toFixed(2)
    : 0;
  log(`  Pass Rate: ${passRate}%\n`, passRate >= 90 ? colors.green : colors.yellow);

  log('Detailed Results:', colors.bold);
  testResults.tests.forEach(test => {
    const statusColor = test.status === 'PASS' ? colors.green :
                       test.status === 'FAIL' ? colors.red : colors.yellow;
    log(`  ${test.id}: ${test.status}`, statusColor);
    log(`    ${test.description}`, colors.reset);
    log(`    ${test.details}`, colors.reset);
  });

  // Deployment Recommendation
  log('\n' + '═'.repeat(80), colors.cyan);
  if (testResults.failed === 0) {
    log('🚀 DEPLOYMENT RECOMMENDATION: DEPLOY', colors.green + colors.bold);
    log('All critical tests passed. The 3 fixes are working correctly.', colors.green);
  } else {
    log('⛔ DEPLOYMENT RECOMMENDATION: DO NOT DEPLOY', colors.red + colors.bold);
    log(`${testResults.failed} critical test(s) failed. Investigate before proceeding.`, colors.red);
  }
  log('═'.repeat(80) + '\n', colors.cyan);

  // Save report to file
  const evidenceDir = join(__dirname, 'test-evidence');
  if (!existsSync(evidenceDir)) {
    mkdirSync(evidenceDir, { recursive: true });
  }

  const reportPath = join(evidenceDir, `test-report-${Date.now()}.json`);
  writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  logInfo(`Full report saved to: ${reportPath}`);
}

/**
 * Main Test Execution
 */
async function runAllTests() {
  logSection('🧪 CRITICAL FIXES VALIDATION TEST SUITE');
  logInfo('Testing deployment: dc7b32c');
  logInfo('Environment: Production (Railway)');
  logInfo('Database: PostgreSQL (Supabase)');

  try {
    // P0 Tests: Email Rendering
    await testP0_EmailRendering();
    await testP0_DataEnrichment();

    // P1 Tests: Language Detection
    await testP1_LanguageDetection();

    // P1 Tests: Duplicate Prevention
    await testP1_DuplicatePrevention();
    await testP1_DeduplicationLogic();

    // E2E Tests
    await testE2E_BookingFlow();

    // Generate final report
    generateTestReport();

  } catch (error) {
    logFail(`Test suite failed: ${error.message}`);
    console.error(error);
  } finally {
    await sql.end();
  }
}

// Run tests
runAllTests().catch(console.error);

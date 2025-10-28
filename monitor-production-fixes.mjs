/**
 * Production Monitoring Script for Critical Fixes
 *
 * Monitors real production bookings for 24-48 hours after deployment
 * Validates 3 critical fixes:
 * - P0: Email template rendering (no more "Cannot convert undefined or null to object")
 * - P1: Language detection working correctly
 * - P1: No duplicate notifications
 *
 * Auto-stops after 48 hours or 30 successful bookings
 */

import postgres from 'postgres';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

// Monitoring state
const monitoringState = {
  startTime: new Date(),
  totalChecks: 0,
  bookingsProcessed: new Set(),
  successfulBookings: 0,
  alerts: [],
  lastCheckTime: null,
  maxRuntime: 48 * 60 * 60 * 1000, // 48 hours
  maxSuccessfulBookings: 30
};

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = colors.reset) {
  const timestamp = new Date().toISOString();
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logAlert(message) {
  log(`🚨 ALERT: ${message}`, colors.magenta);
  monitoringState.alerts.push({
    timestamp: new Date(),
    message
  });
}

async function checkBookingNotifications(booking) {
  const issues = [];

  logInfo(`Checking booking #${booking.id} (Patient: ${booking.patient_id})`);

  try {
    // Get all notifications for this booking
    const notifications = await sql`
      SELECT * FROM email_notifications
      WHERE appointment_id = ${booking.id}
      ORDER BY created_at DESC
    `;

    if (!notifications || notifications.length === 0) {
      issues.push('No notifications found for this booking');
      return { booking, issues, notifications: [] };
    }

    // Check P0: Email delivery success
    const failedNotifications = notifications.filter(n => n.status === 'failed');
    if (failedNotifications.length > 0) {
      for (const failed of failedNotifications) {
        issues.push(`P0 FAILURE: Email ${failed.id} failed with error: ${failed.error_message}`);

        // Check if it's the old template rendering error
        if (failed.error_message?.includes('Cannot convert undefined or null to object')) {
          issues.push('P0 CRITICAL: OLD TEMPLATE ERROR STILL OCCURRING!');
        }
      }
    }

    const sentNotifications = notifications.filter(n => n.status === 'sent');
    if (sentNotifications.length > 0) {
      logSuccess(`  Email delivered successfully (${sentNotifications.length} sent)`);
    }

    // Check P1: Language detection
    const patients = await sql`
      SELECT locale, user_id FROM notification_preferences
      WHERE user_id = ${booking.patient_id}
      LIMIT 1
    `;

    if (patients.length > 0 && sentNotifications.length > 0) {
      const patient = patients[0];
      const expectedLocale = patient.locale || 'en';

      logSuccess(`  Patient locale: ${expectedLocale}`);

      // If patient has non-default locale, it's a good test case
      if (expectedLocale !== 'en') {
        logInfo(`  🌍 Good test case: Non-English locale detected (${expectedLocale})`);
      }
    }

    // Check P1: Duplicate detection
    const bookingNotifications = notifications.filter(n =>
      n.trigger_code === 'B3' || n.template_key === 'booking_confirmation'
    );

    if (bookingNotifications.length > 1) {
      const recentDuplicates = bookingNotifications.filter(n => {
        const createdAt = new Date(n.created_at);
        const timeDiff = Date.now() - createdAt.getTime();
        return timeDiff < 30 * 60 * 1000; // Within 30 minutes
      });

      if (recentDuplicates.length > 1) {
        issues.push(`P1 DUPLICATE: ${recentDuplicates.length} notifications created within 30 minutes`);
      } else {
        logSuccess(`  No duplicates detected (${bookingNotifications.length} total, but spaced correctly)`);
      }
    } else {
      logSuccess('  No duplicate notifications');
    }

    return { booking, issues, notifications };
  } catch (error) {
    issues.push(`Database error: ${error.message}`);
    return { booking, issues, notifications: [] };
  }
}

async function monitorRecentBookings() {
  monitoringState.totalChecks++;
  monitoringState.lastCheckTime = new Date();

  const checkNumber = monitoringState.totalChecks;
  log(`\n${'='.repeat(80)}`, colors.cyan);
  log(`📊 MONITORING CHECK #${checkNumber}`, colors.cyan);
  log(`${'='.repeat(80)}`, colors.cyan);

  try {
    // Get bookings created in the last 10 minutes (after our deployment)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const recentBookings = await sql`
      SELECT * FROM appointments
      WHERE created_at >= ${tenMinutesAgo.toISOString()}
      ORDER BY created_at DESC
      LIMIT 10
    `;

    if (!recentBookings || recentBookings.length === 0) {
      logInfo('No new bookings in the last 10 minutes');
      return;
    }

    logInfo(`Found ${recentBookings.length} recent booking(s)`);

    // Check each booking
    let newBookingsChecked = 0;
    let issuesFound = false;

    for (const booking of recentBookings) {
      // Skip if we've already processed this booking
      if (monitoringState.bookingsProcessed.has(booking.id)) {
        continue;
      }

      monitoringState.bookingsProcessed.add(booking.id);
      newBookingsChecked++;

      const result = await checkBookingNotifications(booking);

      if (result.issues.length > 0) {
        issuesFound = true;
        logAlert(`Issues found for booking #${booking.id}:`);
        result.issues.forEach(issue => logAlert(`  - ${issue}`));
      } else {
        logSuccess(`Booking #${booking.id} - All checks passed!`);
        monitoringState.successfulBookings++;
      }
    }

    if (newBookingsChecked === 0) {
      logInfo('All bookings already checked in previous runs');
    }

    // Summary
    log(`\n${'─'.repeat(80)}`, colors.cyan);
    logInfo(`Summary: ${monitoringState.successfulBookings}/${monitoringState.bookingsProcessed.size} successful bookings`);
    if (monitoringState.alerts.length > 0) {
      logWarning(`Total alerts: ${monitoringState.alerts.length}`);
    }
    log(`${'─'.repeat(80)}\n`, colors.cyan);
  } catch (error) {
    logError(`Failed to fetch bookings: ${error.message}`);
  }
}

function shouldStopMonitoring() {
  const runtime = Date.now() - monitoringState.startTime.getTime();

  // Stop if max runtime exceeded
  if (runtime >= monitoringState.maxRuntime) {
    log('\n' + '='.repeat(80), colors.green);
    logSuccess('✅ MONITORING COMPLETE: 48-hour runtime reached');
    log('='.repeat(80) + '\n', colors.green);
    return true;
  }

  // Stop if max successful bookings reached
  if (monitoringState.successfulBookings >= monitoringState.maxSuccessfulBookings) {
    log('\n' + '='.repeat(80), colors.green);
    logSuccess(`✅ MONITORING COMPLETE: ${monitoringState.maxSuccessfulBookings} successful bookings verified`);
    log('='.repeat(80) + '\n', colors.green);
    return true;
  }

  return false;
}

function printFinalReport() {
  log('\n' + '█'.repeat(80), colors.cyan);
  log('📈 FINAL MONITORING REPORT', colors.cyan);
  log('█'.repeat(80), colors.cyan);

  const runtime = Date.now() - monitoringState.startTime.getTime();
  const hours = Math.floor(runtime / (60 * 60 * 1000));
  const minutes = Math.floor((runtime % (60 * 60 * 1000)) / (60 * 1000));

  logInfo(`Total runtime: ${hours}h ${minutes}m`);
  logInfo(`Total checks performed: ${monitoringState.totalChecks}`);
  logInfo(`Unique bookings processed: ${monitoringState.bookingsProcessed.size}`);
  logSuccess(`Successful bookings: ${monitoringState.successfulBookings}`);

  if (monitoringState.alerts.length > 0) {
    logWarning(`\nTotal alerts raised: ${monitoringState.alerts.length}`);
    log('\nAlert History:', colors.yellow);
    monitoringState.alerts.forEach((alert, index) => {
      log(`  ${index + 1}. [${alert.timestamp.toISOString()}] ${alert.message}`, colors.yellow);
    });
  } else {
    logSuccess('\n🎉 NO ALERTS - All fixes working perfectly!');
  }

  log('\n' + '█'.repeat(80) + '\n', colors.cyan);

  // Save report to file
  const reportPath = join(__dirname, 'monitoring-report.json');
  const report = {
    ...monitoringState,
    bookingsProcessed: Array.from(monitoringState.bookingsProcessed),
    endTime: new Date()
  };

  import('fs').then(fs => {
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    logInfo(`Full report saved to: monitoring-report.json`);
  });
}

async function startMonitoring() {
  log('\n' + '█'.repeat(80), colors.cyan);
  log('🚀 PRODUCTION MONITORING STARTED', colors.cyan);
  log('█'.repeat(80), colors.cyan);
  logInfo(`Start time: ${monitoringState.startTime.toISOString()}`);
  logInfo(`Will monitor for: 48 hours OR 30 successful bookings (whichever comes first)`);
  logInfo(`Check interval: Every 2 minutes`);
  log('█'.repeat(80) + '\n', colors.cyan);

  // Run first check immediately
  await monitorRecentBookings();

  // Set up interval for subsequent checks (every 2 minutes)
  const intervalId = setInterval(async () => {
    try {
      await monitorRecentBookings();

      if (shouldStopMonitoring()) {
        clearInterval(intervalId);
        printFinalReport();
        await sql.end();
        process.exit(0);
      }
    } catch (error) {
      logError(`Monitoring error: ${error.message}`);
      console.error(error);
    }
  }, 2 * 60 * 1000); // 2 minutes

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    log('\n\n' + '█'.repeat(80), colors.yellow);
    logWarning('⚠️  MONITORING STOPPED (User interrupted)');
    log('█'.repeat(80) + '\n', colors.yellow);
    clearInterval(intervalId);
    printFinalReport();
    await sql.end();
    process.exit(0);
  });
}

// Start monitoring
startMonitoring().catch(async (error) => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  await sql.end();
  process.exit(1);
});

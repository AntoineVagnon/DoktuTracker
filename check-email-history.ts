#!/usr/bin/env tsx
/**
 * Check email sending history in the database
 */

import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function checkEmailHistory() {
  console.log("📊 Checking Email Sending History");
  console.log("=====================================\n");

  try {
    // Check notification_audit_log for recent email attempts
    const auditLogs = await db.execute(sql`
      SELECT 
        COUNT(*) as total_attempts,
        COUNT(CASE WHEN channel = 'email' THEN 1 END) as email_attempts,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as successful_sends,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_sends,
        MIN(created_at) as first_attempt,
        MAX(created_at) as last_attempt
      FROM notification_audit_log
      WHERE created_at > NOW() - INTERVAL '7 days'
    `);

    console.log("📈 Last 7 Days Summary:");
    if (auditLogs && auditLogs.length > 0) {
      const stats = auditLogs[0];
      console.log(`  Total notification attempts: ${stats.total_attempts}`);
      console.log(`  Email attempts: ${stats.email_attempts}`);
      console.log(`  Successful: ${stats.successful_sends}`);
      console.log(`  Failed: ${stats.failed_sends}`);
      console.log(`  First attempt: ${stats.first_attempt || 'None'}`);
      console.log(`  Last attempt: ${stats.last_attempt || 'None'}`);
    } else {
      console.log("  No notification attempts found");
    }

    // Check notification_sent_log for successfully sent emails
    const sentLogs = await db.execute(sql`
      SELECT 
        COUNT(*) as total_sent,
        COUNT(DISTINCT user_id) as unique_users,
        MIN(sent_at) as first_sent,
        MAX(sent_at) as last_sent
      FROM notification_sent_log
      WHERE sent_at > NOW() - INTERVAL '30 days'
    `);

    console.log("\n📧 Last 30 Days Sent Emails:");
    if (sentLogs && sentLogs.length > 0) {
      const stats = sentLogs[0];
      console.log(`  Total emails sent: ${stats.total_sent}`);
      console.log(`  Unique users: ${stats.unique_users}`);
      console.log(`  First sent: ${stats.first_sent || 'None'}`);
      console.log(`  Last sent: ${stats.last_sent || 'None'}`);
    } else {
      console.log("  No sent emails found");
    }

    // Check notification_queue for pending emails
    const queuedEmails = await db.execute(sql`
      SELECT 
        COUNT(*) as pending_count,
        MIN(scheduled_for) as next_scheduled
      FROM notification_queue
      WHERE status = 'pending'
    `);

    console.log("\n⏳ Pending in Queue:");
    if (queuedEmails && queuedEmails.length > 0) {
      const stats = queuedEmails[0];
      console.log(`  Pending notifications: ${stats.pending_count}`);
      console.log(`  Next scheduled: ${stats.next_scheduled || 'None'}`);
    } else {
      console.log("  No pending notifications");
    }

    // Get recent failed attempts with error messages
    const recentFailures = await db.execute(sql`
      SELECT 
        created_at,
        channel,
        status,
        error_message,
        metadata
      FROM notification_audit_log
      WHERE status = 'failed' 
        AND created_at > NOW() - INTERVAL '1 day'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    if (recentFailures && recentFailures.length > 0) {
      console.log("\n❌ Recent Failed Attempts (Last 24 hours):");
      recentFailures.forEach((failure: any, index: number) => {
        console.log(`\n  ${index + 1}. ${failure.created_at}`);
        console.log(`     Channel: ${failure.channel}`);
        console.log(`     Error: ${failure.error_message || 'No error message'}`);
        if (failure.metadata) {
          console.log(`     Metadata: ${JSON.stringify(failure.metadata).substring(0, 100)}...`);
        }
      });
    } else {
      console.log("\n✅ No failed email attempts in the last 24 hours");
    }

    // Check if tables are empty
    const tableCheck = await db.execute(sql`
      SELECT 
        (SELECT COUNT(*) FROM notification_audit_log) as audit_count,
        (SELECT COUNT(*) FROM notification_sent_log) as sent_count,
        (SELECT COUNT(*) FROM notification_queue) as queue_count,
        (SELECT COUNT(*) FROM notification_history) as history_count
    `);

    console.log("\n📊 Table Record Counts:");
    if (tableCheck && tableCheck.length > 0) {
      const counts = tableCheck[0];
      console.log(`  notification_audit_log: ${counts.audit_count} records`);
      console.log(`  notification_sent_log: ${counts.sent_count} records`);
      console.log(`  notification_queue: ${counts.queue_count} records`);
      console.log(`  notification_history: ${counts.history_count} records`);
    }

  } catch (error) {
    console.error("❌ Error checking email history:", error);
  }
}

// Run the check
checkEmailHistory()
  .then(() => {
    console.log("\n✨ Check complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Check failed:", error);
    process.exit(1);
  });
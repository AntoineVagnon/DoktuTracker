// Reset Failed Email Notifications
// This script resets failed email notifications so they can be retried
const { Client } = require('pg');
require('dotenv').config();

async function resetFailedEmails() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // For development with self-signed certificates
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Find all failed email notifications
    const failedResult = await client.query(`
      SELECT id, user_id, trigger_code, status, retry_count, error_message, created_at
      FROM email_notifications
      WHERE status = 'failed' OR retry_count >= 3
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log(`\n📧 Found ${failedResult.rows.length} failed email notifications:`);
    failedResult.rows.forEach(row => {
      console.log(`   - ID: ${row.id}`);
      console.log(`     User ID: ${row.user_id}`);
      console.log(`     Trigger: ${row.trigger_code}`);
      console.log(`     Status: ${row.status}`);
      console.log(`     Retry Count: ${row.retry_count}`);
      console.log(`     Error: ${row.error_message}`);
      console.log(`     Created: ${row.created_at}`);
      console.log('');
    });

    if (failedResult.rows.length > 0) {
      // Reset failed notifications
      const resetResult = await client.query(`
        UPDATE email_notifications
        SET status = 'pending',
            retry_count = 0,
            error_message = NULL,
            scheduled_for = NOW(),
            updated_at = NOW()
        WHERE status = 'failed' OR retry_count >= 3
        RETURNING id, trigger_code
      `);

      console.log(`✅ Reset ${resetResult.rows.length} email notifications to 'pending' status`);
      resetResult.rows.forEach(row => {
        console.log(`   - Reset notification ${row.id} (${row.trigger_code})`);
      });
      console.log('\n📧 These emails will be processed by the notification processor in the next run (every 2 minutes)');
    } else {
      console.log('No failed email notifications found.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n✅ Database connection closed');
  }
}

resetFailedEmails();

// Check notification processing status
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkStatus() {
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT id, trigger_code, template_key, status, priority, sent_at, error_message, created_at
      FROM email_notifications
      WHERE user_id = 4
        AND created_at > NOW() - INTERVAL '10 minutes'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('\n========================================');
    console.log('NOTIFICATION PROCESSING STATUS');
    console.log('========================================\n');

    if (result.rows.length === 0) {
      console.log('No recent notifications found');
    } else {
      console.log(`Found ${result.rows.length} recent notifications:\n`);

      let sentCount = 0;
      let pendingCount = 0;
      let failedCount = 0;

      result.rows.forEach((row, idx) => {
        console.log(`${idx + 1}. ${row.trigger_code} (${row.template_key})`);
        console.log(`   ID: ${row.id}`);
        console.log(`   Status: ${row.status.toUpperCase()}`);
        console.log(`   Priority: ${row.priority}`);
        console.log(`   Created: ${row.created_at}`);

        if (row.status === 'sent') {
          console.log(`   ✅ Sent: ${row.sent_at}`);
          sentCount++;
        } else if (row.status === 'pending') {
          console.log(`   ⏳ Still pending...`);
          pendingCount++;
        } else if (row.status === 'failed') {
          console.log(`   ❌ Failed: ${row.error_message}`);
          failedCount++;
        }
        console.log('');
      });

      console.log('========================================');
      console.log('SUMMARY');
      console.log('========================================');
      console.log(`Sent: ${sentCount}`);
      console.log(`Pending: ${pendingCount}`);
      console.log(`Failed: ${failedCount}`);
      console.log('========================================\n');
    }

    client.release();
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkStatus();

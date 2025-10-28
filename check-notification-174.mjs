import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: 'postgresql://postgres.hzmrkvooqjbxptqjqxii:ArnuVVZ0mS4ZbMR8@aws-0-eu-central-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    await client.connect();

    // Check email_notifications for appointment 174
    console.log('📧 Checking email_notifications for appointment 174...\n');
    const result = await client.query(`
      SELECT *
      FROM email_notifications
      WHERE appointment_id = 174
      ORDER BY created_at DESC;
    `);

    if (result.rows.length > 0) {
      console.log(`✅ Found ${result.rows.length} notification(s):\n`);
      result.rows.forEach((row, i) => {
        console.log(`Record ${i + 1}:`);
        console.log(`  ID: ${row.id}`);
        console.log(`  User ID: ${row.user_id}`);
        console.log(`  Trigger Code: ${row.trigger_code}`);
        console.log(`  Template Key: ${row.template_key}`);
        console.log(`  Status: ${row.status}`);
        console.log(`  Scheduled For: ${row.scheduled_for}`);
        console.log(`  Sent At: ${row.sent_at || 'Not sent yet'}`);
        console.log(`  Error: ${row.error_message || 'None'}`);
        console.log(`  Created: ${row.created_at}`);
        console.log(`  Merge Data: ${JSON.stringify(row.merge_data, null, 2)}\n`);
      });
    } else {
      console.log('❌ NO notification found for appointment 174');
      console.log('   This is a CRITICAL FAILURE - notification was not scheduled!\n');
    }

    // Also check for user 296
    console.log('\n👤 Checking all notifications for user 296 (last hour)...');
    const userResult = await client.query(`
      SELECT id, appointment_id, trigger_code, status, created_at, sent_at
      FROM email_notifications
      WHERE user_id = 296
      AND created_at > NOW() - INTERVAL '1 hour'
      ORDER BY created_at DESC;
    `);

    if (userResult.rows.length > 0) {
      console.log(`Found ${userResult.rows.length} notification(s):`);
      userResult.rows.forEach(row => {
        console.log(`  - Appt ${row.appointment_id}, Trigger: ${row.trigger_code}, Status: ${row.status}, Created: ${row.created_at}`);
      });
    } else {
      console.log('No notifications for user 296 in last hour');
    }

    await client.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

check();

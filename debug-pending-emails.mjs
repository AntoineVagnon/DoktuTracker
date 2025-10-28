import pg from 'pg';
const { Client } = pg;

const dbClient = new Client({
  connectionString: 'postgresql://postgres.hzmrkvooqjbxptqjqxii:ArnuVVZ0mS4ZbMR8@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require'
});

await dbClient.connect();

console.log('\n🔍 DEBUGGING PENDING EMAIL NOTIFICATIONS\n');
console.log('='.repeat(80));

const now = new Date();
console.log(`⏰ Current time: ${now.toISOString()}`);
console.log(`⏰ Current time local: ${now.toString()}\n`);

// Get pending email notifications with full details
const result = await dbClient.query(`
  SELECT
    id,
    user_id,
    trigger_code,
    template_key,
    status,
    priority,
    scheduled_for,
    sent_at,
    retry_count,
    error_message,
    created_at,
    NOW() as current_time,
    (scheduled_for <= NOW()) as should_send
  FROM email_notifications
  WHERE user_id = 53
  ORDER BY created_at DESC
  LIMIT 5
`);

console.log(`📧 Found ${result.rows.length} email notifications for user 53:\n`);

result.rows.forEach((email, idx) => {
  console.log(`Email #${idx + 1}:`);
  console.log(`  ID: ${email.id}`);
  console.log(`  Trigger: ${email.trigger_code}`);
  console.log(`  Template: ${email.template_key}`);
  console.log(`  Status: ${email.status}`);
  console.log(`  Priority: ${email.priority}`);
  console.log(`  Scheduled for: ${email.scheduled_for}`);
  console.log(`  Current time: ${email.current_time}`);
  console.log(`  Should send now? ${email.should_send}`);
  console.log(`  Sent at: ${email.sent_at || 'Not sent'}`);
  console.log(`  Retry count: ${email.retry_count}`);
  console.log(`  Created at: ${email.created_at}`);
  if (email.error_message) {
    console.log(`  Error: ${email.error_message}`);
  }
  console.log('');
});

// Check if there are ANY pending emails that should be sent now
const pendingResult = await dbClient.query(`
  SELECT COUNT(*) as count
  FROM email_notifications
  WHERE status = 'pending'
  AND scheduled_for <= NOW()
`);

console.log(`📊 Total pending emails that should be sent now: ${pendingResult.rows[0].count}`);

console.log('\n' + '='.repeat(80));
console.log('💡 Analysis:');
console.log('   If "Should send now?" is TRUE and status is "pending", the email should be processed');
console.log('   If "Should send now?" is FALSE, the scheduled_for time is in the future');
console.log('='.repeat(80) + '\n');

await dbClient.end();

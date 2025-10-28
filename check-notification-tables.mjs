import pg from 'pg';
const { Client } = pg;

const dbClient = new Client({
  connectionString: 'postgresql://postgres.hzmrkvooqjbxptqjqxii:ArnuVVZ0mS4ZbMR8@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require'
});

await dbClient.connect();

console.log('\n📊 CHECKING NOTIFICATION TABLES IN PRODUCTION\n');
console.log('='.repeat(80));

const tablesToCheck = [
  'notifications',
  'email_notifications',
  'sms_notifications',
  'push_notifications',
  'in_app_notifications',
  'notification_preferences'
];

for (const table of tablesToCheck) {
  try {
    const result = await dbClient.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = $1
      );
    `, [table]);

    const exists = result.rows[0].exists;
    console.log(`${exists ? '✅' : '❌'} ${table}: ${exists ? 'EXISTS' : 'MISSING'}`);
  } catch (error) {
    console.log(`❌ ${table}: ERROR - ${error.message}`);
  }
}

console.log('\n' + '='.repeat(80) + '\n');

await dbClient.end();

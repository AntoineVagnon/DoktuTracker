import pg from 'pg';
import fs from 'fs';
const { Client } = pg;

const dbClient = new Client({
  connectionString: 'postgresql://postgres.hzmrkvooqjbxptqjqxii:ArnuVVZ0mS4ZbMR8@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require'
});

console.log('\n🔧 CREATING MISSING NOTIFICATIONS TABLE IN PRODUCTION\n');
console.log('='.repeat(80));

try {
  await dbClient.connect();
  console.log('✅ Connected to production database');

  // Read the SQL file
  const sql = fs.readFileSync('./create-notifications-table.sql', 'utf-8');
  console.log('✅ Read SQL migration file');

  // Execute the migration
  console.log('\n📊 Executing migration...');
  await dbClient.query(sql);
  console.log('✅ Migration executed successfully!');

  // Verify the table was created
  const result = await dbClient.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'notifications'
    );
  `);

  if (result.rows[0].exists) {
    console.log('✅ notifications table verified - EXISTS');
  } else {
    console.log('❌ notifications table was NOT created!');
  }

  console.log('\n' + '='.repeat(80));
  console.log('🎉 Migration complete! Notifications system should now work.');
  console.log('='.repeat(80) + '\n');

} catch (error) {
  console.error('❌ Migration failed:', error.message);
  console.error('Full error:', error);
  process.exit(1);
} finally {
  await dbClient.end();
}

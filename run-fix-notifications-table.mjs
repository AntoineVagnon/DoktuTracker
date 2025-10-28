import pg from 'pg';
import fs from 'fs';
const { Client } = pg;

const dbClient = new Client({
  connectionString: 'postgresql://postgres.hzmrkvooqjbxptqjqxii:ArnuVVZ0mS4ZbMR8@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require'
});

console.log('\n🔧 FIXING NOTIFICATIONS TABLE STRUCTURE IN PRODUCTION\n');
console.log('='.repeat(80));

try {
  await dbClient.connect();
  console.log('✅ Connected to production database');

  // Read the SQL file
  const sql = fs.readFileSync('./fix-notifications-table.sql', 'utf-8');
  console.log('✅ Read SQL migration file');

  // Execute the migration
  console.log('\n📊 Dropping and recreating notifications table...');
  await dbClient.query(sql);
  console.log('✅ Migration executed successfully!');

  // Verify the table was created with correct columns
  const result = await dbClient.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notifications'
    ORDER BY ordinal_position;
  `);

  console.log('\n📋 Notifications table columns:');
  result.rows.forEach(col => {
    console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('🎉 Migration complete! Notifications system should now work correctly.');
  console.log('='.repeat(80) + '\n');

} catch (error) {
  console.error('❌ Migration failed:', error.message);
  console.error('Full error:', error);
  process.exit(1);
} finally {
  await dbClient.end();
}

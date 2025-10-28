import pg from 'pg';
const { Client } = pg;

const dbClient = new Client({
  connectionString: 'postgresql://postgres.hzmrkvooqjbxptqjqxii:ArnuVVZ0mS4ZbMR8@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require'
});

await dbClient.connect();

console.log('\n📊 CHECKING EXISTING NOTIFICATION TABLE SCHEMAS\n');
console.log('='.repeat(80));

const tables = ['email_notifications', 'sms_notifications', 'notification_preferences'];

for (const table of tables) {
  console.log(`\n🔍 ${table} schema:`);
  try {
    const result = await dbClient.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = $1
      ORDER BY ordinal_position;
    `, [table]);

    result.rows.forEach(col => {
      const type = col.character_maximum_length
        ? `${col.data_type}(${col.character_maximum_length})`
        : col.data_type;
      console.log(`   ${col.column_name}: ${type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

// Check users table id type
console.log('\n🔍 users table id column:');
const usersResult = await dbClient.query(`
  SELECT column_name, data_type, character_maximum_length
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'id';
`);
console.log(`   id: ${usersResult.rows[0].data_type}`);

console.log('\n' + '='.repeat(80) + '\n');

await dbClient.end();

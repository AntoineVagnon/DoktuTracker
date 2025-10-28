import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.hzmrkvooqjbxptqjqxii:ArnuVVZ0mS4ZbMR8@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require'
});

try {
  await client.connect();
  console.log('✅ Connected to database\n');

  // Query user and notification preferences
  const userResult = await client.query(`
    SELECT
      u.id,
      u.email,
      u.first_name,
      u.last_name,
      u.created_at,
      np.locale,
      np.email_enabled,
      np.sms_enabled,
      np.push_enabled
    FROM users u
    LEFT JOIN notification_preferences np ON u.id = np.user_id
    WHERE u.email LIKE 'test.booking%'
    ORDER BY u.created_at DESC
    LIMIT 5
  `);

  if (userResult.rows.length > 0) {
    console.log('📊 Test Users Found:');
    userResult.rows.forEach((user, index) => {
      console.log(`\n${index + 1}. User ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.first_name} ${user.last_name}`);
      console.log(`   Created: ${user.created_at}`);
      console.log(`   Locale: ${user.locale || 'NOT SET'}`);
      console.log(`   Email Enabled: ${user.email_enabled}`);
    });
  } else {
    console.log('❌ No test users found');
  }

  await client.end();
} catch (error) {
  console.error('❌ Database error:', error.message);
  process.exit(1);
}

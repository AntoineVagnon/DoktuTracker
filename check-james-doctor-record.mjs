import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

console.log('\n🔍 CHECKING JAMES RODRIGUEZ DOCTOR RECORD IN PRODUCTION DATABASE\n');
console.log('='.repeat(80));

// Use production database URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

try {
  // First, check the user record
  console.log('\n📝 Step 1: Checking user record for james.rodriguez@doktu.com...\n');

  const userResult = await pool.query(
    'SELECT id, email, role, first_name, last_name FROM users WHERE email = $1',
    ['james.rodriguez@doktu.com']
  );

  if (userResult.rows.length === 0) {
    console.log('❌ User not found in database!');
    process.exit(1);
  }

  const user = userResult.rows[0];
  console.log('✅ User found:');
  console.log(JSON.stringify(user, null, 2));

  // Now check if there's a doctor record for this user_id
  console.log(`\n📊 Step 2: Checking doctor record for user_id=${user.id}...\n`);

  const doctorResult = await pool.query(
    'SELECT id, user_id, specialty, license_number, created_at FROM doctors WHERE user_id = $1',
    [user.id]
  );

  if (doctorResult.rows.length === 0) {
    console.log(`❌ NO DOCTOR RECORD FOUND for user_id=${user.id}`);
    console.log('\n🔧 This is the ROOT CAUSE of the issue!');
    console.log(`   User "${user.email}" has role="${user.role}" but no entry in the doctors table.`);
    console.log('\n💡 Solution: Insert a doctor record for this user.');
  } else {
    console.log('✅ Doctor record found:');
    console.log(JSON.stringify(doctorResult.rows[0], null, 2));
    console.log(`\n✅ Doctor ID is: ${doctorResult.rows[0].id}`);
    console.log('   This should be returned by /api/auth/user endpoint.');
  }

} catch (error) {
  console.error('❌ Database error:', error.message);
  console.error(error);
} finally {
  await pool.end();
  console.log('\n' + '='.repeat(80));
}

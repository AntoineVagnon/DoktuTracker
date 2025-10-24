import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const u = new URL(process.env.DATABASE_URL);
const sql = postgres({
  host: u.hostname,
  port: Number(u.port) || 5432,
  database: u.pathname.slice(1),
  user: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password || ''),
  ssl: { rejectUnauthorized: false },
  prepare: false,
});

console.log('\n🔧 Adding Unique Constraint to Prevent Duplicate Email Notifications');
console.log('═'.repeat(80));

try {
  // Step 1: Check current duplicate count
  const [beforeDuplicates] = await sql`
    SELECT COUNT(*) as duplicate_count
    FROM (
      SELECT appointment_id, trigger_code, user_id, COUNT(*) as cnt
      FROM email_notifications
      WHERE appointment_id IS NOT NULL
      GROUP BY appointment_id, trigger_code, user_id
      HAVING COUNT(*) > 1
    ) duplicates
  `;

  console.log(`\n📊 Found ${beforeDuplicates.duplicate_count} sets of duplicate notifications`);

  // Step 2: Delete duplicates (keep only the oldest one per appointment/trigger)
  if (beforeDuplicates.duplicate_count > 0) {
    console.log('\n🧹 Cleaning up existing duplicates...');

    // Use ROW_NUMBER() window function instead of MIN(uuid) which doesn't exist
    const deleted = await sql`
      DELETE FROM email_notifications
      WHERE id IN (
        SELECT id FROM (
          SELECT id,
            ROW_NUMBER() OVER (
              PARTITION BY appointment_id, trigger_code, user_id
              ORDER BY created_at ASC
            ) as rn
          FROM email_notifications
          WHERE appointment_id IS NOT NULL
        ) t
        WHERE rn > 1
      )
    `;

    console.log(`✅ Deleted ${deleted.count} duplicate notifications`);
  }

  // Step 3: Add unique constraint
  console.log('\n🔒 Adding unique constraint...');

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_appointment_notification
    ON email_notifications (appointment_id, trigger_code, user_id)
    WHERE appointment_id IS NOT NULL
  `;

  console.log('✅ Unique constraint added successfully!');

  // Step 4: Verify constraint
  const indexes = await sql`
    SELECT
      schemaname,
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE tablename = 'email_notifications'
      AND indexname = 'idx_unique_appointment_notification'
  `;

  if (indexes.length > 0) {
    console.log('\n✅ Constraint verified:');
    console.log('   ', indexes[0].indexdef);
  }

  console.log('\n🎉 Migration complete!');
  console.log('\n📋 What this does:');
  console.log('   - Prevents duplicate email notifications for the same appointment');
  console.log('   - Database will reject duplicate (appointment_id, trigger_code, user_id) combinations');
  console.log('   - Works even with race conditions (multiple simultaneous requests)');
  console.log('\n✅ Next booking will only create ONE email notification!\n');

} catch (error) {
  console.error('❌ Error:', error);
} finally {
  await sql.end();
}

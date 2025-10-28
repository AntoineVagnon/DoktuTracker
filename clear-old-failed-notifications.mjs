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

console.log('\n🧹 Clearing Old Failed Email Notifications');
console.log('═'.repeat(80));

try {
  // Get count of failed notifications
  const [beforeCount] = await sql`
    SELECT COUNT(*) as count
    FROM email_notifications
    WHERE status = 'failed'
  `;

  console.log(`\n📊 Found ${beforeCount.count} failed email notifications`);

  if (beforeCount.count === 0) {
    console.log('✅ No failed notifications to clear!');
  } else {
    // Update failed notifications to mark them as permanently failed
    // (set retry_count to 99 so they won't be retried)
    const result = await sql`
      UPDATE email_notifications
      SET
        status = 'failed',
        retry_count = 99,
        error_message = COALESCE(error_message, '') || ' [Marked as permanently failed - nested Drizzle ORM select bug]',
        updated_at = NOW()
      WHERE status = 'failed' AND retry_count < 3
      RETURNING id
    `;

    console.log(`\n✅ Marked ${result.length} failed notifications as permanently failed`);
    console.log('   These will no longer be retried');
  }

  // Show current status summary
  const summary = await sql`
    SELECT
      status,
      COUNT(*) as count
    FROM email_notifications
    GROUP BY status
    ORDER BY status
  `;

  console.log('\n📊 Email Notifications Summary:');
  console.log('─'.repeat(80));
  for (const row of summary) {
    console.log(`   ${row.status.padEnd(15)}: ${row.count}`);
  }

  console.log('\n✅ Cleanup complete!');
  console.log('\n🎯 Next Steps:');
  console.log('   1. Wait 10-15 minutes for Railway deployment to complete');
  console.log('   2. Create a NEW booking to test');
  console.log('   3. Check that email is sent successfully with no errors\n');

} catch (error) {
  console.error('❌ Error:', error);
} finally {
  await sql.end();
}

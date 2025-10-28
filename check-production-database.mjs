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

console.log('\n🔍 Production Database Analysis');
console.log('═'.repeat(80));

try {
  // Check if we're connecting to production
  console.log(`\n📡 Database: ${u.hostname}`);
  console.log(`   Database Name: ${u.pathname.slice(1)}`);

  // Check for unique index/constraint
  console.log('\n1️⃣  Checking for unique constraint...');
  console.log('─'.repeat(80));

  const indexes = await sql`
    SELECT
      indexname,
      indexdef
    FROM pg_indexes
    WHERE tablename = 'email_notifications'
      AND indexname LIKE '%unique%'
  `;

  console.log(`Found ${indexes.length} unique indexes:`);
  for (const idx of indexes) {
    console.log(`\n   Index: ${idx.indexname}`);
    console.log(`   Definition: ${idx.indexdef}`);
  }

  // Check for recent failures in PRODUCTION (not local test data)
  console.log('\n\n2️⃣  Recent B3 Notifications (Last 2 hours)');
  console.log('─'.repeat(80));

  const recentB3 = await sql`
    SELECT
      id,
      appointment_id,
      created_at,
      status,
      error_message
    FROM email_notifications
    WHERE trigger_code = 'B3'
      AND created_at > NOW() - INTERVAL '2 hours'
    ORDER BY created_at DESC
  `;

  console.log(`\nFound ${recentB3.length} B3 notifications in last 2 hours:\n`);

  for (const notif of recentB3) {
    const icon = notif.status === 'sent' ? '✅' : '❌';
    console.log(`${icon} Appointment #${notif.appointment_id}`);
    console.log(`   Created: ${new Date(notif.created_at).toLocaleString()}`);
    console.log(`   Status: ${notif.status}`);
    if (notif.error_message) {
      console.log(`   Error: ${notif.error_message}`);
    }
    console.log('');
  }

  // Check all failures in last 24h
  console.log('\n3️⃣  All Failures (Last 24 hours)');
  console.log('─'.repeat(80));

  const allFailures = await sql`
    SELECT
      trigger_code,
      COUNT(*) as count,
      MAX(created_at) as latest,
      error_message
    FROM email_notifications
    WHERE status = 'failed'
      AND created_at > NOW() - INTERVAL '24 hours'
    GROUP BY trigger_code, error_message
    ORDER BY MAX(created_at) DESC
  `;

  if (allFailures.length === 0) {
    console.log('✅ No failures in last 24 hours');
  } else {
    for (const failure of allFailures) {
      console.log(`\n❌ ${failure.trigger_code}: ${failure.count} failures`);
      console.log(`   Latest: ${new Date(failure.latest).toLocaleString()}`);
      console.log(`   Error: ${failure.error_message || 'Unknown'}`);
    }
  }

  // Check constraint application status
  console.log('\n\n4️⃣  Constraint Status');
  console.log('─'.repeat(80));

  const constraintCheck = await sql`
    SELECT
      conname as constraint_name,
      contype as constraint_type,
      pg_get_constraintdef(oid) as definition
    FROM pg_constraint
    WHERE conrelid = 'email_notifications'::regclass
      AND conname LIKE '%unique%'
  `;

  if (constraintCheck.length > 0) {
    console.log('✅ Found unique constraint(s):');
    for (const con of constraintCheck) {
      console.log(`\n   Name: ${con.constraint_name}`);
      console.log(`   Type: ${con.constraint_type}`);
      console.log(`   Definition: ${con.definition}`);
    }
  } else {
    console.log('❌ No unique constraint found');
    console.log('\n⚠️  This means the migration has NOT been run on production database!');
    console.log('   Run: node run-unique-constraint-migration.mjs');
  }

  // Check if ICS fixes are effective
  console.log('\n\n5️⃣  ICS Error Timeline');
  console.log('─'.repeat(80));

  const icsTimeline = await sql`
    SELECT
      DATE(created_at) as date,
      COUNT(*) FILTER (WHERE error_message LIKE '%Cannot convert undefined or null%') as ics_errors,
      COUNT(*) as total
    FROM email_notifications
    WHERE trigger_code = 'B3'
      AND created_at > NOW() - INTERVAL '7 days'
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at) DESC
  `;

  for (const day of icsTimeline) {
    const rate = day.total > 0 ? ((day.ics_errors / day.total) * 100).toFixed(0) : 0;
    const icon = day.ics_errors === 0 ? '✅' : '❌';
    console.log(`${icon} ${day.date}: ${day.ics_errors}/${day.total} ICS errors (${rate}%)`);
  }

} catch (error) {
  console.error('\n❌ Error:', error);
} finally {
  await sql.end();
}

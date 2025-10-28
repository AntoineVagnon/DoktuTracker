import postgres from 'postgres';

const sql = postgres('postgresql://postgres.hzmrkvooqjbxptqjqxii:ArnuVVZ0mS4ZbMR8@aws-0-eu-central-1.pooler.supabase.com:5432/postgres', {
  ssl: { rejectUnauthorized: false }
});

const deploymentTime = '2025-10-24 11:44:00'; // UTC time (13:44 +0200 = 11:44 UTC)

console.log('Deployment time (UTC):', deploymentTime);
console.log('Checking emails created AFTER deployment...\n');

// Query emails created after deployment
const postDeploymentEmails = await sql`
  SELECT
    en.id,
    en.status,
    en.error_message,
    en.template_key,
    en.created_at,
    en.appointment_id,
    u.email as user_email
  FROM email_notifications en
  LEFT JOIN users u ON en.user_id = u.id
  WHERE en.created_at > ${deploymentTime}
  ORDER BY en.created_at ASC
`;

console.log(`Found ${postDeploymentEmails.length} emails created after deployment\n`);

if (postDeploymentEmails.length === 0) {
  console.log('❌ NO EMAILS CREATED AFTER DEPLOYMENT');
  console.log('This means the fix has NOT been tested with real production data yet.');
} else {
  console.log('Post-deployment emails:');

  postDeploymentEmails.forEach((email, index) => {
    console.log(`\n${index + 1}. Email ID: ${email.id}`);
    console.log(`   Template: ${email.template_key}`);
    console.log(`   Status: ${email.status}`);
    console.log(`   To: ${email.user_email}`);
    console.log(`   Created: ${email.created_at}`);

    if (email.template_key === 'booking_confirmation') {
      if (email.error_message && email.error_message.includes('Cannot convert undefined or null to object')) {
        console.log(`   ❌ P0 FIX FAILED: Still has template rendering error!`);
      } else if (email.status === 'sent') {
        console.log(`   ✅ P0 FIX WORKING: Email sent successfully`);
      } else if (email.status === 'failed') {
        console.log(`   ⚠️  Failed with different error: ${email.error_message}`);
      }
    }
  });
}

// Check if monitoring script is running
console.log('\n\n📊 Checking if monitoring script is tracking these...');

await sql.end();

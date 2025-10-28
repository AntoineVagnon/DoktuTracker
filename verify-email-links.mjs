#!/usr/bin/env node
import postgres from 'postgres';

const dbClient = postgres(process.env.DATABASE_URL, {
  ssl: 'require',
  connect_timeout: 10
});

console.log('=== EMAIL LINK VERIFICATION ===\n');

try {
  // Check recent notifications and their merge_data for links
  const recentNotifications = await dbClient`
    SELECT
      id,
      trigger_code,
      template_key,
      merge_data,
      status,
      sent_at,
      created_at
    FROM email_notifications
    WHERE created_at > NOW() - INTERVAL '24 hours'
    ORDER BY created_at DESC
    LIMIT 10
  `;

  console.log(`Found ${recentNotifications.length} recent notifications:\n`);

  for (const notification of recentNotifications) {
    console.log(`ID: ${notification.id}`);
    console.log(`Trigger: ${notification.trigger_code}`);
    console.log(`Template: ${notification.template_key}`);
    console.log(`Status: ${notification.status}`);
    console.log(`Sent: ${notification.sent_at || 'Not sent yet'}`);

    if (notification.merge_data) {
      const mergeData = notification.merge_data;
      console.log('Links in merge_data:');

      // Check for any URLs in the merge data
      for (const [key, value] of Object.entries(mergeData)) {
        if (typeof value === 'string' && (value.includes('http://') || value.includes('https://'))) {
          console.log(`  ${key}: ${value}`);
        }
      }
    }
    console.log('---\n');
  }

  // Check environment variable from database if it's stored
  console.log('\n=== CHECKING BACKEND CLIENT_URL ===');
  console.log(`CLIENT_URL should be set in Railway: https://doktu.co`);
  console.log(`This controls appointment/booking email links`);

  console.log('\n=== SUPABASE AUTH REMINDER ===');
  console.log('Password reset links are controlled by Supabase Auth settings:');
  console.log('1. Go to: https://supabase.com/dashboard/project/[your-project]/auth/url-configuration');
  console.log('2. Verify Site URL is: https://doktu.co');
  console.log('3. Verify Redirect URLs includes: https://doktu.co/**');
  console.log('4. IMPORTANT: Click "Save changes" button');
  console.log('5. Wait 1-2 minutes for changes to propagate');

} catch (error) {
  console.error('Error:', error);
} finally {
  await dbClient.end();
}

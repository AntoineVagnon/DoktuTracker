import fetch from 'node-fetch';

console.log('\n📧 MANUALLY TRIGGERING PENDING EMAIL NOTIFICATIONS\n');
console.log('='.repeat(80));

// Test if there's an API endpoint to trigger email processing
const productionUrl = 'https://web-production-b2ce.up.railway.app';

console.log('\n🔍 Checking if email processor API endpoint exists...');

try {
  // Try to call a test endpoint to process emails
  const response = await fetch(`${productionUrl}/api/test/process-emails`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  console.log(`Response status: ${response.status}`);

  if (response.ok) {
    const data = await response.json();
    console.log('✅ Email processing triggered:', data);
  } else {
    console.log('❌ No email processing endpoint available');
    console.log('We need to check the production logs instead');
  }
} catch (error) {
  console.log('❌ Could not connect:', error.message);
}

console.log('\n' + '='.repeat(80));
console.log('ℹ️  The email processor should be running automatically every 2 minutes');
console.log('ℹ️  If emails are not being sent, check:');
console.log('   1. SendGrid API key is configured in production');
console.log('   2. Email processor is starting up (check Railway logs)');
console.log('   3. No errors in processPendingNotifications()');
console.log('='.repeat(80) + '\n');

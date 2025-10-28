/**
 * Manually trigger notification for test appointment
 * This calls the production API's notification trigger endpoint
 */

const PRODUCTION_URL = 'https://web-production-b2ce.up.railway.app';
const TEST_APPOINTMENT_ID = 177; // From our previous test

console.log('\n🔔 Manually triggering notification for test appointment...');
console.log(`Appointment ID: ${TEST_APPOINTMENT_ID}\n`);

// Try to trigger notification via API endpoint
// Most apps have an admin endpoint or internal endpoint to trigger notifications

const attempts = [
  {
    name: 'Direct notification trigger',
    url: `${PRODUCTION_URL}/api/notifications/trigger`,
    method: 'POST',
    body: {
      appointmentId: TEST_APPOINTMENT_ID,
      triggerCode: 'B3' // Booking confirmation
    }
  },
  {
    name: 'Admin notification trigger',
    url: `${PRODUCTION_URL}/api/admin/notifications/trigger`,
    method: 'POST',
    body: {
      appointmentId: TEST_APPOINTMENT_ID,
      type: 'booking_confirmation'
    }
  },
  {
    name: 'Webhook simulation',
    url: `${PRODUCTION_URL}/api/webhooks/booking-created`,
    method: 'POST',
    body: {
      appointment_id: TEST_APPOINTMENT_ID
    }
  }
];

for (const attempt of attempts) {
  console.log(`Trying: ${attempt.name}...`);

  try {
    const response = await fetch(attempt.url, {
      method: attempt.method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attempt.body)
    });

    const status = response.status;
    const text = await response.text();

    console.log(`  Status: ${status}`);

    if (status === 200 || status === 201) {
      console.log(`  ✅ Success!`);
      console.log(`  Response: ${text.substring(0, 200)}\n`);
      break;
    } else if (status === 404) {
      console.log(`  ⚠️  Endpoint not found`);
    } else if (status === 401 || status === 403) {
      console.log(`  ⚠️  Authentication required`);
    } else {
      console.log(`  Response: ${text.substring(0, 100)}`);
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }

  console.log('');
}

console.log('═'.repeat(80));
console.log('\n📋 ALTERNATIVE APPROACH:');
console.log('Since API endpoints may not be available without auth, here are your options:\n');

console.log('Option 1: Use the UI (RECOMMENDED)');
console.log('  1. Go to https://web-production-b2ce.up.railway.app');
console.log('  2. Login as a patient');
console.log('  3. Book an appointment through the UI');
console.log('  4. The monitoring script will catch it automatically\n');

console.log('Option 2: Wait for real user');
console.log('  - Monitoring script is running');
console.log('  - Will automatically test next real booking');
console.log('  - This is the safest validation\n');

console.log('Option 3: Check existing emails before deployment');
console.log('  - We can analyze WHEN emails started working');
console.log('  - Look at the timeline of email statuses\n');

console.log('Would you like me to:');
console.log('  A) Analyze the timeline of when emails started working');
console.log('  B) Give you instructions to test via UI');
console.log('  C) Continue monitoring for next real booking\n');
